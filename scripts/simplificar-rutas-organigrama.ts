/**
 * Normaliza las rutas del organigrama sin borrar historial:
 * - conserva una sola ruta activa por persona revisora y area;
 * - deja una sola ruta predeterminada;
 * - impide que Direccion de Operaciones reciba niveles menores a gerencia;
 * - corrige las ideas DNP pendientes que aun apuntan a la ruta interina.
 *
 * Uso:
 *   pnpm exec tsx scripts/simplificar-rutas-organigrama.ts
 *   pnpm exec tsx scripts/simplificar-rutas-organigrama.ts --aplicar
 */
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");
const GENERATED_ROUTE_PREFIX = "Organigrama 2026 -";
const OPERATIONS_DIRECTOR_EMAIL = "myriam.esparza@proboca.net";
const DNP_COORDINATOR_REVIEWER_EMAIL = "lucero.aguilar@proboca.net";
const MANAGER_LEVEL = 4;

type UnitWithRoutes = Prisma.OrgUnitGetPayload<{
  include: {
    captureArea: true;
    escalationRules: {
      include: {
        reviewerMembership: { include: { user: true } };
        ideas: { select: { id: true } };
      };
    };
  };
}>;

type Route = UnitWithRoutes["escalationRules"][number];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isGenerated(route: Route) {
  return route.name.startsWith(GENERATED_ROUTE_PREFIX);
}

function canonicalRoute(routes: Route[]) {
  return [...routes].sort((left, right) => {
    const manualDifference = Number(isGenerated(left)) - Number(isGenerated(right));
    if (manualDifference) return manualDifference;
    const defaultDifference = Number(right.isDefault) - Number(left.isDefault);
    if (defaultDifference) return defaultDifference;
    const usageDifference = right.ideas.length - left.ideas.length;
    if (usageDifference) return usageDifference;
    return left.sortOrder - right.sortOrder || left.createdAt.getTime() - right.createdAt.getTime();
  })[0];
}

function preferredDefault(routes: Route[]) {
  return [...routes].sort((left, right) =>
    Number(right.isDefault) - Number(left.isDefault)
    || left.submitterLevel - right.submitterLevel
    || left.reviewerMembership.level - right.reviewerMembership.level
    || left.sortOrder - right.sortOrder
    || left.reviewerMembership.user.name.localeCompare(right.reviewerMembership.user.name)
  )[0];
}

async function loadUnits() {
  return prisma.orgUnit.findMany({
    where: { active: true, qrEnabled: true },
    include: {
      captureArea: true,
      escalationRules: {
        where: { active: true },
        include: {
          reviewerMembership: { include: { user: true } },
          ideas: { select: { id: true } }
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      }
    },
    orderBy: { code: "asc" }
  });
}

function buildPlan(units: UnitWithRoutes[]) {
  return units.map((unit) => {
    const prohibitedDirectorRoutes = unit.escalationRules.filter((route) =>
      normalizeEmail(route.reviewerMembership.user.email) === OPERATIONS_DIRECTOR_EMAIL
      && route.submitterLevel < MANAGER_LEVEL
    );
    const prohibitedIds = new Set(prohibitedDirectorRoutes.map((route) => route.id));
    const eligibleRoutes = unit.escalationRules.filter((route) => !prohibitedIds.has(route.id));
    const routesByReviewer = new Map<string, Route[]>();
    for (const route of eligibleRoutes) {
      routesByReviewer.set(route.reviewerMembershipId, [
        ...(routesByReviewer.get(route.reviewerMembershipId) ?? []),
        route
      ]);
    }

    const canonicalRoutes: Route[] = [];
    const duplicates: Array<{ canonical: Route; duplicate: Route }> = [];
    for (const routes of routesByReviewer.values()) {
      const canonical = canonicalRoute(routes);
      canonicalRoutes.push(canonical);
      for (const duplicate of routes) {
        if (duplicate.id !== canonical.id) duplicates.push({ canonical, duplicate });
      }
    }
    canonicalRoutes.sort((left, right) =>
      left.submitterLevel - right.submitterLevel
      || left.reviewerMembership.level - right.reviewerMembership.level
      || left.reviewerMembership.user.name.localeCompare(right.reviewerMembership.user.name)
    );

    return {
      unit,
      prohibitedDirectorRoutes,
      canonicalRoutes,
      duplicates,
      defaultRoute: preferredDefault(canonicalRoutes)
    };
  });
}

async function runInBatches(operations: Prisma.PrismaPromise<unknown>[], batchSize = 50) {
  for (let index = 0; index < operations.length; index += batchSize) {
    await prisma.$transaction(operations.slice(index, index + batchSize));
  }
}

async function pendingDnpIdeasForDirector() {
  return prisma.idea.findMany({
    where: {
      supervisor: { is: { email: OPERATIONS_DIRECTOR_EMAIL } },
      status: { in: ["EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"] },
      area: { organizationUnit: { is: { code: { contains: "DNP" } } } }
    },
    include: {
      area: { include: { organizationUnit: true } },
      escalationRule: true,
      approvals: { where: { type: "SUPERVISOR" } },
      notifications: {
        where: { status: { in: ["PENDING", "ERROR"] } },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { folio: "asc" }
  });
}

async function dnpTargetRoute(plan: ReturnType<typeof buildPlan>) {
  const dnpUnit = plan.find((item) => item.unit.code === "APO-DNP");
  const target = dnpUnit?.canonicalRoutes.find((route) =>
    normalizeEmail(route.reviewerMembership.user.email) === DNP_COORDINATOR_REVIEWER_EMAIL
  );
  if (!target) throw new Error("APO-DNP no tiene una ruta activa hacia Lucero Aguilar.");
  return target;
}

async function applyPlan(plan: ReturnType<typeof buildPlan>) {
  const dnpIdeas = await pendingDnpIdeasForDirector();
  const targetRoute = await dnpTargetRoute(plan);
  const duplicateRuleIds = plan.flatMap((item) => item.duplicates.map(({ duplicate }) => duplicate.id));
  const prohibitedRuleIds = plan.flatMap((item) => item.prohibitedDirectorRoutes.map((route) => route.id));

  const ideaRepointOperations = plan.flatMap((item) => item.duplicates.map(({ canonical, duplicate }) =>
    prisma.idea.updateMany({
      where: { escalationRuleId: duplicate.id },
      data: { escalationRuleId: canonical.id }
    })
  ));
  await runInBatches(ideaRepointOperations);

  const routesToDeactivate = [...new Set([...duplicateRuleIds, ...prohibitedRuleIds])];
  if (routesToDeactivate.length) {
    await prisma.orgEscalationRule.updateMany({
      where: { id: { in: routesToDeactivate } },
      data: { active: false, isDefault: false }
    });
  }

  const routeUpdates = plan.flatMap((item) => item.canonicalRoutes.map((route, index) =>
    prisma.orgEscalationRule.update({
      where: { id: route.id },
      data: {
        ...(isGenerated(route) ? {
          name: `${GENERATED_ROUTE_PREFIX}${route.reviewerMembership.user.name}`,
          submitterLabel: route.reviewerMembership.user.name,
          circumstance: route.reviewerMembership.title
        } : {}),
        sortOrder: index,
        active: true,
        isDefault: false
      }
    })
  ));
  await runInBatches(routeUpdates);

  const defaultOperations = plan.flatMap((item) => {
    const route = item.defaultRoute;
    if (!route) return [];
    const reviewer = route.reviewerMembership.user;
    return [
      prisma.orgEscalationRule.update({ where: { id: route.id }, data: { isDefault: true } }),
      prisma.orgUnit.update({
        where: { id: item.unit.id },
        data: { routingUserId: reviewer.id, responsible: reviewer.name, manager: reviewer.name }
      }),
      ...(item.unit.captureAreaId ? [
        prisma.area.update({ where: { id: item.unit.captureAreaId }, data: { supervisorId: reviewer.id } })
      ] : [])
    ];
  });
  await runInBatches(defaultOperations);

  for (const idea of dnpIdeas) {
    await prisma.$transaction(async (database) => {
      await database.idea.update({
        where: { id: idea.id },
        data: {
          supervisorId: targetRoute.reviewerMembership.userId,
          escalationRuleId: targetRoute.id
        }
      });
      await database.approval.updateMany({
        where: {
          ideaId: idea.id,
          type: "SUPERVISOR",
          status: { in: ["PENDING", "MORE_INFO"] }
        },
        data: { assignedToId: targetRoute.reviewerMembership.userId }
      });
      await database.notificationOutbox.updateMany({
        where: {
          ideaId: idea.id,
          to: OPERATIONS_DIRECTOR_EMAIL,
          status: { in: ["PENDING", "ERROR"] }
        },
        data: {
          to: targetRoute.reviewerMembership.user.email,
          status: "PENDING",
          errorMessage: null
        }
      });
      await database.auditLog.create({
        data: {
          entity: "Idea",
          entityId: idea.id,
          action: "DNP_ROUTE_REASSIGNED",
          details: JSON.stringify({
            folio: idea.folio,
            from: OPERATIONS_DIRECTOR_EMAIL,
            to: targetRoute.reviewerMembership.user.email,
            reason: "Direccion de Operaciones recibe ideas solo desde nivel gerencia."
          })
        }
      });
    });
  }

  const pendingNotifications = await prisma.notificationOutbox.findMany({
    where: {
      ideaId: { in: dnpIdeas.map((idea) => idea.id) },
      status: { in: ["PENDING", "ERROR"] }
    },
    orderBy: { createdAt: "asc" }
  });
  const notificationKeys = new Set<string>();
  const duplicateNotificationIds: string[] = [];
  for (const notification of pendingNotifications) {
    const key = [notification.ideaId, notification.channel, normalizeEmail(notification.to), notification.subject].join("|");
    if (notificationKeys.has(key)) duplicateNotificationIds.push(notification.id);
    else notificationKeys.add(key);
  }
  if (duplicateNotificationIds.length) {
    await prisma.notificationOutbox.updateMany({
      where: { id: { in: duplicateNotificationIds } },
      data: { status: "DISMISSED", errorMessage: "Notificacion duplicada consolidada por saneamiento de rutas." }
    });
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", active: true }, select: { id: true } });
  await prisma.auditLog.create({
    data: {
      entity: "Organization",
      entityId: "ROUTE-SIMPLIFICATION-2026",
      action: "ORGANIZATION_ROUTES_SIMPLIFIED",
      userId: admin?.id ?? null,
      details: JSON.stringify({
        duplicateRoutesDeactivated: duplicateRuleIds.length,
        directorRoutesDeactivated: prohibitedRuleIds.length,
        dnpIdeasReassigned: dnpIdeas.length,
        duplicateNotificationsDismissed: duplicateNotificationIds.length
      })
    }
  });

  return {
    duplicateRoutesDeactivated: duplicateRuleIds.length,
    directorRoutesDeactivated: prohibitedRuleIds.length,
    dnpIdeasReassigned: dnpIdeas.length,
    duplicateNotificationsDismissed: duplicateNotificationIds.length
  };
}

async function audit() {
  const units = await loadUnits();
  const duplicateReviewers = units.flatMap((unit) => {
    const counts = new Map<string, number>();
    for (const route of unit.escalationRules) {
      counts.set(route.reviewerMembershipId, (counts.get(route.reviewerMembershipId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([reviewerMembershipId, count]) => ({ unit: unit.code, reviewerMembershipId, count }));
  });
  const directorBelowManager = units.flatMap((unit) => unit.escalationRules
    .filter((route) => normalizeEmail(route.reviewerMembership.user.email) === OPERATIONS_DIRECTOR_EMAIL && route.submitterLevel < MANAGER_LEVEL)
    .map((route) => ({ unit: unit.code, route: route.submitterLabel, level: route.submitterLevel }))
  );
  const invalidDefaults = units
    .filter((unit) => unit.escalationRules.length > 0 && unit.escalationRules.filter((route) => route.isDefault).length !== 1)
    .map((unit) => ({ unit: unit.code, defaults: unit.escalationRules.filter((route) => route.isDefault).length }));
  const pendingDirectorIdeasBelowManager = await prisma.idea.findMany({
    where: {
      supervisor: { is: { email: OPERATIONS_DIRECTOR_EMAIL } },
      status: { in: ["EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"] },
      OR: [
        { escalationRule: { is: { submitterLevel: { lt: MANAGER_LEVEL } } } },
        { escalationRuleId: null }
      ]
    },
    select: { folio: true, submitterPosition: true }
  });
  const activeRoutes = units.reduce((total, unit) => total + unit.escalationRules.length, 0);
  const result = {
    ok: duplicateReviewers.length === 0
      && directorBelowManager.length === 0
      && invalidDefaults.length === 0
      && pendingDirectorIdeasBelowManager.length === 0,
    totals: {
      units: units.length,
      activeRoutes,
      uniqueReviewerRoutes: units.reduce((total, unit) => total + new Set(unit.escalationRules.map((route) => route.reviewerMembershipId)).size, 0)
    },
    failures: { duplicateReviewers, directorBelowManager, invalidDefaults, pendingDirectorIdeasBelowManager }
  };
  return result;
}

async function main() {
  const units = await loadUnits();
  const plan = buildPlan(units);
  const dnpIdeas = await pendingDnpIdeasForDirector();
  const preview = {
    mode: aplicar ? "apply" : "preview",
    activeRoutesBefore: units.reduce((total, unit) => total + unit.escalationRules.length, 0),
    activeRoutesAfter: plan.reduce((total, item) => total + item.canonicalRoutes.length, 0),
    duplicateRoutes: plan.reduce((total, item) => total + item.duplicates.length, 0),
    directorRoutesBelowManager: plan.reduce((total, item) => total + item.prohibitedDirectorRoutes.length, 0),
    dnpIdeasToReassign: dnpIdeas.map((idea) => idea.folio),
    affectedUnits: plan
      .filter((item) => item.duplicates.length || item.prohibitedDirectorRoutes.length)
      .map((item) => ({
        unit: item.unit.code,
        before: item.unit.escalationRules.length,
        after: item.canonicalRoutes.length,
        duplicates: item.duplicates.length,
        directorRoutesRemoved: item.prohibitedDirectorRoutes.length,
        defaultReviewer: item.defaultRoute?.reviewerMembership.user.name ?? null
      }))
  };
  console.log(JSON.stringify(preview, null, 2));
  if (!aplicar) {
    console.log("\nVista previa completada. Usa --aplicar para guardar el saneamiento.");
    return;
  }

  const applied = await applyPlan(plan);
  const result = await audit();
  console.log(JSON.stringify({ applied, audit: result }, null, 2));
  if (!result.ok) throw new Error("El saneamiento termino con fallas de integridad.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

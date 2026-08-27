/**
 * Normaliza las rutas del organigrama sin borrar historial:
 * - conserva una sola ruta activa por persona revisora y area;
 * - deja una sola ruta predeterminada;
 * - excluye a cualquier usuario DIRECCION de rutas y asignaciones estructurales;
 * - conserva a Direccion en el organigrama con visibilidad de consulta.
 *
 * Uso:
 *   pnpm exec tsx scripts/simplificar-rutas-organigrama.ts
 *   pnpm exec tsx scripts/simplificar-rutas-organigrama.ts --aplicar
 */
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");
const GENERATED_ROUTE_PREFIX = "Organigrama 2026 -";

type UnitWithRoutes = Prisma.OrgUnitGetPayload<{
  include: {
    routingUser: true;
    captureArea: { include: { supervisor: true } };
    memberships: { include: { user: true } };
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
    where: { active: true },
    include: {
      routingUser: true,
      captureArea: { include: { supervisor: true } },
      memberships: {
        where: { active: true },
        include: { user: true },
        orderBy: [{ level: "desc" }, { sortOrder: "asc" }]
      },
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

function localFallbackMembership(unit: UnitWithRoutes) {
  return unit.memberships.find((membership) =>
    membership.canReceiveIdeas && membership.user.active && membership.user.role !== "DIRECCION"
  ) ?? null;
}

function needsOperationalFallback(item: ReturnType<typeof buildPlan>[number]) {
  return item.unit.qrEnabled
    && !item.defaultRoute
    && (item.prohibitedDirectorRoutes.length > 0 || item.unit.routingUser?.role === "DIRECCION");
}

async function globalImprovementFallback() {
  const candidates = await prisma.user.findMany({
    where: { active: true, role: { not: "DIRECCION" } },
    select: { id: true, name: true, email: true, role: true, jobTitle: true }
  });
  const score = (candidate: (typeof candidates)[number]) => {
    const corporate = candidate.email.toLowerCase().endsWith("@proboca.net");
    if (corporate && candidate.role === "MEJORA_CONTINUA") return 0;
    if (corporate && /mejora continua/i.test(candidate.jobTitle ?? "")) return 1;
    if (corporate && candidate.role === "ADMIN") return 2;
    if (candidate.role === "MEJORA_CONTINUA") return 3;
    return 4;
  };
  return candidates.sort((left, right) => score(left) - score(right) || left.name.localeCompare(right.name))[0] ?? null;
}

async function ensureOperationalFallbackRoutes(plan: ReturnType<typeof buildPlan>) {
  const pending = plan.filter(needsOperationalFallback);
  if (!pending.length) return [];
  const globalFallback = await globalImprovementFallback();
  const created: Array<{ unit: string; reviewer: string; source: "local" | "mejora_continua" }> = [];

  for (const item of pending) {
    const local = localFallbackMembership(item.unit);
    let membershipId = local?.id;
    let reviewerName = local?.user.name;
    let source: "local" | "mejora_continua" = "local";
    if (!membershipId || !reviewerName) {
      if (!globalFallback) throw new Error(`No hay una persona operativa para resguardar la ruta ${item.unit.code}.`);
      source = "mejora_continua";
      reviewerName = globalFallback.name;
      const membership = await prisma.orgMembership.upsert({
        where: { userId_orgUnitId: { userId: globalFallback.id, orgUnitId: item.unit.id } },
        update: { active: true, canReceiveIdeas: true, canReviewTeam: true, canManageActivities: true },
        create: {
          userId: globalFallback.id,
          orgUnitId: item.unit.id,
          title: "Resguardo provisional de Mejora Continua",
          level: 4,
          canReceiveIdeas: true,
          canReviewTeam: true,
          canManageActivities: true,
          active: true,
          sortOrder: item.unit.memberships.length
        }
      });
      membershipId = membership.id;
    }

    const existing = await prisma.orgEscalationRule.findFirst({
      where: { orgUnitId: item.unit.id, reviewerMembershipId: membershipId },
      orderBy: [{ active: "desc" }, { createdAt: "asc" }]
    });
    const data = {
      name: `${GENERATED_ROUTE_PREFIX}${reviewerName}`,
      submitterLabel: "Personal del area",
      circumstance: source === "local" ? "Responsable operativo disponible" : "Resguardo provisional de Mejora Continua",
      submitterLevel: 0,
      reviewerMembershipId: membershipId,
      active: true,
      isDefault: false,
      sortOrder: 0
    };
    if (existing) await prisma.orgEscalationRule.update({ where: { id: existing.id }, data });
    else await prisma.orgEscalationRule.create({ data: { ...data, orgUnitId: item.unit.id } });
    created.push({ unit: item.unit.code, reviewer: reviewerName, source });
  }
  return created;
}

function buildPlan(units: UnitWithRoutes[]) {
  return units.map((unit) => {
    const prohibitedDirectorRoutes = unit.escalationRules.filter((route) => route.reviewerMembership.user.role === "DIRECCION");
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

async function directorOperationalAssignments() {
  const openIdeaStatuses = [
    "REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION", "APROBADA_SUPERVISOR",
    "EN_VALIDACION_CALIDAD", "EN_VALIDACION_SEGURIDAD", "EN_VALIDACION_MANTENIMIENTO",
    "APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA", "EN_IMPLEMENTACION",
    "IMPLEMENTADA", "EN_VALIDACION_FINAL", "VENCIDA"
  ] as const;
  const [ideas, implementations, approvals, support, kaizenLeaders, kaizenActivities, genbaCoordinators, genbaActivities] = await Promise.all([
    prisma.idea.count({ where: { status: { in: [...openIdeaStatuses] }, supervisor: { is: { role: "DIRECCION" } } } }),
    prisma.idea.count({ where: { status: { in: [...openIdeaStatuses] }, implementationOwner: { is: { role: "DIRECCION" } } } }),
    prisma.approval.count({ where: { status: { in: ["PENDING", "MORE_INFO"] }, assignedTo: { is: { role: "DIRECCION" } } } }),
    prisma.ideaSupportRequest.count({ where: { status: { in: ["PENDING", "MORE_INFO"] }, assignedTo: { is: { role: "DIRECCION" } } } }),
    prisma.kaizenProject.count({ where: { status: { notIn: ["COMPLETADO", "CANCELADO"] }, leader: { is: { role: "DIRECCION" } } } }),
    prisma.kaizenActivity.count({ where: { status: { notIn: ["COMPLETADA", "CANCELADA", "COMBINADA"] }, owner: { is: { role: "DIRECCION" } } } }),
    prisma.genbaWalk.count({ where: { status: "ABIERTO", coordinator: { is: { role: "DIRECCION" } } } }),
    prisma.genbaActivity.count({ where: { status: { notIn: ["COMPLETADA", "CANCELADA", "COMBINADA"] }, owner: { is: { role: "DIRECCION" } } } })
  ]);
  return { ideas, implementations, approvals, support, kaizenLeaders, kaizenActivities, genbaCoordinators, genbaActivities };
}

async function cleanDirectorNotifications(directorEmails: string[]) {
  if (!directorEmails.length) return 0;
  const blocked = new Set(directorEmails.map(normalizeEmail));
  const notices = await prisma.notificationOutbox.findMany({ where: { audience: "OPERATIONAL", status: { in: ["PENDING", "ERROR"] } } });
  let changed = 0;
  for (const notice of notices) {
    const recipients = notice.to.split(/[;,]/).map((recipient) => recipient.trim()).filter(Boolean);
    if (!recipients.some((recipient) => blocked.has(normalizeEmail(recipient)))) continue;
    const allowed = recipients.filter((recipient) => !blocked.has(normalizeEmail(recipient)));
    await prisma.notificationOutbox.update({
      where: { id: notice.id },
      data: allowed.length
        ? { to: allowed.join(";"), status: "PENDING", errorMessage: null }
        : { status: "DISMISSED", errorMessage: "Direccion conserva consulta y no recibe avisos operativos." }
    });
    changed++;
  }
  return changed;
}

async function applyPlan(plan: ReturnType<typeof buildPlan>, fallbacksCreated: Awaited<ReturnType<typeof ensureOperationalFallbackRoutes>>) {
  const assignments = await directorOperationalAssignments();
  const assignmentCount = Object.values(assignments).reduce((sum, count) => sum + count, 0);
  if (assignmentCount) {
    throw new Error(`Hay ${assignmentCount} asignaciones operativas activas a Direccion. Reasignalas antes de ejecutar el saneamiento: ${JSON.stringify(assignments)}`);
  }

  const duplicateRuleIds = plan.flatMap((item) => item.duplicates.map(({ duplicate }) => duplicate.id));
  const prohibitedRuleIds = plan.flatMap((item) => item.prohibitedDirectorRoutes.map((route) => route.id));

  await runInBatches(plan.flatMap((item) => item.duplicates.map(({ canonical, duplicate }) =>
    prisma.idea.updateMany({ where: { escalationRuleId: duplicate.id }, data: { escalationRuleId: canonical.id } })
  )));

  const routesToDeactivate = [...new Set([...duplicateRuleIds, ...prohibitedRuleIds])];
  if (routesToDeactivate.length) {
    await prisma.orgEscalationRule.updateMany({
      where: { id: { in: routesToDeactivate } },
      data: { active: false, isDefault: false }
    });
  }

  await runInBatches(plan.flatMap((item) => item.canonicalRoutes.map((route, index) =>
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
        isDefault: route.id === item.defaultRoute?.id
      }
    })
  )));

  const structuralOperations = plan.flatMap((item) => {
    const reviewer = item.defaultRoute?.reviewerMembership.user;
    const mustClearRouting = item.unit.routingUser?.role === "DIRECCION";
    const mustClearArea = item.unit.captureArea?.supervisor?.role === "DIRECCION";
    return [
      ...(reviewer ? [prisma.orgUnit.update({
        where: { id: item.unit.id },
        data: { routingUserId: reviewer.id, responsible: reviewer.name, manager: reviewer.name }
      })] : mustClearRouting ? [prisma.orgUnit.update({ where: { id: item.unit.id }, data: { routingUserId: null } })] : []),
      ...(item.unit.captureAreaId && reviewer ? [
        prisma.area.update({ where: { id: item.unit.captureAreaId }, data: { supervisorId: reviewer.id } })
      ] : item.unit.captureAreaId && mustClearArea ? [
        prisma.area.update({ where: { id: item.unit.captureAreaId }, data: { supervisorId: null } })
      ] : [])
    ];
  });
  await runInBatches(structuralOperations);

  const directors = await prisma.user.findMany({ where: { role: "DIRECCION" }, select: { id: true, email: true } });
  const directorIds = directors.map((director) => director.id);
  const memberships = await prisma.orgMembership.updateMany({
    where: { userId: { in: directorIds } },
    data: { canReceiveIdeas: false, canReviewTeam: false, canManageActivities: false }
  });
  const followers = await prisma.ideaFollower.deleteMany({ where: { userId: { in: directorIds } } });
  const notifications = await cleanDirectorNotifications(directors.map((director) => director.email));

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", active: true }, select: { id: true } });
  await prisma.auditLog.create({
    data: {
      entity: "Organization",
      entityId: "DIRECTOR-READ-ONLY-2026",
      action: "DIRECTOR_OPERATIONAL_ASSIGNMENTS_REMOVED",
      userId: admin?.id ?? null,
      details: JSON.stringify({
        duplicateRoutesDeactivated: duplicateRuleIds.length,
        directorRoutesDeactivated: prohibitedRuleIds.length,
        directorMembershipsRestricted: memberships.count,
        directorFollowersRemoved: followers.count,
        directorNotificationsFiltered: notifications,
        fallbackRoutesCreated: fallbacksCreated
      })
    }
  });

  return {
    duplicateRoutesDeactivated: duplicateRuleIds.length,
    directorRoutesDeactivated: prohibitedRuleIds.length,
    directorMembershipsRestricted: memberships.count,
    directorFollowersRemoved: followers.count,
    directorNotificationsFiltered: notifications,
    fallbackRoutesCreated: fallbacksCreated
  };
}

async function audit() {
  const [routes, units, areas, memberships, followers, assignments] = await Promise.all([
    prisma.orgEscalationRule.count({ where: { active: true, reviewerMembership: { user: { role: "DIRECCION" } } } }),
    prisma.orgUnit.count({ where: { active: true, routingUser: { is: { role: "DIRECCION" } } } }),
    prisma.area.count({ where: { active: true, supervisor: { is: { role: "DIRECCION" } } } }),
    prisma.orgMembership.count({ where: { user: { role: "DIRECCION" }, OR: [{ canReceiveIdeas: true }, { canReviewTeam: true }, { canManageActivities: true }] } }),
    prisma.ideaFollower.count({ where: { user: { role: "DIRECCION" } } }),
    directorOperationalAssignments()
  ]);
  const assignmentCount = Object.values(assignments).reduce((sum, count) => sum + count, 0);
  return { ok: routes + units + areas + memberships + followers + assignmentCount === 0, routes, units, areas, memberships, followers, assignments };
}

async function main() {
  const units = await loadUnits();
  const plan = buildPlan(units);
  const assignments = await directorOperationalAssignments();
  const preview = {
    mode: aplicar ? "apply" : "preview",
    activeRoutesBefore: units.reduce((total, unit) => total + unit.escalationRules.length, 0),
    activeRoutesAfter: plan.reduce((total, item) => total + item.canonicalRoutes.length, 0),
    duplicateRoutes: plan.reduce((total, item) => total + item.duplicates.length, 0),
    directorRoutes: plan.reduce((total, item) => total + item.prohibitedDirectorRoutes.length, 0),
    activeDirectorAssignments: assignments,
    fallbackRoutesNeeded: plan.filter(needsOperationalFallback).map((item) => ({
      unit: item.unit.code,
      localReviewer: localFallbackMembership(item.unit)?.user.name ?? null
    })),
    affectedUnits: plan
      .filter((item) => item.duplicates.length || item.prohibitedDirectorRoutes.length || item.unit.routingUser?.role === "DIRECCION" || item.unit.captureArea?.supervisor?.role === "DIRECCION")
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

  const fallbacksCreated = await ensureOperationalFallbackRoutes(plan);
  const refreshedPlan = buildPlan(await loadUnits());
  const applied = await applyPlan(refreshedPlan, fallbacksCreated);
  const result = await audit();
  console.log(JSON.stringify({ applied, audit: result }, null, 2));
  if (!result.ok) throw new Error("El saneamiento termino con referencias operativas a Direccion.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

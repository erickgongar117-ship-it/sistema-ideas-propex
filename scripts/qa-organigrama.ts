/** Audita personas, jefaturas, rutas y la politica de Direccion solo consulta. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CEO_EMAIL = "osbaldo.montano@proboca.net";

async function main() {
  const [users, memberships, qrUnits, generatedRoutes, activeRoutes, directorFollowers, pendingNotices, executiveValidations] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, jobTitle: true } }),
    prisma.orgMembership.findMany({
      where: { active: true },
      include: {
        user: true,
        orgUnit: { include: { plant: true } },
        managerMembership: { include: { user: true, orgUnit: { include: { plant: true } } } }
      }
    }),
    prisma.orgUnit.findMany({
      where: { active: true, qrEnabled: true },
      include: {
        plant: true,
        routingUser: true,
        captureArea: { include: { supervisor: true } },
        memberships: { where: { active: true } },
        escalationRules: {
          where: { active: true },
          include: { reviewerMembership: { include: { user: true, orgUnit: { include: { plant: true } } } } }
        }
      }
    }),
    prisma.orgEscalationRule.findMany({
      where: { active: true, name: { startsWith: "Organigrama 2026 -" } },
      include: {
        orgUnit: { include: { plant: true } },
        reviewerMembership: { include: { user: true, orgUnit: { include: { plant: true } } } }
      }
    }),
    prisma.orgEscalationRule.findMany({
      where: { active: true },
      include: { orgUnit: true, reviewerMembership: { include: { user: true } } }
    }),
    prisma.ideaFollower.findMany({
      where: { user: { role: "DIRECCION" } },
      select: { idea: { select: { folio: true, status: true } }, user: { select: { name: true, email: true } } }
    }),
    prisma.notificationOutbox.findMany({
      where: { status: { in: ["PENDING", "ERROR"] } },
      select: { id: true, to: true, subject: true, status: true, audience: true }
    }),
    prisma.executiveValidation.findMany({
      include: { requestedBy: true, assignedTo: true, idea: { select: { folio: true } } }
    })
  ]);

  const directors = users.filter((user) => user.role === "DIRECCION");
  const directorIds = new Set(directors.map((director) => director.id));
  const directorEmails = new Set(directors.map((director) => director.email.trim().toLowerCase()));

  const usersByNormalizedEmail = new Map<string, typeof users>();
  for (const user of users) {
    const key = user.email.trim().toLowerCase();
    usersByNormalizedEmail.set(key, [...(usersByNormalizedEmail.get(key) ?? []), user]);
  }
  const duplicateEmails = [...usersByNormalizedEmail]
    .filter(([, matches]) => matches.length > 1)
    .map(([email, matches]) => ({ email, users: matches.map((user) => user.name) }));

  const managerByMembership = new Map(memberships.map((membership) => [membership.id, membership.managerMembershipId]));
  const cycles: string[] = [];
  for (const membership of memberships) {
    const visited = new Set([membership.id]);
    let managerId = membership.managerMembershipId;
    while (managerId) {
      if (visited.has(managerId)) {
        cycles.push(membership.id);
        break;
      }
      visited.add(managerId);
      managerId = managerByMembership.get(managerId) ?? null;
    }
  }

  const crossPlantManagers = memberships
    .filter((membership) => membership.managerMembership
      && membership.orgUnit.plantId !== membership.managerMembership.orgUnit.plantId
      && membership.managerMembership.user.role !== "DIRECCION")
    .map((membership) => ({
      person: membership.user.name,
      unit: membership.orgUnit.code,
      manager: membership.managerMembership!.user.name,
      managerUnit: membership.managerMembership!.orgUnit.code
    }));

  const qrWithPeople = qrUnits.filter((unit) => unit.memberships.length);
  const qrWithoutCaptureArea = qrWithPeople.filter((unit) => !unit.captureArea).map((unit) => unit.code);
  const noDefaultRoute = qrWithPeople.filter((unit) => !unit.escalationRules.some((rule) => rule.isDefault)).map((unit) => unit.code);
  const multipleDefaultRoutes = qrWithPeople.filter((unit) => unit.escalationRules.filter((rule) => rule.isDefault).length > 1).map((unit) => unit.code);
  const duplicateReviewerRoutes = qrUnits.flatMap((unit) => {
    const counts = new Map<string, number>();
    for (const route of unit.escalationRules) counts.set(route.reviewerMembershipId, (counts.get(route.reviewerMembershipId) ?? 0) + 1);
    return [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([reviewerMembershipId, count]) => ({ unit: unit.code, reviewerMembershipId, count }));
  });
  const invalidGeneratedReviewers = generatedRoutes
    .filter((route) => !route.reviewerMembership.active || !route.reviewerMembership.user.active || !route.reviewerMembership.canReceiveIdeas)
    .map((route) => route.name);
  const crossPlantRoutes = generatedRoutes
    .filter((route) => route.orgUnit.plantId !== route.reviewerMembership.orgUnit.plantId)
    .map((route) => ({ route: route.name, unit: route.orgUnit.code, reviewerUnit: route.reviewerMembership.orgUnit.code }));
  const executiveAdmins = users.filter((user) => user.role === "ADMIN" && /director|gerente|comite/i.test(user.jobTitle ?? ""));

  const directorRoutes = activeRoutes
    .filter((route) => route.reviewerMembership.user.role === "DIRECCION")
    .map((route) => ({ unit: route.orgUnit.code, route: route.name, reviewer: route.reviewerMembership.user.name }));
  const directorRoutingUnits = qrUnits
    .filter((unit) => unit.routingUser?.role === "DIRECCION")
    .map((unit) => ({ unit: unit.code, reviewer: unit.routingUser!.name }));
  const directorCaptureAreas = qrUnits
    .filter((unit) => unit.captureArea?.supervisor?.role === "DIRECCION")
    .map((unit) => ({ unit: unit.code, reviewer: unit.captureArea!.supervisor!.name }));
  const directorMembershipCapabilities = memberships
    .filter((membership) => directorIds.has(membership.userId) && (membership.canReceiveIdeas || membership.canReviewTeam || membership.canManageActivities))
    .map((membership) => ({ unit: membership.orgUnit.code, director: membership.user.name }));
  const directorNotifications = pendingNotices.filter((notice) =>
    notice.audience === "OPERATIONAL" &&
    notice.to.split(/[;,]/).some((recipient) => directorEmails.has(recipient.trim().toLowerCase()))
  );
  const executiveValidationIntegrity = executiveValidations.flatMap((validation) => {
    const reasons: string[] = [];
    const assignedIsCeo = validation.assignedTo.email.trim().toLowerCase() === CEO_EMAIL;
    const requesterIsCeo = validation.requestedBy.email.trim().toLowerCase() === CEO_EMAIL;
    if (!validation.assignedTo.active || validation.assignedTo.role !== "DIRECCION") reasons.push("destinatario no es Dirección activa");
    if (validation.requestedBy.role !== "GERENTE" && validation.requestedBy.role !== "DIRECCION") reasons.push("solicitante no es Gerencia ni Dirección");
    if (validation.requestedById === validation.assignedToId) reasons.push("autovalidación");
    if ((validation.level === "CEO") !== assignedIsCeo) reasons.push("nivel ejecutivo no coincide con destinatario");
    if (validation.requestedBy.role === "DIRECCION" && (requesterIsCeo || !assignedIsCeo)) reasons.push("Dirección solo puede solicitar al CEO");
    return reasons.length ? [{ folio: validation.idea.folio, validationId: validation.id, reasons }] : [];
  });

  const openIdeaStatuses = [
    "REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION", "APROBADA_SUPERVISOR",
    "EN_VALIDACION_CALIDAD", "EN_VALIDACION_SEGURIDAD", "EN_VALIDACION_MANTENIMIENTO",
    "APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA", "EN_IMPLEMENTACION",
    "IMPLEMENTADA", "EN_VALIDACION_FINAL", "VENCIDA"
  ] as const;
  const [directorIdeas, directorImplementations, directorApprovals, directorSupport, directorKaizenLeaders, directorKaizenActivities, directorKaizenTeams, directorGenbaCoordinators, directorGenbaActivities] = await Promise.all([
    prisma.idea.findMany({ where: { status: { in: [...openIdeaStatuses] }, supervisor: { is: { role: "DIRECCION" } } }, select: { folio: true, status: true } }),
    prisma.idea.findMany({ where: { status: { in: [...openIdeaStatuses] }, implementationOwner: { is: { role: "DIRECCION" } } }, select: { folio: true, status: true } }),
    prisma.approval.findMany({ where: { status: { in: ["PENDING", "MORE_INFO"] }, assignedTo: { is: { role: "DIRECCION" } } }, select: { type: true, idea: { select: { folio: true } } } }),
    prisma.ideaSupportRequest.findMany({ where: { status: { in: ["PENDING", "MORE_INFO"] }, assignedTo: { is: { role: "DIRECCION" } } }, select: { idea: { select: { folio: true } }, orgUnit: { select: { code: true } } } }),
    prisma.kaizenProject.findMany({ where: { status: { notIn: ["COMPLETADO", "CANCELADO"] }, leader: { is: { role: "DIRECCION" } } }, select: { folio: true, status: true } }),
    prisma.kaizenActivity.findMany({ where: { status: { notIn: ["COMPLETADA", "CANCELADA", "COMBINADA"] }, owner: { is: { role: "DIRECCION" } } }, select: { number: true, project: { select: { folio: true } } } }),
    prisma.kaizenTeamMember.findMany({ where: { user: { role: "DIRECCION" }, project: { status: { notIn: ["COMPLETADO", "CANCELADO"] } } }, select: { project: { select: { folio: true } }, user: { select: { name: true } } } }),
    prisma.genbaWalk.findMany({ where: { status: "ABIERTO", coordinator: { is: { role: "DIRECCION" } } }, select: { folio: true } }),
    prisma.genbaActivity.findMany({ where: { status: { notIn: ["COMPLETADA", "CANCELADA", "COMBINADA"] }, owner: { is: { role: "DIRECCION" } } }, select: { number: true, walk: { select: { folio: true } } } })
  ]);

  const roleCounts = users.reduce<Record<string, number>>((result, user) => {
    result[user.role] = (result[user.role] ?? 0) + 1;
    return result;
  }, {});
  const missingManagers = memberships
    .filter((membership) => !membership.managerMembershipId && membership.level < 6)
    .map((membership) => ({ name: membership.user.name, title: membership.title, unit: membership.orgUnit.code, level: membership.level }));
  const dnpRoutes = qrUnits.filter((unit) => unit.code.includes("DNP")).map((unit) => ({
    unit: unit.code,
    defaultReviewer: unit.escalationRules.find((rule) => rule.isDefault)?.reviewerMembership.user.name ?? null,
    routes: unit.escalationRules.length
  }));

  const failures = {
    duplicateEmails,
    cycles,
    crossPlantManagers,
    qrWithoutCaptureArea,
    noDefaultRoute,
    multipleDefaultRoutes,
    duplicateReviewerRoutes,
    invalidGeneratedReviewers,
    crossPlantRoutes,
    executiveAdmins,
    directorRoutes,
    directorRoutingUnits,
    directorCaptureAreas,
    directorMembershipCapabilities,
    directorFollowers,
    directorNotifications,
    executiveValidationIntegrity,
    directorIdeas,
    directorImplementations,
    directorApprovals,
    directorSupport,
    directorKaizenLeaders,
    directorKaizenActivities,
    directorKaizenTeams,
    directorGenbaCoordinators,
    directorGenbaActivities
  };
  const failureCount = Object.values(failures).reduce((sum, values) => sum + values.length, 0);
  console.log(JSON.stringify({
    ok: failureCount === 0,
    totals: { users: users.length, memberships: memberships.length, qrUnitsWithPeople: qrWithPeople.length, generatedRoutes: generatedRoutes.length, directors: directors.length, executiveValidations: executiveValidations.length },
    roleCounts,
    dnpRoutes,
    missingManagers,
    failures
  }, null, 2));
  if (failureCount) throw new Error(`La auditoria del organigrama encontro ${failureCount} fallas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

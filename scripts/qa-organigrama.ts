/** Audita la integridad de personas, jefaturas y rutas del organigrama. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [users, memberships, qrUnits, generatedRoutes] = await Promise.all([
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
        captureArea: true,
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
    })
  ]);

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
  const invalidGeneratedReviewers = generatedRoutes
    .filter((route) => !route.reviewerMembership.active || !route.reviewerMembership.user.active || !route.reviewerMembership.canReceiveIdeas)
    .map((route) => route.name);
  const crossPlantRoutes = generatedRoutes
    .filter((route) => route.orgUnit.plantId !== route.reviewerMembership.orgUnit.plantId)
    .map((route) => ({ route: route.name, unit: route.orgUnit.code, reviewerUnit: route.reviewerMembership.orgUnit.code }));
  const executiveAdmins = users.filter((user) => user.role === "ADMIN" && /director|gerente|comite/i.test(user.jobTitle ?? ""));
  const roleCounts = users.reduce<Record<string, number>>((result, user) => {
    result[user.role] = (result[user.role] ?? 0) + 1;
    return result;
  }, {});
  const missingManagers = memberships
    .filter((membership) => !membership.managerMembershipId && membership.level < 6)
    .map((membership) => ({ name: membership.user.name, title: membership.title, unit: membership.orgUnit.code, level: membership.level }));
  const dnpRoutes = qrUnits
    .filter((unit) => unit.code.includes("DNP"))
    .map((unit) => ({
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
    invalidGeneratedReviewers,
    crossPlantRoutes,
    executiveAdmins
  };
  const failureCount = Object.values(failures).reduce((sum, values) => sum + values.length, 0);
  console.log(JSON.stringify({
    ok: failureCount === 0,
    totals: {
      users: users.length,
      memberships: memberships.length,
      qrUnitsWithPeople: qrWithPeople.length,
      generatedRoutes: generatedRoutes.length
    },
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

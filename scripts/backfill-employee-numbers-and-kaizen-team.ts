import { PrismaClient } from "@prisma/client";
import { normalizeEmployeeNumber } from "../src/lib/employee-number";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

type IdentityRow = {
  kind: "user" | "participant";
  id: string;
  value: string;
  userId?: string | null;
};

async function main() {
  const [users, participants, projects] = await Promise.all([
    prisma.user.findMany({ where: { employeeNumber: { not: null } }, select: { id: true, name: true, employeeNumber: true, participant: { select: { id: true } } } }),
    prisma.participant.findMany({ where: { employeeNumber: { not: null } }, select: { id: true, name: true, employeeNumber: true, userId: true } }),
    prisma.kaizenProject.findMany({ select: { id: true, leaderId: true, activities: { where: { ownerId: { not: null } }, select: { ownerId: true } } } })
  ]);

  const rows: IdentityRow[] = [
    ...users.flatMap((user) => user.employeeNumber ? [{ kind: "user" as const, id: user.id, value: user.employeeNumber }] : []),
    ...participants.flatMap((participant) => participant.employeeNumber ? [{ kind: "participant" as const, id: participant.id, value: participant.employeeNumber, userId: participant.userId }] : [])
  ];
  const normalized = new Map<string, IdentityRow[]>();
  const skipped: IdentityRow[] = [];
  for (const row of rows) {
    try {
      const canonical = normalizeEmployeeNumber(row.value);
      if (!canonical) continue;
      const group = normalized.get(canonical) ?? [];
      group.push(row);
      normalized.set(canonical, group);
    } catch {
      skipped.push(row);
    }
  }

  const conflicts = [...normalized.entries()].filter(([, group]) => {
    const userRows = group.filter((row) => row.kind === "user");
    const participantRows = group.filter((row) => row.kind === "participant");
    if (userRows.length > 1 || participantRows.length > 1) return true;
    return Boolean(userRows[0] && participantRows[0]?.userId && participantRows[0].userId !== userRows[0].id);
  });

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    numericIdentities: rows.length - skipped.length,
    legacySkipped: skipped.length,
    conflicts: conflicts.map(([employeeNumber, group]) => ({ employeeNumber, rows: group })),
    kaizenProjects: projects.length
  }, null, 2));

  if (conflicts.length) {
    throw new Error("Hay colisiones de numero de empleado. Resuelvelas antes de aplicar la migracion.");
  }
  if (!apply) return;

  await prisma.$transaction(async (tx) => {
    for (const [employeeNumber, group] of normalized) {
      for (const row of group) {
        if (row.value === employeeNumber) continue;
        if (row.kind === "user") await tx.user.update({ where: { id: row.id }, data: { employeeNumber } });
        else await tx.participant.update({ where: { id: row.id }, data: { employeeNumber } });
      }
    }
    for (const project of projects) {
      await tx.kaizenTeamMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: project.leaderId } },
        update: { role: "Lider" },
        create: { projectId: project.id, userId: project.leaderId, role: "Lider" }
      });
      for (const ownerId of new Set(project.activities.map((activity) => activity.ownerId).filter((value): value is string => Boolean(value)))) {
        if (ownerId === project.leaderId) continue;
        await tx.kaizenTeamMember.upsert({
          where: { projectId_userId: { projectId: project.id, userId: ownerId } },
          update: {},
          create: { projectId: project.id, userId: ownerId, role: "Responsable de actividad" }
        });
      }
    }
  });
  console.log("Migracion aplicada correctamente.");
}

main().finally(() => prisma.$disconnect());

import { createKaizenFromIdea } from "../src/lib/kaizen-from-idea";
import { prisma } from "../src/lib/prisma";

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.startsWith("file:") && process.env.ALLOW_PRODUCTION_KAIZEN_BACKFILL !== "1") {
    throw new Error("Define ALLOW_PRODUCTION_KAIZEN_BACKFILL=1 para conciliar Kaizen en produccion.");
  }

  const fallbackLeader = await prisma.user.findFirst({
    where: { active: true, role: { in: ["MEJORA_CONTINUA", "ADMIN"] } },
    orderBy: { role: "desc" }
  });
  if (!fallbackLeader) throw new Error("No existe un usuario activo de Mejora Continua o Administrador.");

  const ideas = await prisma.idea.findMany({
    where: { classification: "KAIZEN", kaizenProject: { is: null } },
    orderBy: { createdAt: "asc" }
  });

  for (const idea of ideas) {
    const leaderId = idea.implementationOwnerId ?? fallbackLeader.id;
    const startDate = idea.createdAt;
    const proposedEnd = idea.dueDate ?? new Date(startDate.getTime() + 90 * 86_400_000);
    const project = await createKaizenFromIdea({
      ideaId: idea.id,
      leaderId,
      startDate,
      endDate: proposedEnd,
      createdById: fallbackLeader.id
    });
    await prisma.auditLog.create({
      data: {
        entity: "KaizenProject",
        entityId: project.id,
        action: "BACKFILLED_FROM_CLASSIFIED_IDEA",
        userId: fallbackLeader.id,
        details: JSON.stringify({ ideaId: idea.id, folio: project.folio })
      }
    });
  }

  console.log(`Ideas Kaizen conciliadas: ${ideas.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

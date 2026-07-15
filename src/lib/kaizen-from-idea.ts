import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CreateKaizenFromIdeaInput = {
  ideaId: string;
  leaderId: string;
  startDate: Date;
  endDate: Date;
  createdById: string;
  updateExisting?: boolean;
};

export async function createKaizenFromIdea(input: CreateKaizenFromIdeaInput) {
  const endDate = input.endDate < input.startDate ? new Date(input.startDate.getTime() + 30 * 86_400_000) : input.endDate;
  const idea = await prisma.idea.findUniqueOrThrow({
    where: { id: input.ideaId },
    include: { area: { include: { organizationUnit: { include: { plant: true } } } } }
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await prisma.kaizenProject.findUnique({ where: { sourceIdeaId: input.ideaId } });
    if (existing) {
      if (!input.updateExisting) return existing;
      return prisma.kaizenProject.update({
        where: { id: existing.id },
        data: { leaderId: input.leaderId, startDate: input.startDate, endDate }
      });
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const maximum = await tx.kaizenProject.aggregate({ _max: { number: true } });
        const number = (maximum._max.number ?? 0) + 1;
        return tx.kaizenProject.create({
          data: {
            number,
            folio: `KZN-${String(number).padStart(3, "0")}`,
            title: idea.problem,
            plant: idea.area.organizationUnit?.plant.name ?? null,
            area: `${idea.area.code} - ${idea.area.name}`,
            objective: idea.expectedBenefit,
            scope: idea.proposal,
            status: "PENDIENTE_CHARTER",
            startDate: input.startDate,
            endDate,
            leaderId: input.leaderId,
            createdById: input.createdById,
            sourceIdeaId: idea.id
          }
        });
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 2) throw error;
    }
  }

  throw new Error("No fue posible generar el consecutivo Kaizen.");
}

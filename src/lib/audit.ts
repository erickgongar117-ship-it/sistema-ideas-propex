import { prisma } from "@/lib/prisma";

export async function auditLog(input: {
  entity: string;
  entityId: string;
  action: string;
  userId?: string | null;
  details?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      userId: input.userId ?? null,
      details: JSON.stringify(input.details ?? {})
    }
  });
}

"use server";

import { randomUUID } from "crypto";
import { CoinSourceType, CoinTransactionType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getParticipantBalance,
  normalizeCoinAmount,
  upsertCoinTransaction
} from "@/lib/coins";
import { prisma } from "@/lib/prisma";

const financeRoles = ["ADMIN", "MEJORA_CONTINUA"] as const;

class InsufficientBalanceError extends Error {}
class DuplicateSourceAwardError extends Error {}
class AlreadyReversedError extends Error {}
class DuplicateNeedsReconciliationError extends Error {}
class DuplicateOrphanSourceError extends Error {}

async function serializableTransaction<T>(operation: (transaction: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Error("No fue posible conciliar el movimiento.");
}

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function financePath(params?: Record<string, string>) {
  const query = new URLSearchParams(params);
  return query.size ? `/probocacoins?${query.toString()}` : "/probocacoins";
}

function parseDate(formData: FormData) {
  const raw = textValue(formData, "occurredAt");
  if (!raw) return new Date();
  const parsed = new Date(`${raw}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function resolveLinkedSource(value: string) {
  if (!value) return null;
  const separator = value.indexOf(":");
  if (separator < 1) return null;
  const source = value.slice(0, separator);
  const sourceId = value.slice(separator + 1);
  if (!sourceId) return null;

  if (source === CoinSourceType.IDEA) {
    const idea = await prisma.idea.findUnique({ where: { id: sourceId }, select: { id: true, folio: true } });
    return idea ? { sourceType: CoinSourceType.IDEA, sourceId: idea.id, label: idea.folio } : null;
  }
  if (source === CoinSourceType.KAIZEN) {
    const project = await prisma.kaizenProject.findUnique({ where: { id: sourceId }, select: { id: true, folio: true } });
    return project ? { sourceType: CoinSourceType.KAIZEN, sourceId: project.id, label: project.folio } : null;
  }
  if (source === CoinSourceType.GENBA) {
    const walk = await prisma.genbaWalk.findUnique({ where: { id: sourceId }, select: { id: true, folio: true } });
    return walk ? { sourceType: CoinSourceType.GENBA, sourceId: walk.id, label: walk.folio } : null;
  }
  return null;
}

export async function createCoinTransactionAction(formData: FormData) {
  const user = await requireUser([...financeRoles]);
  const participantId = textValue(formData, "participantId");
  const requestedType = textValue(formData, "type");
  const description = textValue(formData, "description");
  const amount = Math.trunc(Number(textValue(formData, "amount")));
  const occurredAt = parseDate(formData);
  const linkedEntity = textValue(formData, "linkedEntity");
  const requestId = textValue(formData, "requestId");

  if (
    !participantId ||
    !description ||
    !occurredAt ||
    !Number.isFinite(amount) ||
    !amount ||
    (
      requestedType !== CoinTransactionType.AWARD &&
      requestedType !== CoinTransactionType.ADJUSTMENT &&
      requestedType !== CoinTransactionType.REDEMPTION
    )
  ) {
    redirect(financePath({ error: "movimiento" }));
  }

  if (requestedType !== CoinTransactionType.ADJUSTMENT && amount < 0) {
    redirect(financePath({ error: "cantidad" }));
  }
  if (requestedType !== CoinTransactionType.AWARD && linkedEntity) {
    redirect(financePath({ error: "origen_tipo" }));
  }

  const linkedSource = linkedEntity ? await resolveLinkedSource(linkedEntity) : null;
  if (linkedEntity && !linkedSource) redirect(financePath({ error: "origen" }));

  const participant = await prisma.participant.findFirst({
    where: { id: participantId, active: true },
    select: { id: true }
  });
  if (!participant) redirect(financePath({ error: "participante" }));

  const sourceType = linkedSource?.sourceType ?? CoinSourceType.MANUAL;
  const signedAmount = normalizeCoinAmount(requestedType, amount);

  try {
    await serializableTransaction(async (transaction) => {
      const currentBalance = await getParticipantBalance(participantId, transaction);
      if (currentBalance + signedAmount < 0) throw new InsufficientBalanceError();
      if (linkedSource && requestedType === CoinTransactionType.AWARD) {
        const existingAward = await transaction.coinTransaction.findFirst({
          where: {
            participantId,
            type: CoinTransactionType.AWARD,
            sourceType: linkedSource.sourceType,
            sourceId: linkedSource.sourceId
          },
          select: { id: true }
        });
        if (existingAward) throw new DuplicateSourceAwardError();
      }

      await upsertCoinTransaction({
        reference: linkedSource
          ? `linked:${linkedSource.sourceType}:${linkedSource.sourceId}:${participantId}`
          : `ledger:${/^[a-f0-9-]{36}$/i.test(requestId) ? requestId : randomUUID()}`,
        participantId,
        type: requestedType,
        sourceType,
        sourceId: linkedSource?.sourceId ?? null,
        amount: signedAmount,
        description: linkedSource ? `${description} - ${linkedSource.label}` : description,
        createdById: user.id,
        occurredAt
      }, transaction);
    });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      redirect(financePath({ error: "saldo", participant: participantId }));
    }
    if (error instanceof DuplicateSourceAwardError) {
      redirect(financePath({ error: "origen_duplicado", participant: participantId }));
    }
    throw error;
  }

  revalidatePath("/probocacoins");
  revalidatePath("/entrenamientos");
  revalidatePath("/dashboard");
  redirect(financePath({ success: "movimiento", participant: participantId }));
}

export async function reverseDuplicateCoinTransactionAction(formData: FormData) {
  const user = await requireUser(["ADMIN"]);
  const transactionId = textValue(formData, "transactionId");
  const reason = textValue(formData, "reason");
  const confirmation = textValue(formData, "confirmation").toUpperCase();
  if (!transactionId || reason.length < 5 || confirmation !== "DUPLICADO") {
    redirect(financePath({ error: "duplicado_datos" }));
  }

  let participantId = "";
  try {
    await serializableTransaction(async (transaction) => {
      const original = await transaction.coinTransaction.findUnique({
        where: { id: transactionId },
        include: { reversal: { select: { id: true } }, participant: { select: { id: true, name: true } } }
      });
      if (!original || original.reversalOfId || original.reversal || !original.amount || original.reference.includes(":reconcile:")) throw new AlreadyReversedError();
      participantId = original.participantId;
      const currentBalance = await getParticipantBalance(original.participantId, transaction);
      if (currentBalance - original.amount < 0) throw new InsufficientBalanceError();
      if (original.sourceType === CoinSourceType.IDEA) {
        if (!original.sourceId) throw new DuplicateOrphanSourceError();
        const [idea, sourceNet] = await Promise.all([
          transaction.idea.findUnique({ where: { id: original.sourceId }, select: { pointsAssigned: true } }),
          transaction.coinTransaction.aggregate({ where: { participantId: original.participantId, sourceType: CoinSourceType.IDEA, sourceId: original.sourceId }, _sum: { amount: true } })
        ]);
        if (!idea) throw new DuplicateOrphanSourceError();
        if ((sourceNet._sum.amount ?? 0) - original.amount !== idea.pointsAssigned) throw new DuplicateNeedsReconciliationError();
      }
      if (original.sourceType === CoinSourceType.TRAINING) {
        if (!original.sourceId) throw new DuplicateOrphanSourceError();
        const [enrollment, sourceNet] = await Promise.all([
          transaction.trainingEnrollment.findUnique({
            where: { sessionId_participantId: { sessionId: original.sourceId, participantId: original.participantId } },
            select: { coinsAwarded: true }
          }),
          transaction.coinTransaction.aggregate({ where: { participantId: original.participantId, sourceType: CoinSourceType.TRAINING, sourceId: original.sourceId }, _sum: { amount: true } })
        ]);
        if (!enrollment) throw new DuplicateOrphanSourceError();
        if ((sourceNet._sum.amount ?? 0) - original.amount !== enrollment.coinsAwarded) throw new DuplicateNeedsReconciliationError();
      }
      await transaction.coinTransaction.create({
        data: {
          reference: `reversal:${original.id}`,
          participantId: original.participantId,
          type: CoinTransactionType.ADJUSTMENT,
          sourceType: original.sourceType,
          sourceId: original.sourceId,
          amount: -original.amount,
          description: `Correccion de duplicado: ${original.description}`,
          correctionReason: reason,
          reversalOfId: original.id,
          createdById: user.id,
          occurredAt: new Date()
        }
      });
      await transaction.auditLog.create({
        data: { entity: "CoinTransaction", entityId: transactionId, action: "DUPLICATE_REVERSED", userId: user.id, details: JSON.stringify({ reason, amount: original.amount }) }
      });
    });
  } catch (error) {
    if (error instanceof AlreadyReversedError || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      redirect(financePath({ error: "duplicado_revertido" }));
    }
    if (error instanceof InsufficientBalanceError) redirect(financePath({ error: "duplicado_saldo", participant: participantId }));
    if (error instanceof DuplicateNeedsReconciliationError) redirect(financePath({ error: "duplicado_conciliacion", participant: participantId }));
    if (error instanceof DuplicateOrphanSourceError) redirect(financePath({ error: "duplicado_origen", participant: participantId }));
    throw error;
  }
  revalidatePath("/probocacoins");
  revalidatePath("/dashboard");
  revalidatePath("/ideas/repositorio");
  revalidatePath("/kaizen/repositorio");
  revalidatePath("/genba/repositorio");
  redirect(financePath({ success: "duplicado", ...(participantId ? { participant: participantId } : {}) }));
}

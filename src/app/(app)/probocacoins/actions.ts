"use server";

import { randomUUID } from "crypto";
import { CoinSourceType, CoinTransactionType } from "@prisma/client";
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
    await prisma.$transaction(async (transaction) => {
      const currentBalance = await getParticipantBalance(participantId, transaction);
      if (currentBalance + signedAmount < 0) throw new InsufficientBalanceError();

      await upsertCoinTransaction({
        reference: `ledger:${randomUUID()}`,
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
    throw error;
  }

  revalidatePath("/probocacoins");
  revalidatePath("/entrenamientos");
  revalidatePath("/dashboard");
  redirect(financePath({ success: "movimiento", participant: participantId }));
}

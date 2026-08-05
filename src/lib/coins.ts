import "server-only";

import {
  CoinSourceType,
  CoinTransactionType,
  Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CoinDatabase = Pick<
  Prisma.TransactionClient,
  "coinTransaction" | "participant" | "user"
>;

export type CollaboratorParticipantInput = {
  name: string;
  employeeNumber?: string | null;
  email?: string | null;
  jobTitle?: string | null;
  orgUnitId?: string | null;
};

export type CoinTransactionInput = {
  reference: string;
  participantId: string;
  type: CoinTransactionType;
  sourceType: CoinSourceType;
  sourceId?: string | null;
  amount: number;
  description: string;
  createdById?: string | null;
  occurredAt?: Date;
};

function optionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

function normalizedEmail(value: string | null | undefined) {
  return optionalText(value)?.toLowerCase() ?? null;
}

export function normalizeCoinAmount(type: CoinTransactionType, amount: number) {
  if (!Number.isFinite(amount)) throw new Error("La cantidad de ProbocaCoins no es valida.");
  const integerAmount = Math.trunc(amount);
  if (!integerAmount) throw new Error("La cantidad de ProbocaCoins debe ser distinta de cero.");
  if (type === CoinTransactionType.AWARD) return Math.abs(integerAmount);
  if (type === CoinTransactionType.REDEMPTION) return -Math.abs(integerAmount);
  return integerAmount;
}

export async function resolveParticipantFromUser(
  userId: string,
  database: CoinDatabase = prisma
) {
  const user = await database.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      employeeNumber: true,
      jobTitle: true,
      orgMemberships: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 1,
        select: { orgUnitId: true }
      }
    }
  });

  if (!user) throw new Error("No se encontro el usuario seleccionado.");

  const participantData = {
    name: user.name.trim(),
    email: normalizedEmail(user.email),
    employeeNumber: optionalText(user.employeeNumber),
    jobTitle: optionalText(user.jobTitle),
    orgUnitId: user.orgMemberships[0]?.orgUnitId ?? null,
    active: true
  };
  const linkedParticipant = await database.participant.findUnique({ where: { userId: user.id } });

  if (linkedParticipant) {
    return database.participant.update({
      where: { id: linkedParticipant.id },
      data: {
        ...participantData,
        employeeNumber: participantData.employeeNumber ?? linkedParticipant.employeeNumber,
        jobTitle: participantData.jobTitle ?? linkedParticipant.jobTitle,
        orgUnitId: participantData.orgUnitId ?? linkedParticipant.orgUnitId
      }
    });
  }

  const identityFilters: Prisma.ParticipantWhereInput[] = [];
  if (participantData.employeeNumber) identityFilters.push({ employeeNumber: participantData.employeeNumber });
  if (participantData.email) identityFilters.push({ email: participantData.email });

  const reusableParticipant = identityFilters.length
    ? await database.participant.findFirst({
        where: { userId: null, OR: identityFilters },
        orderBy: { createdAt: "asc" }
      })
    : null;

  if (reusableParticipant) {
    return database.participant.update({
      where: { id: reusableParticipant.id },
      data: {
        ...participantData,
        employeeNumber: participantData.employeeNumber ?? reusableParticipant.employeeNumber,
        jobTitle: participantData.jobTitle ?? reusableParticipant.jobTitle,
        orgUnitId: participantData.orgUnitId ?? reusableParticipant.orgUnitId,
        userId: user.id
      }
    });
  }

  return database.participant.create({
    data: { ...participantData, userId: user.id }
  });
}

export async function resolveParticipantFromCollaborator(
  input: CollaboratorParticipantInput,
  database: CoinDatabase = prisma
) {
  const name = input.name.trim();
  if (!name) throw new Error("Escribe el nombre de la persona.");

  const employeeNumber = optionalText(input.employeeNumber);
  const email = normalizedEmail(input.email);
  const jobTitle = optionalText(input.jobTitle);
  const orgUnitId = optionalText(input.orgUnitId);

  const existing = employeeNumber
    ? await database.participant.findUnique({ where: { employeeNumber } })
    : email
      ? await database.participant.findFirst({ where: { email }, orderBy: { createdAt: "asc" } })
      : null;

  if (existing) {
    return database.participant.update({
      where: { id: existing.id },
      data: {
        name,
        employeeNumber: employeeNumber ?? existing.employeeNumber,
        email: email ?? existing.email,
        jobTitle: jobTitle ?? existing.jobTitle,
        orgUnitId: orgUnitId ?? existing.orgUnitId,
        active: true
      }
    });
  }

  return database.participant.create({
    data: { name, employeeNumber, email, jobTitle, orgUnitId }
  });
}

export async function upsertCoinTransaction(
  input: CoinTransactionInput,
  database: CoinDatabase = prisma
) {
  const reference = input.reference.trim();
  const description = input.description.trim();
  if (!reference) throw new Error("La referencia del movimiento es obligatoria.");
  if (!description) throw new Error("La descripcion del movimiento es obligatoria.");

  const amount = normalizeCoinAmount(input.type, input.amount);
  const participant = await database.participant.findUnique({
    where: { id: input.participantId },
    select: { id: true }
  });
  if (!participant) throw new Error("No se encontro la persona para este movimiento.");

  const existing = await database.coinTransaction.findUnique({ where: { reference } });
  if (existing && existing.participantId !== input.participantId) {
    throw new Error("La referencia ya pertenece a otra persona.");
  }

  if (existing) {
    return database.coinTransaction.update({
      where: { id: existing.id },
      data: {
        type: input.type,
        sourceType: input.sourceType,
        sourceId: optionalText(input.sourceId),
        amount,
        description,
        createdById: input.createdById === undefined ? existing.createdById : input.createdById,
        occurredAt: input.occurredAt ?? existing.occurredAt
      }
    });
  }

  return database.coinTransaction.create({
    data: {
      reference,
      participantId: input.participantId,
      type: input.type,
      sourceType: input.sourceType,
      sourceId: optionalText(input.sourceId),
      amount,
      description,
      createdById: input.createdById ?? null,
      occurredAt: input.occurredAt ?? new Date()
    }
  });
}

export async function getParticipantBalance(
  participantId: string,
  database: CoinDatabase = prisma
) {
  const result = await database.coinTransaction.aggregate({
    where: { participantId },
    _sum: { amount: true }
  });
  return result._sum.amount ?? 0;
}

export async function getParticipantBalances(participantIds?: string[]) {
  if (participantIds && participantIds.length === 0) return new Map<string, number>();
  const grouped = await prisma.coinTransaction.groupBy({
    by: ["participantId"],
    where: participantIds ? { participantId: { in: participantIds } } : undefined,
    _sum: { amount: true }
  });
  return new Map(grouped.map((row) => [row.participantId, row._sum.amount ?? 0]));
}

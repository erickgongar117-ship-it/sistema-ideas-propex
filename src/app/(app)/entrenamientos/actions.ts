"use server";

import {
  ParticipantEmailStatus,
  PayrollFrequency,
  Prisma,
  TrainingEnrollmentStatus
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { EmployeeNumberValidationError } from "@/lib/employee-number";
import {
  resolveParticipantFromCollaborator,
  resolveParticipantFromUser,
  upsertCoinTransaction
} from "@/lib/coins";
import { prisma } from "@/lib/prisma";

const trainingRoles = ["ADMIN", "MEJORA_CONTINUA"] as const;

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalValue(formData: FormData, key: string) {
  return textValue(formData, key) || null;
}

function enumValue<T extends string>(formData: FormData, key: string, values: readonly T[]) {
  const value = textValue(formData, key) as T;
  return values.includes(value) ? value : undefined;
}

function integerValue(formData: FormData, key: string) {
  const value = Number(textValue(formData, key));
  return Number.isFinite(value) ? Math.trunc(value) : Number.NaN;
}

function dateValue(formData: FormData, key: string) {
  const raw = textValue(formData, key);
  const value = raw ? new Date(`${raw}T12:00:00`) : new Date(Number.NaN);
  return Number.isNaN(value.getTime()) ? null : value;
}

function trainingPath(params?: Record<string, string>) {
  const query = new URLSearchParams(params);
  return query.size ? `/entrenamientos?${query.toString()}` : "/entrenamientos";
}

function refreshTraining() {
  revalidatePath("/entrenamientos");
  revalidatePath("/probocacoins");
}

function uniqueValues(formData: FormData, key: string, limit = 2_000) {
  return [...new Set(formData.getAll(key).map(String).map((value) => value.trim()).filter(Boolean))].slice(0, limit);
}

export async function createTrainingProgramAction(formData: FormData) {
  const user = await requireUser([...trainingRoles]);
  const name = textValue(formData, "name");
  const description = optionalValue(formData, "description");
  const coinValue = integerValue(formData, "coinValue");

  if (!name || !Number.isInteger(coinValue) || coinValue <= 0) {
    redirect(trainingPath({ error: "programa" }));
  }

  try {
    await prisma.trainingProgram.create({
      data: { name, description, coinValue, createdById: user.id }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(trainingPath({ error: "programa_duplicado" }));
    }
    throw error;
  }

  refreshTraining();
  redirect(trainingPath({ success: "programa" }));
}

export async function updateTrainingProgramAction(formData: FormData) {
  await requireUser([...trainingRoles]);
  const programId = textValue(formData, "programId");
  const name = textValue(formData, "name");
  const description = optionalValue(formData, "description");
  const coinValue = integerValue(formData, "coinValue");
  const returnPath = {
    view: "directory",
    directory: "programs"
  };

  if (!programId || !name || !Number.isInteger(coinValue) || coinValue <= 0) {
    redirect(trainingPath({ ...returnPath, error: "programa" }));
  }

  try {
    const result = await prisma.trainingProgram.updateMany({
      where: { id: programId },
      data: { name, description, coinValue }
    });
    if (!result.count) redirect(trainingPath({ ...returnPath, error: "programa" }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(trainingPath({ ...returnPath, error: "programa_duplicado" }));
    }
    throw error;
  }

  refreshTraining();
  redirect(trainingPath({ ...returnPath, success: "programa_actualizado" }));
}

export async function toggleTrainingProgramAction(formData: FormData) {
  await requireUser([...trainingRoles]);
  const programId = textValue(formData, "programId");
  const active = textValue(formData, "active") === "true";
  if (!programId) redirect(trainingPath({ error: "programa" }));

  await prisma.trainingProgram.update({ where: { id: programId }, data: { active } });
  refreshTraining();
  redirect(trainingPath({ success: active ? "programa_activado" : "programa_pausado" }));
}

export async function createTrainingSessionAction(formData: FormData) {
  const user = await requireUser([...trainingRoles]);
  const programId = textValue(formData, "programId");
  const sessionDate = dateValue(formData, "sessionDate");
  const trainerName = optionalValue(formData, "trainerName");
  const notes = optionalValue(formData, "notes");
  const requestedPlantId = optionalValue(formData, "plantId");
  const orgUnitId = optionalValue(formData, "orgUnitId");

  if (!programId || !sessionDate) redirect(trainingPath({ error: "sesion" }));

  const [program, orgUnit] = await Promise.all([
    prisma.trainingProgram.findUnique({ where: { id: programId }, select: { id: true, active: true } }),
    orgUnitId
      ? prisma.orgUnit.findUnique({ where: { id: orgUnitId }, select: { id: true, plantId: true, active: true } })
      : null
  ]);

  if (!program?.active || (orgUnitId && !orgUnit?.active)) {
    redirect(trainingPath({ error: "sesion" }));
  }

  const plantId = orgUnit?.plantId ?? requestedPlantId;
  if (orgUnit && requestedPlantId && requestedPlantId !== orgUnit.plantId) {
    redirect(trainingPath({ error: "planta_area" }));
  }

  const session = await prisma.trainingSession.create({
    data: {
      programId,
      plantId,
      orgUnitId,
      sessionDate,
      trainerName,
      notes,
      createdById: user.id
    }
  });

  refreshTraining();
  redirect(trainingPath({ success: "sesion", session: session.id }));
}

export async function createParticipantAction(formData: FormData) {
  await requireUser([...trainingRoles]);
  const userId = optionalValue(formData, "userId");
  const payrollFrequency = enumValue(formData, "payrollFrequency", Object.values(PayrollFrequency));
  const requestedEmailStatus = enumValue(formData, "emailStatus", Object.values(ParticipantEmailStatus));
  const emailStatus = payrollFrequency === PayrollFrequency.WEEKLY
    ? ParticipantEmailStatus.NOT_APPLICABLE
    : requestedEmailStatus;

  try {
    let participant = userId
      ? await resolveParticipantFromUser(userId)
      : await resolveParticipantFromCollaborator({
          name: textValue(formData, "name"),
          employeeNumber: optionalValue(formData, "employeeNumber"),
          email: optionalValue(formData, "email"),
          jobTitle: optionalValue(formData, "jobTitle"),
          orgUnitId: optionalValue(formData, "orgUnitId"),
          payrollFrequency,
          emailStatus
        });

    if (userId && (payrollFrequency || emailStatus)) {
      participant = await prisma.participant.update({
        where: { id: participant.id },
        data: { payrollFrequency, emailStatus }
      });
    }

    refreshTraining();
    redirect(trainingPath({ success: "participante", participant: participant.id }));
  } catch (error) {
    if (error instanceof EmployeeNumberValidationError) {
      redirect(trainingPath({ error: "empleado_formato" }));
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(trainingPath({ error: "participante_duplicado" }));
    }
    throw error;
  }
}

export async function enrollParticipantAction(formData: FormData) {
  await requireUser([...trainingRoles]);
  const sessionId = textValue(formData, "sessionId");
  const participantId = textValue(formData, "participantId");
  if (!sessionId || !participantId) redirect(trainingPath({ error: "inscripcion" }));

  const [session, participant, current] = await Promise.all([
    prisma.trainingSession.findUnique({ where: { id: sessionId }, select: { id: true } }),
    prisma.participant.findFirst({ where: { id: participantId, active: true }, select: { id: true } }),
    prisma.trainingEnrollment.findUnique({
      where: { sessionId_participantId: { sessionId, participantId } }
    })
  ]);

  if (!session || !participant) redirect(trainingPath({ error: "inscripcion" }));
  if (current?.status === TrainingEnrollmentStatus.COMPLETED) {
    redirect(trainingPath({ error: "ya_completado", session: sessionId }));
  }

  if (current) {
    await prisma.trainingEnrollment.update({
      where: { id: current.id },
      data: { status: TrainingEnrollmentStatus.REGISTERED, completedAt: null, coinsAwarded: 0 }
    });
  } else {
    await prisma.trainingEnrollment.create({ data: { sessionId, participantId } });
  }

  refreshTraining();
  redirect(trainingPath({ success: "inscripcion", session: sessionId }));
}

export async function bulkEnrollParticipantsAction(formData: FormData) {
  await requireUser([...trainingRoles]);
  const sessionId = textValue(formData, "sessionId");
  const requestedIds = uniqueValues(formData, "participantIds");
  if (!sessionId || !requestedIds.length) redirect(trainingPath({ error: "inscripcion" }));

  const [session, activeParticipants, currentEnrollments] = await Promise.all([
    prisma.trainingSession.findUnique({ where: { id: sessionId }, select: { id: true } }),
    prisma.participant.findMany({ where: { id: { in: requestedIds }, active: true }, select: { id: true } }),
    prisma.trainingEnrollment.findMany({
      where: { sessionId, participantId: { in: requestedIds } },
      select: { id: true, participantId: true, status: true }
    })
  ]);
  if (!session) redirect(trainingPath({ error: "inscripcion" }));

  const activeIds = new Set(activeParticipants.map((participant) => participant.id));
  const currentByParticipant = new Map(currentEnrollments.map((enrollment) => [enrollment.participantId, enrollment]));
  const eligibleIds = requestedIds.filter((id) => activeIds.has(id) && currentByParticipant.get(id)?.status !== TrainingEnrollmentStatus.COMPLETED);
  const newIds = eligibleIds.filter((id) => !currentByParticipant.has(id));
  const cancelledIds = eligibleIds.filter((id) => currentByParticipant.get(id)?.status === TrainingEnrollmentStatus.CANCELLED);

  await prisma.$transaction(async (transaction) => {
    if (cancelledIds.length) {
      await transaction.trainingEnrollment.updateMany({
        where: { sessionId, participantId: { in: cancelledIds }, status: TrainingEnrollmentStatus.CANCELLED },
        data: { status: TrainingEnrollmentStatus.REGISTERED, completedAt: null, coinsAwarded: 0 }
      });
    }
    if (newIds.length) {
      await transaction.trainingEnrollment.createMany({
        data: newIds.map((participantId) => ({ sessionId, participantId }))
      });
    }
  });

  const enrolledCount = newIds.length + cancelledIds.length;
  refreshTraining();
  redirect(trainingPath({ success: "inscripciones", count: String(enrolledCount), session: sessionId }));
}

export async function bulkUpdateTrainingEnrollmentsAction(formData: FormData) {
  const user = await requireUser([...trainingRoles]);
  const sessionId = textValue(formData, "sessionId");
  const requestedStatus = textValue(formData, "status");
  const scope = textValue(formData, "scope");
  const enrollmentIds = uniqueValues(formData, "enrollmentIds");
  if (
    !sessionId ||
    (requestedStatus !== TrainingEnrollmentStatus.COMPLETED && requestedStatus !== TrainingEnrollmentStatus.CANCELLED) ||
    (scope !== "all" && !enrollmentIds.length)
  ) {
    redirect(trainingPath({ error: "estado", session: sessionId }));
  }

  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    include: { program: { select: { name: true, coinValue: true } } }
  });
  if (!session) redirect(trainingPath({ error: "estado" }));

  const pending = await prisma.trainingEnrollment.findMany({
    where: {
      sessionId,
      status: TrainingEnrollmentStatus.REGISTERED,
      ...(scope === "all" ? {} : { id: { in: enrollmentIds } })
    },
    include: { participant: { select: { id: true, name: true } } }
  });
  if (!pending.length) redirect(trainingPath({ error: "sin_pendientes", session: sessionId }));
  let processedCount = pending.length;

  if (requestedStatus === TrainingEnrollmentStatus.CANCELLED) {
    const result = await prisma.trainingEnrollment.updateMany({
      where: { id: { in: pending.map((enrollment) => enrollment.id) }, status: TrainingEnrollmentStatus.REGISTERED },
      data: { status: TrainingEnrollmentStatus.CANCELLED, coinsAwarded: 0, completedAt: null }
    });
    processedCount = result.count;
  } else {
    const completedAt = new Date();
    const enrollmentIdsToComplete = pending.map((enrollment) => enrollment.id);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        processedCount = await prisma.$transaction(async (transaction) => {
          const stillPending = await transaction.trainingEnrollment.findMany({
            where: { id: { in: enrollmentIdsToComplete }, status: TrainingEnrollmentStatus.REGISTERED },
            include: { participant: { select: { name: true } } }
          });
          if (!stillPending.length) return 0;

          const references = stillPending.map((enrollment) => `training:${enrollment.id}`);
          const existing = await transaction.coinTransaction.findMany({
            where: { reference: { in: references } },
            select: { reference: true }
          });
          const existingReferences = new Set(existing.map((item) => item.reference));
          const newTransactions = stillPending
            .filter((enrollment) => !existingReferences.has(`training:${enrollment.id}`))
            .map((enrollment) => ({
              reference: `training:${enrollment.id}`,
              participantId: enrollment.participantId,
              type: "AWARD" as const,
              sourceType: "TRAINING" as const,
              sourceId: session.id,
              amount: session.program.coinValue,
              description: `${session.program.name} completado por ${enrollment.participant.name}`,
              createdById: user.id,
              occurredAt: completedAt
            }));
          if (newTransactions.length) await transaction.coinTransaction.createMany({ data: newTransactions });
          const result = await transaction.trainingEnrollment.updateMany({
            where: { id: { in: stillPending.map((enrollment) => enrollment.id) }, status: TrainingEnrollmentStatus.REGISTERED },
            data: {
              status: TrainingEnrollmentStatus.COMPLETED,
              coinsAwarded: session.program.coinValue,
              completedAt
            }
          });
          return result.count;
        });
        break;
      } catch (error) {
        const isConcurrentDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!isConcurrentDuplicate || attempt === 2) throw error;
      }
    }
  }

  refreshTraining();
  redirect(trainingPath({
    success: requestedStatus === TrainingEnrollmentStatus.COMPLETED ? "completados" : "cancelados",
    count: String(processedCount),
    session: sessionId
  }));
}

export async function updateParticipantActiveAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const participantId = textValue(formData, "participantId");
  const active = textValue(formData, "active") === "true";
  const participant = await prisma.participant.findUnique({ where: { id: participantId }, select: { id: true, userId: true } });
  if (!participant) redirect(trainingPath({ error: "participante" }));
  if (participant.userId) redirect(trainingPath({ error: "cuenta_vinculada", participant: participant.id }));
  await prisma.participant.update({ where: { id: participant.id }, data: { active } });
  refreshTraining();
  redirect(trainingPath({ success: active ? "participante_activado" : "participante_retirado", peopleStatus: active ? "active" : "inactive" }));
}

export async function deleteInactiveParticipantAction(formData: FormData) {
  await requireUser(["ADMIN"]);
  const participantId = textValue(formData, "participantId");
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, active: false, userId: null },
    include: { _count: { select: { ideas: true, enrollments: true, coinTransactions: true } } }
  });
  if (!participant) redirect(trainingPath({ error: "participante" }));
  const hasHistory = participant._count.ideas + participant._count.enrollments + participant._count.coinTransactions > 0;
  if (hasHistory) redirect(trainingPath({ error: "participante_historial", participant: participant.id, peopleStatus: "inactive" }));
  await prisma.participant.delete({ where: { id: participant.id } });
  refreshTraining();
  redirect(trainingPath({ success: "participante_eliminado", peopleStatus: "inactive" }));
}

export async function updateTrainingEnrollmentStatusAction(formData: FormData) {
  const user = await requireUser([...trainingRoles]);
  const enrollmentId = textValue(formData, "enrollmentId");
  const requestedStatus = textValue(formData, "status");
  if (
    !enrollmentId ||
    (requestedStatus !== TrainingEnrollmentStatus.COMPLETED && requestedStatus !== TrainingEnrollmentStatus.CANCELLED)
  ) {
    redirect(trainingPath({ error: "estado" }));
  }

  const current = await prisma.trainingEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, sessionId: true, status: true }
  });
  if (!current) redirect(trainingPath({ error: "estado" }));
  if (requestedStatus === TrainingEnrollmentStatus.CANCELLED && current.status === TrainingEnrollmentStatus.COMPLETED) {
    redirect(trainingPath({ error: "completado_no_cancelable", session: current.sessionId }));
  }

  if (requestedStatus === TrainingEnrollmentStatus.CANCELLED) {
    await prisma.trainingEnrollment.update({
      where: { id: enrollmentId },
      data: { status: TrainingEnrollmentStatus.CANCELLED, coinsAwarded: 0, completedAt: null }
    });
  } else {
    await prisma.$transaction(async (transaction) => {
      const enrollment = await transaction.trainingEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          participant: { select: { id: true, name: true } },
          session: { include: { program: true } }
        }
      });
      if (!enrollment) throw new Error("No se encontro la inscripcion.");

      const completedAt = enrollment.completedAt ?? new Date();
      const coinsAwarded = enrollment.coinsAwarded > 0
        ? enrollment.coinsAwarded
        : enrollment.session.program.coinValue;

      await upsertCoinTransaction({
        reference: `training:${enrollment.id}`,
        participantId: enrollment.participantId,
        type: "AWARD",
        sourceType: "TRAINING",
        sourceId: enrollment.sessionId,
        amount: coinsAwarded,
        description: `${enrollment.session.program.name} completado por ${enrollment.participant.name}`,
        createdById: user.id,
        occurredAt: completedAt
      }, transaction);

      await transaction.trainingEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: TrainingEnrollmentStatus.COMPLETED,
          coinsAwarded,
          completedAt
        }
      });
    });
  }

  refreshTraining();
  redirect(trainingPath({
    success: requestedStatus === TrainingEnrollmentStatus.COMPLETED ? "completado" : "cancelado",
    session: current.sessionId
  }));
}

"use server";

import { Prisma, TrainingEnrollmentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
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

  try {
    const participant = userId
      ? await resolveParticipantFromUser(userId)
      : await resolveParticipantFromCollaborator({
          name: textValue(formData, "name"),
          employeeNumber: optionalValue(formData, "employeeNumber"),
          email: optionalValue(formData, "email"),
          jobTitle: optionalValue(formData, "jobTitle"),
          orgUnitId: optionalValue(formData, "orgUnitId")
        });

    refreshTraining();
    redirect(trainingPath({ success: "participante", participant: participant.id }));
  } catch (error) {
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

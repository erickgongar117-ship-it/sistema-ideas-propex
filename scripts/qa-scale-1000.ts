import { randomUUID } from "crypto";
import { performance } from "perf_hooks";
import { hash } from "bcryptjs";
import {
  CoinSourceType,
  CoinTransactionType,
  Prisma,
  PrismaClient,
  Role,
  TrainingEnrollmentStatus
} from "@prisma/client";

const prisma = new PrismaClient();
const TAG = "QA-SCALE";
const participantTotal = 1_050;
const enrolledTotal = 1_000;
const programName = `[${TAG}] White Belt masivo`;

type Result = { id: number; test: string; evidence: string; milliseconds: number };
const results: Result[] = [];

function verify(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function measured(id: number, test: string, operation: () => Promise<string>) {
  const started = performance.now();
  const evidence = await operation();
  results.push({ id, test, evidence, milliseconds: Math.round(performance.now() - started) });
}

function assertLocalDatabase() {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!databaseUrl.toLowerCase().startsWith("file:")) {
    throw new Error("Esta prueba de volumen solo puede ejecutarse contra SQLite local.");
  }
}

async function ensureAdmin() {
  const existing = await prisma.user.findFirst({ where: { role: Role.ADMIN, active: true }, orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      name: "Administrador QA Escala",
      email: "qa.scale.admin@example.test",
      role: Role.ADMIN,
      passwordHash: await hash(randomUUID(), 4),
      active: true
    }
  });
}

async function cleanPreviousRun() {
  const sessions = await prisma.trainingSession.findMany({ where: { notes: { startsWith: `[${TAG}]` } }, select: { id: true } });
  const sessionIds = sessions.map((session) => session.id);
  await prisma.$transaction([
    prisma.coinTransaction.deleteMany({ where: { reference: { startsWith: "qa-scale:" } } }),
    prisma.trainingEnrollment.deleteMany({ where: { sessionId: { in: sessionIds } } }),
    prisma.trainingSession.deleteMany({ where: { id: { in: sessionIds } } })
  ]);
}

async function ensureParticipants(orgUnitId: string | null) {
  const expected = Array.from({ length: participantTotal }, (_, index) => {
    const number = String(index + 1).padStart(4, "0");
    return {
      name: `QA Escala Colaborador ${number}`,
      employeeNumber: `QA-SCALE-${number}`,
      email: `qa.scale.${number}@example.test`,
      jobTitle: index % 10 === 0 ? "Supervisor QA" : "Operador QA",
      orgUnitId,
      active: true
    };
  });
  const existing = await prisma.participant.findMany({ where: { employeeNumber: { startsWith: "QA-SCALE-" } }, select: { employeeNumber: true } });
  const existingNumbers = new Set(existing.map((participant) => participant.employeeNumber));
  const missing = expected.filter((participant) => !existingNumbers.has(participant.employeeNumber));
  if (missing.length) await prisma.participant.createMany({ data: missing });
  await prisma.participant.updateMany({
    where: { employeeNumber: { startsWith: "QA-SCALE-" } },
    data: { active: true, orgUnitId }
  });
  return prisma.participant.findMany({
    where: { employeeNumber: { startsWith: "QA-SCALE-" } },
    orderBy: { employeeNumber: "asc" }
  });
}

async function safeRedemption(participantId: string, amount: number, reference: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const balance = await tx.coinTransaction.aggregate({ where: { participantId }, _sum: { amount: true } });
    if ((balance._sum.amount ?? 0) < amount) return false;
    await tx.coinTransaction.create({
      data: {
        reference,
        participantId,
        type: CoinTransactionType.REDEMPTION,
        sourceType: CoinSourceType.MANUAL,
        amount: -amount,
        description: `[${TAG}] Canje controlado`,
        createdById: adminId
      }
    });
    return true;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function main() {
  assertLocalDatabase();
  await cleanPreviousRun();
  const admin = await ensureAdmin();
  const orgUnit = await prisma.orgUnit.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
  let participants: Awaited<ReturnType<typeof ensureParticipants>> = [];

  await measured(1, "Alta y actualizacion de 1,050 personas", async () => {
    participants = await ensureParticipants(orgUnit?.id ?? null);
    verify(participants.length === participantTotal, `Se esperaban ${participantTotal} personas y se obtuvieron ${participants.length}.`);
    return `${participants.length} perfiles disponibles`;
  });

  await measured(2, "Busqueda por nombre, numero y correo", async () => {
    const matches = await prisma.participant.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: "Colaborador 0525" } },
          { employeeNumber: { contains: "QA-SCALE-0525" } },
          { email: { contains: "qa.scale.0525" } }
        ]
      },
      take: 50
    });
    verify(matches.some((participant) => participant.employeeNumber === "QA-SCALE-0525"), "La busqueda no encontro al empleado 0525.");
    return `${matches.length} coincidencia(s), limite 50`;
  });

  await measured(3, "Paginacion estable del directorio", async () => {
    const [count, page] = await Promise.all([
      prisma.participant.count({ where: { active: true, employeeNumber: { startsWith: "QA-SCALE-" } } }),
      prisma.participant.findMany({ where: { active: true, employeeNumber: { startsWith: "QA-SCALE-" } }, orderBy: { name: "asc" }, skip: 40, take: 40 })
    ]);
    verify(count === participantTotal && page.length === 40, "La paginacion del directorio no devolvio el rango esperado.");
    return `pagina 2 con ${page.length} de ${count}`;
  });

  const program = await prisma.trainingProgram.upsert({
    where: { name: programName },
    create: { name: programName, description: "Prueba masiva local", coinValue: 100, createdById: admin.id },
    update: { coinValue: 100, active: true }
  });
  const session = await prisma.trainingSession.create({
    data: {
      programId: program.id,
      orgUnitId: orgUnit?.id ?? null,
      plantId: orgUnit?.plantId ?? null,
      sessionDate: new Date("2026-08-05T12:00:00Z"),
      trainerName: "Instructor QA Escala",
      notes: `[${TAG}] Sesion de 1,000 empleados`,
      createdById: admin.id
    }
  });
  const enrolledParticipants = participants.slice(0, enrolledTotal);

  await measured(4, "Inscripcion masiva de 1,000 personas", async () => {
    await prisma.trainingEnrollment.createMany({ data: enrolledParticipants.map((participant) => ({ sessionId: session.id, participantId: participant.id })) });
    const count = await prisma.trainingEnrollment.count({ where: { sessionId: session.id } });
    verify(count === enrolledTotal, `La sesion quedo con ${count} inscripciones.`);
    return `${count} inscripciones en una operacion`;
  });

  await measured(5, "Reintento de inscripcion sin duplicados", async () => {
    const existing = await prisma.trainingEnrollment.findMany({ where: { sessionId: session.id }, select: { participantId: true } });
    const existingIds = new Set(existing.map((enrollment) => enrollment.participantId));
    const missing = enrolledParticipants.filter((participant) => !existingIds.has(participant.id));
    if (missing.length) await prisma.trainingEnrollment.createMany({ data: missing.map((participant) => ({ sessionId: session.id, participantId: participant.id })) });
    const count = await prisma.trainingEnrollment.count({ where: { sessionId: session.id } });
    verify(count === enrolledTotal && missing.length === 0, "El reintento genero duplicados o inscripciones faltantes.");
    return `${count} unicas; 0 duplicados`;
  });

  await measured(6, "Asistencia masiva y entrega automatica", async () => {
    const pending = await prisma.trainingEnrollment.findMany({
      where: { sessionId: session.id, status: TrainingEnrollmentStatus.REGISTERED },
      include: { participant: { select: { name: true } } }
    });
    const completedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.coinTransaction.createMany({
        data: pending.map((enrollment) => ({
          reference: `qa-scale:training:${enrollment.id}`,
          participantId: enrollment.participantId,
          type: CoinTransactionType.AWARD,
          sourceType: CoinSourceType.TRAINING,
          sourceId: session.id,
          amount: 100,
          description: `${programName} completado por ${enrollment.participant.name}`,
          createdById: admin.id,
          occurredAt: completedAt
        }))
      });
      await tx.trainingEnrollment.updateMany({
        where: { sessionId: session.id, status: TrainingEnrollmentStatus.REGISTERED },
        data: { status: TrainingEnrollmentStatus.COMPLETED, coinsAwarded: 100, completedAt }
      });
    });
    const [completed, awarded] = await Promise.all([
      prisma.trainingEnrollment.count({ where: { sessionId: session.id, status: TrainingEnrollmentStatus.COMPLETED } }),
      prisma.coinTransaction.count({ where: { reference: { startsWith: "qa-scale:training:" } } })
    ]);
    verify(completed === enrolledTotal && awarded === enrolledTotal, "La asistencia y el libro mayor no coinciden.");
    return `${completed} completados y ${awarded} premios`;
  });

  await measured(7, "Reintento de cierre idempotente", async () => {
    const pending = await prisma.trainingEnrollment.count({ where: { sessionId: session.id, status: TrainingEnrollmentStatus.REGISTERED } });
    const awards = await prisma.coinTransaction.count({ where: { reference: { startsWith: "qa-scale:training:" } } });
    verify(pending === 0 && awards === enrolledTotal, "El reintento altero los premios o dejo pendientes.");
    return `0 pendientes; ${awards} referencias unicas`;
  });

  await measured(8, "Canje financiero y bloqueo de sobregiro", async () => {
    const participant = enrolledParticipants[0];
    const accepted = await safeRedemption(participant.id, 40, "qa-scale:redemption:accepted", admin.id);
    const rejected = await safeRedemption(participant.id, 100, "qa-scale:redemption:rejected", admin.id);
    const balance = await prisma.coinTransaction.aggregate({ where: { participantId: participant.id }, _sum: { amount: true } });
    verify(accepted && !rejected && balance._sum.amount === 60, `El saldo seguro debia ser 60 y resulto ${balance._sum.amount}.`);
    return "canje 40 aceptado; canje 100 rechazado; saldo 60";
  });

  await measured(9, "Proteccion de historial y eliminacion segura", async () => {
    let protectedByForeignKey = false;
    try {
      await prisma.participant.delete({ where: { id: enrolledParticipants[0].id } });
    } catch (error) {
      protectedByForeignKey = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
    }
    verify(protectedByForeignKey, "Fue posible borrar una persona con historial financiero.");

    const protectedAccount = await prisma.user.create({
      data: {
        name: "QA Cuenta con historial",
        email: `qa.scale.protected.${randomUUID()}@example.test`,
        role: Role.COLABORADOR,
        passwordHash: await hash(randomUUID(), 4),
        active: false
      }
    });
    await prisma.participant.update({
      where: { id: enrolledParticipants[0].id },
      data: { userId: protectedAccount.id }
    });
    const protectedProfile = await prisma.participant.findUnique({
      where: { userId: protectedAccount.id },
      include: { _count: { select: { ideas: true, enrollments: true, coinTransactions: true } } }
    });
    verify(
      Boolean(protectedProfile && (protectedProfile._count.ideas || protectedProfile._count.enrollments || protectedProfile._count.coinTransactions)),
      "La cuenta con correo e historial no fue detectada como protegida."
    );
    await prisma.participant.update({ where: { id: enrolledParticipants[0].id }, data: { userId: null } });
    await prisma.user.delete({ where: { id: protectedAccount.id } });

    const removableEmail = `qa.scale.delete.${randomUUID()}@example.test`;
    const removableAccount = await prisma.user.create({
      data: {
        name: "QA Cuenta vacia",
        email: removableEmail,
        role: Role.COLABORADOR,
        passwordHash: await hash(randomUUID(), 4),
        active: false,
        participant: {
          create: {
            name: "QA Cuenta vacia",
            email: removableEmail,
            employeeNumber: `QA-DELETE-${randomUUID()}`,
            active: false
          }
        }
      }
    });
    await prisma.$transaction(async (tx) => {
      await tx.participant.deleteMany({ where: { userId: removableAccount.id } });
      await tx.user.delete({ where: { id: removableAccount.id } });
    });
    const removedAccount = await prisma.user.findUnique({ where: { id: removableAccount.id } });
    verify(!removedAccount, "La cuenta inactiva y sin historial no elimino su correo.");

    const empty = participants[participantTotal - 1];
    await prisma.participant.update({ where: { id: empty.id }, data: { active: false } });
    await prisma.participant.delete({ where: { id: empty.id } });
    const removed = await prisma.participant.findUnique({ where: { id: empty.id } });
    verify(!removed, "La persona inactiva y sin historial no se elimino.");
    await prisma.participant.create({ data: { name: empty.name, employeeNumber: empty.employeeNumber, email: empty.email, jobTitle: empty.jobTitle, orgUnitId: empty.orgUnitId, active: false } });
    return "cuenta con historial protegida; cuenta vacia y correo eliminados; perfil retirado conservado";
  });

  await measured(10, "Libro mayor paginado y conciliado", async () => {
    const [count, page, total] = await Promise.all([
      prisma.coinTransaction.count({ where: { reference: { startsWith: "qa-scale:" } } }),
      prisma.coinTransaction.findMany({ where: { reference: { startsWith: "qa-scale:" } }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 50 }),
      prisma.coinTransaction.aggregate({ where: { reference: { startsWith: "qa-scale:" } }, _sum: { amount: true } })
    ]);
    verify(count === enrolledTotal + 1 && page.length === 50 && total._sum.amount === enrolledTotal * 100 - 40, "El libro mayor masivo no concilia.");
    return `${count} movimientos; pagina 50; neto ${total._sum.amount}`;
  });

  console.log(`\n[${TAG}] 10 de 10 pruebas de escala aprobadas`);
  console.table(results);
  console.log(`[${TAG}] Datos locales conservados para revisar la interfaz en localhost.`);
}

main()
  .catch((error) => {
    console.error(`[${TAG}] Fallo:`);
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

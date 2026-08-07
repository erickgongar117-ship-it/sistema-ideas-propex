import { randomUUID } from "crypto";
import { CoinSourceType, CoinTransactionType, Prisma, PrismaClient } from "@prisma/client";
import { normalizeEmployeeNumber } from "../src/lib/employee-number";
import { kaizenClosureReadiness } from "../src/lib/kaizen-closure";

const prisma = new PrismaClient();
const results: string[] = [];

function verify(condition: unknown, name: string) {
  if (!condition) throw new Error(`Fallo: ${name}`);
  results.push(name);
}

function rejectsEmployeeNumber(value: string) {
  try {
    normalizeEmployeeNumber(value);
    return false;
  } catch {
    return true;
  }
}

async function main() {
  verify(normalizeEmployeeNumber("123") === "00123", "01 normaliza 123 a 00123");
  verify(normalizeEmployeeNumber(" 00123 ") === "00123", "02 conserva el canon de cinco digitos");
  verify(rejectsEmployeeNumber("12A3"), "03 rechaza caracteres no numericos");
  verify(rejectsEmployeeNumber("00000") && rejectsEmployeeNumber("123456"), "04 rechaza cero y mas de cinco digitos");

  verify(!kaizenClosureReadiness({ activities: [{ status: "COMPLETADA", evidenceCount: 1 }], hasCharter: false, teamCount: 1 }).ready, "05 bloquea cierre sin Charter");
  verify(!kaizenClosureReadiness({ activities: [{ status: "CANCELADA", evidenceCount: 0 }], hasCharter: true, teamCount: 1 }).ready, "06 bloquea cierre con todas las actividades canceladas");
  verify(!kaizenClosureReadiness({ activities: [{ status: "COMPLETADA", evidenceCount: 0 }], hasCharter: true, teamCount: 1 }).ready, "07 bloquea resultado sin evidencia");
  verify(kaizenClosureReadiness({ activities: [{ status: "COMPLETADA", evidenceCount: 1 }, { status: "CANCELADA", evidenceCount: 0 }], hasCharter: true, teamCount: 2 }).ready, "08 permite expediente completo");

  const missingLeaders = await prisma.kaizenProject.count({ where: { teamMembers: { none: { role: "Lider" } } } });
  verify(missingLeaders === 0, "09 todos los Kaizen tienen lider en el equipo");

  const token = randomUUID();
  const participant = await prisma.participant.create({ data: { name: `[QA ledger ${token}]` } });
  const original = await prisma.coinTransaction.create({
    data: {
      reference: `qa-original:${token}`,
      participantId: participant.id,
      type: CoinTransactionType.AWARD,
      sourceType: CoinSourceType.MANUAL,
      amount: 100,
      description: "Movimiento QA para reversa"
    }
  });
  const reversal = await prisma.coinTransaction.create({
    data: {
      reference: `reversal:${original.id}`,
      participantId: participant.id,
      type: CoinTransactionType.ADJUSTMENT,
      sourceType: CoinSourceType.MANUAL,
      amount: -100,
      description: "Correccion QA",
      correctionReason: "Prueba automatizada",
      reversalOfId: original.id
    }
  });
  const net = await prisma.coinTransaction.aggregate({ where: { participantId: participant.id }, _sum: { amount: true } });
  let duplicateBlocked = false;
  try {
    await prisma.coinTransaction.create({
      data: {
        reference: `qa-second-reversal:${token}`,
        participantId: participant.id,
        type: CoinTransactionType.ADJUSTMENT,
        sourceType: CoinSourceType.MANUAL,
        amount: -100,
        description: "Segunda correccion QA",
        reversalOfId: original.id
      }
    });
  } catch (error) {
    duplicateBlocked = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
  await prisma.coinTransaction.delete({ where: { id: reversal.id } });
  await prisma.coinTransaction.delete({ where: { id: original.id } });
  await prisma.participant.delete({ where: { id: participant.id } });
  verify((net._sum.amount ?? 0) === 0 && duplicateBlocked, "10 la reversa deja neto cero y solo puede publicarse una vez");

  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
}

main().finally(() => prisma.$disconnect());

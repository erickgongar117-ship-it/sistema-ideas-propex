/**
 * Une dos registros de participante que resultaron ser la misma persona.
 *
 * Por que existe: los documentos fuente escriben los nombres como cada quien los capturo.
 * "Azaret Molina Vargas" en el listado de White Belt y "Iztlazitlalin Azaret Molina Vargas"
 * en el de TWI son la misma persona, pero como la carga conserva los nombres al pie de la
 * letra —que es lo que se pidio— quedaron como dos participantes. Unirlos automaticamente
 * por parecido seria adivinar; unirlos cuando alguien lo confirma es corregir.
 *
 * Lo que hace: mueve al registro que se conserva todo lo que colgaba del duplicado
 * —inscripciones y movimientos de ProbocaCoins— y despues lo elimina. Si la persona estaba
 * inscrita en la misma sesion por ambos registros, se queda una sola inscripcion.
 *
 * Uso:  pnpm exec tsx scripts/unir-participantes.ts "<nombre que se conserva>" "<duplicado>"
 *       pnpm exec tsx scripts/unir-participantes.ts "<conserva>" "<duplicado>" --aplicar
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");
const [nombreConservar, nombreDuplicado] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));

async function buscar(nombre: string) {
  const encontrados = await prisma.participant.findMany({
    where: { name: nombre },
    select: {
      id: true, name: true, employeeNumber: true, jobTitle: true, email: true, userId: true, orgUnitId: true,
      enrollments: { select: { id: true, sessionId: true, status: true, session: { select: { program: { select: { name: true } } } } } },
      _count: { select: { coinTransactions: true } }
    }
  });
  if (!encontrados.length) throw new Error(`No hay ningun participante llamado "${nombre}".`);
  if (encontrados.length > 1) throw new Error(`Hay ${encontrados.length} participantes llamados "${nombre}". Desambigua antes de unir.`);
  return encontrados[0];
}

async function main() {
  if (!nombreConservar || !nombreDuplicado) {
    throw new Error('Uso: pnpm exec tsx scripts/unir-participantes.ts "<nombre que se conserva>" "<duplicado>" [--aplicar]');
  }
  if (nombreConservar === nombreDuplicado) throw new Error("Los dos nombres son iguales.");

  const conservar = await buscar(nombreConservar);
  const duplicado = await buscar(nombreDuplicado);

  const cursos = (p: typeof conservar) => [...new Set(p.enrollments.map((e) => e.session.program.name))];
  console.log(`Se conserva:  ${conservar.name}`);
  console.log(`   cursos: ${cursos(conservar).join(", ") || "(ninguno)"} · monedas: ${conservar._count.coinTransactions}`);
  console.log(`   numero de empleado: ${conservar.employeeNumber ?? "(vacio)"} · puesto: ${conservar.jobTitle ?? "(vacio)"}`);
  console.log(`Se elimina:   ${duplicado.name}`);
  console.log(`   cursos: ${cursos(duplicado).join(", ") || "(ninguno)"} · monedas: ${duplicado._count.coinTransactions}`);
  console.log(`   numero de empleado: ${duplicado.employeeNumber ?? "(vacio)"} · puesto: ${duplicado.jobTitle ?? "(vacio)"}`);

  const sesionesConservadas = new Set(conservar.enrollments.map((e) => e.sessionId));
  const aMover = duplicado.enrollments.filter((e) => !sesionesConservadas.has(e.sessionId));
  const repetidas = duplicado.enrollments.length - aMover.length;
  console.log(`\ninscripciones a mover: ${aMover.length}${repetidas ? ` · ${repetidas} ya existian en el registro que se conserva` : ""}`);
  aMover.forEach((e) => console.log(`   ${e.session.program.name}`));

  if (!aplicar) {
    console.log("\nSimulacion. Vuelve a correr con --aplicar para escribir los cambios.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const inscripcion of aMover) {
      await tx.trainingEnrollment.update({ where: { id: inscripcion.id }, data: { participantId: conservar.id } });
    }
    await tx.coinTransaction.updateMany({ where: { participantId: duplicado.id }, data: { participantId: conservar.id } });
    // Se completa lo que el registro conservado tenga vacio; nunca se pisa un dato suyo.
    await tx.participant.update({
      where: { id: conservar.id },
      data: {
        employeeNumber: conservar.employeeNumber ?? duplicado.employeeNumber ?? undefined,
        jobTitle: conservar.jobTitle ?? duplicado.jobTitle ?? undefined,
        email: conservar.email ?? duplicado.email ?? undefined,
        userId: conservar.userId ?? duplicado.userId ?? undefined,
        orgUnitId: conservar.orgUnitId ?? duplicado.orgUnitId ?? undefined
      }
    });
    await tx.participant.delete({ where: { id: duplicado.id } });
    await tx.auditLog.create({
      data: {
        entity: "Participant",
        entityId: conservar.id,
        action: "PARTICIPANT_MERGED",
        details: JSON.stringify({ conservado: conservar.name, eliminado: duplicado.name, inscripcionesMovidas: aMover.length, inscripcionesRepetidas: repetidas })
      }
    });
  });

  const final = await buscar(nombreConservar);
  console.log(`\n${final.name} queda en: ${cursos(final).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

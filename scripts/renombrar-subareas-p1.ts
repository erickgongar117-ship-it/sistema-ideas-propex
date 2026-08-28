/**
 * Alinea los codigos de las tres lineas de P1 con los de la semilla.
 *
 * Por que existe: las sub-areas se crearon con scripts/cargar-subareas-p1.ts usando
 * APO-P1-MUS / APO-P1-PYM1 / APO-P1-PYM2, y en paralelo la semilla de src/lib/organization.ts
 * quedo escrita con APO-P1-MUSLO / APO-P1-PYM-L1 / APO-P1-PYM-L2. Dos juegos de codigos para
 * las mismas tres lineas: en una base nueva se crearian seis sub-areas y seis QR, porque la
 * semilla no reconoceria como suyas a las que ya existen.
 *
 * Se elige el juego de la semilla, no el del script, por dos razones que decidio el usuario:
 * se lee mejor en el QR —/captura/P1-MUSLO en vez de /captura/APO-P1-MUS— y asi no hay que
 * editar el archivo que el otro frente tiene sin terminar.
 *
 * Renombrar es seguro aqui porque las tres areas tienen cero ideas capturadas: nadie ha
 * escaneado esos QR todavia y ningun folio quedaria apuntando a un codigo que ya no existe.
 * El script lo verifica antes de tocar nada y aborta si encuentra capturas.
 *
 * Es idempotente: si ya estan renombradas, no hace nada.
 *
 * Uso:  node node_modules/tsx/dist/cli.mjs scripts/renombrar-subareas-p1.ts            reporta
 *       node node_modules/tsx/dist/cli.mjs scripts/renombrar-subareas-p1.ts --aplicar  renombra
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");

const RENOMBRES = [
  { unidadVieja: "APO-P1-MUS", unidadNueva: "APO-P1-MUSLO", areaVieja: "APO-P1-MUS", areaNueva: "P1-MUSLO" },
  { unidadVieja: "APO-P1-PYM1", unidadNueva: "APO-P1-PYM-L1", areaVieja: "APO-P1-PYM1", areaNueva: "P1-PYM-L1" },
  { unidadVieja: "APO-P1-PYM2", unidadNueva: "APO-P1-PYM-L2", areaVieja: "APO-P1-PYM2", areaNueva: "P1-PYM-L2" }
];

async function main() {
  console.log(aplicar ? "APLICANDO\n" : "SIMULACION\n");
  let pendientes = 0;

  for (const paso of RENOMBRES) {
    const unidad = await prisma.orgUnit.findFirst({ where: { code: paso.unidadVieja }, select: { id: true, name: true } });
    const yaEsta = await prisma.orgUnit.findFirst({ where: { code: paso.unidadNueva }, select: { id: true } });

    if (!unidad && yaEsta) {
      console.log(`  [hecho     ] ${paso.unidadNueva} ya tiene el codigo nuevo`);
      continue;
    }
    if (!unidad) {
      console.log(`  [falta     ] no existe ${paso.unidadVieja} ni ${paso.unidadNueva}`);
      continue;
    }
    if (yaEsta) {
      // Las dos a la vez: alguien corrio la semilla en una base que ya tenia las mias.
      console.log(`  [CONFLICTO ] existen ${paso.unidadVieja} y ${paso.unidadNueva} al mismo tiempo. Hay que unirlas a mano.`);
      continue;
    }

    const area = await prisma.area.findUnique({
      where: { code: paso.areaVieja },
      select: { id: true, _count: { select: { ideas: true } } }
    });
    if (area?._count.ideas) {
      throw new Error(`${paso.areaVieja} ya tiene ${area._count.ideas} ideas capturadas. Renombrar dejaria folios apuntando a un codigo inexistente; se aborta.`);
    }

    console.log(`  [renombra  ] ${paso.unidadVieja} -> ${paso.unidadNueva}   ·   QR /captura/${paso.areaVieja} -> /captura/${paso.areaNueva}`);
    pendientes += 1;
    if (!aplicar) continue;

    await prisma.$transaction(async (tx) => {
      if (area) await tx.area.update({ where: { id: area.id }, data: { code: paso.areaNueva } });
      await tx.orgUnit.update({ where: { id: unidad.id }, data: { code: paso.unidadNueva } });
      await tx.auditLog.create({
        data: {
          entity: "OrgUnit",
          entityId: unidad.id,
          action: "ORG_UNIT_RECODED",
          details: JSON.stringify({ de: paso.unidadVieja, a: paso.unidadNueva, areaDe: paso.areaVieja, areaA: paso.areaNueva, motivo: "alinear con la semilla de organization.ts" })
        }
      });
    });
  }

  if (!aplicar) {
    console.log(pendientes ? "\nSimulacion. Vuelve a correr con --aplicar para renombrar." : "\nNo hay nada que renombrar.");
    return;
  }

  console.log("\nEstado de P1:");
  const hijos = await prisma.orgUnit.findMany({
    where: { parent: { code: "APO-P1" } },
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, qrEnabled: true, captureArea: { select: { code: true } } }
  });
  for (const hijo of hijos) console.log(`  ${hijo.code.padEnd(15)} ${hijo.name.padEnd(18)} QR ${hijo.qrEnabled ? "si" : "no"} · /captura/${hijo.captureArea?.code ?? "—"}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

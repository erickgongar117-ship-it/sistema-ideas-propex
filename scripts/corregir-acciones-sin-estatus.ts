/**
 * Cierra sin ejecutar las acciones Kaizen que el Excel dejo sin estatus.
 *
 * Por que existe: en el plan de accion, una casilla de Estatus vacia no es un hueco de
 * captura. Son las acciones que el equipo decidio no seguir porque no aportaban al
 * proceso, y que por acuerdo quedan fuera del calculo de avance. El importador las hacia
 * caer en PENDIENTE por descarte, asi que arrastraban el porcentaje hacia abajo y
 * aparecian como vencidas: el proyecto #21 marcaba 71% estando terminado.
 *
 * El importador ya quedo corregido para las proximas corridas, pero su `upsert` usa
 * `update: {}` a proposito —para no pisar lo que alguien edite en la aplicacion—, asi que
 * las acciones ya importadas no se enteran. Este script las alcanza una sola vez.
 *
 * Solo toca acciones que siguen en PENDIENTE. Si alguien ya la movio a mano desde la
 * aplicacion, la respeta y lo reporta.
 *
 * Uso:  pnpm exec tsx scripts/corregir-acciones-sin-estatus.ts <libro.xlsx>
 *       pnpm exec tsx scripts/corregir-acciones-sin-estatus.ts <libro.xlsx> --aplicar
 */
import { PrismaClient, type WorkItemStatus } from "@prisma/client";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");
const ruta = process.argv[2];

const SIN_SEGUIMIENTO = "Sin seguimiento: no aporta al proceso, cerrada sin ejecutar.";

function texto(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const rich = value as { richText?: Array<{ text?: string }>; result?: unknown; text?: string };
    if (Array.isArray(rich.richText)) return rich.richText.map((part) => part.text ?? "").join("").trim();
    if (rich.result != null) return String(rich.result).trim();
    if (rich.text != null) return String(rich.text).trim();
    return "";
  }
  return String(value).trim();
}

/**
 * Recorre el plan igual que el importador: los bloques abren con "KAIZEN #0NN - ..." y la
 * posicion de cada accion dentro de su bloque es el `number` con el que quedo guardada.
 */
function accionesSinEstatus(sheet: ExcelJS.Worksheet) {
  const objetivo: Array<{ proyecto: number; numero: number; accion: string }> = [];
  let proyecto: number | null = null;
  let indice = 0;
  for (let fila = 1; fila <= sheet.rowCount; fila += 1) {
    const row = sheet.getRow(fila);
    const encabezado = texto(row.getCell(1).value).match(/kaizen\s*#\s*0*(\d+)\s*-/i);
    if (encabezado && proyecto !== Number(encabezado[1])) {
      proyecto = Number(encabezado[1]);
      indice = 0;
    }
    if (proyecto == null) continue;
    const numero = texto(row.getCell(2).value);
    const problema = texto(row.getCell(3).value);
    const accion = texto(row.getCell(4).value);
    if (!/^\d+$/.test(numero) || (!problema && !accion)) continue;
    indice += 1;
    if (!texto(row.getCell(7).value)) objetivo.push({ proyecto, numero: indice, accion: (accion || problema).slice(0, 60) });
  }
  return objetivo;
}

async function main() {
  if (!ruta) throw new Error("Uso: pnpm exec tsx scripts/corregir-acciones-sin-estatus.ts <libro.xlsx> [--aplicar]");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(ruta);
  // Misma eleccion de hoja que hace el importador: la visible gana.
  const candidatas = workbook.worksheets.filter((item) => item.name.toLowerCase().startsWith("plan de acci"));
  const sheet = [...candidatas].reverse().find((item) => item.state === "visible") ?? candidatas[candidatas.length - 1];
  if (!sheet) throw new Error("No se encontro la hoja del plan de accion.");

  const objetivo = accionesSinEstatus(sheet);
  console.log(`Acciones sin estatus en "${sheet.name}": ${objetivo.length}`);

  const proyectos = await prisma.kaizenProject.findMany({
    where: { number: { in: [...new Set(objetivo.map((o) => o.proyecto))] } },
    select: { id: true, number: true, title: true }
  });
  const porNumero = new Map(proyectos.map((p) => [p.number, p]));

  let corregidas = 0;
  let yaCerradas = 0;
  let tocadasAMano = 0;
  let sinPar = 0;
  const afectados = new Set<number>();

  for (const item of objetivo) {
    const proyecto = porNumero.get(item.proyecto);
    if (!proyecto) { sinPar += 1; continue; }
    const actividad = await prisma.kaizenActivity.findUnique({
      where: { projectId_number: { projectId: proyecto.id, number: item.numero } },
      select: { id: true, status: true }
    });
    if (!actividad) { sinPar += 1; continue; }
    if (actividad.status === "CANCELADA") { yaCerradas += 1; continue; }
    if (actividad.status !== "PENDIENTE") {
      tocadasAMano += 1;
      console.log(`  respeta  #${item.proyecto} accion ${item.numero}: ya esta en ${actividad.status}`);
      continue;
    }
    corregidas += 1;
    afectados.add(item.proyecto);
    if (aplicar) {
      await prisma.kaizenActivity.update({
        where: { id: actividad.id },
        data: { status: "CANCELADA" as WorkItemStatus, cancellationReason: SIN_SEGUIMIENTO }
      });
    }
  }

  console.log(`\n  a cerrar sin ejecutar .... ${corregidas}`);
  console.log(`  ya estaban cerradas ...... ${yaCerradas}`);
  console.log(`  movidas a mano, respetadas ${tocadasAMano}`);
  console.log(`  sin pareja en la base .... ${sinPar}`);

  if (afectados.size) {
    console.log(`\nAvance de los proyectos afectados:`);
    for (const numero of [...afectados].sort((a, b) => a - b)) {
      const proyecto = porNumero.get(numero)!;
      const items = await prisma.kaizenActivity.findMany({ where: { projectId: proyecto.id }, select: { status: true } });
      const vigentes = items.filter((i) => i.status !== "COMBINADA");
      const cerradas = vigentes.filter((i) => i.status === "COMPLETADA" || i.status === "CANCELADA").length;
      const antes = Math.round((vigentes.filter((i) => i.status === "COMPLETADA").length / vigentes.length) * 100);
      const ahora = Math.round((cerradas / vigentes.length) * 100);
      console.log(`  #${String(numero).padStart(2)} ${String(proyecto.title).slice(0, 34).padEnd(34)} ${antes}% -> ${ahora}%`);
    }
  }

  if (!aplicar) console.log("\nSimulacion. Vuelve a correr con --aplicar para escribir los cambios.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

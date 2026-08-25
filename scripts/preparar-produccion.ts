/**
 * Deja produccion lista para operar: quita el piloto y conserva la estructura.
 *
 * Por que existe: produccion se uso durante agosto para probar el sistema, y quedaron
 * capturas de ensayo mezcladas con la estructura real. Antes de subir los datos oficiales
 * hay que retirarlas, o el primer folio real seria IM-000004 y los tableros abririan con
 * proyectos llamados "erick", "CR7" y "juanito".
 *
 * Lo que quita, confirmado con el usuario:
 *   - Las 3 ideas del piloto con sus validaciones, comentarios y seguidores.
 *   - Los 3 Kaizen de prueba con sus actividades.
 *   - El programa "white belt" en minusculas y los dos de pruebas automatizadas.
 *   - Los participantes que solo existian para esas pruebas.
 *   - Todos los movimientos de ProbocaCoins del piloto.
 *   - Usuarios y datos marcados [QA/E2E].
 *
 * Lo que NO toca:
 *   - La estructura organizacional: plantas, unidades, areas de captura y sus rutas.
 *   - La planta Torre San Jeronimo, que el usuario confirmo como sede real.
 *   - Los usuarios de la estructura, que sostienen el enrutamiento de los QR.
 *   - La bitacora de auditoria: es el registro de lo que paso y no se borra.
 *
 * Uso:  pnpm exec tsx scripts/preparar-produccion.ts            reporta
 *       pnpm exec tsx scripts/preparar-produccion.ts --aplicar  borra
 *
 * La conexion sale de DATABASE_URL. Para apuntar a produccion hay que exportarla desde
 * .env.local, porque .env apunta a la base local de SQLite.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");

const paso = (etiqueta: string, cantidad: number) => console.log(`  ${String(cantidad).padStart(5)}  ${etiqueta}`);

async function main() {
  console.log(aplicar ? "APLICANDO SOBRE PRODUCCION\n" : "SIMULACION SOBRE PRODUCCION\n");

  const plantas = await prisma.plant.count();
  const unidades = await prisma.orgUnit.count();
  const areas = await prisma.area.count();
  console.log(`Estructura que se conserva: ${plantas} plantas · ${unidades} unidades · ${areas} areas de captura`);
  if (!plantas || !unidades) throw new Error("No se encontro la estructura organizacional. Se aborta.");

  console.log("\nA quitar:");
  paso("ideas del piloto", await prisma.idea.count());
  paso("proyectos Kaizen", await prisma.kaizenProject.count());
  paso("recorridos GENBA", await prisma.genbaWalk.count());
  paso("programas de entrenamiento", await prisma.trainingProgram.count());
  paso("participantes", await prisma.participant.count());
  paso("movimientos de ProbocaCoins", await prisma.coinTransaction.count());
  paso("usuarios [QA/E2E]", await prisma.user.count({ where: { name: { contains: "[QA/E2E]" } } }));
  console.log(`\nSe conservan ${await prisma.auditLog.count()} registros de auditoria: son el rastro de lo que paso.`);

  if (!aplicar) {
    console.log("\nSimulacion. Vuelve a correr con --aplicar para borrar.");
    return;
  }

  const borrado: Record<string, number> = {};
  // Orden de dependencia: primero lo que cuelga de otra cosa.
  borrado["movimientos de ProbocaCoins"] = (await prisma.coinTransaction.deleteMany({})).count;
  borrado["ideas"] = (await prisma.idea.deleteMany({})).count;
  borrado["proyectos Kaizen"] = (await prisma.kaizenProject.deleteMany({})).count;
  borrado["recorridos GENBA"] = (await prisma.genbaWalk.deleteMany({})).count;
  borrado["programas de entrenamiento"] = (await prisma.trainingProgram.deleteMany({})).count;
  borrado["participantes"] = (await prisma.participant.deleteMany({})).count;
  borrado["usuarios [QA/E2E]"] = (await prisma.user.deleteMany({ where: { name: { contains: "[QA/E2E]" } } })).count;

  console.log("\nBorrado:");
  Object.entries(borrado).forEach(([k, v]) => paso(k, v));

  console.log("\nEstado:");
  paso("plantas", await prisma.plant.count());
  paso("unidades organizacionales", await prisma.orgUnit.count());
  paso("areas de captura", await prisma.area.count());
  paso("rutas de escalamiento", await prisma.orgEscalationRule.count());
  paso("usuarios", await prisma.user.count());
  paso("ideas", await prisma.idea.count());
  paso("registros de auditoria", await prisma.auditLog.count());
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

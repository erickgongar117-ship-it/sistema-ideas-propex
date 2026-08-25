/**
 * Deja en la base unicamente los datos reales cargados de los archivos del usuario.
 *
 * Por que existe: durante el desarrollo se acumularon tres capas de datos falsos que hoy
 * conviven con los reales y ensucian todo tablero: la siembra de ejemplos, las plantas y
 * personas de las pruebas automatizadas, y una prueba de volumen con mil participantes que
 * dejo 206 mil ProbocaCoins repartidas. Con Kaizen, GENBA y Entrenamientos ya cargados de
 * los archivos oficiales, esa capa dejo de tener sentido.
 *
 * Lo que quita:
 *   - Plantas [QA/E2E] con sus unidades, areas, membresias y rutas de escalamiento.
 *   - Usuarios [QA/E2E].
 *   - Todas las ideas: ocho sembradas y una de tecleo de prueba, confirmado con el usuario.
 *   - Programas de entrenamiento de prueba, incluido "WB", que fue una corrida de volumen.
 *   - Participantes de la prueba de escala y sus ProbocaCoins.
 *
 * Lo que NO toca, por decision explicita del usuario:
 *   - Los 40 Kaizen, 51 GENBA y los dos cursos del documento.
 *   - Los ~100 usuarios que la importacion de GENBA creo con los nombres de los
 *     responsables: son quienes responden por 62 hallazgos y borrarlos perderia ese
 *     vinculo, que no se recupera.
 *   - Los 17 usuarios que representan puestos y no personas —Supervisor P1 a P9, Calidad,
 *     Mantenimiento, Seguridad, Mejora Continua—: sostienen el enrutamiento de los QR y
 *     son el coordinador de los 51 recorridos.
 *
 * Uso:  pnpm exec tsx scripts/limpiar-datos-de-prueba.ts            reporta
 *       pnpm exec tsx scripts/limpiar-datos-de-prueba.ts --aplicar  borra
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");

/** Programas que no salieron de un archivo oficial. "WB" fue la prueba de volumen. */
const PROGRAMAS_DE_PRUEBA = ["WB", "[QA/E2E-08] White Belt", "[QA/E2E-08] Training Within Industry (TWI)", "[QA-SCALE] White Belt masivo"];
const PROGRAMAS_REALES = ["White Belt 2026", "TWI Certificación 2026"];

const paso = (etiqueta: string, cantidad: number) => console.log(`  ${String(cantidad).padStart(5)}  ${etiqueta}`);

async function main() {
  console.log(aplicar ? "APLICANDO\n" : "SIMULACION\n");

  // Guarda: si lo real no esta donde se espera, algo cambio y no se borra nada.
  const kaizen = await prisma.kaizenProject.count({ where: { folio: { startsWith: "XLS-" } } });
  const genba = await prisma.genbaWalk.count({ where: { folio: { startsWith: "XLS-GENBA" } } });
  const cursos = await prisma.trainingProgram.count({ where: { name: { in: PROGRAMAS_REALES } } });
  console.log(`Datos reales presentes: ${kaizen} Kaizen · ${genba} GENBA · ${cursos} cursos del documento`);
  if (!kaizen || !genba || cursos !== PROGRAMAS_REALES.length) {
    throw new Error("No se encontraron los datos reales esperados. Se aborta para no borrar sobre una base equivocada.");
  }

  console.log("\nA quitar:");
  const plantasQa = await prisma.plant.findMany({ where: { code: { startsWith: "QA-E2E" } }, select: { id: true, code: true } });
  paso("plantas [QA/E2E]", plantasQa.length);
  paso("  unidades organizacionales dentro", await prisma.orgUnit.count({ where: { plantId: { in: plantasQa.map((p) => p.id) } } }));
  paso("  areas de captura dentro", await prisma.area.count({ where: { organizationUnit: { plantId: { in: plantasQa.map((p) => p.id) } } } }));

  const usuariosQa = await prisma.user.count({ where: { name: { contains: "[QA/E2E]" } } });
  paso("usuarios [QA/E2E]", usuariosQa);

  const ideas = await prisma.idea.count();
  // Son 16: las nueve que el usuario confirmo borrar mas siete de las pruebas
  // automatizadas. Ninguna salio de un QR real, asi que se van todas.
  paso("ideas (9 sembradas o de tecleo + 7 de QA)", ideas);

  const programas = await prisma.trainingProgram.findMany({ where: { name: { in: PROGRAMAS_DE_PRUEBA } }, select: { id: true, name: true, sessions: { select: { _count: { select: { enrollments: true } } } } } });
  for (const g of programas) paso(`programa "${g.name}"`, g.sessions.reduce((s, y) => s + y._count.enrollments, 0));

  // Solo participantes de prueba que no esten en ninguno de los dos cursos reales.
  const participantesQa = await prisma.participant.findMany({
    where: {
      OR: [{ employeeNumber: { startsWith: "QA-SCALE" } }, { name: { startsWith: "QA " } }, { name: { startsWith: "[QA" } }],
      NOT: { enrollments: { some: { session: { program: { name: { in: PROGRAMAS_REALES } } } } } }
    },
    select: { id: true }
  });
  paso("participantes de prueba", participantesQa.length);
  paso("  sus ProbocaCoins", await prisma.coinTransaction.count({ where: { participantId: { in: participantesQa.map((p) => p.id) } } }));

  const monedasWb = await prisma.coinTransaction.count({ where: { sourceType: "TRAINING", description: { contains: "WB completado" } } });
  // De estas, 1050 son de participantes de prueba y solo 2 recayeron sobre gente real
  // —el usuario y "Supervisor P9"— por haber corrido la prueba con sus cuentas.
  paso("monedas de la prueba de volumen \"WB\"", monedasWb);

  if (!aplicar) {
    console.log("\nSimulacion. Vuelve a correr con --aplicar para borrar.");
    return;
  }

  // El orden importa: primero lo que cuelga, al final lo que sostiene.
  const borrado: Record<string, number> = {};
  borrado["monedas de la prueba de volumen"] = (await prisma.coinTransaction.deleteMany({ where: { sourceType: "TRAINING", description: { contains: "WB completado" } } })).count;
  borrado["ideas"] = (await prisma.idea.deleteMany({})).count;
  borrado["programas de prueba"] = (await prisma.trainingProgram.deleteMany({ where: { name: { in: PROGRAMAS_DE_PRUEBA } } })).count;
  borrado["monedas de participantes de prueba"] = (await prisma.coinTransaction.deleteMany({ where: { participantId: { in: participantesQa.map((p) => p.id) } } })).count;
  borrado["participantes de prueba"] = (await prisma.participant.deleteMany({ where: { id: { in: participantesQa.map((p) => p.id) } } })).count;
  borrado["plantas [QA/E2E]"] = (await prisma.plant.deleteMany({ where: { id: { in: plantasQa.map((p) => p.id) } } })).count;
  borrado["usuarios [QA/E2E]"] = (await prisma.user.deleteMany({ where: { name: { contains: "[QA/E2E]" } } })).count;

  console.log("\nBorrado:");
  Object.entries(borrado).forEach(([k, v]) => paso(k, v));

  console.log("\nEstado final:");
  paso("Kaizen", await prisma.kaizenProject.count());
  paso("GENBA", await prisma.genbaWalk.count());
  paso("ideas", await prisma.idea.count());
  paso("plantas", await prisma.plant.count());
  paso("usuarios", await prisma.user.count());
  paso("participantes", await prisma.participant.count());
  paso("ProbocaCoins (movimientos)", await prisma.coinTransaction.count());
  for (const nombre of PROGRAMAS_REALES) {
    const g = await prisma.trainingProgram.findFirst({ where: { name: nombre }, select: { sessions: { select: { _count: { select: { enrollments: true } } } } } });
    paso(nombre, g?.sessions.reduce((s, y) => s + y._count.enrollments, 0) ?? 0);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

/**
 * Borra la nota de migracion que quedo dentro del campo `circumstance` de las rutas de
 * escalamiento.
 *
 * Por que existe: `ensureDefaultRoutingMemberships()` en `src/lib/organization.ts` creaba
 * la ruta inicial de cada area con `circumstance: "Ruta inicial heredada del responsable
 * del QR"`. Pero `circumstance` significa "solo cuando..." (turno nocturno, linea 2) y se
 * pinta al operador en el formulario publico del QR. El resultado era que en 22 areas
 * —incluidas P1 a P9— quien escaneaba leia esa nota interna en lugar del nombre de quien
 * le iba a responder.
 *
 * El bootstrap ya no la escribe y la pantalla de captura ya muestra siempre "Reporta a X".
 * Este script solo limpia lo que quedo escrito antes.
 *
 * Es idempotente: solo toca las filas cuya circunstancia es exactamente ese texto, asi que
 * correrlo dos veces no hace nada la segunda vez, y jamas pisa una circunstancia real que
 * alguien haya escrito a mano.
 *
 * Uso:  pnpm exec tsx scripts/limpiar-circunstancias-heredadas.ts          reporta
 *       pnpm exec tsx scripts/limpiar-circunstancias-heredadas.ts --aplicar  escribe
 */
import { PrismaClient } from "@prisma/client";

const NOTA_HEREDADA = "Ruta inicial heredada del responsable del QR";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");

async function main() {
  const afectadas = await prisma.orgEscalationRule.findMany({
    where: { circumstance: NOTA_HEREDADA },
    select: {
      id: true,
      submitterLabel: true,
      orgUnit: { select: { code: true, name: true, plant: { select: { code: true } } } },
      reviewerMembership: { select: { user: { select: { name: true } } } }
    },
    orderBy: { orgUnit: { code: "asc" } }
  });

  if (!afectadas.length) {
    console.log("No hay rutas con la nota heredada. Nada que limpiar.");
    return;
  }

  console.log(`Rutas con la nota heredada: ${afectadas.length}\n`);
  for (const regla of afectadas) {
    const antes = `${regla.submitterLabel} · ${NOTA_HEREDADA}`;
    const despues = `${regla.submitterLabel} · Reporta a ${regla.reviewerMembership.user.name}`;
    console.log(`  ${regla.orgUnit.plant.code}/${regla.orgUnit.code}  ${regla.orgUnit.name}`);
    console.log(`      antes:   ${antes}`);
    console.log(`      despues: ${despues}`);
  }

  if (!aplicar) {
    console.log("\nSimulacion. Vuelve a correr con --aplicar para escribir los cambios.");
    return;
  }

  const { count } = await prisma.orgEscalationRule.updateMany({
    where: { circumstance: NOTA_HEREDADA },
    data: { circumstance: null }
  });
  console.log(`\nCircunstancia borrada en ${count} rutas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

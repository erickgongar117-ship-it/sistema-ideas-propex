/**
 * Une los usuarios que creo la importacion con la persona real de la plantilla.
 *
 * Por que existe: al importar GENBA, cada responsable que aparecia en el Excel se convirtio
 * en un usuario nuevo con un correo generado —"javier.sanchez.6368657a@import.propex.local"—
 * porque el libro solo traia el nombre. Despues se cargo la plantilla real, con correos
 * @proboca.net. El resultado son dos registros para la misma persona: uno que carga sus
 * actividades y no puede entrar, y otro que puede entrar y no ve trabajo asignado.
 *
 * El emparejamiento es deliberadamente estricto: solo une cuando TODAS las palabras del
 * nombre corto estan contenidas en un unico nombre completo. "Javier Sanchez" une con
 * "Javier Sanchez Lopez"; "Elizabeth Mendez" NO une, porque empata con dos personas
 * distintas y elegir una seria adivinar sobre la identidad de alguien.
 *
 * Lo que mueve al registro real: actividades Kaizen y GENBA, coordinaciones de recorrido,
 * liderazgo de proyectos, membresias organizacionales y su participante de entrenamiento.
 * Despues elimina el registro generado.
 *
 * Uso:  pnpm exec tsx scripts/unir-usuarios-importados.ts            reporta los pares
 *       pnpm exec tsx scripts/unir-usuarios-importados.ts --aplicar  fusiona
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");

const CORREO_GENERADO = "@import.propex.local";
const CORREO_REAL = "@proboca.net";

const palabras = (valor: string) =>
  String(valor).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);

async function main() {
  const importados = await prisma.user.findMany({
    where: { email: { contains: CORREO_GENERADO } },
    select: {
      id: true, name: true, email: true,
      _count: { select: { ownedGenbaActivities: true, ownedKaizenActivities: true, coordinatedGenbaWalks: true, ledKaizenProjects: true, orgMemberships: true } }
    }
  });
  const reales = await prisma.user.findMany({
    where: { email: { endsWith: CORREO_REAL } },
    select: { id: true, name: true, email: true }
  });
  const realesConPalabras = reales.map((persona) => ({ persona, tokens: palabras(persona.name) }));

  const pares: Array<{ generado: (typeof importados)[number]; real: (typeof reales)[number] }> = [];
  const descartados: Array<{ nombre: string; razon: string; carga: number }> = [];

  for (const generado of importados) {
    const carga = generado._count.ownedGenbaActivities + generado._count.ownedKaizenActivities;
    const tokens = palabras(generado.name).filter((palabra) => palabra.length > 2);
    if (tokens.length < 2) { descartados.push({ nombre: generado.name, razon: "nombre incompleto", carga }); continue; }
    // Contenido total: cada palabra del nombre corto tiene que estar en el nombre completo.
    const candidatos = realesConPalabras.filter(({ tokens: completos }) => tokens.every((palabra) => completos.includes(palabra)));
    if (!candidatos.length) { descartados.push({ nombre: generado.name, razon: "sin pareja en la plantilla", carga }); continue; }
    if (candidatos.length > 1) {
      descartados.push({ nombre: generado.name, razon: `ambiguo: ${candidatos.map((c) => c.persona.name).join(" | ")}`, carga });
      continue;
    }
    pares.push({ generado, real: candidatos[0].persona });
  }

  console.log(`${aplicar ? "APLICANDO" : "SIMULACION"} · ${importados.length} usuarios con correo generado · ${reales.length} con correo corporativo\n`);
  console.log(`Se fusionan ${pares.length}:`);
  for (const { generado, real } of pares) {
    const carga = generado._count.ownedGenbaActivities + generado._count.ownedKaizenActivities;
    console.log(`  ${String(generado.name).padEnd(30)} (${String(carga).padStart(2)} act) -> ${real.name} <${real.email}>`);
  }
  console.log(`\nNo se tocan ${descartados.length}:`);
  for (const item of descartados) console.log(`  ${String(item.nombre).padEnd(30)} (${String(item.carga).padStart(2)} act) — ${item.razon}`);

  if (!aplicar) {
    console.log("\nSimulacion. Vuelve a correr con --aplicar para fusionar.");
    return;
  }

  let movidas = 0;
  for (const { generado, real } of pares) {
    await prisma.$transaction(async (tx) => {
      const cuenta = async (fn: Promise<{ count: number }>) => { movidas += (await fn).count; };
      await cuenta(tx.genbaActivity.updateMany({ where: { ownerId: generado.id }, data: { ownerId: real.id } }));
      await cuenta(tx.kaizenActivity.updateMany({ where: { ownerId: generado.id }, data: { ownerId: real.id } }));
      await cuenta(tx.genbaWalk.updateMany({ where: { coordinatorId: generado.id }, data: { coordinatorId: real.id } }));
      await cuenta(tx.kaizenProject.updateMany({ where: { leaderId: generado.id }, data: { leaderId: real.id } }));
      // Las membresias van una por una: la pareja (usuario, unidad) es unica, asi que si la
      // persona real ya pertenece a esa area no se duplica, se descarta la del generado.
      for (const membresia of await tx.orgMembership.findMany({ where: { userId: generado.id }, select: { id: true, orgUnitId: true } })) {
        const yaEsta = await tx.orgMembership.findUnique({ where: { userId_orgUnitId: { userId: real.id, orgUnitId: membresia.orgUnitId } }, select: { id: true } });
        if (yaEsta) await tx.orgMembership.delete({ where: { id: membresia.id } });
        else await tx.orgMembership.update({ where: { id: membresia.id }, data: { userId: real.id } });
      }
      const participante = await tx.participant.findUnique({ where: { userId: generado.id }, select: { id: true } });
      if (participante) {
        const yaTiene = await tx.participant.findUnique({ where: { userId: real.id }, select: { id: true } });
        await tx.participant.update({ where: { id: participante.id }, data: { userId: yaTiene ? null : real.id } });
      }
      await tx.auditLog.create({
        data: { entity: "User", entityId: real.id, action: "USER_MERGED_FROM_IMPORT", details: JSON.stringify({ conservado: real.name, correo: real.email, eliminado: generado.name, correoEliminado: generado.email }) }
      });
      await tx.user.delete({ where: { id: generado.id } });
    });
  }

  console.log(`\nFusionados ${pares.length} · asignaciones movidas ${movidas}`);
  console.log(`Quedan con correo generado: ${await prisma.user.count({ where: { email: { contains: CORREO_GENERADO } } })}`);
  console.log(`Usuarios totales: ${await prisma.user.count()}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

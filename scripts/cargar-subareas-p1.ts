/**
 * Divide P1 en sus tres supervisiones reales, cada una con su QR.
 *
 * Por que existe: P1 tenia un solo QR y un solo "Supervisor P1" generico, pero en piso son
 * tres lineas con tres encargados distintos. Con un unico codigo, una idea del deshuese
 * automatico aterrizaba en el supervisor de muslo, que no puede resolverla. El QR es
 * fisico: se pega junto a la linea, y quien esta ahi escanea el suyo.
 *
 * Una decision de fondo, que la tomo el usuario: las rutas apuntan al BUZON DEL PUESTO y no
 * a la persona. "A Placido lo pueden mover y no esta fijo", asi que enrutar a su cuenta
 * personal romperia el dia que cambie de linea. supervisor.muslo@proboca.net lo lee quien
 * ocupe el puesto —hoy Jose Miguel Cerda y Placido comparten ese buzon— y la cuenta
 * personal de cada quien queda intacta para su propio trabajo.
 *
 * Lo que escribe, todo dentro de APO-P1:
 *   1. Tres unidades de tipo PROCESO colgando de P1, con su area de captura y su QR.
 *   2. Un usuario por puesto, con el correo funcional que dio el usuario.
 *   3. Su membresia en la unidad, con permiso de recibir ideas.
 *   4. La escalera de cada una: operativo -> supervisor de la linea -> jefe de turno -> Gerencia de Operaciones.
 *
 * El jefe de turno se hereda de P1: quien ya sea el revisor del escalon 1 de APO-P1 pasa a
 * serlo de las tres lineas, en vez de codificar un nombre que manana cambia.
 *
 * Es idempotente: unidades, areas, usuarios y membresias van por upsert, y las reglas se
 * buscan por (unidad, etiqueta) antes de crear.
 *
 * Uso:  pnpm exec tsx scripts/cargar-subareas-p1.ts            reporta
 *       pnpm exec tsx scripts/cargar-subareas-p1.ts --aplicar  escribe
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");

const PADRE = "APO-P1";

// El codigo de la unidad y el del area de captura no son el mismo a proposito: el del area
// es el que sale en el QR, y /captura/P1-MUSLO se lee mucho mejor que /captura/APO-P1-MUSLO
// para quien lo escanea junto a la linea. Ambos coinciden con la semilla de
// src/lib/organization.ts; si se separan, una base nueva termina con seis sub-areas.
const LINEAS = [
  {
    code: "APO-P1-MUSLO",
    areaCode: "P1-MUSLO",
    name: "P1 Muslo",
    etiquetaSupervisor: "Supervisor de muslo",
    // Buzon compartido: hoy lo leen Jose Miguel Cerda Robles y Placido Hernandez.
    correo: "supervisor.muslo@proboca.net",
    titular: "Jose Miguel Cerda Robles",
    // La importacion de Kaizen creo una cuenta muerta con el nombre corto y su carga
    // encima. Se absorbe aqui, o esas actividades se quedan colgando de nadie.
    cuentaImportada: "Miguel Cerda"
  },
  {
    code: "APO-P1-PYM-L1",
    areaCode: "P1-PYM-L1",
    name: "P1 PYM Linea 1",
    etiquetaSupervisor: "Supervisor de pierna de pavo",
    correo: "supervisor.pavo@proboca.net",
    titular: "Erik Guadalupe Reyna Navarro",
    cuentaImportada: "Erik Reyna"
  },
  {
    code: "APO-P1-PYM-L2",
    areaCode: "P1-PYM-L2",
    name: "P1 PYM Linea 2",
    etiquetaSupervisor: "Supervisor de deshuese automatico",
    correo: "sup.deshueseautomatico@proboca.net",
    titular: "Jesus Perez Rangel",
    cuentaImportada: null
  }
];

const ESCALON_OPERATIVO = "Personal operativo o colaborador";
const ESCALON_SUPERVISOR = "Supervisor de area";

const paso = (accion: string, detalle: string) => console.log(`  [${accion.padEnd(10)}] ${detalle}`);

/** Hash que nadie conoce: la cuenta enruta pero no permite entrar hasta que se asigne una. */
async function hashInutilizable() {
  return bcrypt.hash(`${randomUUID()}${randomUUID()}`, 10);
}

const palabras = (valor: string) =>
  valor.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);

/**
 * Localiza la cuenta que dejo la importacion para esta misma persona.
 *
 * Empata igual de estricto que scripts/unir-usuarios-importados.ts: todas las palabras del
 * nombre corto tienen que estar en el nombre de la cuenta generada, y solo se acepta si hay
 * exactamente una candidata. Con dos, prefiere no tocar nada antes que adivinar de quien es
 * el trabajo.
 */
async function buscarImportada(nombreCorto: string | null) {
  if (!nombreCorto) return null;
  const tokens = palabras(nombreCorto);
  const generadas = await prisma.user.findMany({
    where: { email: { contains: "@import.propex.local" } },
    select: { id: true, name: true, email: true, _count: { select: { ownedKaizenActivities: true, ownedGenbaActivities: true, orgMemberships: true } } }
  });
  const candidatas = generadas.filter((cuenta) => {
    const completos = palabras(cuenta.name);
    return tokens.every((palabra) => completos.includes(palabra));
  });
  return candidatas.length === 1 ? candidatas[0] : null;
}

async function main() {
  console.log(aplicar ? "APLICANDO\n" : "SIMULACION\n");

  const padre = await prisma.orgUnit.findFirst({
    where: { code: PADRE },
    select: {
      id: true, plantId: true, name: true,
      escalationRules: {
        where: { active: true, submitterLevel: { in: [1, 2] } },
        select: { submitterLevel: true, reviewerMembershipId: true, reviewerMembership: { select: { user: { select: { name: true } } } } }
      }
    }
  });
  if (!padre) throw new Error(`No existe la unidad ${PADRE}.`);

  // El jefe de turno no se codifica: se toma del escalon 1 que P1 ya tiene configurado.
  const jefeDeTurno = padre.escalationRules.find((rule) => rule.submitterLevel === 1);
  if (!jefeDeTurno) throw new Error(`${PADRE} no tiene un revisor de escalon 1 del que heredar el jefe de turno.`);
  const gerenteOperaciones = padre.escalationRules.find((rule) => rule.submitterLevel === 2);
  if (!gerenteOperaciones) throw new Error(`${PADRE} no tiene un revisor de escalon 2 del que heredar la Gerencia de Operaciones.`);
  console.log(`Jefe de turno heredado de ${PADRE}: ${jefeDeTurno.reviewerMembership.user.name}`);
  console.log(`Gerencia heredada de ${PADRE}: ${gerenteOperaciones.reviewerMembership.user.name}\n`);

  for (const [indice, linea] of LINEAS.entries()) {
    console.log(`${linea.name}  (${linea.code})`);

    const unidadPrevia = await prisma.orgUnit.findFirst({ where: { code: linea.code }, select: { id: true } });
    paso(unidadPrevia ? "sin cambio" : "crea", `unidad PROCESO bajo ${PADRE}`);
    const usuarioPrevio = await prisma.user.findUnique({ where: { email: linea.correo }, select: { id: true, name: true } });
    paso(usuarioPrevio ? "sin cambio" : "crea", `usuario ${linea.titular} <${linea.correo}>`);
    paso(unidadPrevia ? "sin cambio" : "crea", `area de captura y QR /captura/${linea.areaCode}`);
    const importada = await buscarImportada(linea.cuentaImportada);
    if (importada) paso("absorbe", `cuenta importada ${importada.name} <${importada.email}> con ${importada._count.ownedKaizenActivities} Kaizen y ${importada._count.ownedGenbaActivities} GENBA`);
    else if (linea.cuentaImportada) paso("nada", `sin cuenta importada "${linea.cuentaImportada}" pendiente`);
    paso("crea", `escalon 1: ${ESCALON_OPERATIVO} -> ${linea.etiquetaSupervisor}`);
    paso("crea", `escalon 2: ${ESCALON_SUPERVISOR} -> ${jefeDeTurno.reviewerMembership.user.name}`);
    paso("crea", `escalon 3: Jefe de turno -> ${gerenteOperaciones.reviewerMembership.user.name}`);
    console.log("");

    if (!aplicar) continue;

    const usuario = usuarioPrevio ?? await prisma.user.create({
      data: { email: linea.correo, name: linea.titular, role: "SUPERVISOR", jobTitle: linea.etiquetaSupervisor, passwordHash: await hashInutilizable(), active: true }
    });

    const area = await prisma.area.upsert({
      where: { code: linea.areaCode },
      update: { name: linea.name, supervisorId: usuario.id, active: true },
      create: { code: linea.areaCode, name: linea.name, supervisorId: usuario.id, active: true }
    });

    const unidad = await prisma.orgUnit.upsert({
      where: { code: linea.code },
      update: { name: linea.name, responsible: linea.etiquetaSupervisor, routingUserId: usuario.id, captureAreaId: area.id, qrEnabled: true, active: true },
      create: {
        code: linea.code,
        name: linea.name,
        type: "PROCESO",
        plantId: padre.plantId,
        parentId: padre.id,
        responsible: linea.etiquetaSupervisor,
        manager: jefeDeTurno.reviewerMembership.user.name,
        routingUserId: usuario.id,
        captureAreaId: area.id,
        qrEnabled: true,
        active: true,
        sortOrder: indice
      }
    });

    const membresia = await prisma.orgMembership.upsert({
      where: { userId_orgUnitId: { userId: usuario.id, orgUnitId: unidad.id } },
      update: { title: linea.etiquetaSupervisor, level: 1, canReceiveIdeas: true, canReviewTeam: true, canManageActivities: true, active: true },
      create: { userId: usuario.id, orgUnitId: unidad.id, title: linea.etiquetaSupervisor, level: 1, canReceiveIdeas: true, canReviewTeam: true, canManageActivities: true, active: true }
    });

    const generada = await buscarImportada(linea.cuentaImportada);
    if (generada && generada.id !== usuario.id) {
      await prisma.$transaction(async (tx) => {
        await tx.kaizenActivity.updateMany({ where: { ownerId: generada.id }, data: { ownerId: usuario.id } });
        await tx.genbaActivity.updateMany({ where: { ownerId: generada.id }, data: { ownerId: usuario.id } });
        await tx.kaizenProject.updateMany({ where: { leaderId: generada.id }, data: { leaderId: usuario.id } });
        await tx.genbaWalk.updateMany({ where: { coordinatorId: generada.id }, data: { coordinatorId: usuario.id } });
        for (const m of await tx.orgMembership.findMany({ where: { userId: generada.id }, select: { id: true, orgUnitId: true } })) {
          const yaEsta = await tx.orgMembership.findUnique({ where: { userId_orgUnitId: { userId: usuario.id, orgUnitId: m.orgUnitId } }, select: { id: true } });
          if (yaEsta) await tx.orgMembership.delete({ where: { id: m.id } });
          else await tx.orgMembership.update({ where: { id: m.id }, data: { userId: usuario.id } });
        }
        const participante = await tx.participant.findUnique({ where: { userId: generada.id }, select: { id: true } });
        if (participante) {
          const yaTiene = await tx.participant.findUnique({ where: { userId: usuario.id }, select: { id: true } });
          await tx.participant.update({ where: { id: participante.id }, data: { userId: yaTiene ? null : usuario.id } });
        }
        await tx.auditLog.create({
          data: { entity: "User", entityId: usuario.id, action: "USER_MERGED_FROM_IMPORT", details: JSON.stringify({ conservado: usuario.name, correo: linea.correo, eliminado: generada.name, correoEliminado: generada.email }) }
        });
        await tx.user.delete({ where: { id: generada.id } });
      });
    }

    // Escalon 0: quien captura en la linea llega a su propio supervisor. Es la ruta
    // principal, la que el QR preselecciona y la que sincroniza al responsable del area.
    const reglas: Array<{ etiqueta: string; nivel: number; revisor: string; principal: boolean }> = [
      { etiqueta: ESCALON_OPERATIVO, nivel: 0, revisor: membresia.id, principal: true },
      { etiqueta: ESCALON_SUPERVISOR, nivel: 1, revisor: jefeDeTurno.reviewerMembershipId, principal: false },
      { etiqueta: "Jefe de turno", nivel: 2, revisor: gerenteOperaciones.reviewerMembershipId, principal: false }
    ];
    for (const regla of reglas) {
      const previa = await prisma.orgEscalationRule.findFirst({ where: { orgUnitId: unidad.id, submitterLabel: regla.etiqueta } });
      if (previa) {
        await prisma.orgEscalationRule.update({
          where: { id: previa.id },
          data: { submitterLevel: regla.nivel, reviewerMembershipId: regla.revisor, isDefault: regla.principal, active: true }
        });
      } else {
        await prisma.orgEscalationRule.create({
          data: { orgUnitId: unidad.id, name: regla.etiqueta, submitterLabel: regla.etiqueta, submitterLevel: regla.nivel, reviewerMembershipId: regla.revisor, isDefault: regla.principal, active: true, sortOrder: regla.nivel }
        });
      }
    }
  }

  if (!aplicar) {
    console.log("Simulacion. Vuelve a correr con --aplicar para escribir.");
    return;
  }

  console.log("Resultado:");
  for (const linea of LINEAS) {
    const u = await prisma.orgUnit.findFirst({
      where: { code: linea.code },
      select: { code: true, name: true, captureArea: { select: { code: true } }, escalationRules: { where: { active: true }, orderBy: { submitterLevel: "asc" }, select: { submitterLabel: true, reviewerMembership: { select: { user: { select: { name: true, email: true } } } } } } }
    });
    console.log(`  ${u!.name}  ->  /captura/${u!.captureArea?.code}`);
    u!.escalationRules.forEach((r) => console.log(`     ${r.submitterLabel.padEnd(34)} ${r.reviewerMembership.user.name} <${r.reviewerMembership.user.email}>`));
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

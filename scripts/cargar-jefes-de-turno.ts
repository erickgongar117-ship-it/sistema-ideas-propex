/**
 * Carga la escalera de produccion de Apodaca: supervisor -> jefe de turno -> gerente.
 *
 * Por que existe: las areas P1 a P9 solo tenian cargado su supervisor. El escalon de
 * arriba existia como texto libre ("Jefatura de Produccion") en `OrgUnit.manager`, que es
 * una ficha descriptiva y no enruta nada. Resultado: una idea que el supervisor mismo
 * levantaba no tenia a quien subir, y la escalera del QR se quedaba en un solo peldano.
 *
 * Lo que escribe, todo dentro de la planta Apodaca:
 *
 *   1. Los cuatro usuarios que faltaban: tres jefes de turno y el gerente.
 *   2. Su membresia en APO-PROD (Produccion y Valor Agregado), que es el departamento del
 *      que cuelgan las nueve areas. Una sola membresia por persona alcanza: una regla de
 *      escalamiento solo exige que revisor y area compartan planta.
 *   3. El jefe directo real: `managerMembershipId` de cada supervisor apunta a su jefe de
 *      turno, y el de cada jefe de turno al gerente. Eso reemplaza al texto libre.
 *   4. Dos escalones nuevos por area: nivel 1 supervisor -> jefe de turno, nivel 2 jefe de
 *      turno -> gerente. El nivel 0, operativo -> supervisor, ya existia y no se toca.
 *   5. `OrgUnit.manager` deja de decir "Jefatura de Produccion" y dice el nombre real.
 *
 * Es idempotente: los usuarios y membresias van por upsert, y las reglas se buscan por
 * (area, etiqueta) antes de crear. Correrlo dos veces deja la base igual y reporta 0 cambios.
 *
 * CORREOS: no me los dieron. Van con el mismo dominio ficticio `@propEx.local` que usan
 * todos los usuarios sembrados, justamente para que se note que son provisionales. Antes
 * de encender Microsoft Graph hay que cambiarlos por los corporativos reales, si no las
 * notificaciones de estas cuatro personas no llegan a ningun lado.
 *
 * CONTRASENAS: cada usuario nuevo queda con un hash aleatorio que nadie conoce, asi que la
 * cuenta existe para enrutar pero no se puede usar para entrar. Un administrador debe
 * asignarles contrasena cuando toque darles acceso.
 *
 * Uso:  pnpm exec tsx scripts/cargar-jefes-de-turno.ts            reporta lo que haria
 *       pnpm exec tsx scripts/cargar-jefes-de-turno.ts --aplicar  escribe
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");

const PLANTA = "APO";
/** Departamento del que cuelgan P1 a P9. Ahi viven las membresias de jefes y gerente. */
const DEPARTAMENTO = "APO-PROD";

const GERENTE = {
  nombre: "Padilla",
  email: "padilla@propEx.local",
  puesto: "Gerente de Produccion"
};

const JEFES_DE_TURNO = [
  { nombre: "Marco Dominguez", email: "marco.dominguez@propEx.local", areas: ["APO-P1", "APO-P2", "APO-P4", "APO-P6"] },
  { nombre: "Filiberto Herrera Rivera", email: "filiberto.herrera@propEx.local", areas: ["APO-P3", "APO-P5", "APO-P7", "APO-P9"] },
  { nombre: "Oscar Ortiz", email: "oscar.ortiz@propEx.local", areas: ["APO-P8"] }
];

/** Etiquetas de los escalones nuevos, tal como las leera quien capture desde el QR. */
const ESCALON_SUPERVISOR = "Supervisor de area";
const ESCALON_JEFE = "Jefe de turno";

type Registro = { accion: "crea" | "actualiza" | "sin cambio"; detalle: string };
const bitacora: Registro[] = [];
const anota = (accion: Registro["accion"], detalle: string) => bitacora.push({ accion, detalle });

/**
 * Hash imposible de adivinar. La cuenta queda creada para poder enrutar ideas, pero sin
 * contrasena utilizable: nadie —ni quien corre el script— puede entrar con ella.
 */
async function hashInutilizable() {
  return bcrypt.hash(`${randomUUID()}${randomUUID()}`, 10);
}

async function asegurarUsuario(email: string, nombre: string, puesto: string) {
  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    anota("sin cambio", `usuario ${nombre} <${email}> ya existia`);
    return existente;
  }
  anota("crea", `usuario ${nombre} <${email}> con rol SUPERVISOR`);
  if (!aplicar) return null;
  return prisma.user.create({
    data: { email, name: nombre, role: "SUPERVISOR", jobTitle: puesto, passwordHash: await hashInutilizable(), active: true }
  });
}

async function asegurarMembresia(userId: string, orgUnitId: string, titulo: string, nivel: number, jefeMembresiaId: string | null) {
  return prisma.orgMembership.upsert({
    where: { userId_orgUnitId: { userId, orgUnitId } },
    update: { title: titulo, level: nivel, canReceiveIdeas: true, canReviewTeam: true, canManageActivities: true, active: true, managerMembershipId: jefeMembresiaId },
    create: { userId, orgUnitId, title: titulo, level: nivel, canReceiveIdeas: true, canReviewTeam: true, canManageActivities: true, active: true, managerMembershipId: jefeMembresiaId }
  });
}

/**
 * Busca la regla por (area, etiqueta), no por (area, nivel).
 *
 * Buscar por nivel parecia natural y estaba mal: si un area ya tenia otra ruta en ese
 * mismo nivel —por ejemplo "Especialista QA" en el nivel 1 de P1— el script la pisaba y se
 * perdia una ruta que alguien habia configurado a mano. Por etiqueta solo toca las suyas y
 * convive con las demas, que es lo que debe hacer un cargador.
 */
async function asegurarRegla(orgUnitId: string, nivel: number, etiqueta: string, revisorMembresiaId: string | null, areaCodigo: string, revisorNombre: string) {
  const existente = await prisma.orgEscalationRule.findFirst({ where: { orgUnitId, submitterLabel: etiqueta } });
  if (existente) {
    if (existente.reviewerMembershipId === revisorMembresiaId && existente.submitterLevel === nivel && existente.active) {
      anota("sin cambio", `${areaCodigo} escalon ${nivel + 1}: ${etiqueta} -> ${revisorNombre}`);
      return;
    }
    anota("actualiza", `${areaCodigo} escalon ${nivel + 1}: ${etiqueta} -> ${revisorNombre}`);
    if (aplicar && revisorMembresiaId) {
      await prisma.orgEscalationRule.update({
        where: { id: existente.id },
        data: { submitterLevel: nivel, reviewerMembershipId: revisorMembresiaId, active: true, name: etiqueta }
      });
    }
    return;
  }
  anota("crea", `${areaCodigo} escalon ${nivel + 1}: ${etiqueta} -> ${revisorNombre}`);
  if (!aplicar || !revisorMembresiaId) return;
  const cuantas = await prisma.orgEscalationRule.count({ where: { orgUnitId } });
  await prisma.orgEscalationRule.create({
    data: {
      orgUnitId,
      name: etiqueta,
      submitterLabel: etiqueta,
      submitterLevel: nivel,
      reviewerMembershipId: revisorMembresiaId,
      // isDefault sigue siendo del escalon 0: es la opcion preseleccionada en el QR y la
      // que sincroniza el responsable del area. Estos escalones son alternativas.
      isDefault: false,
      active: true,
      sortOrder: cuantas
    }
  });
}

async function main() {
  const departamento = await prisma.orgUnit.findFirst({ where: { code: DEPARTAMENTO }, select: { id: true, name: true } });
  if (!departamento) throw new Error(`No existe el departamento ${DEPARTAMENTO} en la planta ${PLANTA}.`);

  const areas = await prisma.orgUnit.findMany({
    where: { code: { in: JEFES_DE_TURNO.flatMap((jefe) => jefe.areas) } },
    select: { id: true, code: true, name: true, manager: true, memberships: { where: { active: true }, select: { id: true, level: true, managerMembershipId: true, user: { select: { name: true } } } } }
  });
  const porCodigo = new Map(areas.map((area) => [area.code, area]));
  const faltantes = JEFES_DE_TURNO.flatMap((jefe) => jefe.areas).filter((codigo) => !porCodigo.has(codigo));
  if (faltantes.length) throw new Error(`Estas areas no existen: ${faltantes.join(", ")}`);

  // 1. Gerente primero: los jefes de turno le cuelgan.
  const gerente = await asegurarUsuario(GERENTE.email, GERENTE.nombre, GERENTE.puesto);
  let gerenteMembresiaId: string | null = null;
  if (gerente) {
    gerenteMembresiaId = aplicar
      ? (await asegurarMembresia(gerente.id, departamento.id, GERENTE.puesto, 3, null)).id
      : (await prisma.orgMembership.findUnique({ where: { userId_orgUnitId: { userId: gerente.id, orgUnitId: departamento.id } }, select: { id: true } }))?.id ?? null;
  }
  if (gerente) {
    const previa = await prisma.orgMembership.findUnique({ where: { userId_orgUnitId: { userId: gerente.id, orgUnitId: departamento.id } } });
    anota(previa ? "sin cambio" : "crea", `${GERENTE.nombre} en ${departamento.name} como ${GERENTE.puesto}`);
  }

  for (const jefe of JEFES_DE_TURNO) {
    const usuario = await asegurarUsuario(jefe.email, jefe.nombre, ESCALON_JEFE);
    let jefeMembresiaId: string | null = null;
    if (usuario) {
      jefeMembresiaId = aplicar
        ? (await asegurarMembresia(usuario.id, departamento.id, ESCALON_JEFE, 2, gerenteMembresiaId)).id
        : (await prisma.orgMembership.findUnique({ where: { userId_orgUnitId: { userId: usuario.id, orgUnitId: departamento.id } }, select: { id: true } }))?.id ?? null;
    }
    if (usuario) {
      const previa = await prisma.orgMembership.findUnique({ where: { userId_orgUnitId: { userId: usuario.id, orgUnitId: departamento.id } } });
      anota(previa ? "sin cambio" : "crea", `${jefe.nombre} en ${departamento.name} como ${ESCALON_JEFE}, reportando a ${GERENTE.nombre}`);
    }

    for (const codigo of jefe.areas) {
      const area = porCodigo.get(codigo)!;
      const supervisor = area.memberships.find((m) => m.level === 1);
      if (!supervisor) {
        anota("sin cambio", `${codigo}: no tiene supervisor cargado, se omite`);
        continue;
      }

      // El jefe directo del supervisor deja de ser texto y pasa a ser una relacion.
      const yaEnlazado = jefeMembresiaId !== null && supervisor.managerMembershipId === jefeMembresiaId;
      anota(yaEnlazado ? "sin cambio" : "actualiza", `${codigo}: ${supervisor.user.name} reporta a ${jefe.nombre}`);
      if (aplicar && jefeMembresiaId && !yaEnlazado) {
        await prisma.orgMembership.update({ where: { id: supervisor.id }, data: { managerMembershipId: jefeMembresiaId } });
      }

      if (area.manager !== jefe.nombre) {
        anota("actualiza", `${codigo}: ficha "Jefe directo" pasa de "${area.manager}" a "${jefe.nombre}"`);
        if (aplicar) await prisma.orgUnit.update({ where: { id: area.id }, data: { manager: jefe.nombre } });
      }

      // La consulta corre siempre, aplique o no: si solo se hiciera al escribir, la
      // simulacion diria "crea" sobre reglas que ya existen y no serviria para revisar.
      await asegurarRegla(area.id, 1, ESCALON_SUPERVISOR, jefeMembresiaId, codigo, jefe.nombre);
      await asegurarRegla(area.id, 2, ESCALON_JEFE, gerenteMembresiaId, codigo, GERENTE.nombre);
    }
  }

  const anchos = { crea: 0, actualiza: 0, "sin cambio": 0 };
  for (const registro of bitacora) {
    anchos[registro.accion] += 1;
    console.log(`  [${registro.accion.padEnd(10)}] ${registro.detalle}`);
  }
  console.log(`\ncrea ${anchos.crea} · actualiza ${anchos.actualiza} · sin cambio ${anchos["sin cambio"]}`);
  if (!aplicar) console.log("\nSimulacion. Vuelve a correr con --aplicar para escribir los cambios.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

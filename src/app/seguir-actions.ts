"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { userModuleAccess } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

/**
 * Seguir por decision propia un registro que ya existe.
 *
 * Por que vive aparte de src/app/actions.ts: ese archivo pasa de cinco mil lineas y ahora
 * mismo tiene trabajo de otro frente sin cerrar. Un modulo propio evita enredar dos cambios
 * en el mismo archivo y deja este flujo legible por si solo.
 *
 * Que resuelve: hasta ahora "Mi trabajo" solo mostraba lo asignado —ser responsable, lider
 * o coordinador— y los seguidores de Ideas solo los podia poner un administrador. Quien
 * queria vigilar un Kaizen de otra linea, o el recorrido donde salio un hallazgo que le
 * toca de cerca, no tenia donde ponerlo: lo apuntaba fuera del sistema.
 *
 * Regla de acceso, decidida con el usuario: puede seguir cualquiera que ya pueda ver el
 * registro. Seguir no abre informacion nueva, solo la trae a su lista, asi que la
 * comprobacion es la misma que para entrar al modulo.
 */

type Modulo = "IDEA" | "KAIZEN" | "GENBA";

function rutasQueRefrescar(modulo: Modulo, id: string) {
  const base = ["/seguimientos", "/dashboard"];
  if (modulo === "IDEA") return [...base, "/ideas", `/ideas/${id}`];
  if (modulo === "KAIZEN") return [...base, "/kaizen", "/kaizen/kanban", `/kaizen/${id}`];
  return [...base, "/genba", "/genba/kanban", `/genba/${id}`];
}

async function verificarAcceso(modulo: Modulo, registroId: string, userId: string, role: string) {
  if (modulo === "IDEA") {
    // Una idea es visible para quien tiene acceso al sistema; el detalle ya filtra aparte.
    const existe = await prisma.idea.findUnique({ where: { id: registroId }, select: { id: true } });
    return Boolean(existe);
  }
  const acceso = await userModuleAccess({ id: userId, role, kaizenAccess: false, genbaAccess: false } as Parameters<typeof userModuleAccess>[0]);
  if (modulo === "KAIZEN") {
    if (!acceso.kaizen) return false;
    return Boolean(await prisma.kaizenProject.findUnique({ where: { id: registroId }, select: { id: true } }));
  }
  if (!acceso.genba) return false;
  return Boolean(await prisma.genbaWalk.findUnique({ where: { id: registroId }, select: { id: true } }));
}

export async function seguirRegistroAction(formData: FormData) {
  const user = await requireUser();
  const modulo = String(formData.get("modulo") ?? "") as Modulo;
  const registroId = String(formData.get("registroId") ?? "");
  const etiqueta = String(formData.get("etiqueta") ?? "").trim() || "Seguimiento propio";
  if (!["IDEA", "KAIZEN", "GENBA"].includes(modulo) || !registroId) return;

  const permitido = await verificarAcceso(modulo, registroId, user.id, user.role);
  if (!permitido) return;

  // Vuelve a seguir sin duplicar: la llave unica ya impide dos registros, y actualizar la
  // etiqueta permite renombrar el seguimiento sin borrarlo y volverlo a crear.
  if (modulo === "IDEA") {
    await prisma.ideaFollower.upsert({
      where: { ideaId_userId: { ideaId: registroId, userId: user.id } },
      update: { label: etiqueta },
      create: { ideaId: registroId, userId: user.id, createdById: user.id, label: etiqueta }
    });
  } else if (modulo === "KAIZEN") {
    await prisma.kaizenFollower.upsert({
      where: { projectId_userId: { projectId: registroId, userId: user.id } },
      update: { label: etiqueta },
      create: { projectId: registroId, userId: user.id, label: etiqueta }
    });
  } else {
    await prisma.genbaFollower.upsert({
      where: { walkId_userId: { walkId: registroId, userId: user.id } },
      update: { label: etiqueta },
      create: { walkId: registroId, userId: user.id, label: etiqueta }
    });
  }

  await prisma.auditLog.create({
    data: { entity: `${modulo}_FOLLOW`, entityId: registroId, action: "FOLLOW_ADDED", userId: user.id, details: JSON.stringify({ etiqueta }) }
  });
  for (const ruta of rutasQueRefrescar(modulo, registroId)) revalidatePath(ruta);
}

export async function dejarDeSeguirAction(formData: FormData) {
  const user = await requireUser();
  const modulo = String(formData.get("modulo") ?? "") as Modulo;
  const registroId = String(formData.get("registroId") ?? "");
  if (!["IDEA", "KAIZEN", "GENBA"].includes(modulo) || !registroId) return;

  // Solo borra el suyo: el filtro lleva userId, asi que nadie puede quitarle el
  // seguimiento a otra persona ni siquiera manipulando el formulario.
  if (modulo === "IDEA") {
    await prisma.ideaFollower.deleteMany({ where: { ideaId: registroId, userId: user.id } });
  } else if (modulo === "KAIZEN") {
    await prisma.kaizenFollower.deleteMany({ where: { projectId: registroId, userId: user.id } });
  } else {
    await prisma.genbaFollower.deleteMany({ where: { walkId: registroId, userId: user.id } });
  }

  await prisma.auditLog.create({
    data: { entity: `${modulo}_FOLLOW`, entityId: registroId, action: "FOLLOW_REMOVED", userId: user.id, details: "{}" }
  });
  for (const ruta of rutasQueRefrescar(modulo, registroId)) revalidatePath(ruta);
}

/**
 * Las tres preferencias de la bandeja, decididas con el usuario.
 *
 * La idea era "que cada quien vea primero lo que le importa". Se acoto a proposito a tres
 * cosas —con que pestana abre, que modulo trae por defecto y que registros van fijados
 * arriba— en vez de dejar armar tableros a medida. En una planta de mil personas, mil
 * configuraciones distintas significan que nadie puede ayudar a otro por telefono: "dale
 * a la tercera pestana" deja de querer decir lo mismo para todos.
 *
 * Vacio siempre es una respuesta valida: guardar sin elegir nada devuelve a la persona al
 * comportamiento de siempre, que es la unica forma de deshacer una preferencia.
 */
const VISTAS_VALIDAS = ["pendientes", "mias", "seguimiento", "equipo"];
const MODULOS_VALIDOS = ["IDEA", "KAIZEN", "GENBA"];

export async function guardarPreferenciasSeguimientoAction(formData: FormData) {
  const user = await requireUser();
  const vista = String(formData.get("vista") ?? "").trim();
  const modulo = String(formData.get("modulo") ?? "").trim().toUpperCase();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      followUpView: VISTAS_VALIDAS.includes(vista) ? vista : null,
      followUpModule: MODULOS_VALIDOS.includes(modulo) ? modulo : null
    }
  });
  revalidatePath("/seguimientos");
}

/**
 * Fijar arriba reutiliza al seguidor en vez de inventar otra tabla.
 *
 * Fijar algo ya implica seguirlo, asi que si la persona no lo seguia se crea el seguimiento
 * en el mismo paso. Desfijar solo baja la bandera y conserva el seguimiento: quien fija y
 * luego desfija casi nunca quiere dejar de ver el registro, solo quitarlo de la cabecera.
 */
export async function fijarRegistroAction(formData: FormData) {
  const user = await requireUser();
  const modulo = String(formData.get("modulo") ?? "") as Modulo;
  const registroId = String(formData.get("registroId") ?? "");
  const fijar = String(formData.get("fijar") ?? "") !== "no";
  if (!["IDEA", "KAIZEN", "GENBA"].includes(modulo) || !registroId) return;

  const permitido = await verificarAcceso(modulo, registroId, user.id, user.role);
  if (!permitido) return;

  if (modulo === "IDEA") {
    await prisma.ideaFollower.upsert({
      where: { ideaId_userId: { ideaId: registroId, userId: user.id } },
      update: { pinned: fijar },
      create: { ideaId: registroId, userId: user.id, createdById: user.id, label: "Fijado por mi", pinned: fijar }
    });
  } else if (modulo === "KAIZEN") {
    await prisma.kaizenFollower.upsert({
      where: { projectId_userId: { projectId: registroId, userId: user.id } },
      update: { pinned: fijar },
      create: { projectId: registroId, userId: user.id, label: "Fijado por mi", pinned: fijar }
    });
  } else {
    await prisma.genbaFollower.upsert({
      where: { walkId_userId: { walkId: registroId, userId: user.id } },
      update: { pinned: fijar },
      create: { walkId: registroId, userId: user.id, label: "Fijado por mi", pinned: fijar }
    });
  }

  await prisma.auditLog.create({
    data: { entity: `${modulo}_FOLLOW`, entityId: registroId, action: fijar ? "FOLLOW_PINNED" : "FOLLOW_UNPINNED", userId: user.id, details: "{}" }
  });
  for (const ruta of rutasQueRefrescar(modulo, registroId)) revalidatePath(ruta);
}

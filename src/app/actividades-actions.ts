"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { areOperationalUsers } from "@/lib/director-policy";
import { improvementManagerRoles } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

/**
 * Cambiar el responsable de una actividad sin abrir el expediente.
 *
 * Por que existe: reasignar solo se podia desde Kaizen -> proyecto -> "Editar actividad", y
 * desde GENBA igual. Quien administra el portafolio pasa el dia en los tableros, no dentro de
 * cada expediente, y para mover una actividad de una persona a otra tenia que navegar hasta
 * el fondo. Cerrar, reabrir y crear ya se podian desde el panel lateral; reasignar se quedo
 * fuera por descuido, no por decision.
 *
 * Vive aparte de src/app/actions.ts porque ese archivo pasa de cinco mil lineas y este flujo
 * se lee entero de un vistazo.
 */

type Modulo = "KAIZEN" | "GENBA";

/**
 * Solo cambia el responsable, nada mas.
 *
 * No se reutilizo updateKaizenActivityAction a proposito: esa accion espera el formulario
 * completo —accion, problema, fechas, estado— y llamarla con solo el responsable borraria lo
 * demas. Una accion que hace una cosa no puede equivocarse en las otras.
 */
export async function reasignarActividadAction(formData: FormData) {
  const user = await requireUser(improvementManagerRoles);
  const modulo = String(formData.get("modulo") ?? "") as Modulo;
  const actividadId = String(formData.get("activityId") ?? "");
  const nuevoResponsable = String(formData.get("ownerId") ?? "").trim() || null;
  if (!["KAIZEN", "GENBA"].includes(modulo) || !actividadId) return;

  // Direccion ve todo pero no recibe trabajo operativo; la misma regla que aplican las
  // acciones del expediente. Si se dejara pasar aqui, la actividad quedaria en manos de
  // alguien a quien el resto del sistema nunca le va a mostrar pendientes.
  if (!(await areOperationalUsers([nuevoResponsable]))) return;

  if (modulo === "KAIZEN") {
    const actividad = await prisma.kaizenActivity.findUnique({
      where: { id: actividadId },
      select: { id: true, number: true, projectId: true, status: true, project: { select: { status: true } } }
    });
    // Una actividad cerrada, o de un proyecto cerrado, no se reasigna: primero se reabre.
    // Cambiarle el responsable a algo ya terminado solo confunde el historial.
    if (!actividad || actividad.project.status === "COMPLETADO" || actividad.project.status === "CANCELADO") return;
    if (["COMPLETADA", "CANCELADA", "COMBINADA"].includes(actividad.status)) return;

    await prisma.$transaction(async (tx) => {
      await tx.kaizenActivity.update({ where: { id: actividadId }, data: { ownerId: nuevoResponsable } });
      // Quien recibe una actividad entra al equipo del proyecto, igual que al asignarla desde
      // el expediente: si no, no le aparece el Kaizen en su bandeja.
      if (nuevoResponsable) {
        await tx.kaizenTeamMember.upsert({
          where: { projectId_userId: { projectId: actividad.projectId, userId: nuevoResponsable } },
          update: {},
          create: { projectId: actividad.projectId, userId: nuevoResponsable, role: "Responsable de actividad" }
        });
      }
      await tx.kaizenUpdate.create({
        data: { projectId: actividad.projectId, activityId: actividadId, userId: user.id, comment: `Actividad #${actividad.number}: cambio de responsable.` }
      });
      await tx.auditLog.create({
        data: { entity: "KaizenActivity", entityId: actividadId, action: "KAIZEN_ACTIVITY_REASSIGNED", userId: user.id, details: JSON.stringify({ ownerId: nuevoResponsable }) }
      });
    });
    revalidatePath(`/kaizen/${actividad.projectId}`);
    revalidatePath("/kaizen");
    revalidatePath("/kaizen/kanban");
  } else {
    const actividad = await prisma.genbaActivity.findUnique({
      where: { id: actividadId },
      select: { id: true, number: true, walkId: true, status: true, walk: { select: { status: true } } }
    });
    if (!actividad || actividad.walk.status !== "ABIERTO") return;
    if (["COMPLETADA", "CANCELADA", "COMBINADA"].includes(actividad.status)) return;

    await prisma.$transaction(async (tx) => {
      await tx.genbaActivity.update({ where: { id: actividadId }, data: { ownerId: nuevoResponsable } });
      await tx.genbaUpdate.create({
        data: { walkId: actividad.walkId, activityId: actividadId, userId: user.id, comment: `Actividad #${actividad.number}: cambio de responsable.` }
      });
      await tx.auditLog.create({
        data: { entity: "GenbaActivity", entityId: actividadId, action: "GENBA_ACTIVITY_REASSIGNED", userId: user.id, details: JSON.stringify({ ownerId: nuevoResponsable }) }
      });
    });
    revalidatePath(`/genba/${actividad.walkId}`);
    revalidatePath("/genba");
    revalidatePath("/genba/kanban");
  }

  revalidatePath("/seguimientos");
  revalidatePath("/dashboard");
}

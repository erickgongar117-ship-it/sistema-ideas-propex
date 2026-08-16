import type { GenbaStatus, IdeaStatus, KaizenStatus, WorkItemStatus } from "@prisma/client";
import { workItemStatusLabels } from "@/lib/domain";

export type StatusCategory = "ENTRADA" | "VALIDACION" | "EJECUCION" | "CIERRE" | "DETENIDA";

export type StatusIconName = "Inbox" | "ShieldCheck" | "CircleDashed" | "CircleCheckBig" | "CircleSlash";

export type StatusRender = {
  category: StatusCategory;
  label: string;
  reference?: boolean;
};

export const statusCategoryMeta: Record<StatusCategory, {
  label: string;
  token: "entrada" | "validacion" | "ejecucion" | "cierre" | "detenida";
  icon: StatusIconName;
}> = {
  ENTRADA: { label: "Entrada", token: "entrada", icon: "Inbox" },
  VALIDACION: { label: "Validacion", token: "validacion", icon: "ShieldCheck" },
  EJECUCION: { label: "Ejecucion", token: "ejecucion", icon: "CircleDashed" },
  CIERRE: { label: "Cierre", token: "cierre", icon: "CircleCheckBig" },
  DETENIDA: { label: "Detenida", token: "detenida", icon: "CircleSlash" }
};

const ideaStatusCategories: Record<IdeaStatus, StatusCategory> = {
  REGISTRADA: "ENTRADA",
  EN_REVISION_SUPERVISOR: "ENTRADA",
  RECHAZADA_SUPERVISOR: "DETENIDA",
  SOLICITUD_INFORMACION: "ENTRADA",
  APROBADA_SUPERVISOR: "VALIDACION",
  EN_VALIDACION_CALIDAD: "VALIDACION",
  EN_VALIDACION_SEGURIDAD: "VALIDACION",
  EN_VALIDACION_MANTENIMIENTO: "VALIDACION",
  RECHAZADA_VALIDACION: "DETENIDA",
  APROBADA_PARA_IMPLEMENTAR: "EJECUCION",
  CLASIFICACION_MEJORA_CONTINUA: "EJECUCION",
  EN_IMPLEMENTACION: "EJECUCION",
  IMPLEMENTADA: "EJECUCION",
  EN_VALIDACION_FINAL: "VALIDACION",
  CERRADA: "CIERRE",
  CANCELADA: "DETENIDA",
  VENCIDA: "DETENIDA"
};

const kaizenStatusCategories: Record<KaizenStatus, StatusCategory> = {
  PENDIENTE_CHARTER: "ENTRADA",
  PLANIFICACION: "EJECUCION",
  EN_CURSO: "EJECUCION",
  EN_PAUSA: "DETENIDA",
  COMPLETADO: "CIERRE",
  CANCELADO: "DETENIDA"
};

const genbaStatusCategories: Record<GenbaStatus, StatusCategory> = {
  ABIERTO: "EJECUCION",
  CERRADO: "CIERRE",
  CANCELADO: "DETENIDA"
};

const workItemStatusCategories: Record<WorkItemStatus, StatusCategory> = {
  PENDIENTE: "ENTRADA",
  EN_PROCESO: "EJECUCION",
  BLOQUEADA: "DETENIDA",
  COMPLETADA: "CIERRE",
  CANCELADA: "DETENIDA",
  COMBINADA: "DETENIDA"
};

export function ideaStatusCategory(status: IdeaStatus) {
  return ideaStatusCategories[status];
}

export function kaizenStatusCategory(status: KaizenStatus) {
  return kaizenStatusCategories[status];
}

export function genbaStatusCategory(status: GenbaStatus) {
  return genbaStatusCategories[status];
}

export function workItemStatusRender(status: WorkItemStatus): StatusRender {
  return {
    category: workItemStatusCategories[status],
    label: workItemStatusLabels[status],
    reference: status === "COMBINADA"
  };
}

export function statusCategoryFill(category: StatusCategory) {
  return `var(--st-${statusCategoryMeta[category].token}-fill)`;
}

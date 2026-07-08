import {
  ApprovalStatus,
  ApprovalType,
  Classification,
  IdeaStatus,
  Priority,
  Role
} from "@prisma/client";

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  MEJORA_CONTINUA: "Mejora Continua",
  SUPERVISOR: "Supervisor",
  CALIDAD: "Calidad/Inocuidad",
  SEGURIDAD: "Seguridad Industrial",
  MANTENIMIENTO: "Mantenimiento",
  COLABORADOR: "Colaborador"
};

export const statusLabels: Record<IdeaStatus, string> = {
  REGISTRADA: "Registrada",
  EN_REVISION_SUPERVISOR: "En revision de supervisor",
  RECHAZADA_SUPERVISOR: "Rechazada por supervisor",
  SOLICITUD_INFORMACION: "Solicitud de informacion",
  APROBADA_SUPERVISOR: "Aprobada por supervisor",
  EN_VALIDACION_CALIDAD: "En validacion Calidad/Inocuidad",
  EN_VALIDACION_SEGURIDAD: "En validacion Seguridad",
  EN_VALIDACION_MANTENIMIENTO: "En validacion Mantenimiento",
  RECHAZADA_VALIDACION: "Rechazada en validacion",
  APROBADA_PARA_IMPLEMENTAR: "Aprobada para implementar",
  CLASIFICACION_MEJORA_CONTINUA: "Clasificacion Mejora Continua",
  EN_IMPLEMENTACION: "En implementacion",
  IMPLEMENTADA: "Implementada",
  EN_VALIDACION_FINAL: "En validacion final",
  CERRADA: "Cerrada",
  CANCELADA: "Cancelada",
  VENCIDA: "Vencida"
};

export const statusTone: Record<IdeaStatus, "green" | "yellow" | "red" | "blue" | "gray" | "purple"> = {
  REGISTRADA: "yellow",
  EN_REVISION_SUPERVISOR: "yellow",
  RECHAZADA_SUPERVISOR: "red",
  SOLICITUD_INFORMACION: "yellow",
  APROBADA_SUPERVISOR: "green",
  EN_VALIDACION_CALIDAD: "yellow",
  EN_VALIDACION_SEGURIDAD: "yellow",
  EN_VALIDACION_MANTENIMIENTO: "yellow",
  RECHAZADA_VALIDACION: "red",
  APROBADA_PARA_IMPLEMENTAR: "green",
  CLASIFICACION_MEJORA_CONTINUA: "yellow",
  EN_IMPLEMENTACION: "blue",
  IMPLEMENTADA: "blue",
  EN_VALIDACION_FINAL: "purple",
  CERRADA: "green",
  CANCELADA: "gray",
  VENCIDA: "red"
};

export const priorityLabels: Record<Priority, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Critica"
};

export const classificationLabels: Record<Classification, string> = {
  IDEA_RAPIDA: "Idea rapida",
  ACCION_MANTENIMIENTO: "Accion de mantenimiento",
  KAIZEN: "Kaizen",
  PROYECTO_DMAIC: "Proyecto DMAIC",
  CINCO_S_GESTION_VISUAL: "5S / Gestion visual",
  SEGURIDAD: "Seguridad",
  CALIDAD_INOCUIDAD: "Calidad/Inocuidad",
  NO_VIABLE: "No viable"
};

export const approvalTypeLabels: Record<ApprovalType, string> = {
  SUPERVISOR: "Supervisor",
  CALIDAD: "Calidad/Inocuidad",
  SEGURIDAD: "Seguridad Industrial",
  MANTENIMIENTO: "Mantenimiento",
  MEJORA_CONTINUA_FINAL: "Mejora Continua final"
};

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  MORE_INFO: "Mas informacion"
};

export const impactOptions = [
  "Seguridad",
  "Calidad/Inocuidad",
  "Entrega",
  "Costo",
  "Moral",
  "Productividad",
  "5S",
  "Ergonomia",
  "Medio ambiente"
];

export const shifts = ["Matutino", "Vespertino", "Nocturno", "Mixto", "Administrativo"];

export const validationOrder: ApprovalType[] = ["CALIDAD", "SEGURIDAD", "MANTENIMIENTO"];

export function parseImpactTypes(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export function requiredApprovalTypes(input: {
  impactsQuality: boolean;
  impactsSafety: boolean;
  requiresMaintenance: boolean;
}): ApprovalType[] {
  const required: ApprovalType[] = [];
  if (input.impactsQuality) required.push("CALIDAD");
  if (input.impactsSafety) required.push("SEGURIDAD");
  if (input.requiresMaintenance) required.push("MANTENIMIENTO");
  return required;
}

export function statusForApprovalType(type: ApprovalType): IdeaStatus {
  if (type === "CALIDAD") return "EN_VALIDACION_CALIDAD";
  if (type === "SEGURIDAD") return "EN_VALIDACION_SEGURIDAD";
  if (type === "MANTENIMIENTO") return "EN_VALIDACION_MANTENIMIENTO";
  return "APROBADA_SUPERVISOR";
}

export function nextValidationStatus(types: ApprovalType[]): IdeaStatus {
  const first = validationOrder.find((type) => types.includes(type));
  return first ? statusForApprovalType(first) : "APROBADA_PARA_IMPLEMENTAR";
}

export function approvalTypeForRole(role: Role): ApprovalType | null {
  if (role === "SUPERVISOR") return "SUPERVISOR";
  if (role === "CALIDAD") return "CALIDAD";
  if (role === "SEGURIDAD") return "SEGURIDAD";
  if (role === "MANTENIMIENTO") return "MANTENIMIENTO";
  if (role === "MEJORA_CONTINUA") return "MEJORA_CONTINUA_FINAL";
  return null;
}

export function roleHomePath(role: Role): string {
  if (role === "SUPERVISOR") return "/supervisor";
  if (role === "CALIDAD") return "/validaciones/calidad";
  if (role === "SEGURIDAD") return "/validaciones/seguridad";
  if (role === "MANTENIMIENTO") return "/validaciones/mantenimiento";
  if (role === "MEJORA_CONTINUA" || role === "ADMIN") return "/dashboard";
  return "/";
}

export function isTerminalStatus(status: IdeaStatus): boolean {
  return ["CERRADA", "CANCELADA", "RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(status);
}

export function isOverdue(input: { dueDate: Date | null; status: IdeaStatus }): boolean {
  if (!input.dueDate || isTerminalStatus(input.status)) return false;
  return input.dueDate.getTime() < Date.now();
}

export const kanbanColumns: Array<{ title: string; statuses: IdeaStatus[] }> = [
  { title: "En revision de supervisor", statuses: ["REGISTRADA", "EN_REVISION_SUPERVISOR"] },
  {
    title: "En validacion",
    statuses: ["APROBADA_SUPERVISOR", "EN_VALIDACION_CALIDAD", "EN_VALIDACION_SEGURIDAD", "EN_VALIDACION_MANTENIMIENTO"]
  },
  { title: "Aprobada para implementar", statuses: ["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA"] },
  { title: "En implementacion", statuses: ["EN_IMPLEMENTACION"] },
  { title: "Validacion final", statuses: ["IMPLEMENTADA", "EN_VALIDACION_FINAL"] },
  { title: "Cerrada", statuses: ["CERRADA"] },
  { title: "Rechazada / Cancelada", statuses: ["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION", "CANCELADA", "VENCIDA"] }
];

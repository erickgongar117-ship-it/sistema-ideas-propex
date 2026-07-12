import {
  ApprovalStatus,
  ApprovalType,
  Classification,
  IdeaStatus,
  IdeaCategory,
  GenbaStatus,
  KaizenStatus,
  Priority,
  Role,
  WorkItemStatus
} from "@prisma/client";

export const ideaCategoryLabels: Record<IdeaCategory, string> = {
  A: "Categoría A · Operador y supervisor",
  B: "Categoría B · Apoyo interno",
  C: "Categoría C · Externo o cotización"
};

export const kaizenStatusLabels: Record<KaizenStatus, string> = {
  PENDIENTE_CHARTER: "Pendiente de Project Charter",
  PLANIFICACION: "En planificación",
  EN_CURSO: "En curso",
  EN_PAUSA: "En pausa",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado"
};

export const genbaStatusLabels: Record<GenbaStatus, string> = {
  ABIERTO: "Abierto",
  CERRADO: "Cerrado",
  CANCELADO: "Cancelado"
};

export const workItemStatusLabels: Record<WorkItemStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  BLOQUEADA: "Bloqueada",
  COMPLETADA: "Completada",
  CANCELADA: "Cerrada sin ejecutar",
  COMBINADA: "Combinada"
};

export const genbaDepartments = [
  "Calidad / Inocuidad",
  "Mantenimiento",
  "Producción",
  "Seguridad",
  "Mejora Continua",
  "Almacén",
  "Supervisión"
];

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
  EN_REVISION_SUPERVISOR: "En revisión de supervisor",
  RECHAZADA_SUPERVISOR: "Rechazada por supervisor",
  SOLICITUD_INFORMACION: "Solicitud de información",
  APROBADA_SUPERVISOR: "Aprobada por supervisor",
  EN_VALIDACION_CALIDAD: "En validación Calidad/Inocuidad",
  EN_VALIDACION_SEGURIDAD: "En validación Seguridad",
  EN_VALIDACION_MANTENIMIENTO: "En validación Mantenimiento",
  RECHAZADA_VALIDACION: "Rechazada en validación",
  APROBADA_PARA_IMPLEMENTAR: "Aprobada para implementar",
  CLASIFICACION_MEJORA_CONTINUA: "Clasificación Mejora Continua",
  EN_IMPLEMENTACION: "En implementación",
  IMPLEMENTADA: "Implementada",
  EN_VALIDACION_FINAL: "En validación final",
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
  CRITICA: "Crítica"
};

export const classificationLabels: Record<Classification, string> = {
  IDEA_RAPIDA: "Idea de mejora",
  ACCION_MANTENIMIENTO: "Acción de mantenimiento",
  KAIZEN: "Kaizen",
  PROYECTO_DMAIC: "Proyecto DMAIC",
  CINCO_S_GESTION_VISUAL: "5S / Gestión visual",
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
  MORE_INFO: "Más información"
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

export function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

export function workProgress(items: Array<{ status: WorkItemStatus }>) {
  const relevant = items.filter((item) => item.status !== "COMBINADA");
  const closed = relevant.filter((item) => item.status === "COMPLETADA" || item.status === "CANCELADA").length;
  return {
    total: relevant.length,
    closed,
    open: relevant.length - closed,
    percent: relevant.length ? Math.round((closed / relevant.length) * 100) : 0
  };
}

export function attendancePercent(expectedValue: string, attendedValue: string) {
  const expected = parseStringArray(expectedValue);
  const attended = new Set(parseStringArray(attendedValue));
  if (!expected.length) return 0;
  return Math.round((expected.filter((department) => attended.has(department)).length / expected.length) * 100);
}

export function isWorkItemOverdue(item: { dueDate: Date | null; status: WorkItemStatus }) {
  return Boolean(item.dueDate && item.dueDate < new Date() && !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(item.status));
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
  { title: "En revisión de supervisor", statuses: ["REGISTRADA", "EN_REVISION_SUPERVISOR"] },
  {
    title: "En validación",
    statuses: ["APROBADA_SUPERVISOR", "EN_VALIDACION_CALIDAD", "EN_VALIDACION_SEGURIDAD", "EN_VALIDACION_MANTENIMIENTO"]
  },
  { title: "Aprobada para implementar", statuses: ["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA"] },
  { title: "En implementación", statuses: ["EN_IMPLEMENTACION"] },
  { title: "Validación final", statuses: ["IMPLEMENTADA", "EN_VALIDACION_FINAL"] },
  { title: "Cerrada", statuses: ["CERRADA"] },
  { title: "Rechazada / Cancelada", statuses: ["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION", "CANCELADA", "VENCIDA"] }
];

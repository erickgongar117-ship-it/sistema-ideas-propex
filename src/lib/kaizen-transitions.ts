import type { KaizenStatus } from "@prisma/client";

export const KAIZEN_STAGE_ORDER: KaizenStatus[] = [
  "PENDIENTE_CHARTER",
  "PLANIFICACION",
  "EN_CURSO",
  "EN_PAUSA",
  "COMPLETADO",
  "CANCELADO"
];

export type KaizenStageContext = {
  hasCharter: boolean;
  activityCount: number;
};

export type KaizenTransitionVia = "drag" | "menu" | "undo" | "form";

export type KaizenStageTransitionResult =
  | {
      ok: true;
      status: KaizenStatus;
      message: string;
    }
  | {
      ok: false;
      code: "PERMISO" | "TRANSICION" | "REQUISITO" | "CONFLICTO" | "CERRADO" | "NO_ENCONTRADO";
      message: string;
    };

const ACTIVE_TRANSITIONS: Partial<Record<KaizenStatus, KaizenStatus[]>> = {
  PENDIENTE_CHARTER: ["PLANIFICACION"],
  PLANIFICACION: ["EN_CURSO"],
  EN_CURSO: ["PLANIFICACION", "EN_PAUSA"],
  EN_PAUSA: ["EN_CURSO"]
};

export function kaizenStageRequirement(
  from: KaizenStatus,
  to: KaizenStatus,
  context: KaizenStageContext
) {
  if (from === "PENDIENTE_CHARTER" && to === "PLANIFICACION" && !context.hasCharter) {
    return "Carga el Project Charter antes de pasar a planificacion.";
  }
  if (from === "PLANIFICACION" && to === "EN_CURSO" && context.activityCount < 1) {
    return "Agrega al menos una actividad antes de iniciar el Kaizen.";
  }
  return null;
}

export function kaizenAllowedStageTargets(status: KaizenStatus, context: KaizenStageContext) {
  return (ACTIVE_TRANSITIONS[status] ?? []).filter(
    (target) => !kaizenStageRequirement(status, target, context)
  );
}

export function validateKaizenStageTransition(
  from: KaizenStatus,
  to: KaizenStatus,
  context: KaizenStageContext
) {
  if (from === to) return { ok: true as const };
  if (from === "COMPLETADO" || from === "CANCELADO") {
    return { ok: false as const, code: "CERRADO" as const, message: "El Kaizen ya esta cerrado y solo puede consultarse." };
  }
  if (!(ACTIVE_TRANSITIONS[from] ?? []).includes(to)) {
    return { ok: false as const, code: "TRANSICION" as const, message: "Ese cambio de etapa no forma parte del flujo Kaizen." };
  }
  const requirement = kaizenStageRequirement(from, to, context);
  if (requirement) return { ok: false as const, code: "REQUISITO" as const, message: requirement };
  return { ok: true as const };
}

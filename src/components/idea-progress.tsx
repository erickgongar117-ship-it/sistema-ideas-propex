import type { IdeaStatus } from "@prisma/client";
import { Check, X } from "lucide-react";

const stages = ["Captura", "Supervisor", "Validaciones", "Implementación", "Cierre"];

const stageByStatus: Record<IdeaStatus, number> = {
  REGISTRADA: 0,
  EN_REVISION_SUPERVISOR: 1,
  RECHAZADA_SUPERVISOR: 1,
  SOLICITUD_INFORMACION: 1,
  APROBADA_SUPERVISOR: 2,
  EN_VALIDACION_CALIDAD: 2,
  EN_VALIDACION_SEGURIDAD: 2,
  EN_VALIDACION_MANTENIMIENTO: 2,
  RECHAZADA_VALIDACION: 2,
  APROBADA_PARA_IMPLEMENTAR: 3,
  CLASIFICACION_MEJORA_CONTINUA: 3,
  EN_IMPLEMENTACION: 3,
  IMPLEMENTADA: 4,
  EN_VALIDACION_FINAL: 4,
  CERRADA: 4,
  CANCELADA: 4,
  VENCIDA: 3
};

const stoppedStatuses: IdeaStatus[] = ["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION", "CANCELADA"];

export function IdeaProgress({ status }: { status: IdeaStatus }) {
  const current = stageByStatus[status];
  const stopped = stoppedStatuses.includes(status);
  return (
    <ol aria-label="Progreso de la idea" className="grid grid-cols-5 gap-1 sm:gap-2">
      {stages.map((stage, index) => {
        const complete = index < current || status === "CERRADA";
        const active = index === current && status !== "CERRADA";
        const halted = active && stopped;
        return (
          <li className="min-w-0" key={stage}>
            <div className="flex items-center">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold ${complete ? "border-emerald-700 bg-emerald-700 text-white" : halted ? "border-rose-600 bg-rose-600 text-white" : active ? "border-[var(--role-accent)] bg-[var(--role-accent)] text-white" : "border-slate-300 bg-white text-slate-500"}`}>
                {complete ? <Check className="h-4 w-4" aria-hidden /> : halted ? <X className="h-4 w-4" aria-hidden /> : index + 1}
              </span>
              {index < stages.length - 1 ? <span className={`h-px flex-1 ${index < current ? "bg-emerald-600" : "bg-slate-300"}`} /> : null}
            </div>
            <p className={`mt-2 text-center text-[9px] font-extrabold leading-3 sm:text-xs ${complete || active ? "text-slate-800" : "text-slate-400"}`}>{stage}</p>
          </li>
        );
      })}
    </ol>
  );
}

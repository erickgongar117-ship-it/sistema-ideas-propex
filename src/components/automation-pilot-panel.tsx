import type { ComponentType } from "react";
import {
  CircleCheck,
  CircleHelp,
  ExternalLink,
  FlaskConical,
  Mail,
  PauseCircle,
  ShieldAlert,
  TriangleAlert,
  Workflow
} from "lucide-react";
import type { AutomationPilotConfig, AutomationPilotState } from "@/lib/automation-pilot";

type StatePresentation = {
  label: string;
  detail: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: string;
  border: string;
};

const statePresentation: Record<AutomationPilotState, StatePresentation> = {
  NOT_CONFIGURED: {
    label: "No configurado",
    detail: "La bandera de prueba está activa, pero falta registrar el piloto.",
    icon: CircleHelp,
    tone: "border-slate-300 bg-slate-50 text-slate-700",
    border: "border-l-slate-400"
  },
  ACTIVE_UNTESTED: {
    label: "Activado · prueba pendiente",
    detail: "El flujo está encendido; todavía falta una prueba controlada de punta a punta.",
    icon: FlaskConical,
    tone: "border-amber-300 bg-amber-50 text-amber-900",
    border: "border-l-amber-500"
  },
  VERIFIED: {
    label: "Prueba verificada",
    detail: "La última prueba controlada terminó con la salida esperada.",
    icon: CircleCheck,
    tone: "border-emerald-300 bg-emerald-50 text-emerald-900",
    border: "border-l-emerald-600"
  },
  DEGRADED: {
    label: "Prueba con incidencia",
    detail: "Se observó una falla y el piloto requiere revisión antes de repetir la prueba.",
    icon: TriangleAlert,
    tone: "border-rose-300 bg-rose-50 text-rose-900",
    border: "border-l-rose-600"
  },
  PAUSED: {
    label: "Piloto pausado",
    detail: "El flujo está detenido y no debe recibir pruebas nuevas.",
    icon: PauseCircle,
    tone: "border-slate-300 bg-slate-50 text-slate-700",
    border: "border-l-slate-500"
  },
  UNKNOWN: {
    label: "Estado sin verificar",
    detail: "No hay una comprobación reciente del estado externo del flujo.",
    icon: CircleHelp,
    tone: "border-slate-300 bg-slate-50 text-slate-700",
    border: "border-l-slate-400"
  }
};

function AutomationStatusPill({ state }: { state: AutomationPilotState }) {
  const presentation = statePresentation[state];
  const Icon = presentation.icon;
  return (
    <span className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold ${presentation.tone}`}>
      <Icon className="h-4 w-4" aria-hidden />
      {presentation.label}
    </span>
  );
}

function formattedDate(date?: Date) {
  if (!date) return "Sin prueba controlada";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City"
  }).format(date);
}

export function AutomationPilotPanel({ pilot, isAdmin }: { pilot: AutomationPilotConfig; isAdmin: boolean }) {
  const presentation = statePresentation[pilot.state];
  return (
    <section aria-labelledby="automation-pilot-title" className={`surface mb-6 border-l-4 ${presentation.border}`}>
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-brand-700">
            <FlaskConical className="h-4 w-4" aria-hidden />
            Piloto Microsoft 365 · No oficial
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-ink" id="automation-pilot-title">Automatización de captura por correo</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{presentation.detail}</p>
        </div>
        <AutomationStatusPill state={pilot.state} />
      </div>

      <div className="grid border-y border-line bg-panel sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Entrada de prueba", "Correo en Inbox", Mail],
          ["Regla", "Asunto inicia con [PROPEX-IDEA]", ShieldAlert],
          ["Salida aislada", "HTML en OneDrive", Workflow],
          ["Última verificación", formattedDate(pilot.verifiedAt), CircleCheck]
        ].map(([label, value, Icon]) => {
          const FactIcon = Icon as ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
          return (
            <div className="flex min-h-24 gap-3 border-b border-line p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0" key={label as string}>
              <FactIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-slate-500">{label as string}</p>
                <p className="mt-1 break-words text-sm font-extrabold leading-5 text-ink">{value as string}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-5">
        <div className="alert alert-warning mb-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-extrabold">Piloto completamente aislado</p>
            <p className="mt-0.5 leading-5">No crea ni modifica Ideas en la base maestra, no ejecuta aprobaciones y no registra movimientos de ProbocaCoins.</p>
          </div>
        </div>

        {isAdmin ? (
          <details className="details-panel">
            <summary><span className="flex items-center gap-2"><Workflow className="h-4 w-4 text-slate-600" aria-hidden />Detalles técnicos del piloto</span></summary>
            <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
              <div><p className="label">Nombre</p><p className="break-words font-bold text-ink">{pilot.flowName}</p></div>
              <div><p className="label">Flow ID</p><p className="break-all font-mono text-xs text-slate-700">{pilot.flowId ?? "No registrado"}</p></div>
              {pilot.flowUrl ? (
                <div className="sm:col-span-2">
                  <a className="btn btn-secondary min-h-11 w-full sm:w-auto" href={pilot.flowUrl} rel="noreferrer" target="_blank">
                    Abrir en Power Automate
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

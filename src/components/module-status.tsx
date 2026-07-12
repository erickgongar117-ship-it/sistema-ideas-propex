import type { GenbaStatus, KaizenStatus, WorkItemStatus } from "@prisma/client";
import { genbaStatusLabels, kaizenStatusLabels, workItemStatusLabels } from "@/lib/domain";

const kaizenTone: Record<KaizenStatus, string> = {
  PENDIENTE_CHARTER: "border-amber-200 bg-amber-50 text-amber-800",
  PLANIFICACION: "border-sky-200 bg-sky-50 text-sky-800",
  EN_CURSO: "border-emerald-200 bg-emerald-50 text-emerald-800",
  EN_PAUSA: "border-slate-300 bg-slate-100 text-slate-700",
  COMPLETADO: "border-emerald-700 bg-emerald-700 text-white",
  CANCELADO: "border-rose-200 bg-rose-50 text-rose-700"
};

const workTone: Record<WorkItemStatus, string> = {
  PENDIENTE: "border-amber-200 bg-amber-50 text-amber-800",
  EN_PROCESO: "border-blue-200 bg-blue-50 text-blue-800",
  BLOQUEADA: "border-rose-200 bg-rose-50 text-rose-700",
  COMPLETADA: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELADA: "border-slate-300 bg-slate-100 text-slate-700",
  COMBINADA: "border-violet-200 bg-violet-50 text-violet-800"
};

const genbaTone: Record<GenbaStatus, string> = {
  ABIERTO: "border-red-200 bg-red-50 text-red-800",
  CERRADO: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELADO: "border-slate-300 bg-slate-100 text-slate-700"
};

function Pill({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${className}`}>{label}</span>;
}

export function KaizenStatusPill({ status }: { status: KaizenStatus }) {
  return <Pill className={kaizenTone[status]} label={kaizenStatusLabels[status]} />;
}

export function WorkStatusPill({ status }: { status: WorkItemStatus }) {
  return <Pill className={workTone[status]} label={workItemStatusLabels[status]} />;
}

export function GenbaStatusPill({ status }: { status: GenbaStatus }) {
  return <Pill className={genbaTone[status]} label={genbaStatusLabels[status]} />;
}

import type { IdeaStatus } from "@prisma/client";
import { statusLabels, statusTone } from "@/lib/domain";

const toneClass = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  yellow: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-rose-200 bg-rose-50 text-rose-800",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  gray: "border-slate-200 bg-slate-100 text-slate-700",
  purple: "border-violet-200 bg-violet-50 text-violet-800"
};

export function StatusPill({ status }: { status: IdeaStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${toneClass[statusTone[status]]}`}>
      {statusLabels[status]}
    </span>
  );
}

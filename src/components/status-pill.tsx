import type { IdeaStatus } from "@prisma/client";
import { statusLabels, statusTone } from "@/lib/domain";

const toneClass = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800 before:bg-emerald-600",
  yellow: "border-amber-200 bg-amber-50 text-amber-900 before:bg-amber-500",
  red: "border-rose-200 bg-rose-50 text-rose-800 before:bg-rose-600",
  blue: "border-blue-200 bg-blue-50 text-blue-800 before:bg-blue-600",
  gray: "border-slate-200 bg-slate-100 text-slate-700 before:bg-slate-500",
  purple: "border-violet-200 bg-violet-50 text-violet-800 before:bg-violet-600"
};

export function StatusPill({ status }: { status: IdeaStatus }) {
  return (
    <span className={`inline-flex min-h-7 w-fit max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold leading-4 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:content-[''] ${toneClass[statusTone[status]]}`}>
      <span className="truncate">{statusLabels[status]}</span>
    </span>
  );
}

import type { WorkItemStatus } from "@prisma/client";
import { CalendarDays, ChevronDown, UserRound } from "lucide-react";
import { WorkStatusPill } from "@/components/module-status";

const borderTone = {
  amber: "border-l-amber-500",
  red: "border-l-brand-500"
};

export function WorkItemDisclosure({
  id,
  number,
  title,
  description,
  owner,
  dueDate,
  overdue,
  status,
  tone,
  children
}: {
  id: string;
  number: number;
  title: string;
  description?: string | null;
  owner?: string | null;
  dueDate?: Date | null;
  overdue?: boolean;
  status: WorkItemStatus;
  tone: keyof typeof borderTone;
  children: React.ReactNode;
}) {
  const muted = status === "COMBINADA";
  return (
    <details className={`work-item-disclosure border-l-4 ${borderTone[tone]} ${muted ? "opacity-70" : ""}`} id={id}>
      <summary className="grid min-h-[78px] cursor-pointer list-none grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 bg-white px-3 py-3 transition hover:bg-slate-50 sm:px-4 md:grid-cols-[34px_minmax(220px,1fr)_minmax(130px,0.35fr)_118px_auto]">
        <span className="flex h-8 w-8 items-center justify-center bg-slate-100 text-xs font-extrabold text-slate-700">{number}</span>
        <span className="min-w-0">
          <span className="line-clamp-2 block text-sm font-extrabold leading-5 text-ink">{title}</span>
          {description ? <span className="mt-1 line-clamp-1 block text-[11px] text-slate-500">{description}</span> : null}
          <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500 md:hidden"><span>{owner || "Sin responsable"}</span><span className={overdue ? "text-rose-700" : ""}>{dueDate ? dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</span></span>
        </span>
        <span className="hidden min-w-0 items-center gap-2 text-xs text-slate-600 md:flex"><UserRound className="h-4 w-4 shrink-0 text-slate-400" aria-hidden /><span className="truncate font-bold">{owner || "Sin responsable"}</span></span>
        <span className={`hidden items-center gap-2 whitespace-nowrap text-xs font-bold md:flex ${overdue ? "text-rose-700" : "text-slate-600"}`}><CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />{dueDate ? dueDate.toLocaleDateString("es-MX") : "Sin fecha"}</span>
        <span className="flex items-center justify-end gap-2"><WorkStatusPill status={status} /><ChevronDown className="work-item-chevron hidden h-4 w-4 shrink-0 text-slate-400 transition sm:block" aria-hidden /></span>
      </summary>
      <div className="border-t border-line bg-slate-50/60 p-4 sm:p-5">{children}</div>
    </details>
  );
}

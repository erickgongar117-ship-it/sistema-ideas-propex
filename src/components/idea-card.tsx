import type { Area, Idea, User } from "@prisma/client";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, UserRound } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { ideaCategoryLabels, isOverdue } from "@/lib/domain";

type IdeaWithBasics = Idea & {
  area: Area;
  supervisor?: User | null;
  implementationOwner?: User | null;
};

export function IdeaCard({ idea }: { idea: IdeaWithBasics }) {
  const overdue = isOverdue(idea);
  return (
    <Link className="surface surface-interactive group block min-h-[190px] rounded-lg p-4" href={`/ideas/${idea.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.06em] text-slate-500">{idea.area.code}</p>
          <p className="mt-0.5 text-sm font-extrabold text-ink">{idea.folio}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-slate-900" aria-hidden />
      </div>
      <p className="mt-3 line-clamp-3 text-sm font-semibold leading-5 text-slate-800">{idea.problem}</p>
      <p className="mt-2 text-[10px] font-extrabold uppercase text-emerald-700">{ideaCategoryLabels[idea.category]}</p>
      <div className="mt-4">
        <StatusPill status={idea.status} />
      </div>
      <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-[11px] text-slate-600">
        <p className="flex min-w-0 items-center gap-2">
          <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{idea.implementationOwner?.name ?? idea.supervisor?.name ?? "Sin responsable"}</span>
        </p>
        <p className={`flex items-center gap-2 font-semibold ${overdue ? "text-rose-700" : ""}`}>
          <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha compromiso"}
        </p>
      </div>
    </Link>
  );
}

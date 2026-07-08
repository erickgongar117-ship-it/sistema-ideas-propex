import type { Area, Idea, User } from "@prisma/client";
import Link from "next/link";
import { CalendarDays, UserRound } from "lucide-react";
import { StatusPill } from "@/components/status-pill";

type IdeaWithBasics = Idea & {
  area: Area;
  supervisor?: User | null;
  implementationOwner?: User | null;
};

export function IdeaCard({ idea }: { idea: IdeaWithBasics }) {
  return (
    <Link className="block rounded-lg border border-line bg-white p-4 shadow-sm hover:border-brand-500" href={`/ideas/${idea.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-ink">{idea.folio}</p>
          <p className="text-xs font-bold text-slate-500">{idea.area.code}</p>
        </div>
        <StatusPill status={idea.status} />
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-800">{idea.problem}</p>
      <div className="mt-4 space-y-1 text-xs text-slate-600">
        <p className="flex items-center gap-2">
          <UserRound className="h-3.5 w-3.5" aria-hidden />
          {idea.implementationOwner?.name ?? idea.supervisor?.name ?? "Sin responsable"}
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {idea.dueDate ? idea.dueDate.toLocaleDateString("es-MX") : "Sin fecha compromiso"}
        </p>
      </div>
    </Link>
  );
}

import type { Approval, ApprovalStatus, ApprovalType, Area, Idea, User } from "@prisma/client";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, Clock3, HelpCircle, UserRound, X } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { approvalStatusLabels, ideaCategoryLabels, isOverdue } from "@/lib/domain";

type IdeaWithBasics = Idea & {
  area: Area;
  supervisor?: User | null;
  implementationOwner?: User | null;
  approvals: Approval[];
};

const validationOrder: ApprovalType[] = ["SUPERVISOR", "CALIDAD", "SEGURIDAD", "MANTENIMIENTO"];

const validationLabels: Partial<Record<ApprovalType, string>> = {
  SUPERVISOR: "Supervisor",
  CALIDAD: "Calidad",
  SEGURIDAD: "Seguridad",
  MANTENIMIENTO: "Mantenimiento"
};

const departmentBorder: Partial<Record<ApprovalType, string>> = {
  SUPERVISOR: "border-l-emerald-600",
  CALIDAD: "border-l-red-600",
  SEGURIDAD: "border-l-slate-500",
  MANTENIMIENTO: "border-l-blue-600"
};

const validationStatus: Record<ApprovalStatus, { icon: typeof Check; tone: string }> = {
  APPROVED: { icon: Check, tone: "bg-emerald-50 text-emerald-800" },
  REJECTED: { icon: X, tone: "bg-rose-50 text-rose-800" },
  MORE_INFO: { icon: HelpCircle, tone: "bg-amber-50 text-amber-800" },
  PENDING: { icon: Clock3, tone: "bg-slate-100 text-slate-700" }
};

export function IdeaCard({ idea }: { idea: IdeaWithBasics }) {
  const overdue = isOverdue(idea);
  const validations = idea.approvals
    .filter((approval) => validationOrder.includes(approval.type))
    .sort((a, b) => validationOrder.indexOf(a.type) - validationOrder.indexOf(b.type));
  return (
    <Link className="surface surface-interactive group block rounded-lg p-4" href={`/ideas/${idea.id}`}>
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
      {validations.length ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-[10px] font-extrabold uppercase text-slate-500">Validaciones por area</p>
          <div className="grid grid-cols-2 gap-1.5">
            {validations.map((approval) => {
              const status = validationStatus[approval.status];
              const ValidationIcon = status.icon;
              return (
                <span className={`min-w-0 border border-line border-l-4 bg-white px-2 py-1.5 ${departmentBorder[approval.type] ?? "border-l-slate-400"}`} key={approval.id} title={`${validationLabels[approval.type]}: ${approvalStatusLabels[approval.status]}`}>
                  <span className="block truncate text-[9px] font-extrabold uppercase text-slate-500">{validationLabels[approval.type]}</span>
                  <span className={`mt-1 flex w-fit max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-extrabold ${status.tone}`}>
                    <ValidationIcon className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">{approvalStatusLabels[approval.status]}</span>
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
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

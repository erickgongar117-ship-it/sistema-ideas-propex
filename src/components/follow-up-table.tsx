import Link from "next/link";
import { ArrowRight, CalendarClock, CircleAlert, ClipboardCheck, Footprints, Lightbulb } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export type FollowUpModule = "IDEA" | "KAIZEN" | "GENBA";
export type FollowUpTone = "amber" | "blue" | "green" | "red" | "slate" | "violet";

export type FollowUpRow = {
  key: string;
  module: FollowUpModule;
  reference: string;
  title: string;
  subtitle: string;
  location: string;
  assignment: string;
  status: string;
  statusTone: FollowUpTone;
  href: string;
  dueDate: Date | null;
  updatedAt: Date;
  overdue: boolean;
  progress?: {
    completed: number;
    total: number;
    percent: number;
  };
};

const moduleMeta = {
  IDEA: {
    label: "Idea",
    icon: Lightbulb,
    className: "border-rose-200 bg-rose-50 text-rose-800"
  },
  KAIZEN: {
    label: "Kaizen",
    icon: ClipboardCheck,
    className: "border-slate-300 bg-slate-950 text-white"
  },
  GENBA: {
    label: "GENBA",
    icon: Footprints,
    className: "border-blue-200 bg-blue-50 text-blue-800"
  }
} as const;

const statusClasses: Record<FollowUpTone, string> = {
  amber: "border-amber-200 bg-amber-50 text-amber-900 before:bg-amber-500",
  blue: "border-blue-200 bg-blue-50 text-blue-800 before:bg-blue-600",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800 before:bg-emerald-600",
  red: "border-rose-200 bg-rose-50 text-rose-800 before:bg-rose-600",
  slate: "border-slate-200 bg-slate-100 text-slate-700 before:bg-slate-500",
  violet: "border-violet-200 bg-violet-50 text-violet-800 before:bg-violet-600"
};

function ModuleBadge({ module }: { module: FollowUpModule }) {
  const meta = moduleMeta[module];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-extrabold ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

function FollowUpStatus({ label, tone }: { label: string; tone: FollowUpTone }) {
  return (
    <span className={`inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold leading-4 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:content-[''] ${statusClasses[tone]}`}>
      <span className="truncate">{label}</span>
    </span>
  );
}

function ProgressCell({ progress }: { progress: NonNullable<FollowUpRow["progress"]> }) {
  return (
    <div className="min-w-28">
      <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold text-slate-600">
        <span>{progress.completed} de {progress.total}</span>
        <span>{progress.percent}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${progress.percent}% completado`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}

function DateCell({ row }: { row: FollowUpRow }) {
  if (!row.dueDate) {
    return <span className="text-xs text-slate-500">Sin compromiso</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold ${row.overdue ? "text-rose-700" : "text-slate-700"}`}>
      {row.overdue ? <CircleAlert className="h-3.5 w-3.5" aria-hidden /> : <CalendarClock className="h-3.5 w-3.5" aria-hidden />}
      {row.dueDate.toLocaleDateString("es-MX")}
    </span>
  );
}

export function FollowUpTable({
  rows,
  emptyTitle,
  emptyDescription
}: {
  rows: FollowUpRow[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (!rows.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <>
      <div className="mobile-card-list">
        {rows.map((row) => (
          <Link className="surface surface-interactive block rounded-lg p-4" href={row.href} key={row.key}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ModuleBadge module={row.module} />
                  <span className="text-sm font-extrabold text-brand-700">{row.reference}</span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-extrabold leading-5 text-ink">{row.title}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{row.subtitle}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </div>
            <div className="mt-4 grid gap-3 border-t border-line pt-3 text-xs">
              <div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-500">Ubicación</span><span className="truncate text-right font-extrabold text-slate-700">{row.location}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-500">Asignación</span><span className="text-right font-extrabold text-slate-700">{row.assignment}</span></div>
              <div className="flex flex-wrap items-center justify-between gap-3"><FollowUpStatus label={row.status} tone={row.statusTone} /><DateCell row={row} /></div>
              {row.progress ? <ProgressCell progress={row.progress} /> : null}
            </div>
          </Link>
        ))}
      </div>

      <div className="table-wrap desktop-table-only min-w-0 max-w-full">
        <table className="data-table">
          <thead>
            <tr>
              <th>Seguimiento</th>
              <th>Responsabilidad</th>
              <th>Estado</th>
              <th>Avance</th>
              <th>Fechas</th>
              <th><span className="sr-only">Abrir</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="min-w-64 max-w-md">
                  <div className="flex flex-wrap items-center gap-2">
                    <ModuleBadge module={row.module} />
                    <Link className="font-extrabold text-brand-700 hover:underline" href={row.href}>{row.reference}</Link>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-ink">{row.title}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{row.subtitle}</p>
                </td>
                <td className="min-w-48 max-w-64 text-xs">
                  <p className="font-extrabold text-slate-700">{row.location}</p>
                  <p className="mt-1.5 font-bold leading-5 text-slate-500">{row.assignment}</p>
                </td>
                <td><FollowUpStatus label={row.status} tone={row.statusTone} /></td>
                <td>{row.progress ? <ProgressCell progress={row.progress} /> : <span className="text-xs text-slate-400">No aplica</span>}</td>
                <td className="min-w-32">
                  <DateCell row={row} />
                  <p className="mt-1.5 whitespace-nowrap text-[11px] text-slate-500">Actualizado {row.updatedAt.toLocaleDateString("es-MX")}</p>
                </td>
                <td>
                  <Link aria-label={`Abrir ${row.reference}`} className="icon-button h-9 w-9 min-w-9" href={row.href} title="Abrir seguimiento">
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

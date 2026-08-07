import Link from "next/link";
import { ArrowRight, CalendarCheck2, Paperclip, UserRound, UsersRound } from "lucide-react";
import { ProbocaCoin } from "@/components/proboca-coin";

export type RepositoryEntry = {
  href: string;
  folio: string;
  title: string;
  subtitle: string;
  status: string;
  statusTone: "green" | "red" | "gray";
  closedAt: Date;
  owner: string;
  team: string;
  progress: string;
  evidence: string;
  coins: number;
  recipients: number;
};

const statusTone = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  red: "border-rose-200 bg-rose-50 text-rose-800",
  gray: "border-slate-300 bg-slate-100 text-slate-700"
};

export function RepositoryList({ entries }: { entries: RepositoryEntry[] }) {
  if (!entries.length) {
    return <div className="surface border-dashed p-10 text-center text-sm text-slate-500">No hay expedientes cerrados con estos filtros.</div>;
  }

  return (
    <div className="divide-y divide-line border-y border-line bg-white">
      {entries.map((entry) => (
        <Link className="group block px-3 py-4 transition hover:bg-slate-50 sm:px-4" href={entry.href} key={`${entry.href}:${entry.folio}`}>
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.3fr)_minmax(180px,0.7fr)_160px_130px_44px] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-extrabold text-brand-700">{entry.folio}</span><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${statusTone[entry.statusTone]}`}>{entry.status}</span></div>
              <p className="mt-1 truncate text-sm font-extrabold text-ink">{entry.title}</p>
              <p className="mt-1 line-clamp-1 text-xs text-slate-500">{entry.subtitle}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs lg:grid-cols-1">
              <span className="flex min-w-0 items-center gap-2"><UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden /><span className="truncate font-bold text-slate-700">{entry.owner}</span></span>
              <span className="flex min-w-0 items-center gap-2"><UsersRound className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden /><span className="truncate text-slate-500">{entry.team}</span></span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs lg:grid-cols-1">
              <span className="flex items-center gap-2"><CalendarCheck2 className="h-3.5 w-3.5 text-slate-400" aria-hidden />{entry.closedAt.toLocaleDateString("es-MX")}</span>
              <span className="flex items-center gap-2 text-slate-500"><Paperclip className="h-3.5 w-3.5 text-slate-400" aria-hidden />{entry.evidence} · {entry.progress}</span>
            </div>
            <div className="flex items-center justify-between gap-3 lg:block lg:text-right">
              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold tabular-nums text-ink"><ProbocaCoin size="sm" />{entry.coins.toLocaleString("es-MX")}</span>
              <span className="ml-2 text-[10px] font-bold text-slate-500">{entry.recipients} {entry.recipients === 1 ? "persona" : "personas"}</span>
            </div>
            <span className="hidden h-9 w-9 items-center justify-center text-slate-400 transition group-hover:text-brand-700 lg:flex"><ArrowRight className="h-4 w-4" aria-hidden /></span>
          </div>
        </Link>
      ))}
    </div>
  );
}

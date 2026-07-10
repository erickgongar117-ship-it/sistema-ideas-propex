import type { ComponentType } from "react";

const toneClasses = {
  neutral: "bg-slate-100 text-slate-700",
  dark: "bg-slate-950 text-white",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-rose-50 text-rose-700",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-800"
};

export function BarList({ rows, color = "var(--role-accent)" }: { rows: Array<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="space-y-3.5">
      {rows.map((row) => (
        <div className="grid grid-cols-[minmax(72px,112px)_1fr_32px] items-center gap-3" key={row.label}>
          <span className="truncate text-xs font-bold text-slate-600" title={row.label}>{row.label}</span>
          <div aria-label={`${row.label}: ${row.value}`} className="h-2 overflow-hidden rounded-full bg-slate-100" role="img">
            <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${row.value ? Math.max(5, (row.value / max) * 100) : 0}%` }} />
          </div>
          <span className="text-right text-xs font-extrabold text-ink">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <article className="surface min-h-[132px] rounded-lg p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-slate-500">{label}</p>
        {Icon ? (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-extrabold leading-none text-ink">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p> : null}
    </article>
  );
}

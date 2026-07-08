export function BarList({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div className="grid grid-cols-[72px_1fr_36px] items-center gap-3" key={row.label}>
          <span className="text-sm font-bold text-slate-600">{row.label}</span>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </div>
          <span className="text-right text-sm font-bold text-ink">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function KpiCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="surface rounded-lg p-4">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-ink">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

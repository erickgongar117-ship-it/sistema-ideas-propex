export function ProgressMeter({ percent, label = "Avance" }: { percent: number; label?: string }) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-600">{label}</span>
        <span className="font-extrabold text-ink">{safePercent}%</span>
      </div>
      <div aria-label={`${label}: ${safePercent}%`} className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safePercent}>
        <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${safePercent}%` }} />
      </div>
    </div>
  );
}

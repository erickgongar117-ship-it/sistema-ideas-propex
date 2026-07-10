import { CheckCircle2 } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-7 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-3 text-base font-extrabold text-ink">{title}</h2>
      {description ? <p className="mt-1 max-w-lg text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
  );
}

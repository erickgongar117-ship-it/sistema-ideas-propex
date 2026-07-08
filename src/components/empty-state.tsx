import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="surface flex min-h-48 flex-col items-center justify-center rounded-lg p-8 text-center">
      <Inbox className="mb-3 h-9 w-9 text-slate-400" aria-hidden />
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {description ? <p className="mt-1 max-w-lg text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}

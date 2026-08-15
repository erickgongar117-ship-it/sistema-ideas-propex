export function PageHeader({
  title,
  description,
  actions,
  eyebrow = "PROpEx · Ideas de Mejora"
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="mb-4 border-b border-line pb-4 sm:mb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 bg-brand-500" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-700">{eyebrow}</p>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight text-ink sm:text-[1.7rem]">{title}</h1>
          {description ? <p className="mt-1.5 max-w-3xl text-sm leading-5 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

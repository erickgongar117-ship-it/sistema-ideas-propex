const accents = {
  dark: "#171a18",
  green: "#14835f",
  red: "#d32236",
  gray: "#626a70",
  blue: "#176fc1",
  amber: "#b7791f"
};

export function SectionHeading({
  title,
  description,
  count,
  tone = "dark",
  actions
}: {
  title: string;
  description?: string;
  count?: number;
  tone?: keyof typeof accents;
  actions?: React.ReactNode;
}) {
  return (
    <div className="section-heading" style={{ "--section-accent": accents[tone] } as React.CSSProperties}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="section-heading-mark" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold leading-tight text-ink sm:text-xl">{title}</h2>
            {typeof count === "number" ? <span className="rounded-full border border-line bg-white px-2 py-0.5 text-xs font-extrabold text-slate-600">{count}</span> : null}
          </div>
          {description ? <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

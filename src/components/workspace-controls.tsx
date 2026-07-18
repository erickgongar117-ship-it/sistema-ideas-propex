"use client";

import { ArrowRight, CalendarRange, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type WorkspacePeriod = "30" | "90" | "365" | "all";

export const WORKSPACE_PERIOD_EVENT = "propex:period-change";
export const WORKSPACE_PERIOD_STORAGE = "propex-period";

export type WorkspaceSearchItem = {
  href: string;
  label: string;
  group: string;
};

const periodOptions: Array<{ value: WorkspacePeriod; label: string }> = [
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
  { value: "365", label: "1 año" },
  { value: "all", label: "Histórico" }
];

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
}

export function WorkspaceSearch({ items, fullWidth = false }: { items: WorkspaceSearchItem[]; fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previousOverflow;
      setQuery("");
    };
  }, [open]);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-MX");
    if (!normalized) return items.slice(0, 8);
    return items.filter((item) => `${item.label} ${item.group}`.toLocaleLowerCase("es-MX").includes(normalized)).slice(0, 10);
  }, [items, query]);

  return (
    <>
      <button
        aria-expanded={open}
        className={fullWidth ? "workspace-search-trigger is-full" : "workspace-search-trigger"}
        onClick={() => setOpen(true)}
        title="Buscar en el espacio de trabajo"
        type="button"
      >
        <Search className="h-[18px] w-[18px]" aria-hidden />
        <span>Buscar</span>
      </button>
      {open ? (
        <div className="command-search-layer" role="presentation">
          <button aria-label="Cerrar búsqueda" className="command-search-backdrop" onClick={() => setOpen(false)} type="button" />
          <section aria-label="Búsqueda global" aria-modal="true" className="command-search-panel" role="dialog">
            <div className="command-search-input-row">
              <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              <input
                aria-label="Buscar módulo o herramienta"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca un módulo, bandeja o herramienta"
                ref={inputRef}
                value={query}
              />
              <button aria-label="Cerrar búsqueda" className="icon-button" onClick={() => setOpen(false)} title="Cerrar" type="button">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="command-search-results">
              {results.length ? results.map((item) => (
                <Link className="command-search-result" href={item.href} key={`${item.group}-${item.href}`} onClick={() => setOpen(false)}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-ink">{item.label}</span>
                    <span className="mt-0.5 block text-[11px] font-bold uppercase text-slate-500">{item.group}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden />
                </Link>
              )) : (
                <div className="command-search-empty">
                  <Search className="h-6 w-6 text-slate-300" aria-hidden />
                  <p className="mt-3 text-sm font-extrabold text-ink">Sin resultados</p>
                  <p className="mt-1 text-xs text-slate-500">Prueba con el nombre de una bandeja o módulo.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function WorkspacePeriodControl({ fullWidth = false }: { fullWidth?: boolean }) {
  const [period, setPeriod] = useState<WorkspacePeriod>("90");

  useEffect(() => {
    const stored = window.localStorage.getItem(WORKSPACE_PERIOD_STORAGE);
    if (periodOptions.some((option) => option.value === stored)) setPeriod(stored as WorkspacePeriod);
  }, []);

  const updatePeriod = (value: WorkspacePeriod) => {
    setPeriod(value);
    window.localStorage.setItem(WORKSPACE_PERIOD_STORAGE, value);
    window.dispatchEvent(new CustomEvent<WorkspacePeriod>(WORKSPACE_PERIOD_EVENT, { detail: value }));
  };

  return (
    <label className={`workspace-period-control ${fullWidth ? "is-full" : ""}`}>
      <CalendarRange className="h-[18px] w-[18px]" aria-hidden />
      <span className="sr-only">Periodo global</span>
      <select aria-label="Periodo global" onChange={(event) => updatePeriod(event.target.value as WorkspacePeriod)} value={period}>
        {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

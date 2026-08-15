"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Columns3,
  Copy,
  LayoutList,
  Rows3,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";
import { WorkboardInsights } from "@/components/workboard-insights";

export type WorkboardChild = {
  id: string;
  label: string;
  status: string;
  statusLabel: string;
  owner: string;
  dueDate: string | null;
  tone: string;
};

export type WorkboardItem = {
  id: string;
  href: string;
  code: string;
  title: string;
  subtitle: string;
  group: string;
  groupLabel: string;
  groupColor: string;
  statusLabel: string;
  statusColor: string;
  owner: string;
  location: string;
  dueDate: string | null;
  progress: number;
  progressLabel: string;
  risk?: boolean;
  riskLabel?: string;
  tags?: string[];
  children?: WorkboardChild[];
};

export type WorkboardMetric = {
  label: string;
  value: string | number;
  detail: string;
  color: string;
};

type View = "table" | "kanban" | "panel";
type Sort = "priority" | "due" | "progress" | "title";
type Density = "compact" | "comfortable";

const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Monterrey" });

function dueLabel(value: string | null) {
  if (!value) return "Sin fecha";
  const civilDate = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/);
  if (civilDate) {
    const [, year, month, day] = civilDate;
    return DATE_FORMAT.format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12)));
  }
  return DATE_FORMAT.format(new Date(value));
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return `${parts[0][0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function WorkStatus({ color, label }: { color: string; label: string }) {
  const match = color.trim().match(/^#([0-9a-f]{6})$/i);
  const darkText = match ? (() => {
    const value = Number.parseInt(match[1], 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    return (red * 299 + green * 587 + blue * 114) / 255000 > 0.58;
  })() : false;
  return <span className="workboard-status" style={{ backgroundColor: color, color: darkText ? "#171717" : "#ffffff" }}><span>{label}</span></span>;
}

function Owner({ name }: { name: string }) {
  return (
    <span className="workboard-owner" title={name}>
      <span className="workboard-avatar">{initials(name)}</span>
      <span>{name}</span>
    </span>
  );
}

export function OperationsWorkboard({
  items,
  metrics,
  primaryLabel,
  locationLabel = "Ubicacion",
  emptyLabel = "No hay registros con estos filtros"
}: {
  items: WorkboardItem[];
  metrics: WorkboardMetric[];
  primaryLabel: string;
  locationLabel?: string;
  emptyLabel?: string;
}) {
  const [view, setView] = useState<View>("table");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [location, setLocation] = useState("all");
  const [owner, setOwner] = useState("all");
  const [sort, setSort] = useState<Sort>("priority");
  const [density, setDensity] = useState<Density>("comfortable");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [copied, setCopied] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const statuses = useMemo(() => [...new Set(items.map((item) => item.group))], [items]);
  const locations = useMemo(() => [...new Set(items.map((item) => item.location))].sort(), [items]);
  const owners = useMemo(() => [...new Set(items.map((item) => item.owner))].sort((a, b) => a.localeCompare(b, "es-MX")), [items]);
  const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");
  const searchMatched = useMemo(() => items.filter((item) => {
    const searchable = [
      item.code,
      item.title,
      item.subtitle,
      item.owner,
      item.location,
      item.statusLabel,
      ...(item.tags ?? []),
      ...(item.children ?? []).flatMap((child) => [child.label, child.owner, child.statusLabel])
    ].join(" ");
    const matchesQuery = !normalizedQuery || searchable.toLocaleLowerCase("es-MX").includes(normalizedQuery);
    return matchesQuery && (location === "all" || item.location === location);
  }), [items, location, normalizedQuery]);
  const filtered = useMemo(() => {
    const rows = searchMatched.filter((item) => (status === "all" || item.group === status) && (owner === "all" || item.owner === owner));
    return [...rows].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "es-MX");
      if (sort === "progress") return a.progress - b.progress || a.title.localeCompare(b.title, "es-MX");
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (sort === "due") return aDate - bDate || a.title.localeCompare(b.title, "es-MX");
      return Number(Boolean(b.risk)) - Number(Boolean(a.risk)) || aDate - bDate || a.title.localeCompare(b.title, "es-MX");
    });
  }, [owner, searchMatched, sort, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const groups = useMemo(() => statuses.map((key) => {
    const rows = pageItems.filter((item) => item.group === key);
    const allRows = filtered.filter((item) => item.group === key);
    const source = items.find((item) => item.group === key);
    const average = allRows.length ? Math.round(allRows.reduce((sum, item) => sum + item.progress, 0) / allRows.length) : 0;
    return { key, rows, total: allRows.length, average, label: source?.groupLabel ?? key, color: source?.groupColor ?? "#64748b" };
  }).filter((group) => group.rows.length), [filtered, items, pageItems, statuses]);

  const focusedItem = items.find((item) => item.id === focusedId) ?? null;
  const activeFilters = Number(status !== "all") + Number(location !== "all") + Number(owner !== "all");

  useEffect(() => {
    setPage(1);
  }, [location, normalizedQuery, owner, pageSize, sort, status, view]);

  useEffect(() => {
    const preferenceKey = `propex-workboard-${primaryLabel.toLocaleLowerCase("es-MX")}`;
    try {
      const saved = JSON.parse(window.localStorage.getItem(preferenceKey) ?? "{}") as { view?: View; density?: Density; sort?: Sort };
      if (["table", "kanban", "panel"].includes(saved.view ?? "")) setView(saved.view as View);
      if (["compact", "comfortable"].includes(saved.density ?? "")) setDensity(saved.density as Density);
      if (["priority", "due", "progress", "title"].includes(saved.sort ?? "")) setSort(saved.sort as Sort);
    } catch {
      window.localStorage.removeItem(preferenceKey);
    }
  }, [primaryLabel]);

  useEffect(() => {
    const preferenceKey = `propex-workboard-${primaryLabel.toLocaleLowerCase("es-MX")}`;
    window.localStorage.setItem(preferenceKey, JSON.stringify({ view, density, sort }));
  }, [density, primaryLabel, sort, view]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const updatePageSize = () => setPageSize(media.matches ? 12 : 50);
    updatePageSize();
    media.addEventListener("change", updatePageSize);
    return () => media.removeEventListener("change", updatePageSize);
  }, []);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!focusedId) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const drawer = drawerRef.current;
    drawer?.querySelector<HTMLElement>("button, a[href], input, select, textarea")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFocusedId(null);
        return;
      }
      if (event.key !== "Tab" || !drawer) return;
      const focusable = [...drawer.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [focusedId]);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => setter((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectGroup = (ids: string[], checked: boolean) => setSelected((current) => {
    const next = new Set(current);
    ids.forEach((id) => checked ? next.add(id) : next.delete(id));
    return next;
  });

  const copySelectedCodes = async () => {
    const codes = items.filter((item) => selected.has(item.id)).map((item) => item.code);
    if (!codes.length) return;
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className={`workboard is-${density}`} aria-label={`${primaryLabel} - tablero de trabajo`}>
      <div className="workboard-viewbar no-print">
        <div className="workboard-tabs" aria-label="Vista del tablero">
          {([
            ["table", "Tabla", LayoutList],
            ["kanban", "Kanban", Columns3],
            ["panel", "Panel", BarChart3]
          ] as const).map(([value, label, Icon]) => (
            <button aria-pressed={view === value} className={view === value ? "is-active" : ""} key={value} onClick={() => setView(value)} type="button">
              <Icon className="h-4 w-4" aria-hidden />{label}
            </button>
          ))}
        </div>
        <div className="workboard-view-meta"><span className="workboard-live-dot" />{filtered.length} registros</div>
      </div>

      <div className="workboard-toolbar no-print">
        <label className="workboard-search">
          <Search className="h-[18px] w-[18px]" aria-hidden />
          <input aria-label="Buscar en el tablero" onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${primaryLabel.toLocaleLowerCase("es-MX")}`} value={query} />
          {query ? <button aria-label="Limpiar busqueda" onClick={() => setQuery("")} type="button"><X className="h-4 w-4" aria-hidden /></button> : null}
        </label>
        <button aria-expanded={filtersOpen} className={`workboard-filter-button ${filtersOpen || activeFilters ? "is-active" : ""}`} onClick={() => setFiltersOpen((current) => !current)} type="button">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />Filtros{activeFilters ? <span>{activeFilters}</span> : null}
        </button>
        {selected.size ? (
          <div className="workboard-selection">
            <span><Check className="h-4 w-4" aria-hidden />{selected.size} seleccionados</span>
            <Link href={items.find((item) => selected.has(item.id))?.href ?? "#"}>Abrir primero<ArrowRight className="h-4 w-4" aria-hidden /></Link>
            <button onClick={copySelectedCodes} type="button">{copied ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}{copied ? "Copiados" : "Copiar folios"}</button>
            <button aria-label="Limpiar seleccion" onClick={() => setSelected(new Set())} type="button"><X className="h-4 w-4" aria-hidden /></button>
          </div>
        ) : null}
      </div>

      {filtersOpen ? (
        <div className="workboard-filters no-print">
          <label><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos los estados</option>{statuses.map((value) => <option key={value} value={value}>{items.find((item) => item.group === value)?.groupLabel ?? value}</option>)}</select></label>
          <label><span>Responsable</span><select value={owner} onChange={(event) => setOwner(event.target.value)}><option value="all">Todas las personas</option>{owners.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>{locationLabel}</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option value="all">Todas</option>{locations.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>Orden</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="priority">Atencion primero</option><option value="due">Fecha mas cercana</option><option value="progress">Menor avance</option><option value="title">Nombre</option></select></label>
          <div className="workboard-density" role="group" aria-label="Densidad de filas">
            <span>Densidad</span>
            <div><button aria-pressed={density === "comfortable"} className={density === "comfortable" ? "is-active" : ""} onClick={() => setDensity("comfortable")} title="Vista comoda" type="button"><Rows3 className="h-4 w-4" aria-hidden /><span>Comoda</span></button><button aria-pressed={density === "compact"} className={density === "compact" ? "is-active" : ""} onClick={() => setDensity("compact")} title="Vista compacta" type="button"><LayoutList className="h-4 w-4" aria-hidden /><span>Compacta</span></button></div>
          </div>
          {activeFilters ? <button onClick={() => { setStatus("all"); setOwner("all"); setLocation("all"); }} type="button">Limpiar filtros</button> : null}
        </div>
      ) : null}

      {view === "table" ? (
        <div className="workboard-table-view">
          {!groups.length ? <div className="workboard-empty">{emptyLabel}</div> : groups.map((group) => {
            const isCollapsed = collapsed.has(group.key);
            const allSelected = group.rows.every((item) => selected.has(item.id));
            return (
              <section className="workboard-group" key={group.key} style={{ "--group-color": group.color } as React.CSSProperties}>
                <header className="workboard-group-header">
                  <button aria-expanded={!isCollapsed} onClick={() => toggleSet(setCollapsed, group.key)} type="button">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                    <span>{group.label}</span><strong>{group.total}</strong>
                  </button>
                  <span>{group.average}% promedio</span>
                </header>
                {!isCollapsed ? (
                  <div className="workboard-grid">
                    <div className="workboard-grid-head">
                      <label><input aria-label={`Seleccionar filas visibles de ${group.label}`} checked={allSelected} onChange={(event) => selectGroup(group.rows.map((item) => item.id), event.target.checked)} type="checkbox" /></label>
                      <span>{primaryLabel}</span><span>Estado</span><span>Responsable</span><span>{locationLabel}</span><span>Fecha</span><span>Avance</span><span />
                    </div>
                    {group.rows.map((item) => {
                      const isExpanded = expanded.has(item.id);
                      return (
                        <div className={`workboard-item ${item.risk ? "is-risk" : ""}`} key={item.id}>
                          <div className="workboard-grid-row">
                            <label className="workboard-check"><input aria-label={`Seleccionar ${item.code}`} checked={selected.has(item.id)} onChange={() => toggleSet(setSelected, item.id)} type="checkbox" /></label>
                            <div className="workboard-primary-cell">
                              <button aria-label={isExpanded ? `Contraer ${item.code}` : `Mostrar subelementos de ${item.code}`} className="workboard-expand-button" disabled={!item.children?.length} onClick={() => toggleSet(setExpanded, item.id)} type="button">
                                {isExpanded ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
                              </button>
                              <button className="workboard-title-button" onClick={() => setFocusedId(item.id)} type="button"><strong>{item.title}</strong><small>{item.code} · {item.subtitle}</small></button>
                            </div>
                            <div data-label="Estado"><WorkStatus color={item.statusColor} label={item.statusLabel} /></div>
                            <div data-label="Responsable"><Owner name={item.owner} /></div>
                            <div data-label={locationLabel}><span className="workboard-text-cell">{item.location}</span></div>
                            <div data-label="Fecha"><span className={`workboard-date ${item.risk ? "is-risk" : ""}`}><CalendarDays className="h-3.5 w-3.5" aria-hidden />{dueLabel(item.dueDate)}</span></div>
                            <div data-label="Avance" className="workboard-progress-cell"><span><i style={{ width: `${item.progress}%`, backgroundColor: item.statusColor }} /></span><strong>{item.progress}%</strong></div>
                            <Link aria-label={`Abrir ${item.code}`} className="workboard-open" href={item.href}><ArrowRight className="h-4 w-4" aria-hidden /></Link>
                          </div>
                          {isExpanded ? (
                            <div className="workboard-expanded">
                              <div className="workboard-summary">
                                <div><span>Resumen</span><p>{item.subtitle}</p></div>
                                <div><span>Avance</span><p>{item.progressLabel}</p></div>
                                {item.riskLabel ? <div><span>Atencion</span><p className="text-rose-700">{item.riskLabel}</p></div> : null}
                                {item.tags?.length ? <div><span>Etiquetas</span><p>{item.tags.join(" · ")}</p></div> : null}
                              </div>
                              {item.children?.length ? (
                                <div className="workboard-subitems">
                                  <div className="workboard-subitem is-head"><span>Subelemento</span><span>Estado</span><span>Responsable</span><span>Fecha</span></div>
                                  {item.children.map((child) => <div className="workboard-subitem" key={child.id}><strong>{child.label}</strong><WorkStatus color={child.tone} label={child.statusLabel} /><span>{child.owner}</span><span>{dueLabel(child.dueDate)}</span></div>)}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}

      {view === "kanban" ? (
        <div className="workboard-kanban">
          {groups.map((group) => <section className="workboard-kanban-column" key={group.key} style={{ "--group-color": group.color } as React.CSSProperties}>
            <header><span>{group.label}</span><strong>{group.rows.length}</strong></header>
            <div>{group.rows.map((item) => <Link className="workboard-kanban-card" href={item.href} key={item.id}><span className="workboard-kanban-code">{item.code}</span><h3>{item.title}</h3><p>{item.subtitle}</p><div className="workboard-kanban-progress"><span><i style={{ width: `${item.progress}%`, backgroundColor: item.statusColor }} /></span><strong>{item.progress}%</strong></div><footer><Owner name={item.owner} /><span>{dueLabel(item.dueDate)}</span></footer></Link>)}</div>
          </section>)}
        </div>
      ) : null}

      {view === "panel" ? (
        <div className="workboard-panel">
          <WorkboardInsights
            items={filtered}
            metrics={metrics}
            onDrillGroup={(group) => { setStatus(group); setView("table"); }}
            onDrillOwner={(selectedOwner) => { setOwner(selectedOwner); setView("table"); }}
          />
        </div>
      ) : null}

      {view !== "panel" && totalPages > 1 ? (
        <nav aria-label="Paginacion del tablero" className="workboard-pagination no-print">
          <p>Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} de {filtered.length}</p>
          <div>
            <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Anterior</button>
            <span>Pagina {page} de {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Siguiente</button>
          </div>
        </nav>
      ) : null}

      {focusedItem ? (
        <div className="workboard-drawer-layer" role="presentation">
          <button aria-label="Cerrar detalle" className="workboard-drawer-backdrop" onClick={() => setFocusedId(null)} type="button" />
          <aside aria-label={`Detalle de ${focusedItem.code}`} aria-modal="true" className="workboard-drawer" ref={drawerRef} role="dialog">
            <header>
              <div><span>{focusedItem.code}</span><h2>{focusedItem.title}</h2></div>
              <button aria-label="Cerrar detalle" className="icon-button" onClick={() => setFocusedId(null)} type="button"><X className="h-4 w-4" aria-hidden /></button>
            </header>
            <div className="workboard-drawer-body">
              <div className="workboard-drawer-status"><WorkStatus color={focusedItem.statusColor} label={focusedItem.statusLabel} /><span>{focusedItem.progress}%</span></div>
              <section><span>Resumen</span><p>{focusedItem.subtitle}</p></section>
              <dl>
                <div><dt>Responsable</dt><dd><Owner name={focusedItem.owner} /></dd></div>
                <div><dt>{locationLabel}</dt><dd>{focusedItem.location}</dd></div>
                <div><dt>Fecha</dt><dd>{dueLabel(focusedItem.dueDate)}</dd></div>
                <div><dt>Avance</dt><dd>{focusedItem.progressLabel}</dd></div>
              </dl>
              {focusedItem.riskLabel ? <section className="is-alert"><span>Atencion</span><p>{focusedItem.riskLabel}</p></section> : null}
              {focusedItem.tags?.length ? <section><span>Etiquetas</span><div className="workboard-drawer-tags">{focusedItem.tags.map((tag) => <i key={tag}>{tag}</i>)}</div></section> : null}
              {focusedItem.children?.length ? <section><span>Subelementos</span><div className="workboard-drawer-subitems">{focusedItem.children.map((child) => <div key={child.id}><strong>{child.label}</strong><WorkStatus color={child.tone} label={child.statusLabel} /><small>{child.owner} · {dueLabel(child.dueDate)}</small></div>)}</div></section> : null}
            </div>
            <footer><Link className="btn btn-primary w-full" href={focusedItem.href}>Abrir expediente completo<ArrowRight className="h-4 w-4" aria-hidden /></Link></footer>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

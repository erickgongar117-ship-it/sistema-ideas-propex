"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvidedDragHandleProps,
  type DropResult,
  type ResponderProvided
} from "@hello-pangea/dnd";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CalendarClock,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleCheckBig,
  CircleDashed,
  CircleSlash,
  Columns3,
  Copy,
  GitMerge,
  GripVertical,
  Inbox,
  LayoutList,
  LoaderCircle,
  MoreHorizontal,
  Rows3,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  UserRoundCheck,
  X,
  type LucideIcon
} from "lucide-react";
import { WorkboardInsights } from "@/components/workboard-insights";
import { statusCategoryMeta, type StatusCategory } from "@/lib/status-system";

export type WorkboardChild = {
  id: string;
  label: string;
  status: string;
  statusLabel: string;
  owner: string;
  dueDate: string | null;
  statusCategory: StatusCategory;
  statusReference?: boolean;
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
  statusCategory: StatusCategory;
  statusReference?: boolean;
  owner: string;
  location: string;
  dueDate: string | null;
  /** Porcentaje real. `null` cuando el elemento no tiene denominador (una Idea no tiene
   *  actividades que contar): en ese caso NO se dibuja barra, se muestra la etapa. */
  progress: number | null;
  progressLabel: string;
  risk?: boolean;
  riskLabel?: string;
  tags?: string[];
  children?: WorkboardChild[];
  allowedGroups?: string[];
  bulkEntityId?: string;
  bulkActions?: WorkboardBulkAction[];
};

export type WorkboardMetric = {
  label: string;
  value: string | number;
  detail: string;
  color: string;
};

export type WorkboardGroupDefinition = {
  key: string;
  label: string;
  color: string;
};

export type WorkboardMoveInput = {
  itemId: string;
  fromGroup: string;
  toGroup: string;
  via: "drag" | "menu" | "undo";
};

export type WorkboardMoveResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type WorkboardBulkAction = "APPROVE" | "REJECT" | "REASSIGN" | "DUE_DATE";

export type WorkboardBulkInput = {
  action: WorkboardBulkAction;
  itemIds: string[];
  reason?: string;
  assignee?: string;
  dueDate?: string;
};

export type WorkboardBulkItemResult = {
  itemId: string;
  reference: string;
  ok: boolean;
  message: string;
};

export type WorkboardBulkResult = {
  ok: boolean;
  message: string;
  succeeded: number;
  failed: number;
  results: WorkboardBulkItemResult[];
  batchIds?: string[];
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

const CATEGORY_ICON: Record<StatusCategory, LucideIcon> = {
  ENTRADA: Inbox,
  VALIDACION: ShieldCheck,
  EJECUCION: CircleDashed,
  CIERRE: CircleCheckBig,
  DETENIDA: CircleSlash
};

function WorkStatus({ category, label, reference = false }: { category: StatusCategory; label: string; reference?: boolean }) {
  const Icon = reference ? GitMerge : CATEGORY_ICON[category];
  const token = statusCategoryMeta[category].token;
  return (
    <span
      aria-label={`Estado: ${label}`}
      className={`workboard-status ${reference ? "is-reference" : ""}`}
      style={{ "--status-fill": `var(--st-${token}-fill)` } as React.CSSProperties}
      title={label}
    >
      <Icon aria-hidden />
      <span>{label}</span>
    </span>
  );
}

function Owner({ name }: { name: string }) {
  return (
    <span className="workboard-owner" title={name}>
      <span className="workboard-avatar">{initials(name)}</span>
      <span>{name}</span>
    </span>
  );
}

function WorkboardKanbanCard({
  item,
  groups,
  dragHandleProps,
  moving,
  onMove
}: {
  item: WorkboardItem;
  groups: WorkboardGroupDefinition[];
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  moving: boolean;
  onMove?: (toGroup: string) => void;
}) {
  const targets = groups.filter((group) => item.allowedGroups?.includes(group.key));
  return (
    <article className={`workboard-kanban-card ${item.risk ? "is-risk" : ""} ${moving ? "is-moving" : ""}`}>
      <div className="workboard-kanban-card-top">
        <span className="workboard-kanban-code">{item.code}</span>
        <div className="workboard-kanban-card-actions">
          {dragHandleProps ? (
            <button
              {...dragHandleProps}
              aria-label={`Mover ${item.code} entre etapas`}
              className="workboard-drag-handle"
              title="Arrastrar a otra etapa"
              type="button"
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          {targets.length && onMove ? (
            <details className="workboard-stage-menu">
              <summary aria-label={`Cambiar etapa de ${item.code}`} title="Cambiar etapa">
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </summary>
              <div>
                <span>Cambiar etapa</span>
                {targets.map((target) => (
                  <button disabled={moving} key={target.key} onClick={() => onMove(target.key)} type="button">
                    <i style={{ background: target.color }} />
                    <span>{target.label}</span>
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>
      <Link className="workboard-kanban-card-body" href={item.href}>
        <h3>{item.title}</h3>
        <p>{item.subtitle}</p>
        <WorkStatus category={item.statusCategory} label={item.statusLabel} reference={item.statusReference} />
        {item.progress === null ? null : <div className="workboard-kanban-progress"><span><i style={{ width: `${item.progress}%` }} /></span><strong>{item.progress}%</strong></div>}
        <footer>
          <Owner name={item.owner} />
          <span aria-label={item.risk ? `Fecha en riesgo: ${dueLabel(item.dueDate)}` : undefined} className={`workboard-date ${item.risk ? "is-risk" : ""}`} title={item.risk ? item.riskLabel : undefined}>
            {item.risk ? <TriangleAlert className="h-4 w-4" aria-hidden /> : <CalendarDays className="h-3.5 w-3.5" aria-hidden />}
            {dueLabel(item.dueDate)}
          </span>
        </footer>
      </Link>
    </article>
  );
}

export function OperationsWorkboard({
  items,
  metrics,
  primaryLabel,
  locationLabel = "Ubicacion",
  emptyLabel = "No hay registros con estos filtros",
  groupDefinitions,
  onMoveItem,
  onBulkAction,
  clientPagination = true
}: {
  items: WorkboardItem[];
  metrics: WorkboardMetric[];
  primaryLabel: string;
  locationLabel?: string;
  emptyLabel?: string;
  groupDefinitions?: WorkboardGroupDefinition[];
  onMoveItem?: (input: WorkboardMoveInput) => Promise<WorkboardMoveResult>;
  onBulkAction?: (input: WorkboardBulkInput) => Promise<WorkboardBulkResult>;
  clientPagination?: boolean;
}) {
  const router = useRouter();
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
  const [dragEnabled, setDragEnabled] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveNotice, setMoveNotice] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState<WorkboardBulkAction | null>(null);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<WorkboardBulkResult | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const statuses = useMemo(
    () => groupDefinitions?.map((group) => group.key) ?? [...new Set(items.map((item) => item.group))],
    [groupDefinitions, items]
  );
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
      if (sort === "progress") return (a.progress ?? 101) - (b.progress ?? 101) || a.title.localeCompare(b.title, "es-MX");
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (sort === "due") return aDate - bDate || a.title.localeCompare(b.title, "es-MX");
      return Number(Boolean(b.risk)) - Number(Boolean(a.risk)) || aDate - bDate || a.title.localeCompare(b.title, "es-MX");
    });
  }, [owner, searchMatched, sort, status]);

  const totalPages = clientPagination ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const pageItems = useMemo(
    () => clientPagination ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered,
    [clientPagination, filtered, page, pageSize]
  );

  const groups = useMemo(() => statuses.map((key) => {
    const rows = pageItems.filter((item) => item.group === key);
    const allRows = filtered.filter((item) => item.group === key);
    const source = items.find((item) => item.group === key);
    const definition = groupDefinitions?.find((group) => group.key === key);
    const measurable = allRows.filter((item) => item.progress !== null);
    const average = measurable.length ? Math.round(measurable.reduce((sum, item) => sum + (item.progress ?? 0), 0) / measurable.length) : null;
    return {
      key,
      rows,
      total: allRows.length,
      average,
      label: definition?.label ?? source?.groupLabel ?? key,
      color: definition?.color ?? source?.groupColor ?? "var(--muted)"
    };
  }).filter((group) => view === "kanban" || group.rows.length), [filtered, groupDefinitions, items, pageItems, statuses, view]);

  const focusedItem = items.find((item) => item.id === focusedId) ?? null;
  const activeFilters = Number(status !== "all") + Number(location !== "all") + Number(owner !== "all");
  const draggingItem = items.find((item) => item.id === draggingId) ?? null;
  const selectedItems = useMemo(() => items.filter((item) => selected.has(item.id)), [items, selected]);
  const bulkCount = (action: WorkboardBulkAction) => selectedItems.filter((item) => item.bulkActions?.includes(action)).length;

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
    if (!clientPagination) {
      setPageSize(50);
      return;
    }
    const media = window.matchMedia("(max-width: 639px)");
    const updatePageSize = () => setPageSize(media.matches ? 12 : 50);
    updatePageSize();
    media.addEventListener("change", updatePageSize);
    return () => media.removeEventListener("change", updatePageSize);
  }, [clientPagination]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const updateDragMode = () => setDragEnabled(media.matches);
    updateDragMode();
    media.addEventListener("change", updateDragMode);
    return () => media.removeEventListener("change", updateDragMode);
  }, []);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const visibleIds = new Set(items.map((item) => item.id));
    setSelected((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

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

  const openBulkAction = (action: WorkboardBulkAction) => {
    setBulkMode(action);
    setBulkFeedback(null);
    setBulkReason("");
    setBulkAssignee("");
    setBulkDueDate("");
  };

  const performBulkAction = async () => {
    if (!bulkMode || !onBulkAction || bulkPending) return;
    const eligible = selectedItems.filter((item) => item.bulkEntityId && item.bulkActions?.includes(bulkMode));
    if (!eligible.length) {
      setBulkFeedback({
        ok: false,
        message: "Ninguno de los elementos seleccionados admite esta accion.",
        succeeded: 0,
        failed: selectedItems.length,
        results: selectedItems.map((item) => ({ itemId: item.id, reference: item.code, ok: false, message: "Esta accion no corresponde a su etapa o a tus permisos." }))
      });
      return;
    }
    if (bulkMode === "REJECT" && bulkReason.trim().length < 3) {
      setBulkFeedback({ ok: false, message: "Escribe una razon clara de al menos 3 caracteres.", succeeded: 0, failed: 0, results: [] });
      return;
    }
    if (bulkMode === "REASSIGN" && bulkAssignee.trim().length < 3) {
      setBulkFeedback({ ok: false, message: "Escribe el correo o numero de empleado de la nueva persona responsable.", succeeded: 0, failed: 0, results: [] });
      return;
    }
    if (bulkMode === "DUE_DATE" && !bulkDueDate) {
      setBulkFeedback({ ok: false, message: "Selecciona la nueva fecha compromiso.", succeeded: 0, failed: 0, results: [] });
      return;
    }

    setBulkPending(true);
    setBulkFeedback(null);
    try {
      const targets = eligible.map((item) => item.bulkEntityId as string);
      const batchResults: WorkboardBulkItemResult[] = [];
      const targetItems = new Map(eligible.map((item) => [item.bulkEntityId as string, item]));
      const chunks = Array.from({ length: Math.ceil(targets.length / 25) }, (_, index) => targets.slice(index * 25, index * 25 + 25));
      const settledChunks = await Promise.allSettled(chunks.map((chunk) => onBulkAction({
        action: bulkMode,
        itemIds: chunk,
        reason: bulkReason.trim() || undefined,
        assignee: bulkAssignee.trim() || undefined,
        dueDate: bulkDueDate || undefined
      })));
      for (const [index, settled] of settledChunks.entries()) {
        if (settled.status === "fulfilled") {
          batchResults.push(...settled.value.results);
          const returnedTargets = new Set(settled.value.results.map((result) => result.itemId));
          for (const target of chunks[index]) {
            if (returnedTargets.has(target)) continue;
            batchResults.push({
              itemId: target,
              reference: targetItems.get(target)?.code ?? "Registro",
              ok: false,
              message: settled.value.message || "El servidor rechazo este bloque. Actualiza la bandeja antes de reintentarlo."
            });
          }
          continue;
        }
        for (const target of chunks[index]) {
          batchResults.push({
            itemId: target,
            reference: targetItems.get(target)?.code ?? "Registro",
            ok: false,
            message: "No se pudo confirmar este bloque. Actualiza la bandeja antes de reintentarlo."
          });
        }
      }
      const skippedResults = selectedItems
        .filter((item) => !item.bulkEntityId || !item.bulkActions?.includes(bulkMode))
        .map((item) => ({
          itemId: item.bulkEntityId ?? item.id,
          reference: item.code,
          ok: false,
          message: "Esta accion no corresponde a su etapa o a tus permisos."
        }));
      const allResults = [...batchResults, ...skippedResults];
      const batchIds = settledChunks.flatMap((settled) => settled.status === "fulfilled" ? settled.value.batchIds ?? [] : []);
      const succeeded = allResults.filter((entry) => entry.ok).length;
      const failed = allResults.length - succeeded;
      const feedback: WorkboardBulkResult = {
        ok: failed === 0,
        message: failed
          ? `${succeeded} ${succeeded === 1 ? "cambio aplicado" : "cambios aplicados"}; ${failed} ${failed === 1 ? "requiere revision" : "requieren revision"}.`
          : `${succeeded} ${succeeded === 1 ? "cambio aplicado correctamente" : "cambios aplicados correctamente"}.`,
        succeeded,
        failed,
        results: allResults,
        batchIds
      };
      setBulkFeedback(feedback);
      const successfulIds = new Set(batchResults.filter((entry) => entry.ok).map((entry) => entry.itemId));
      setSelected((current) => new Set([...current].filter((id) => {
        const item = items.find((candidate) => candidate.id === id);
        return !item?.bulkEntityId || !successfulIds.has(item.bulkEntityId);
      })));
      if (succeeded) {
        setBulkMode(null);
        router.refresh();
      }
    } catch {
      setBulkFeedback({
        ok: false,
        message: "No fue posible completar la operacion. Nada que no haya sido confirmado se mostrara como aplicado.",
        succeeded: 0,
        failed: eligible.length,
        results: []
      });
    } finally {
      setBulkPending(false);
    }
  };

  const moveGroups: WorkboardGroupDefinition[] = groupDefinitions ?? statuses.map((key) => {
    const source = items.find((item) => item.group === key);
    return { key, label: source?.groupLabel ?? key, color: source?.groupColor ?? "var(--muted)" };
  });

  const performMove = async (item: WorkboardItem, toGroup: string, via: WorkboardMoveInput["via"]) => {
    if (!onMoveItem || item.group === toGroup || movingId) return;
    if (!item.allowedGroups?.includes(toGroup)) {
      setMoveError("Esa etapa no esta habilitada para este proyecto.");
      return;
    }
    setMoveError(null);
    setMoveNotice(null);
    setMovingId(item.id);
    try {
      const result = await onMoveItem({ itemId: item.id, fromGroup: item.group, toGroup, via });
      if (result.ok) setMoveNotice(result.message);
      else setMoveError(result.message);
    } catch {
      setMoveError("No fue posible cambiar la etapa. El proyecto regreso a su posicion anterior.");
    } finally {
      setMovingId(null);
    }
  };

  const onDragEnd = (result: DropResult, provided: ResponderProvided) => {
    const item = items.find((candidate) => candidate.id === result.draggableId);
    setDraggingId(null);
    if (!item || !result.destination || result.destination.droppableId === item.group) {
      provided.announce("Movimiento cancelado. El proyecto conserva su etapa.");
      return;
    }
    if (!item.allowedGroups?.includes(result.destination.droppableId)) {
      provided.announce("Esa etapa no esta permitida para el proyecto.");
      setMoveError("Esa etapa no esta habilitada para este proyecto.");
      return;
    }
    const destination = moveGroups.find((group) => group.key === result.destination?.droppableId);
    provided.announce(`Moviendo ${item.code} a ${destination?.label ?? result.destination.droppableId}.`);
    void performMove(item, result.destination.droppableId, "drag");
  };

  return (
    <section className={`workboard is-${density}`} aria-label={`${primaryLabel} - tablero de trabajo`}>
      {/* Vistas y busqueda comparten fila: eran dos bandas de 54 y 62 px. */}
      <div className="workboard-controlbar no-print">
      <div className="workboard-viewbar">
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

      <div className="workboard-toolbar">
        <label className="workboard-search">
          <Search className="h-[18px] w-[18px]" aria-hidden />
          <input aria-label="Filtrar los registros cargados en esta pagina" onChange={(event) => setQuery(event.target.value)} placeholder={`Filtrar esta pagina de ${primaryLabel.toLocaleLowerCase("es-MX")}`} value={query} />
          {query ? <button aria-label="Limpiar busqueda" onClick={() => setQuery("")} type="button"><X className="h-4 w-4" aria-hidden /></button> : null}
        </label>
        <button aria-expanded={filtersOpen} className={`workboard-filter-button ${filtersOpen || activeFilters ? "is-active" : ""}`} onClick={() => setFiltersOpen((current) => !current)} type="button">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />Filtros{activeFilters ? <span>{activeFilters}</span> : null}
        </button>
        {selected.size ? (
          <div className="workboard-selection">
            <span><Check className="h-4 w-4" aria-hidden />{selected.size} seleccionados</span>
            {onBulkAction && bulkCount("APPROVE") ? <button onClick={() => openBulkAction("APPROVE")} type="button"><CheckCheck className="h-4 w-4" aria-hidden />Aprobar <i>{bulkCount("APPROVE")}</i></button> : null}
            {onBulkAction && bulkCount("REJECT") ? <button onClick={() => openBulkAction("REJECT")} type="button"><CircleSlash className="h-4 w-4" aria-hidden />Rechazar <i>{bulkCount("REJECT")}</i></button> : null}
            {onBulkAction && bulkCount("REASSIGN") ? <button onClick={() => openBulkAction("REASSIGN")} type="button"><UserRoundCheck className="h-4 w-4" aria-hidden />Reasignar <i>{bulkCount("REASSIGN")}</i></button> : null}
            {onBulkAction && bulkCount("DUE_DATE") ? <button onClick={() => openBulkAction("DUE_DATE")} type="button"><CalendarClock className="h-4 w-4" aria-hidden />Nueva fecha <i>{bulkCount("DUE_DATE")}</i></button> : null}
            <Link href={items.find((item) => selected.has(item.id))?.href ?? "#"}>Abrir primero<ArrowRight className="h-4 w-4" aria-hidden /></Link>
            <button onClick={copySelectedCodes} type="button">{copied ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}{copied ? "Copiados" : "Copiar folios"}</button>
            <button aria-label="Limpiar seleccion" onClick={() => { setSelected(new Set()); setBulkMode(null); setBulkFeedback(null); }} type="button"><X className="h-4 w-4" aria-hidden /></button>
          </div>
        ) : null}
      </div>
      </div>

      {bulkMode ? (
        <section aria-labelledby="workboard-bulk-title" className="workboard-bulk-editor no-print">
          <div>
            <span>Accion en lote</span>
            <h3 id="workboard-bulk-title">
              {bulkMode === "APPROVE" ? "Aprobar ideas seleccionadas" : bulkMode === "REJECT" ? "Rechazar con una razon" : bulkMode === "REASSIGN" ? "Asignar una nueva persona" : "Cambiar fecha compromiso"}
            </h3>
            <p>
              {bulkMode === "APPROVE"
                ? "Se conservaran las areas de apoyo elegidas durante la captura. Abre una idea si necesitas agregar un apoyo distinto."
                : bulkMode === "REJECT"
                  ? "La razon quedara visible en cada expediente y en su auditoria."
                  : bulkMode === "REASSIGN"
                    ? "Usa el correo corporativo o el numero de empleado de 5 digitos."
                    : "La misma fecha se aplicara solo a los registros que permitan reprogramacion."}
            </p>
          </div>
          {bulkMode === "REJECT" ? (
            <label><span>Razon obligatoria</span><textarea autoFocus maxLength={500} onChange={(event) => setBulkReason(event.target.value)} placeholder="Explica que debe corregirse o por que no procede" rows={3} value={bulkReason} /></label>
          ) : null}
          {bulkMode === "REASSIGN" ? (
            <label><span>Correo o numero de empleado</span><input autoFocus onChange={(event) => setBulkAssignee(event.target.value)} placeholder="persona@proboca.net o 00123" value={bulkAssignee} /></label>
          ) : null}
          {bulkMode === "DUE_DATE" ? (
            <label><span>Nueva fecha compromiso</span><input autoFocus onChange={(event) => setBulkDueDate(event.target.value)} type="date" value={bulkDueDate} /></label>
          ) : null}
          <footer>
            <span>{bulkCount(bulkMode)} de {selectedItems.length} seleccionados aplican</span>
            <button disabled={bulkPending} onClick={() => setBulkMode(null)} type="button">Cancelar</button>
            <button className="is-primary" disabled={bulkPending} onClick={() => void performBulkAction()} type="button">
              {bulkPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
              {bulkPending ? "Procesando" : "Confirmar"}
            </button>
          </footer>
        </section>
      ) : null}

      {bulkFeedback ? (
        <section className={`workboard-bulk-feedback ${bulkFeedback.ok ? "is-success" : "is-error"}`} role={bulkFeedback.ok ? "status" : "alert"}>
          <div>
            {bulkFeedback.ok ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <TriangleAlert className="h-5 w-5" aria-hidden />}
            <p><strong>{bulkFeedback.message}</strong>{bulkFeedback.failed ? <span>{bulkFeedback.failed} requieren revision.</span> : null}{bulkFeedback.batchIds?.length ? <span>Auditoria: {bulkFeedback.batchIds.join(", ")}</span> : null}</p>
            <button aria-label="Cerrar resultado" onClick={() => setBulkFeedback(null)} type="button"><X className="h-4 w-4" aria-hidden /></button>
          </div>
          {bulkFeedback.results.some((entry) => !entry.ok) ? (
            <ul aria-label="Elementos que no pudieron actualizarse">
              {bulkFeedback.results.filter((entry) => !entry.ok).map((entry) => <li key={`${entry.itemId}-${entry.reference}`}><strong>{entry.reference}</strong><span>{entry.message}</span></li>)}
            </ul>
          ) : null}
        </section>
      ) : null}

      {moveError ? <div className="workboard-move-message is-error" role="alert"><TriangleAlert className="h-4 w-4" aria-hidden /><span>{moveError}</span><button aria-label="Cerrar aviso" onClick={() => setMoveError(null)} type="button"><X className="h-4 w-4" aria-hidden /></button></div> : null}
      {moveNotice ? <div className="workboard-move-message is-success" role="status"><CheckCircle2 className="h-4 w-4" aria-hidden /><span>{moveNotice}</span><button aria-label="Cerrar aviso" onClick={() => setMoveNotice(null)} type="button"><X className="h-4 w-4" aria-hidden /></button></div> : null}

      {filtersOpen ? (
        <div className="workboard-filters no-print">
          <label><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos los estados</option>{statuses.map((value) => <option key={value} value={value}>{moveGroups.find((group) => group.key === value)?.label ?? value}</option>)}</select></label>
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
                  <span>{group.average === null ? `${group.total} registros` : `${group.average}% promedio`}</span>
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
                            <div data-label="Estado"><WorkStatus category={item.statusCategory} label={item.statusLabel} reference={item.statusReference} /></div>
                            <div data-label="Responsable"><Owner name={item.owner} /></div>
                            <div data-label={locationLabel}><span className="workboard-text-cell">{item.location}</span></div>
                            <div data-label="Fecha"><span aria-label={item.risk ? `Fecha en riesgo: ${dueLabel(item.dueDate)}` : undefined} className={`workboard-date ${item.risk ? "is-risk" : ""}`} title={item.risk ? item.riskLabel : undefined}>{item.risk ? <TriangleAlert className="h-4 w-4" aria-hidden /> : <CalendarDays className="h-3.5 w-3.5" aria-hidden />}{dueLabel(item.dueDate)}</span></div>
                            <div data-label="Avance" className="workboard-progress-cell">{item.progress === null ? <span className="workboard-progress-na" title="Esta etapa no se mide en porcentaje">Por etapa</span> : <><span><i style={{ width: `${item.progress}%` }} /></span><strong>{item.progress}%</strong></>}</div>
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
                                  {item.children.map((child) => <div className="workboard-subitem" key={child.id}><strong>{child.label}</strong><WorkStatus category={child.statusCategory} label={child.statusLabel} reference={child.statusReference} /><span>{child.owner}</span><span>{dueLabel(child.dueDate)}</span></div>)}
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
        groups.length ? (
          <DragDropContext
            dragHandleUsageInstructions="Presiona espacio o Enter para levantar el proyecto. Usa las flechas para cambiar de etapa, espacio o Enter para soltar y Escape para cancelar."
            onDragEnd={onDragEnd}
            onDragStart={(start, provided) => {
              setDraggingId(start.draggableId);
              const item = items.find((candidate) => candidate.id === start.draggableId);
              provided.announce(`Levantaste ${item?.code ?? "el proyecto"}. Elige una etapa permitida.`);
            }}
          >
            <div className="workboard-kanban">
              {groups.map((group) => {
                const dropDisabled = Boolean(draggingItem && group.key !== draggingItem.group && !draggingItem.allowedGroups?.includes(group.key));
                return (
                  <Droppable droppableId={group.key} isDropDisabled={dropDisabled} key={group.key}>
                    {(provided, snapshot) => (
                      <section
                        className={`workboard-kanban-column ${dropDisabled ? "is-drop-disabled" : ""} ${snapshot.isDraggingOver ? "is-dragging-over" : ""}`}
                        style={{ "--group-color": group.color } as React.CSSProperties}
                      >
                        <header><span>{group.label}</span><strong>{group.rows.length}</strong></header>
                        <div className="workboard-kanban-stack" ref={provided.innerRef} {...provided.droppableProps}>
                          {group.rows.map((item, index) => (
                            <Draggable
                              draggableId={item.id}
                              index={index}
                              isDragDisabled={!dragEnabled || !onMoveItem || !item.allowedGroups?.length || Boolean(movingId)}
                              key={item.id}
                            >
                              {(provided, snapshot) => (
                                <div
                                  className={snapshot.isDragging ? "is-dragging" : ""}
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                >
                                  <WorkboardKanbanCard
                                    dragHandleProps={dragEnabled && onMoveItem && item.allowedGroups?.length ? provided.dragHandleProps : null}
                                    groups={moveGroups}
                                    item={item}
                                    moving={movingId === item.id}
                                    onMove={onMoveItem ? (toGroup) => void performMove(item, toGroup, "menu") : undefined}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {!group.rows.length ? <div className="workboard-kanban-empty"><Inbox className="h-4 w-4" aria-hidden /><span>Sin proyectos</span></div> : null}
                        </div>
                      </section>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        ) : <div className="workboard-empty">{emptyLabel}</div>
      ) : null}

      {view === "panel" ? (
        filtered.length ? <div className="workboard-panel">
          <WorkboardInsights
            items={filtered}
            metrics={metrics}
            onDrillGroup={(group) => { setStatus(group); setView("table"); }}
            onDrillOwner={(selectedOwner) => { setOwner(selectedOwner); setView("table"); }}
          />
        </div> : <div className="workboard-empty">{emptyLabel}</div>
      ) : null}

      {clientPagination && view !== "panel" && totalPages > 1 ? (
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
              <div className="workboard-drawer-status"><WorkStatus category={focusedItem.statusCategory} label={focusedItem.statusLabel} reference={focusedItem.statusReference} /><span>{focusedItem.progress === null ? "—" : `${focusedItem.progress}%`}</span></div>
              <section><span>Resumen</span><p>{focusedItem.subtitle}</p></section>
              <dl>
                <div><dt>Responsable</dt><dd><Owner name={focusedItem.owner} /></dd></div>
                <div><dt>{locationLabel}</dt><dd>{focusedItem.location}</dd></div>
                <div><dt>Fecha</dt><dd>{dueLabel(focusedItem.dueDate)}</dd></div>
                <div><dt>Avance</dt><dd>{focusedItem.progressLabel}</dd></div>
              </dl>
              {focusedItem.riskLabel ? <section className="is-alert"><span>Atencion</span><p>{focusedItem.riskLabel}</p></section> : null}
              {focusedItem.tags?.length ? <section><span>Etiquetas</span><div className="workboard-drawer-tags">{focusedItem.tags.map((tag) => <i key={tag}>{tag}</i>)}</div></section> : null}
              {focusedItem.children?.length ? <section><span>Subelementos</span><div className="workboard-drawer-subitems">{focusedItem.children.map((child) => <div key={child.id}><strong>{child.label}</strong><WorkStatus category={child.statusCategory} label={child.statusLabel} reference={child.statusReference} /><small>{child.owner} · {dueLabel(child.dueDate)}</small></div>)}</div></section> : null}
            </div>
            <footer><Link className="btn btn-primary w-full" href={focusedItem.href}>Abrir expediente completo<ArrowRight className="h-4 w-4" aria-hidden /></Link></footer>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

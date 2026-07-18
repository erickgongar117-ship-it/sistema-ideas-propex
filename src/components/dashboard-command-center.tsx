"use client";

import type { IdeaCategory, IdeaStatus } from "@prisma/client";
import type { EChartsOption } from "echarts";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Footprints,
  FolderKanban,
  Gauge,
  Layers3,
  Lightbulb,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Tag,
  TimerReset,
  TrendingDown,
  TrendingUp,
  UserRound,
  X,
  XCircle
} from "lucide-react";
import { ProbocaCoin } from "@/components/proboca-coin";
import { StatusPill } from "@/components/status-pill";
import { WORKSPACE_PERIOD_EVENT, WORKSPACE_PERIOD_STORAGE, type WorkspacePeriod } from "@/components/workspace-controls";
import { statusLabels } from "@/lib/domain";

const DynamicChart = dynamic(() => import("@/components/premium-chart"), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center text-sm font-bold text-slate-400">Preparando visualización...</div>
});

const DAY = 86_400_000;

const initialStatuses: IdeaStatus[] = ["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"];
const validationStatuses: IdeaStatus[] = ["EN_VALIDACION_CALIDAD", "EN_VALIDACION_SEGURIDAD", "EN_VALIDACION_MANTENIMIENTO"];
const implementationStatuses: IdeaStatus[] = ["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA", "EN_IMPLEMENTACION", "IMPLEMENTADA", "EN_VALIDACION_FINAL"];
const approvedStatuses: IdeaStatus[] = ["APROBADA_SUPERVISOR", ...validationStatuses, ...implementationStatuses, "CERRADA"];
const rejectedStatuses: IdeaStatus[] = ["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"];

type Period = WorkspacePeriod;
type Department = "all" | "quality" | "safety" | "maintenance";

export type DashboardIdea = {
  id: string;
  folio: string;
  areaCode: string;
  collaboratorName: string;
  supervisorName: string | null;
  problem: string;
  status: IdeaStatus;
  category: IdeaCategory;
  createdAt: string;
  closedAt: string | null;
  dueDate: string | null;
  pointsAssigned: number;
  impactTypes: string[];
  impactsQuality: boolean;
  impactsSafety: boolean;
  requiresMaintenance: boolean;
};

export type DashboardPortfolio = {
  kaizen: {
    total: number;
    active: number;
    averageProgress: number;
    overdueActivities: number;
    estimatedSavings: number;
    realSavings: number;
  };
  genba: {
    total: number;
    openActivities: number;
    overdueActivities: number;
    averageAttendance: number;
  };
};

type DashboardCommandCenterProps = {
  ideas: DashboardIdea[];
  areas: string[];
  generatedAt: string;
  portfolio: DashboardPortfolio;
  timing: {
    supervisor: string;
    validation: string;
    implementation: string;
  };
};

function departmentMatches(idea: DashboardIdea, department: Department) {
  if (department === "quality") return idea.impactsQuality;
  if (department === "safety") return idea.impactsSafety;
  if (department === "maintenance") return idea.requiresMaintenance;
  return true;
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function delta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function averageCycleDays(ideas: DashboardIdea[]) {
  const closed = ideas.filter((idea) => idea.closedAt);
  if (!closed.length) return 0;
  return Math.round(closed.reduce((sum, idea) => sum + (new Date(idea.closedAt!).getTime() - new Date(idea.createdAt).getTime()) / DAY, 0) / closed.length);
}

function nextStepFor(status: IdeaStatus) {
  if (["REGISTRADA", "EN_REVISION_SUPERVISOR", "SOLICITUD_INFORMACION"].includes(status)) return "Revisión y decisión del supervisor";
  if (["EN_VALIDACION_CALIDAD", "EN_VALIDACION_SEGURIDAD", "EN_VALIDACION_MANTENIMIENTO"].includes(status)) return "Completar la validación del área de soporte";
  if (["APROBADA_SUPERVISOR", "APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA"].includes(status)) return "Clasificar, priorizar y asignar responsable";
  if (status === "EN_IMPLEMENTACION") return "Registrar avance y evidencia de implementación";
  if (["IMPLEMENTADA", "EN_VALIDACION_FINAL"].includes(status)) return "Validar el resultado y asignar ProbocaCoins";
  if (["RECHAZADA_SUPERVISOR", "RECHAZADA_VALIDACION"].includes(status)) return "Revisar la justificación y decidir si se reenvía";
  if (status === "VENCIDA") return "Escalar el compromiso o acordar una nueva fecha";
  if (status === "CERRADA") return "Consultar evidencia y resultado final";
  return "Revisar el expediente y definir la siguiente acción";
}

function trendBuckets(ideas: DashboardIdea[], period: Period) {
  const monthly = period === "365" || period === "all";
  const bucketMap = new Map<string, { label: string; created: number; closed: number; sort: number }>();

  const add = (dateValue: string, key: "created" | "closed") => {
    const date = new Date(dateValue);
    const start = monthly
      ? new Date(date.getFullYear(), date.getMonth(), 1)
      : new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
    const id = monthly ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}` : start.toISOString().slice(0, 10);
    const label = monthly
      ? start.toLocaleDateString("es-MX", { month: "short", year: "2-digit" })
      : start.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    const bucket = bucketMap.get(id) ?? { label, created: 0, closed: 0, sort: start.getTime() };
    bucket[key] += 1;
    bucketMap.set(id, bucket);
  };

  ideas.forEach((idea) => {
    add(idea.createdAt, "created");
    if (idea.closedAt) add(idea.closedAt, "closed");
  });

  return [...bucketMap.values()].sort((a, b) => a.sort - b.sort).slice(monthly ? -12 : -13);
}

function ChartPanel({ eyebrow, title, description, children, action }: { eyebrow: string; title: string; description: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <article className="surface overflow-hidden rounded-lg">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-brand-700">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-extrabold text-ink">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </article>
  );
}

function MetricCard({ label, value, detail, change, icon: Icon, visual, tone = "dark" }: { label: string; value: string | number; detail: string; change?: number | null; icon: typeof Lightbulb; visual?: React.ReactNode; tone?: "dark" | "green" | "red" | "amber" | "blue" }) {
  const colors = {
    dark: "bg-slate-950 text-white",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-700"
  };
  const positive = (change ?? 0) >= 0;

  return (
    <article className="surface metric-depth min-h-[150px] rounded-lg p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500">{label}</p>
        {visual ?? <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors[tone]}`}><Icon className="h-[18px] w-[18px]" aria-hidden /></span>}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-extrabold leading-none text-ink">{value}</p>
        {change !== null && change !== undefined ? (
          <span className={`inline-flex items-center gap-1 text-xs font-extrabold ${positive ? "text-emerald-700" : "text-rose-700"}`}>
            {positive ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
            {Math.abs(change)}%
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

export function DashboardCommandCenter({ ideas, areas, generatedAt, portfolio, timing }: DashboardCommandCenterProps) {
  const [period, setPeriod] = useState<Period>("90");
  const [area, setArea] = useState("all");
  const [category, setCategory] = useState<"all" | IdeaCategory>("all");
  const [department, setDepartment] = useState<Department>("all");
  const [impact, setImpact] = useState<string | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  useEffect(() => {
    const storedPeriod = window.localStorage.getItem(WORKSPACE_PERIOD_STORAGE);
    if (["30", "90", "365", "all"].includes(storedPeriod ?? "")) setPeriod(storedPeriod as Period);
    const onPeriodChange = (event: Event) => {
      const value = (event as CustomEvent<WorkspacePeriod>).detail;
      if (["30", "90", "365", "all"].includes(value)) setPeriod(value);
    };
    window.addEventListener(WORKSPACE_PERIOD_EVENT, onPeriodChange);
    return () => window.removeEventListener(WORKSPACE_PERIOD_EVENT, onPeriodChange);
  }, []);

  const now = useMemo(() => new Date(generatedAt), [generatedAt]);
  const dimensionIdeas = useMemo(() => ideas.filter((idea) =>
    (area === "all" || idea.areaCode === area) &&
    (category === "all" || idea.category === category) &&
    departmentMatches(idea, department) &&
    (!impact || idea.impactTypes.includes(impact))
  ), [ideas, area, category, department, impact]);

  const periodDays = period === "all" ? null : Number(period);
  const currentIdeas = useMemo(() => {
    if (!periodDays) return dimensionIdeas;
    const start = now.getTime() - periodDays * DAY;
    return dimensionIdeas.filter((idea) => new Date(idea.createdAt).getTime() >= start);
  }, [dimensionIdeas, now, periodDays]);
  const previousIdeas = useMemo(() => {
    if (!periodDays) return [];
    const end = now.getTime() - periodDays * DAY;
    const start = end - periodDays * DAY;
    return dimensionIdeas.filter((idea) => {
      const created = new Date(idea.createdAt).getTime();
      return created >= start && created < end;
    });
  }, [dimensionIdeas, now, periodDays]);

  const metrics = useMemo(() => {
    const closed = currentIdeas.filter((idea) => idea.status === "CERRADA").length;
    const previousClosed = previousIdeas.filter((idea) => idea.status === "CERRADA").length;
    const approved = currentIdeas.filter((idea) => approvedStatuses.includes(idea.status)).length;
    const rejected = currentIdeas.filter((idea) => rejectedStatuses.includes(idea.status)).length;
    const overdue = currentIdeas.filter((idea) => idea.status === "VENCIDA" || (idea.dueDate && new Date(idea.dueDate) < now && !["CERRADA", "CANCELADA"].includes(idea.status))).length;
    const points = currentIdeas.reduce((sum, idea) => sum + idea.pointsAssigned, 0);
    return {
      closed,
      approved,
      rejected,
      overdue,
      points,
      closeRate: percent(closed, currentIdeas.length),
      previousCloseRate: percent(previousClosed, previousIdeas.length),
      cycleDays: averageCycleDays(currentIdeas),
      previousCycleDays: averageCycleDays(previousIdeas)
    };
  }, [currentIdeas, previousIdeas, now]);

  const attention = useMemo(() => [
    { label: "Revisión de supervisor", value: currentIdeas.filter((idea) => initialStatuses.includes(idea.status)).length, href: "/supervisor", icon: Clock3, tone: "text-amber-300" },
    { label: "Validaciones pendientes", value: currentIdeas.filter((idea) => validationStatuses.includes(idea.status)).length, href: "/kanban", icon: ShieldCheck, tone: "text-blue-300" },
    { label: "Acciones de Mejora Continua", value: currentIdeas.filter((idea) => ["APROBADA_PARA_IMPLEMENTAR", "CLASIFICACION_MEJORA_CONTINUA", "IMPLEMENTADA", "EN_VALIDACION_FINAL"].includes(idea.status)).length, href: "/mejora", icon: Lightbulb, tone: "text-emerald-300" },
    { label: "Compromisos vencidos", value: metrics.overdue, href: "/vencidas", icon: AlertTriangle, tone: "text-rose-300" }
  ], [currentIdeas, metrics.overdue]);

  const trend = useMemo(() => trendBuckets(currentIdeas, period), [currentIdeas, period]);
  const impactRows = useMemo(() => {
    const counts = new Map<string, number>();
    currentIdeas.forEach((idea) => idea.impactTypes.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1)));
    return [...counts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 9);
  }, [currentIdeas]);
  const agingRows = useMemo(() => {
    const open = currentIdeas.filter((idea) => !["CERRADA", "CANCELADA"].includes(idea.status));
    const buckets = [
      { name: "0-2 días", min: 0, max: 2, color: "#14835f" },
      { name: "3-7 días", min: 3, max: 7, color: "#176fc1" },
      { name: "8-14 días", min: 8, max: 14, color: "#b7791f" },
      { name: "15-30 días", min: 15, max: 30, color: "#d32236" },
      { name: "+30 días", min: 31, max: Number.POSITIVE_INFINITY, color: "#171717" }
    ];
    return buckets.map((bucket) => ({ ...bucket, value: open.filter((idea) => {
      const age = Math.floor((now.getTime() - new Date(idea.createdAt).getTime()) / DAY);
      return age >= bucket.min && age <= bucket.max;
    }).length }));
  }, [currentIdeas, now]);

  const flowRows = useMemo(() => [
    { name: "Registradas", value: currentIdeas.length },
    { name: "Aval supervisor", value: currentIdeas.filter((idea) => ![...initialStatuses, "RECHAZADA_SUPERVISOR", "CANCELADA"].includes(idea.status)).length },
    { name: "Listas para ejecutar", value: currentIdeas.filter((idea) => [...implementationStatuses, "CERRADA"].includes(idea.status)).length },
    { name: "En implementación", value: currentIdeas.filter((idea) => ["EN_IMPLEMENTACION", "IMPLEMENTADA", "EN_VALIDACION_FINAL", "CERRADA"].includes(idea.status)).length },
    { name: "Cerradas", value: metrics.closed }
  ], [currentIdeas, metrics.closed]);

  const trendOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    color: ["#EA0029", "#14835F"],
    tooltip: { trigger: "axis", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    legend: { bottom: 0, icon: "circle", textStyle: { color: "#64748b", fontSize: 11 } },
    grid: { left: 40, right: 18, top: 22, bottom: 48 },
    xAxis: { type: "category", boundaryGap: false, data: trend.map((row) => row.label), axisLine: { lineStyle: { color: "#d8d8d8" } }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 } },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    series: [
      { name: "Registradas", type: "line", smooth: true, symbolSize: 7, data: trend.map((row) => row.created), lineStyle: { width: 3 }, areaStyle: { color: "rgba(234,0,41,.08)" } },
      { name: "Cerradas", type: "line", smooth: true, symbolSize: 7, data: trend.map((row) => row.closed), lineStyle: { width: 3 } }
    ]
  };

  const funnelOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c}", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    series: [{
      name: "Flujo",
      type: "funnel",
      left: "5%",
      top: 16,
      bottom: 10,
      width: "90%",
      minSize: "16%",
      maxSize: "100%",
      sort: "descending",
      gap: 4,
      label: { show: true, position: "inside", formatter: "{b}  {c}", color: "#fff", fontWeight: 700, fontSize: 11 },
      labelLine: { show: false },
      itemStyle: { borderColor: "#fff", borderWidth: 1, borderRadius: 4 },
      data: flowRows.map((row, index) => ({ ...row, itemStyle: { color: ["#171717", "#3b3b3b", "#626a70", "#b50020", "#ea0029"][index] } }))
    }],
    media: [{
      query: { maxWidth: 500 },
      option: {
        series: [{
          left: "3%",
          width: "55%",
          label: { show: true, position: "right", formatter: "{b}\n{c}", color: "#334155", fontWeight: 700, fontSize: 10, lineHeight: 14 },
          labelLine: { show: true, length: 7, length2: 4, lineStyle: { color: "#94a3b8" } }
        }]
      }
    }]
  };

  const impactOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c} ideas", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 112, right: 28, top: 12, bottom: 20 },
    xAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    yAxis: { type: "category", inverse: true, data: impactRows.map((row) => row.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontWeight: 600, fontSize: 10, width: 104, overflow: "truncate" } },
    series: [{ type: "bar", barWidth: 14, data: impactRows.map((row) => row.value), itemStyle: { color: "#EA0029", borderRadius: [0, 5, 5, 0] }, label: { show: true, position: "right", color: "#171717", fontWeight: 700 } }]
  };

  const agingOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c} ideas abiertas", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 44, right: 14, top: 18, bottom: 42 },
    xAxis: { type: "category", data: agingRows.map((row) => row.name), axisLine: { lineStyle: { color: "#d8d8d8" } }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 } },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    series: [{ type: "bar", barMaxWidth: 38, data: agingRows.map((row) => ({ value: row.value, itemStyle: { color: row.color, borderRadius: [5, 5, 0, 0] } })), label: { show: true, position: "top", color: "#171717", fontWeight: 700 } }]
  };

  const recentIdeas = currentIdeas.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  const selectedIdea = selectedIdeaId ? currentIdeas.find((idea) => idea.id === selectedIdeaId) ?? null : null;
  const activeFilters = [period !== "90", area !== "all", category !== "all", department !== "all", Boolean(impact)].filter(Boolean).length;
  const updatePeriod = (value: Period) => {
    setPeriod(value);
    window.localStorage.setItem(WORKSPACE_PERIOD_STORAGE, value);
    window.dispatchEvent(new CustomEvent<WorkspacePeriod>(WORKSPACE_PERIOD_EVENT, { detail: value }));
  };
  const resetFilters = () => { updatePeriod("90"); setArea("all"); setCategory("all"); setDepartment("all"); setImpact(null); };

  useEffect(() => {
    if (!selectedIdea) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedIdeaId(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedIdea]);

  return (
    <div className="dashboard-command-center">
      <section className="surface mb-5 rounded-lg p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-500" aria-hidden /><p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">Vista analítica</p></div>
            <h2 className="mt-1 text-lg font-extrabold text-ink">Explora el desempeño sin salir del panel</h2>
            <p className="mt-1 text-xs text-slate-500">Actualizado {new Date(generatedAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label><span className="label">Periodo</span><select className="field min-w-36" value={period} onChange={(event) => updatePeriod(event.target.value as Period)}><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="365">Último año</option><option value="all">Todo el historial</option></select></label>
            <label><span className="label">Área</span><select className="field min-w-32" value={area} onChange={(event) => setArea(event.target.value)}><option value="all">Todas</option>{areas.map((code) => <option value={code} key={code}>{code}</option>)}</select></label>
            <label><span className="label">Categoría</span><select className="field min-w-32" value={category} onChange={(event) => setCategory(event.target.value as "all" | IdeaCategory)}><option value="all">Todas</option><option value="A">Categoría A</option><option value="B">Categoría B</option><option value="C">Categoría C</option></select></label>
            <label><span className="label">Soporte</span><select className="field min-w-40" value={department} onChange={(event) => setDepartment(event.target.value as Department)}><option value="all">Todos</option><option value="quality">Calidad</option><option value="safety">Seguridad</option><option value="maintenance">Mantenimiento</option></select></label>
          </div>
        </div>
        {(impact || activeFilters) ? <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3"><span className="text-xs font-bold text-slate-500">{activeFilters} filtros activos</span>{impact ? <button className="inline-flex min-h-8 items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 text-xs font-extrabold text-brand-700" onClick={() => setImpact(null)} type="button">Impacto: {impact}<XCircle className="h-3.5 w-3.5" aria-hidden /></button> : null}<button className="btn btn-secondary ml-auto min-h-9 px-3 text-xs" onClick={resetFilters} type="button"><RotateCcw className="h-3.5 w-3.5" aria-hidden />Restablecer</button></div> : null}
      </section>

      <section className="command-attention-band overflow-hidden rounded-lg bg-slate-950 text-white">
        <div className="grid lg:grid-cols-[285px_1fr]">
          <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-red-300">Atención de hoy</p>
            <h2 className="mt-2 text-xl font-extrabold">Lo que necesita movimiento</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">La prioridad cambia con los filtros del panel.</p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {attention.map((item) => { const Icon = item.icon; return <Link className="group flex min-h-28 items-center gap-3 border-b border-white/10 p-4 transition hover:bg-white/5 sm:border-r xl:border-b-0" href={item.href} key={item.label}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10"><Icon className={`h-5 w-5 ${item.tone}`} aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-2xl font-extrabold">{item.value}</span><span className="mt-1 block text-xs font-bold leading-4 text-slate-300">{item.label}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" aria-hidden /></Link>; })}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Ideas registradas" value={currentIdeas.length} detail="Comparación contra el periodo anterior" change={periodDays && previousIdeas.length ? delta(currentIdeas.length, previousIdeas.length) : null} icon={Lightbulb} />
        <MetricCard label="Tasa de cierre" value={`${metrics.closeRate}%`} detail={`${metrics.closed} ideas cerradas`} change={periodDays && previousIdeas.length ? metrics.closeRate - metrics.previousCloseRate : null} icon={Target} tone="green" />
        <MetricCard label="Ciclo promedio" value={`${metrics.cycleDays} d`} detail="Desde registro hasta cierre" change={periodDays && metrics.previousCycleDays ? -delta(metrics.cycleDays, metrics.previousCycleDays) : null} icon={TimerReset} tone="blue" />
        <MetricCard label="Compromisos vencidos" value={metrics.overdue} detail="Requieren escalamiento o nueva fecha" icon={AlertTriangle} tone="red" />
        <MetricCard label="ProbocaCoins otorgadas" value={metrics.points} detail={`${metrics.approved} aprobadas · ${metrics.rejected} rechazadas`} icon={Gauge} visual={<ProbocaCoin size="md" />} tone="amber" />
      </section>

      <section className="mt-5 grid gap-3 lg:grid-cols-3">
        <Link className="surface surface-interactive flex min-h-28 items-center gap-4 rounded-lg border-l-4 border-l-brand-500 p-4" href="/ideas"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Layers3 className="h-5 w-5" aria-hidden /></span><span className="min-w-0 flex-1"><span className="text-xs font-extrabold uppercase text-slate-500">Ideas</span><span className="mt-1 block text-lg font-extrabold text-ink">{currentIdeas.length} en el periodo</span><span className="mt-1 block text-xs text-slate-500">{metrics.closeRate}% cerradas · {metrics.overdue} vencidas</span></span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden /></Link>
        <Link className="surface surface-interactive flex min-h-28 items-center gap-4 rounded-lg border-l-4 border-l-amber-600 p-4" href="/kaizen"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-800"><FolderKanban className="h-5 w-5" aria-hidden /></span><span className="min-w-0 flex-1"><span className="text-xs font-extrabold uppercase text-slate-500">Kaizen</span><span className="mt-1 block text-lg font-extrabold text-ink">{portfolio.kaizen.active} proyectos activos</span><span className="mt-1 block text-xs text-slate-500">{portfolio.kaizen.averageProgress}% avance · {portfolio.kaizen.overdueActivities} vencidas</span></span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden /></Link>
        <Link className="surface surface-interactive flex min-h-28 items-center gap-4 rounded-lg border-l-4 border-l-slate-700 p-4" href="/genba"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-800"><Footprints className="h-5 w-5" aria-hidden /></span><span className="min-w-0 flex-1"><span className="text-xs font-extrabold uppercase text-slate-500">GENBA</span><span className="mt-1 block text-lg font-extrabold text-ink">{portfolio.genba.openActivities} acciones abiertas</span><span className="mt-1 block text-xs text-slate-500">{portfolio.genba.averageAttendance}% asistencia · {portfolio.genba.overdueActivities} vencidas</span></span><ArrowRight className="h-4 w-4 text-slate-400" aria-hidden /></Link>
      </section>

      <section className="mt-7 grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
        <ChartPanel eyebrow="Ritmo del programa" title="Entradas y cierres" description="Evolución temporal de las ideas registradas y terminadas."><DynamicChart option={trendOption} style={{ height: 310 }} /></ChartPanel>
        <ChartPanel eyebrow="Conversión" title="Embudo de ejecución" description="Cuántas ideas avanzan desde registro hasta cierre."><DynamicChart option={funnelOption} style={{ height: 310 }} /></ChartPanel>
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-2">
        <ChartPanel eyebrow="Prioridades SQDCM" title="Impactos más frecuentes" description="Selecciona una barra o tema para filtrar todo el panel." action={impact ? <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">{impact}</span> : undefined}>
          <DynamicChart option={impactOption} style={{ height: 300 }} onEvents={{ click: (params: { name?: string }) => params.name && setImpact(params.name) }} />
          <div className="flex flex-wrap gap-2 border-t border-line px-1 pt-3">
            {impactRows.map((row) => <button aria-pressed={impact === row.name} className={`min-h-8 rounded-full border px-3 text-[11px] font-extrabold transition ${impact === row.name ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-slate-600 hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700"}`} key={row.name} onClick={() => setImpact(impact === row.name ? null : row.name)} type="button">{row.name} · {row.value}</button>)}
          </div>
        </ChartPanel>
        <ChartPanel eyebrow="Riesgo operativo" title="Antigüedad de ideas abiertas" description="Concentración de trabajo según días sin cierre."><DynamicChart option={agingOption} style={{ height: 330 }} /></ChartPanel>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="surface rounded-lg p-5">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white"><CalendarDays className="h-5 w-5" aria-hidden /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Velocidad</p><h2 className="text-lg font-extrabold text-ink">Tiempos de respuesta</h2></div></div>
          <dl className="mt-4 divide-y divide-line">
            {[["Respuesta del supervisor", timing.supervisor], ["Validación de soporte", timing.validation], ["Implementación", timing.implementation]].map(([label, value]) => <div className="flex items-center justify-between gap-4 py-4" key={label}><dt className="text-sm font-bold text-slate-600">{label}</dt><dd className="text-xl font-extrabold text-ink">{value}</dd></div>)}
          </dl>
          <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-slate-500">Estos tiempos usan las decisiones registradas y se recalculan automáticamente.</p>
        </article>

        <article className="surface overflow-hidden rounded-lg">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-brand-700">Trazabilidad inmediata</p><h2 className="mt-1 text-lg font-extrabold text-ink">Ideas recientes en la selección</h2></div><Link className="text-xs font-extrabold text-brand-700 hover:underline" href="/ideas">Ver todas</Link></div>
          {!recentIdeas.length ? <div className="flex min-h-56 flex-col items-center justify-center p-6 text-center"><CheckCircle2 className="h-8 w-8 text-slate-300" aria-hidden /><p className="mt-3 text-sm font-extrabold text-slate-700">No hay ideas con estos filtros</p><button className="mt-3 text-xs font-extrabold text-brand-700" onClick={resetFilters} type="button">Restablecer filtros</button></div> : <div className="divide-y divide-line">{recentIdeas.map((idea) => <button aria-label={`Ver resumen de ${idea.folio}`} className="quick-view-row group grid w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-50 sm:grid-cols-[110px_1fr_auto] sm:items-center" key={idea.id} onClick={() => setSelectedIdeaId(idea.id)} type="button"><span><span className="block text-xs font-extrabold text-brand-700">{idea.folio}</span><span className="mt-1 block text-[11px] font-bold text-slate-500">{idea.areaCode} · Cat. {idea.category}</span></span><span className="min-w-0"><span className="line-clamp-1 block text-sm font-bold text-slate-800">{idea.problem}</span><span className="mt-1 block text-xs text-slate-500">{idea.supervisorName ?? "Sin supervisor"} · {new Date(idea.createdAt).toLocaleDateString("es-MX")}</span></span><span className="flex items-center gap-3"><StatusPill status={idea.status} /><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden /></span></button>)}</div>}
        </article>
      </section>

      {selectedIdea ? (
        <div className="quick-view-layer" role="presentation">
          <button aria-label="Cerrar detalle rápido" className="quick-view-backdrop" onClick={() => setSelectedIdeaId(null)} type="button" />
          <aside aria-label={`Detalle rápido de ${selectedIdea.folio}`} aria-modal="true" className="quick-view-panel" role="dialog">
            <header className="quick-view-header">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase text-brand-700">Detalle rápido · {selectedIdea.areaCode}</p>
                <h2 className="mt-1 text-xl font-extrabold text-ink">{selectedIdea.folio}</h2>
              </div>
              <button aria-label="Cerrar detalle rápido" className="icon-button" onClick={() => setSelectedIdeaId(null)} title="Cerrar" type="button"><X className="h-4 w-4" aria-hidden /></button>
            </header>
            <div className="quick-view-body">
              <div className="flex flex-wrap items-center gap-2"><StatusPill status={selectedIdea.status} /><span className="text-xs font-bold text-slate-500">Categoría {selectedIdea.category}</span></div>
              <section className="quick-view-section">
                <p className="quick-view-label">Qué pasó</p>
                <p className="mt-2 text-sm font-bold leading-6 text-ink">{selectedIdea.problem}</p>
                <p className="mt-2 text-xs text-slate-500">Registrada por {selectedIdea.collaboratorName} el {new Date(selectedIdea.createdAt).toLocaleDateString("es-MX", { dateStyle: "medium" })}.</p>
              </section>
              <section className="quick-view-next-step">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10"><ArrowRight className="h-4 w-4" aria-hidden /></span>
                <span><span className="block text-[10px] font-extrabold uppercase text-red-200">Siguiente paso</span><span className="mt-1 block text-sm font-extrabold">{nextStepFor(selectedIdea.status)}</span></span>
              </section>
              <dl className="quick-view-facts">
                <div><dt><UserRound className="h-4 w-4" aria-hidden />Responsable visible</dt><dd>{selectedIdea.supervisorName ?? "Pendiente de asignar"}</dd></div>
                <div><dt><CalendarClock className="h-4 w-4" aria-hidden />Fecha compromiso</dt><dd>{selectedIdea.dueDate ? new Date(selectedIdea.dueDate).toLocaleDateString("es-MX", { dateStyle: "medium" }) : "Sin fecha definida"}</dd></div>
                <div><dt><Tag className="h-4 w-4" aria-hidden />Estado actual</dt><dd>{statusLabels[selectedIdea.status]}</dd></div>
              </dl>
              <section className="quick-view-section">
                <p className="quick-view-label">Impacto operativo</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedIdea.impactTypes.length ? selectedIdea.impactTypes.map((item) => <span className="quick-view-impact" key={item}>{item}</span>) : <span className="text-xs text-slate-500">Sin impacto clasificado</span>}
                </div>
              </section>
            </div>
            <footer className="quick-view-footer">
              <Link className="btn btn-brand w-full" href={`/ideas/${selectedIdea.id}`}>Abrir expediente completo<ArrowUpRight className="h-4 w-4" aria-hidden /></Link>
            </footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

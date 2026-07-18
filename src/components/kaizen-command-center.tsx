"use client";

import type { KaizenStatus, WorkItemStatus } from "@prisma/client";
import type { EChartsOption } from "echarts";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Gauge,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  UsersRound
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { KaizenStatusPill, WorkStatusPill } from "@/components/module-status";
import { EmptyChart, PortfolioAttention, PortfolioChartPanel, PortfolioMetric } from "@/components/portfolio-command-ui";
import { ProgressMeter } from "@/components/progress-meter";
import { WORKSPACE_PERIOD_EVENT, WORKSPACE_PERIOD_STORAGE, type WorkspacePeriod } from "@/components/workspace-controls";
import { kaizenStatusLabels, workItemStatusLabels } from "@/lib/domain";

const DynamicChart = dynamic(() => import("@/components/premium-chart"), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center text-sm font-bold text-slate-400">Preparando visualización...</div>
});

const DAY = 86_400_000;
const PROPEX_TIME_ZONE = "America/Monterrey";
type Period = WorkspacePeriod;

export type KaizenDashboardActivity = {
  id: string;
  number: number;
  action: string;
  ownerName: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: WorkItemStatus;
  closedAt: string | null;
  createdAt: string;
};

export type KaizenDashboardProject = {
  id: string;
  number: number;
  folio: string;
  title: string;
  plant: string | null;
  area: string;
  objective: string;
  status: KaizenStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  leaderName: string;
  sourceIdeaFolio: string | null;
  estimatedSavings: number;
  realSavings: number;
  hasCharter: boolean;
  activities: KaizenDashboardActivity[];
};

function activityProgress(activities: KaizenDashboardActivity[]) {
  const relevant = activities.filter((activity) => activity.status !== "COMBINADA");
  const closed = relevant.filter((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status)).length;
  return { total: relevant.length, closed, open: relevant.length - closed, percent: relevant.length ? Math.round((closed / relevant.length) * 100) : 0 };
}

function plannedProgress(project: KaizenDashboardProject, now: Date) {
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  if (now.getTime() <= start) return 0;
  if (now.getTime() >= end || end <= start) return 100;
  return Math.round(((now.getTime() - start) / (end - start)) * 100);
}

function isActivityOverdue(activity: KaizenDashboardActivity, now: Date) {
  return Boolean(activity.dueDate && new Date(activity.dueDate) < now && !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status));
}

function currency(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);
}

export function KaizenCommandCenter({ projects, generatedAt }: { projects: KaizenDashboardProject[]; generatedAt: string }) {
  const [period, setPeriod] = useState<Period>("90");
  const [plant, setPlant] = useState("all");
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState<"all" | KaizenStatus>("all");
  const [responsible, setResponsible] = useState("all");
  const now = useMemo(() => new Date(generatedAt), [generatedAt]);

  useEffect(() => {
    const storedPeriod = window.localStorage.getItem(WORKSPACE_PERIOD_STORAGE);
    if (["30", "90", "365", "all"].includes(storedPeriod ?? "")) setPeriod(storedPeriod as Period);
    const onPeriodChange = (event: Event) => setPeriod((event as CustomEvent<WorkspacePeriod>).detail);
    window.addEventListener(WORKSPACE_PERIOD_EVENT, onPeriodChange);
    return () => window.removeEventListener(WORKSPACE_PERIOD_EVENT, onPeriodChange);
  }, []);

  const plants = useMemo(() => [...new Set(projects.map((project) => project.plant ?? "Sin planta"))].sort(), [projects]);
  const areas = useMemo(() => [...new Set(projects.map((project) => project.area))].sort(), [projects]);
  const responsibles = useMemo(() => [...new Set(projects.flatMap((project) => [project.leaderName, ...project.activities.flatMap((activity) => activity.ownerName ? [activity.ownerName] : [])]))].sort(), [projects]);

  const filteredProjects = useMemo(() => {
    const start = period === "all" ? null : now.getTime() - Number(period) * DAY;
    return projects.filter((project) => {
      const overlapsPeriod = start === null || new Date(project.endDate).getTime() >= start;
      const matchesResponsible = responsible === "all" || project.leaderName === responsible || project.activities.some((activity) => activity.ownerName === responsible);
      return overlapsPeriod &&
        (plant === "all" || (project.plant ?? "Sin planta") === plant) &&
        (area === "all" || project.area === area) &&
        (status === "all" || project.status === status) &&
        matchesResponsible;
    });
  }, [projects, period, plant, area, status, responsible, now]);

  const projectRows = useMemo(() => filteredProjects.map((project) => {
    const progress = activityProgress(project.activities);
    const planned = plannedProgress(project, now);
    const overdue = project.activities.filter((activity) => isActivityOverdue(activity, now)).length;
    const blocked = project.activities.filter((activity) => activity.status === "BLOQUEADA").length;
    return { project, progress, planned, overdue, blocked, atRisk: ["PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status) && (overdue > 0 || blocked > 0 || progress.percent + 10 < planned) };
  }), [filteredProjects, now]);

  const relevantActivities = useMemo(() => filteredProjects.flatMap((project) => project.activities.map((activity) => ({ ...activity, project }))).filter((activity) => activity.status !== "COMBINADA"), [filteredProjects]);
  const openActivities = relevantActivities.filter((activity) => !["COMPLETADA", "CANCELADA"].includes(activity.status));
  const overdueActivities = openActivities.filter((activity) => isActivityOverdue(activity, now));
  const blockedActivities = openActivities.filter((activity) => activity.status === "BLOQUEADA");
  const charterPending = filteredProjects.filter((project) => project.status === "PENDIENTE_CHARTER" || !project.hasCharter);
  const activeProjects = filteredProjects.filter((project) => ["PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(project.status));
  const aggregateProgress = activityProgress(relevantActivities);
  const estimatedSavings = filteredProjects.reduce((sum, project) => sum + project.estimatedSavings, 0);
  const realSavings = filteredProjects.reduce((sum, project) => sum + project.realSavings, 0);
  const savingsAchievement = estimatedSavings ? Math.round((realSavings / estimatedSavings) * 100) : 0;
  const closedWithDate = relevantActivities.filter((activity) => activity.closedAt && activity.dueDate && ["COMPLETADA", "CANCELADA"].includes(activity.status));
  const onTimeRate = closedWithDate.length ? Math.round((closedWithDate.filter((activity) => new Date(activity.closedAt!) <= new Date(activity.dueDate!)).length / closedWithDate.length) * 100) : 0;
  const atRisk = projectRows.filter((row) => row.atRisk);

  const workloadRows = useMemo(() => {
    const map = new Map<string, number>();
    openActivities.forEach((activity) => map.set(activity.ownerName ?? "Sin asignar", (map.get(activity.ownerName ?? "Sin asignar") ?? 0) + 1));
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [openActivities]);

  const chartProjects = projectRows.filter((row) => ["PLANIFICACION", "EN_CURSO", "EN_PAUSA"].includes(row.project.status)).sort((a, b) => Number(b.atRisk) - Number(a.atRisk) || b.planned - b.progress.percent).slice(0, 10);
  const progressOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    color: ["#171717", "#EA0029"],
    tooltip: { trigger: "axis", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    legend: { bottom: 0, icon: "circle", textStyle: { color: "#64748b", fontSize: 11 } },
    grid: { left: 42, right: 14, top: 24, bottom: 72 },
    xAxis: { type: "category", data: chartProjects.map((row) => `K-${String(row.project.number).padStart(3, "0")}`), axisLine: { lineStyle: { color: "#d8d8d8" } }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10, rotate: chartProjects.length > 7 ? 35 : 0 } },
    yAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%", color: "#94a3b8" }, splitLine: { lineStyle: { color: "#eeeeee" } } },
    series: [
      { name: "Avance planeado", type: "bar", barMaxWidth: 22, data: chartProjects.map((row) => row.planned), itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: "Avance real", type: "bar", barMaxWidth: 22, data: chartProjects.map((row) => row.progress.percent), itemStyle: { borderRadius: [4, 4, 0, 0] } }
    ]
  };

  const savingsProjects = filteredProjects.filter((project) => project.estimatedSavings || project.realSavings).sort((a, b) => b.estimatedSavings - a.estimatedSavings).slice(0, 10);
  const savingsOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    color: ["#171717", "#14835f"],
    tooltip: { trigger: "axis", valueFormatter: (value) => currency(Number(value)), backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    legend: { bottom: 0, icon: "circle", textStyle: { color: "#64748b", fontSize: 11 } },
    grid: { left: 78, right: 20, top: 18, bottom: 48 },
    xAxis: { type: "value", axisLabel: { color: "#94a3b8", formatter: (value: number) => `$${Math.round(value / 1000)}k` }, splitLine: { lineStyle: { color: "#eeeeee" } } },
    yAxis: { type: "category", inverse: true, data: savingsProjects.map((project) => `K-${String(project.number).padStart(3, "0")}`), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontWeight: 700 } },
    series: [
      { name: "Estimado", type: "bar", barMaxWidth: 16, data: savingsProjects.map((project) => project.estimatedSavings), itemStyle: { borderRadius: [0, 4, 4, 0] } },
      { name: "Real", type: "bar", barMaxWidth: 16, data: savingsProjects.map((project) => project.realSavings), itemStyle: { borderRadius: [0, 4, 4, 0] } }
    ]
  };

  const workloadOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c} actividades abiertas", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 120, right: 34, top: 12, bottom: 22 },
    xAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    yAxis: { type: "category", inverse: true, data: workloadRows.map((row) => row.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontSize: 10, width: 108, overflow: "truncate" } },
    series: [{ type: "bar", barWidth: 14, data: workloadRows.map((row) => row.value), itemStyle: { color: "#EA0029", borderRadius: [0, 5, 5, 0] }, label: { show: true, position: "right", color: "#171717", fontWeight: 700 } }]
  };

  const statusRows = Object.entries(workItemStatusLabels).map(([key, label]) => ({ key: key as WorkItemStatus, label, value: relevantActivities.filter((activity) => activity.status === key).length })).filter((row) => row.value);
  const statusOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c} actividades", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 116, right: 30, top: 12, bottom: 20 },
    xAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    yAxis: { type: "category", inverse: true, data: statusRows.map((row) => row.label), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontSize: 10, width: 104, overflow: "truncate" } },
    series: [{ type: "bar", barMaxWidth: 22, data: statusRows.map((row) => ({ value: row.value, itemStyle: { color: row.key === "BLOQUEADA" ? "#d32236" : row.key === "COMPLETADA" ? "#14835f" : row.key === "EN_PROCESO" ? "#176fc1" : "#a16207", borderRadius: [0, 5, 5, 0] } })), label: { show: true, position: "right", color: "#171717", fontWeight: 700 } }]
  };

  const commitments = openActivities.slice().sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }).slice(0, 12);
  const activeFilters = [period !== "90", plant !== "all", area !== "all", status !== "all", responsible !== "all"].filter(Boolean).length;
  const updatePeriod = (value: Period) => { setPeriod(value); window.localStorage.setItem(WORKSPACE_PERIOD_STORAGE, value); window.dispatchEvent(new CustomEvent<WorkspacePeriod>(WORKSPACE_PERIOD_EVENT, { detail: value })); };
  const resetFilters = () => { updatePeriod("90"); setPlant("all"); setArea("all"); setStatus("all"); setResponsible("all"); };

  return (
    <div className="dashboard-command-center">
      <section className="surface mb-5 rounded-lg p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-500" aria-hidden /><p className="text-xs font-extrabold uppercase text-slate-500">Control del portafolio</p></div><h2 className="mt-1 text-lg font-extrabold text-ink">Decide con el avance real de cada Kaizen</h2><p className="mt-1 text-xs text-slate-500">Actualizado {now.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: PROPEX_TIME_ZONE })}</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label><span className="label">Periodo</span><select className="field min-w-36" value={period} onChange={(event) => updatePeriod(event.target.value as Period)}><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="365">Último año</option><option value="all">Todo el historial</option></select></label>
            <label><span className="label">Planta</span><select className="field min-w-32" value={plant} onChange={(event) => setPlant(event.target.value)}><option value="all">Todas</option>{plants.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
            <label><span className="label">Área</span><select className="field min-w-32" value={area} onChange={(event) => setArea(event.target.value)}><option value="all">Todas</option>{areas.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
            <label><span className="label">Estatus</span><select className="field min-w-40" value={status} onChange={(event) => setStatus(event.target.value as "all" | KaizenStatus)}><option value="all">Todos</option>{Object.entries(kaizenStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label><span className="label">Responsable</span><select className="field min-w-40" value={responsible} onChange={(event) => setResponsible(event.target.value)}><option value="all">Todos</option>{responsibles.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          </div>
        </div>
        {activeFilters ? <div className="mt-4 flex items-center gap-3 border-t border-line pt-3"><span className="text-xs font-bold text-slate-500">{activeFilters} filtros activos</span><button className="btn btn-secondary ml-auto min-h-9 px-3 text-xs" onClick={resetFilters} type="button"><RotateCcw className="h-3.5 w-3.5" aria-hidden />Restablecer</button></div> : null}
      </section>

      <PortfolioAttention eyebrow="Atención de hoy" title="Proyectos que necesitan movimiento" description="Prioriza documentación, bloqueos y desviaciones del plan." items={[
        { label: "Project Charter pendientes", value: charterPending.length, href: charterPending[0] ? `/kaizen/${charterPending[0].id}` : "/kaizen", icon: Clock3, tone: "text-amber-300" },
        { label: "Actividades vencidas", value: overdueActivities.length, href: "/kaizen/kanban", icon: CalendarClock, tone: "text-rose-300" },
        { label: "Actividades bloqueadas", value: blockedActivities.length, href: "/kaizen/kanban", icon: ShieldAlert, tone: "text-red-300" },
        { label: "Proyectos en riesgo", value: atRisk.length, href: atRisk[0] ? `/kaizen/${atRisk[0].project.id}` : "/kaizen", icon: AlertTriangle, tone: "text-orange-300" }
      ]} />

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PortfolioMetric label="Kaizen activos" value={activeProjects.length} detail={`${filteredProjects.length} proyectos en la selección`} icon={FolderKanban} />
        <PortfolioMetric label="Avance global" value={`${aggregateProgress.percent}%`} detail={`${aggregateProgress.closed} de ${aggregateProgress.total} actividades cerradas`} icon={Gauge} tone="green" />
        <PortfolioMetric label="Cumplimiento de fecha" value={`${onTimeRate}%`} detail={`${closedWithDate.length} cierres con fecha evaluable`} icon={Target} tone="blue" />
        <PortfolioMetric label="Actividades vencidas" value={overdueActivities.length} detail="Requieren ajuste o escalamiento" icon={AlertTriangle} tone="red" />
        <PortfolioMetric label="Ahorro realizado" value={currency(realSavings)} detail={`${savingsAchievement}% de ${currency(estimatedSavings)} estimados`} icon={Banknote} tone="amber" />
      </section>

      <section className="mt-7 grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
        <PortfolioChartPanel eyebrow="Salud del calendario" title="Avance planeado contra real" description="La diferencia revela proyectos atrasados antes de que venzan.">{chartProjects.length ? <DynamicChart option={progressOption} style={{ height: 330 }} /> : <EmptyChart message="No hay proyectos activos con estos filtros." />}</PortfolioChartPanel>
        <PortfolioChartPanel eyebrow="Beneficio comprobado" title="Ahorro estimado contra real" description="Comparación económica por proyecto Kaizen.">{savingsProjects.length ? <DynamicChart option={savingsOption} style={{ height: 330 }} /> : <EmptyChart message="Aún no hay beneficios económicos registrados." />}</PortfolioChartPanel>
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-2">
        <PortfolioChartPanel eyebrow="Capacidad" title="Carga abierta por responsable" description="Selecciona un responsable en los filtros para profundizar.">{workloadRows.length ? <DynamicChart option={workloadOption} style={{ height: 320 }} /> : <EmptyChart message="No hay actividades abiertas en la selección." />}</PortfolioChartPanel>
        <PortfolioChartPanel eyebrow="Flujo de ejecución" title="Estado de las actividades" description="Distribución de trabajo pendiente, en proceso, bloqueado y cerrado.">{statusRows.length ? <DynamicChart option={statusOption} style={{ height: 320 }} /> : <EmptyChart message="No hay actividades para analizar." />}</PortfolioChartPanel>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase text-brand-700">Portafolio visible</p><h2 className="mt-1 text-xl font-extrabold text-ink">Salud de cada Kaizen</h2><p className="mt-1 text-sm text-slate-500">Avance, fechas, responsable y alerta en una sola lectura.</p></div><span className="text-xs font-extrabold text-slate-500">{projectRows.length} proyectos</span></div>
        {!projectRows.length ? <EmptyState title="No hay Kaizen con estos filtros" description="Restablece los filtros para recuperar el portafolio completo." /> : <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{projectRows.map(({ project, progress, planned, overdue, blocked, atRisk: risk }) => <Link className={`surface surface-interactive block min-h-72 rounded-lg border-l-4 p-5 ${risk ? "border-l-rose-500" : "border-l-slate-950"}`} href={`/kaizen/${project.id}`} key={project.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-extrabold uppercase text-brand-700">Kaizen #{String(project.number).padStart(3, "0")}</p><h3 className="mt-1 line-clamp-2 text-lg font-extrabold leading-6 text-ink">{project.title}</h3></div><KaizenStatusPill status={project.status} /></div><p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">{project.objective}</p><div className="mt-5"><ProgressMeter label={`${progress.closed} de ${progress.total} actividades · plan ${planned}%`} percent={progress.percent} /></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs"><div><p className="font-bold text-slate-500">Líder</p><p className="mt-1 truncate font-extrabold text-slate-800">{project.leaderName}</p></div><div><p className="font-bold text-slate-500">Fecha objetivo</p><p className="mt-1 font-extrabold text-slate-800">{new Date(project.endDate).toLocaleDateString("es-MX", { timeZone: PROPEX_TIME_ZONE })}</p></div></div>{risk ? <p className="mt-4 flex items-center gap-2 text-xs font-extrabold text-rose-700"><AlertTriangle className="h-4 w-4" aria-hidden />{overdue} vencidas · {blocked} bloqueadas · brecha {Math.max(0, planned - progress.percent)} pts</p> : null}</Link>)}</div>}
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase text-slate-500">Siguiente paso</p><h2 className="mt-1 text-xl font-extrabold text-ink">Próximos compromisos</h2></div><Link className="text-xs font-extrabold text-brand-700 hover:underline" href="/kaizen/kanban">Abrir Kanban</Link></div>
        {!commitments.length ? <EmptyState title="No hay actividades abiertas" description="Todos los compromisos de la selección están atendidos." /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Kaizen</th><th>Actividad</th><th>Responsable</th><th>Compromiso</th><th>Estatus</th><th></th></tr></thead><tbody>{commitments.map((activity) => <tr key={activity.id}><td className="font-extrabold text-brand-700">{activity.project.folio}</td><td className="min-w-64">{activity.action}</td><td>{activity.ownerName ?? "Sin asignar"}</td><td className={isActivityOverdue(activity, now) ? "font-extrabold text-rose-700" : ""}>{activity.dueDate ? new Date(activity.dueDate).toLocaleDateString("es-MX", { timeZone: PROPEX_TIME_ZONE }) : "Sin fecha"}</td><td><WorkStatusPill status={activity.status} /></td><td><Link aria-label={`Abrir ${activity.project.folio}`} className="icon-button h-9 w-9 min-w-9" href={`/kaizen/${activity.project.id}`}><ArrowRight className="h-4 w-4" aria-hidden /></Link></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}

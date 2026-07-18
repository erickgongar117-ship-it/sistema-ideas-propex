"use client";

import type { GenbaStatus, WorkItemStatus } from "@prisma/client";
import type { EChartsOption } from "echarts";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Footprints,
  MapPinned,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  UserRoundX,
  UsersRound
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { GenbaStatusPill, WorkStatusPill } from "@/components/module-status";
import { EmptyChart, PortfolioAttention, PortfolioChartPanel, PortfolioMetric } from "@/components/portfolio-command-ui";
import { ProgressMeter } from "@/components/progress-meter";
import { WORKSPACE_PERIOD_EVENT, WORKSPACE_PERIOD_STORAGE, type WorkspacePeriod } from "@/components/workspace-controls";
import { genbaStatusLabels } from "@/lib/domain";

const DynamicChart = dynamic(() => import("@/components/premium-chart"), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center text-sm font-bold text-slate-400">Preparando visualización...</div>
});

const DAY = 86_400_000;
type Period = WorkspacePeriod;

export type GenbaDashboardActivity = {
  id: string;
  number: number;
  problem: string;
  action: string | null;
  ownerName: string | null;
  dueDate: string | null;
  status: WorkItemStatus;
  closedAt: string | null;
  createdAt: string;
  promotedToKaizen: boolean;
};

export type GenbaDashboardWalk = {
  id: string;
  number: number;
  folio: string;
  areaName: string;
  visitDate: string;
  status: GenbaStatus;
  coordinatorName: string;
  expectedDepartments: number;
  attendedDepartments: number;
  createdAt: string;
  closedAt: string | null;
  activities: GenbaDashboardActivity[];
};

function activityProgress(activities: GenbaDashboardActivity[]) {
  const relevant = activities.filter((activity) => activity.status !== "COMBINADA");
  const closed = relevant.filter((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status)).length;
  return { total: relevant.length, closed, open: relevant.length - closed, percent: relevant.length ? Math.round((closed / relevant.length) * 100) : 0 };
}

function attendance(walk: GenbaDashboardWalk) {
  return walk.expectedDepartments ? Math.round((walk.attendedDepartments / walk.expectedDepartments) * 100) : 0;
}

function isActivityOverdue(activity: GenbaDashboardActivity, now: Date) {
  return Boolean(activity.dueDate && new Date(activity.dueDate) < now && !["COMPLETADA", "CANCELADA", "COMBINADA"].includes(activity.status));
}

function bucketStart(date: Date, monthly: boolean) {
  return monthly
    ? new Date(date.getFullYear(), date.getMonth(), 1)
    : new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
}

function bucketId(date: Date, monthly: boolean) {
  const start = bucketStart(date, monthly);
  return monthly ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}` : start.toISOString().slice(0, 10);
}

function bucketLabel(date: Date, monthly: boolean) {
  const start = bucketStart(date, monthly);
  return monthly
    ? start.toLocaleDateString("es-MX", { month: "short", year: "2-digit" })
    : start.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function GenbaCommandCenter({ walks, generatedAt }: { walks: GenbaDashboardWalk[]; generatedAt: string }) {
  const [period, setPeriod] = useState<Period>("90");
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState<"all" | GenbaStatus>("all");
  const [coordinator, setCoordinator] = useState("all");
  const now = useMemo(() => new Date(generatedAt), [generatedAt]);

  useEffect(() => {
    const storedPeriod = window.localStorage.getItem(WORKSPACE_PERIOD_STORAGE);
    if (["30", "90", "365", "all"].includes(storedPeriod ?? "")) setPeriod(storedPeriod as Period);
    const onPeriodChange = (event: Event) => setPeriod((event as CustomEvent<WorkspacePeriod>).detail);
    window.addEventListener(WORKSPACE_PERIOD_EVENT, onPeriodChange);
    return () => window.removeEventListener(WORKSPACE_PERIOD_EVENT, onPeriodChange);
  }, []);
  const areas = useMemo(() => [...new Set(walks.map((walk) => walk.areaName))].sort(), [walks]);
  const coordinators = useMemo(() => [...new Set(walks.map((walk) => walk.coordinatorName))].sort(), [walks]);

  const filteredWalks = useMemo(() => {
    const start = period === "all" ? null : now.getTime() - Number(period) * DAY;
    return walks.filter((walk) =>
      (start === null || new Date(walk.visitDate).getTime() >= start) &&
      (area === "all" || walk.areaName === area) &&
      (status === "all" || walk.status === status) &&
      (coordinator === "all" || walk.coordinatorName === coordinator)
    );
  }, [walks, period, area, status, coordinator, now]);

  const relevantActivities = useMemo(() => filteredWalks.flatMap((walk) => walk.activities.map((activity) => ({ ...activity, walk }))).filter((activity) => activity.status !== "COMBINADA"), [filteredWalks]);
  const openActivities = relevantActivities.filter((activity) => !["COMPLETADA", "CANCELADA"].includes(activity.status));
  const overdueActivities = openActivities.filter((activity) => isActivityOverdue(activity, now));
  const blockedActivities = openActivities.filter((activity) => activity.status === "BLOQUEADA");
  const unassignedActivities = openActivities.filter((activity) => !activity.ownerName);
  const closedActivities = relevantActivities.filter((activity) => ["COMPLETADA", "CANCELADA"].includes(activity.status));
  const closureRate = relevantActivities.length ? Math.round((closedActivities.length / relevantActivities.length) * 100) : 0;
  const averageAttendance = filteredWalks.length ? Math.round(filteredWalks.reduce((sum, walk) => sum + attendance(walk), 0) / filteredWalks.length) : 0;
  const closedWithDates = closedActivities.filter((activity) => activity.closedAt);
  const averageClosureDays = closedWithDates.length ? Math.round(closedWithDates.reduce((sum, activity) => sum + Math.max(0, (new Date(activity.closedAt!).getTime() - new Date(activity.createdAt).getTime()) / DAY), 0) / closedWithDates.length) : 0;
  const promotedActivities = relevantActivities.filter((activity) => activity.promotedToKaizen).length;
  const openWalks = filteredWalks.filter((walk) => walk.status === "ABIERTO");

  const monthly = period === "365" || period === "all";
  const trendRows = useMemo(() => {
    const map = new Map<string, { label: string; sort: number; walks: number; closed: number }>();
    const ensure = (date: Date) => {
      const id = bucketId(date, monthly);
      const current = map.get(id) ?? { label: bucketLabel(date, monthly), sort: bucketStart(date, monthly).getTime(), walks: 0, closed: 0 };
      map.set(id, current);
      return current;
    };
    filteredWalks.forEach((walk) => { ensure(new Date(walk.visitDate)).walks += 1; });
    closedActivities.forEach((activity) => { if (activity.closedAt) ensure(new Date(activity.closedAt)).closed += 1; });
    return [...map.values()].sort((a, b) => a.sort - b.sort).slice(monthly ? -12 : -13);
  }, [filteredWalks, closedActivities, monthly]);

  const trendOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    color: ["#EA0029", "#14835f"],
    tooltip: { trigger: "axis", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    legend: { bottom: 0, icon: "circle", textStyle: { color: "#64748b", fontSize: 11 } },
    grid: { left: 40, right: 18, top: 22, bottom: 48 },
    xAxis: { type: "category", boundaryGap: false, data: trendRows.map((row) => row.label), axisLine: { lineStyle: { color: "#d8d8d8" } }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 } },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    series: [
      { name: "Recorridos", type: "line", smooth: true, symbolSize: 7, data: trendRows.map((row) => row.walks), lineStyle: { width: 3 }, areaStyle: { color: "rgba(234,0,41,.08)" } },
      { name: "Actividades cerradas", type: "line", smooth: true, symbolSize: 7, data: trendRows.map((row) => row.closed), lineStyle: { width: 3 } }
    ]
  };

  const areaAttendanceRows = useMemo(() => {
    const map = new Map<string, number[]>();
    filteredWalks.forEach((walk) => map.set(walk.areaName, [...(map.get(walk.areaName) ?? []), attendance(walk)]));
    return [...map.entries()].map(([name, values]) => ({ name, value: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) })).sort((a, b) => a.value - b.value).slice(0, 10);
  }, [filteredWalks]);
  const attendanceOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c}% de asistencia", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 118, right: 38, top: 12, bottom: 20 },
    xAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%", color: "#94a3b8" }, splitLine: { lineStyle: { color: "#eeeeee" } } },
    yAxis: { type: "category", inverse: true, data: areaAttendanceRows.map((row) => row.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontSize: 10, width: 106, overflow: "truncate" } },
    series: [{ type: "bar", barWidth: 15, data: areaAttendanceRows.map((row) => ({ value: row.value, itemStyle: { color: row.value >= 90 ? "#14835f" : row.value >= 70 ? "#a16207" : "#d32236", borderRadius: [0, 5, 5, 0] } })), label: { show: true, position: "right", formatter: "{c}%", color: "#171717", fontWeight: 700 } }]
  };

  const topAreas = useMemo(() => {
    const map = new Map<string, number>();
    filteredWalks.forEach((walk) => map.set(walk.areaName, (map.get(walk.areaName) ?? 0) + walk.activities.filter((activity) => activity.status !== "COMBINADA").length));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
  }, [filteredWalks]);
  const heatPeriods = [...new Set(filteredWalks.map((walk) => bucketId(new Date(walk.visitDate), monthly)))].sort().slice(monthly ? -8 : -10);
  const heatLabels = heatPeriods.map((id) => bucketLabel(new Date(`${id}T12:00:00`), monthly));
  const heatData = topAreas.flatMap((areaName, x) => heatPeriods.map((periodId, y) => {
    const value = filteredWalks.filter((walk) => walk.areaName === areaName && bucketId(new Date(walk.visitDate), monthly) === periodId).reduce((sum, walk) => sum + walk.activities.filter((activity) => activity.status !== "COMBINADA").length, 0);
    return { name: areaName, value: [x, y, value] };
  }));
  const heatMax = Math.max(1, ...heatData.map((row) => Number(row.value[2])));
  const heatmapOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { formatter: (params: unknown) => {
      const item = params as { data?: { name?: string; value?: number[] } };
      const value = item.data?.value ?? [];
      return `${item.data?.name ?? "Área"}<br/>${heatLabels[value[1]] ?? "Periodo"}: <b>${value[2] ?? 0} actividades</b>`;
    }, backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 88, right: 18, top: 18, bottom: 82 },
    xAxis: { type: "category", data: topAreas, splitArea: { show: true }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontSize: 9, rotate: 32, width: 78, overflow: "truncate" } },
    yAxis: { type: "category", data: heatLabels, splitArea: { show: true }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 } },
    visualMap: { min: 0, max: heatMax, calculable: false, orient: "horizontal", left: "center", bottom: 4, inRange: { color: ["#f8fafc", "#fecdd3", "#EA0029", "#171717"] }, textStyle: { color: "#64748b", fontSize: 10 } },
    series: [{ type: "heatmap", data: heatData, label: { show: true, formatter: (params: unknown) => { const item = params as { value?: number[] }; return String(item.value?.[2] ?? 0); }, color: "#171717", fontSize: 10 }, itemStyle: { borderColor: "#fff", borderWidth: 3, borderRadius: 4 } }]
  };

  const agingRows = [
    { name: "0-7 días", min: 0, max: 7, color: "#14835f" },
    { name: "8-14 días", min: 8, max: 14, color: "#176fc1" },
    { name: "15-30 días", min: 15, max: 30, color: "#a16207" },
    { name: "31-60 días", min: 31, max: 60, color: "#d32236" },
    { name: "+60 días", min: 61, max: Number.POSITIVE_INFINITY, color: "#171717" }
  ].map((bucket) => ({ ...bucket, value: openActivities.filter((activity) => { const age = Math.floor((now.getTime() - new Date(activity.createdAt).getTime()) / DAY); return age >= bucket.min && age <= bucket.max; }).length }));
  const agingOption: EChartsOption = {
    animationDuration: 650,
    aria: { enabled: true },
    tooltip: { trigger: "item", formatter: "{b}: {c} actividades abiertas", backgroundColor: "#171717", borderWidth: 0, textStyle: { color: "#fff" } },
    grid: { left: 44, right: 14, top: 18, bottom: 42 },
    xAxis: { type: "category", data: agingRows.map((row) => row.name), axisLine: { lineStyle: { color: "#d8d8d8" } }, axisTick: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 } },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeeee" } }, axisLabel: { color: "#94a3b8" } },
    series: [{ type: "bar", barMaxWidth: 38, data: agingRows.map((row) => ({ value: row.value, itemStyle: { color: row.color, borderRadius: [5, 5, 0, 0] } })), label: { show: true, position: "top", color: "#171717", fontWeight: 700 } }]
  };

  const commitments = openActivities.slice().sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  }).slice(0, 12);
  const activeFilters = [period !== "90", area !== "all", status !== "all", coordinator !== "all"].filter(Boolean).length;
  const updatePeriod = (value: Period) => { setPeriod(value); window.localStorage.setItem(WORKSPACE_PERIOD_STORAGE, value); window.dispatchEvent(new CustomEvent<WorkspacePeriod>(WORKSPACE_PERIOD_EVENT, { detail: value })); };
  const resetFilters = () => { updatePeriod("90"); setArea("all"); setStatus("all"); setCoordinator("all"); };

  return (
    <div className="dashboard-command-center">
      <section className="surface mb-5 rounded-lg p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-500" aria-hidden /><p className="text-xs font-extrabold uppercase text-slate-500">Gestión visual de piso</p></div><h2 className="mt-1 text-lg font-extrabold text-ink">Convierte cada recorrido en acciones verificables</h2><p className="mt-1 text-xs text-slate-500">Actualizado {now.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label><span className="label">Periodo</span><select className="field min-w-36" value={period} onChange={(event) => updatePeriod(event.target.value as Period)}><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option><option value="365">Último año</option><option value="all">Todo el historial</option></select></label>
            <label><span className="label">Área visitada</span><select className="field min-w-40" value={area} onChange={(event) => setArea(event.target.value)}><option value="all">Todas</option>{areas.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
            <label><span className="label">Estatus</span><select className="field min-w-36" value={status} onChange={(event) => setStatus(event.target.value as "all" | GenbaStatus)}><option value="all">Todos</option>{Object.entries(genbaStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label><span className="label">Coordinador</span><select className="field min-w-40" value={coordinator} onChange={(event) => setCoordinator(event.target.value)}><option value="all">Todos</option>{coordinators.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          </div>
        </div>
        {activeFilters ? <div className="mt-4 flex items-center gap-3 border-t border-line pt-3"><span className="text-xs font-bold text-slate-500">{activeFilters} filtros activos</span><button className="btn btn-secondary ml-auto min-h-9 px-3 text-xs" onClick={resetFilters} type="button"><RotateCcw className="h-3.5 w-3.5" aria-hidden />Restablecer</button></div> : null}
      </section>

      <PortfolioAttention eyebrow="Atención de hoy" title="Hallazgos que necesitan seguimiento" description="Enfoca vencimientos, bloqueos y actividades sin dueño." items={[
        { label: "Actividades vencidas", value: overdueActivities.length, href: "/genba/kanban", icon: AlertTriangle, tone: "text-rose-300" },
        { label: "Actividades bloqueadas", value: blockedActivities.length, href: "/genba/kanban", icon: ShieldAlert, tone: "text-red-300" },
        { label: "Acciones sin responsable", value: unassignedActivities.length, href: "/genba/kanban", icon: UserRoundX, tone: "text-amber-300" },
        { label: "Recorridos abiertos", value: openWalks.length, href: openWalks[0] ? `/genba/${openWalks[0].id}` : "/genba", icon: Footprints, tone: "text-blue-300" }
      ]} />

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PortfolioMetric label="Recorridos GENBA" value={filteredWalks.length} detail={`${openWalks.length} recorridos todavía abiertos`} icon={Footprints} />
        <PortfolioMetric label="Actividades abiertas" value={openActivities.length} detail={`${relevantActivities.length} actividades vigentes`} icon={ClipboardList} tone="amber" />
        <PortfolioMetric label="Tasa de cierre" value={`${closureRate}%`} detail={`${closedActivities.length} actividades atendidas`} icon={CheckCircle2} tone="green" />
        <PortfolioMetric label="Asistencia promedio" value={`${averageAttendance}%`} detail="Departamentos esperados contra presentes" icon={UsersRound} tone="blue" />
        <PortfolioMetric label="Tiempo de cierre" value={`${averageClosureDays} d`} detail={`${promotedActivities} actividades promovidas a Kaizen`} icon={Clock3} tone="red" />
      </section>

      <section className="mt-7 grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
        <PortfolioChartPanel eyebrow="Ritmo de ejecución" title="Recorridos y actividades cerradas" description="Evolución del trabajo detectado y resuelto en piso.">{trendRows.length ? <DynamicChart option={trendOption} style={{ height: 320 }} /> : <EmptyChart message="No hay recorridos en el periodo seleccionado." />}</PortfolioChartPanel>
        <PortfolioChartPanel eyebrow="Disciplina del recorrido" title="Asistencia por área" description="Identifica rápidamente dónde falta representación departamental.">{areaAttendanceRows.length ? <DynamicChart option={attendanceOption} style={{ height: 320 }} /> : <EmptyChart message="No hay asistencia registrada en esta selección." />}</PortfolioChartPanel>
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[1.15fr_0.85fr]">
        <PortfolioChartPanel eyebrow="Concentración operativa" title="Mapa de calor de actividades" description="Cantidad de hallazgos por área y periodo." action={area !== "all" ? <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">{area}</span> : undefined}>{topAreas.length && heatPeriods.length ? <DynamicChart option={heatmapOption} style={{ height: 350 }} /> : <EmptyChart message="Se necesitan recorridos para construir el mapa de calor." />}</PortfolioChartPanel>
        <PortfolioChartPanel eyebrow="Riesgo por antigüedad" title="Edad de actividades abiertas" description="Concentración de pendientes según días sin cierre."><DynamicChart option={agingOption} style={{ height: 350 }} /></PortfolioChartPanel>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase text-brand-700">Recorridos visibles</p><h2 className="mt-1 text-xl font-extrabold text-ink">Cumplimiento por GENBA</h2><p className="mt-1 text-sm text-slate-500">Hallazgos, asistencia y avance sin perder el contexto del recorrido.</p></div><span className="text-xs font-extrabold text-slate-500">{filteredWalks.length} recorridos</span></div>
        {!filteredWalks.length ? <EmptyState title="No hay recorridos con estos filtros" description="Restablece los filtros para recuperar el historial completo." /> : <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{filteredWalks.slice(0, 12).map((walk) => { const progress = activityProgress(walk.activities); const overdue = walk.activities.filter((activity) => isActivityOverdue(activity, now)).length; const blocked = walk.activities.filter((activity) => activity.status === "BLOQUEADA").length; const risk = overdue > 0 || blocked > 0; return <Link className={`surface surface-interactive block min-h-64 rounded-lg border-l-4 p-5 ${risk ? "border-l-rose-500" : "border-l-slate-950"}`} href={`/genba/${walk.id}`} key={walk.id}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase text-brand-700">GENBA #{String(walk.number).padStart(3, "0")}</p><h3 className="mt-1 text-lg font-extrabold text-ink">{walk.areaName}</h3><p className="mt-1 text-xs text-slate-500">{new Date(walk.visitDate).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p></div><GenbaStatusPill status={walk.status} /></div><div className="mt-5"><ProgressMeter label={`${progress.closed} de ${progress.total} actividades cerradas`} percent={progress.percent} /></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs"><div><p className="font-bold text-slate-500">Coordinador</p><p className="mt-1 truncate font-extrabold text-slate-800">{walk.coordinatorName}</p></div><div><p className="font-bold text-slate-500">Asistencia</p><p className="mt-1 font-extrabold text-slate-800">{attendance(walk)}%</p></div></div>{risk ? <p className="mt-4 flex items-center gap-2 text-xs font-extrabold text-rose-700"><AlertTriangle className="h-4 w-4" aria-hidden />{overdue} vencidas · {blocked} bloqueadas</p> : null}</Link>; })}</div>}
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase text-slate-500">Siguiente paso</p><h2 className="mt-1 text-xl font-extrabold text-ink">Próximos compromisos</h2></div><Link className="text-xs font-extrabold text-brand-700 hover:underline" href="/genba/kanban">Abrir Kanban</Link></div>
        {!commitments.length ? <EmptyState title="No hay actividades abiertas" description="Todos los hallazgos de la selección están atendidos." /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>GENBA</th><th>Área</th><th>Actividad</th><th>Responsable</th><th>Compromiso</th><th>Estatus</th><th></th></tr></thead><tbody>{commitments.map((activity) => <tr key={activity.id}><td className="font-extrabold text-brand-700">{activity.walk.folio}</td><td>{activity.walk.areaName}</td><td className="min-w-64">{activity.action ?? activity.problem}</td><td>{activity.ownerName ?? "Sin asignar"}</td><td className={isActivityOverdue(activity, now) ? "font-extrabold text-rose-700" : ""}>{activity.dueDate ? new Date(activity.dueDate).toLocaleDateString("es-MX") : "Sin fecha"}</td><td><WorkStatusPill status={activity.status} /></td><td><Link aria-label={`Abrir ${activity.walk.folio}`} className="icon-button h-9 w-9 min-w-9" href={`/genba/${activity.walk.id}`}><ArrowRight className="h-4 w-4" aria-hidden /></Link></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}

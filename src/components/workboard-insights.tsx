"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { AlertTriangle, ArrowRight, ChartNoAxesColumnIncreasing, Gauge, UsersRound } from "lucide-react";
import PremiumChart from "@/components/premium-chart";
import type { WorkboardItem, WorkboardMetric } from "@/components/operations-workboard";

type GroupInsight = {
  key: string;
  label: string;
  color: string;
  count: number;
  /** Cuantos del grupo tienen porcentaje real. Las Ideas no cuentan para el promedio. */
  measurable: number;
  progress: number;
  risks: number;
};

export function WorkboardInsights({
  items,
  metrics,
  onDrillGroup,
  onDrillOwner
}: {
  items: WorkboardItem[];
  metrics: WorkboardMetric[];
  onDrillGroup: (group: string) => void;
  onDrillOwner: (owner: string) => void;
}) {
  const groups = useMemo<GroupInsight[]>(() => {
    const result = new Map<string, GroupInsight>();
    items.forEach((item) => {
      const current = result.get(item.group) ?? {
        key: item.group,
        label: item.groupLabel,
        color: item.groupColor,
        count: 0,
        measurable: 0,
        progress: 0,
        risks: 0
      };
      current.count += 1;
      // Solo promedia lo que tiene denominador real; una Idea no aporta porcentaje.
      if (item.progress !== null) { current.measurable += 1; current.progress += item.progress; }
      current.risks += Number(Boolean(item.risk));
      result.set(item.group, current);
    });
    return [...result.values()]
      .map((group) => ({ ...group, progress: group.measurable ? Math.round(group.progress / group.measurable) : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const owners = useMemo(() => {
    const result = new Map<string, { count: number; risks: number }>();
    items.forEach((item) => {
      const current = result.get(item.owner) ?? { count: 0, risks: 0 };
      current.count += 1;
      current.risks += Number(Boolean(item.risk));
      result.set(item.owner, current);
    });
    return [...result.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .reverse();
  }, [items]);

  const groupByLabel = useMemo(() => new Map(groups.map((group) => [group.label, group.key])), [groups]);
  const riskItems = useMemo(() => items.filter((item) => item.risk).slice(0, 7), [items]);
  const totalRisks = items.filter((item) => item.risk).length;
  const measurableItems = items.filter((item) => item.progress !== null);
  const averageProgress = measurableItems.length
    ? Math.round(measurableItems.reduce((sum, item) => sum + (item.progress ?? 0), 0) / measurableItems.length)
    : null;
  const owned = items.filter((item) => item.owner && item.owner !== "Sin responsable" && item.owner !== "Sin asignar").length;

  const statusOption = useMemo<EChartsOption>(() => ({
    aria: { enabled: true, description: "Distribucion de registros por estado. Selecciona una barra para abrir los registros." },
    animationDuration: 380,
    grid: { left: 8, right: 22, top: 12, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params as Array<{ name?: string; value?: number }> : [];
        const row = rows[0];
        const group = groups.find((candidate) => candidate.label === row?.name);
        return `<strong>${row?.name ?? "Estado"}</strong><br/>${row?.value ?? 0} registros<br/>${group?.progress ?? 0}% de avance promedio`;
      }
    },
    xAxis: { type: "value", minInterval: 1, axisLabel: { show: false }, axisLine: { show: false }, splitLine: { lineStyle: { color: "#edf0f3" } } },
    yAxis: { type: "category", data: groups.map((group) => group.label).reverse(), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { width: 132, overflow: "truncate", fontWeight: 700 } },
    series: [{
      type: "bar",
      barWidth: 18,
      data: groups.map((group) => ({ value: group.count, itemStyle: { color: group.color, borderRadius: [0, 3, 3, 0] } })).reverse(),
      label: { show: true, position: "right", fontWeight: 800 },
      cursor: "pointer"
    }]
  }), [groups]);

  const ownerOption = useMemo<EChartsOption>(() => ({
    aria: { enabled: true, description: "Carga de registros por responsable. Selecciona una barra para ver su trabajo." },
    animationDuration: 380,
    grid: { left: 8, right: 22, top: 12, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params as Array<{ name?: string; value?: number }> : [];
        const row = rows[0];
        const owner = owners.find((candidate) => candidate.name === row?.name);
        return `<strong>${row?.name ?? "Responsable"}</strong><br/>${row?.value ?? 0} registros<br/>${owner?.risks ?? 0} requieren atencion`;
      }
    },
    xAxis: { type: "value", minInterval: 1, axisLabel: { show: false }, axisLine: { show: false }, splitLine: { lineStyle: { color: "#edf0f3" } } },
    yAxis: { type: "category", data: owners.map((owner) => owner.name), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { width: 118, overflow: "truncate", fontWeight: 700 } },
    series: [{
      type: "bar",
      barWidth: 16,
      data: owners.map((owner) => ({ value: owner.count, itemStyle: { color: owner.risks ? "#ea0029" : "#171717", borderRadius: [0, 3, 3, 0] } })),
      label: { show: true, position: "right", fontWeight: 800 },
      cursor: "pointer"
    }]
  }), [owners]);

  return (
    <div className="workboard-insights">
      <div className="workboard-insight-heading">
        <div><span>Indicadores del periodo</span><h2>Lectura ejecutiva</h2></div>
        <p>Las graficas y la lectura rapida responden a los filtros activos.</p>
      </div>
      <section aria-label="Indicadores del tablero" className="workboard-metrics">
        {metrics.map((metric) => (
          <article key={metric.label} style={{ "--metric-color": metric.color } as React.CSSProperties}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </section>

      <section aria-label="Lectura rapida" className="workboard-pulse">
        <article>
          <span><Gauge className="h-4 w-4" aria-hidden />Avance promedio</span>
          <strong>{averageProgress === null ? "—" : `${averageProgress}%`}</strong>
          <i><b style={{ width: `${averageProgress ?? 0}%` }} /></i>
          {averageProgress === null ? <small>Esta seleccion se sigue por etapa</small> : <small>Solo proyectos con actividades</small>}
        </article>
        <article>
          <span><AlertTriangle className="h-4 w-4" aria-hidden />Requieren atencion</span>
          <strong>{totalRisks}</strong>
          <small>{items.length ? Math.round((totalRisks / items.length) * 100) : 0}% de la seleccion</small>
        </article>
        <article>
          <span><UsersRound className="h-4 w-4" aria-hidden />Con responsable</span>
          <strong>{owned}</strong>
          <small>{items.length ? Math.round((owned / items.length) * 100) : 0}% con responsable visible</small>
        </article>
      </section>

      <div className="workboard-insight-grid">
        <section className="workboard-insight-widget">
          <header>
            <div><span>Flujo operativo</span><h2>Trabajo por estado</h2></div>
            <ChartNoAxesColumnIncreasing className="h-5 w-5" aria-hidden />
          </header>
          {groups.length ? (
            <PremiumChart
              onEvents={{ click: (params) => { const key = params.name ? groupByLabel.get(params.name) : undefined; if (key) onDrillGroup(key); } }}
              option={statusOption}
              style={{ height: Math.max(250, groups.length * 46) }}
            />
          ) : <p className="workboard-empty-small">No hay estados en esta seleccion.</p>}
          <p className="workboard-chart-hint">Selecciona una barra para abrir ese grupo.</p>
        </section>

        <section className="workboard-insight-widget">
          <header>
            <div><span>Capacidad</span><h2>Carga por responsable</h2></div>
            <UsersRound className="h-5 w-5" aria-hidden />
          </header>
          {owners.length ? (
            <PremiumChart
              onEvents={{ click: (params) => { if (params.name) onDrillOwner(params.name); } }}
              option={ownerOption}
              style={{ height: Math.max(250, owners.length * 42) }}
            />
          ) : <p className="workboard-empty-small">No hay responsables en esta seleccion.</p>}
          <p className="workboard-chart-hint">Rojo indica que existe al menos un compromiso en riesgo.</p>
        </section>

        <section className="workboard-insight-widget workboard-decision-widget">
          <header>
            <div><span>Prioridad</span><h2>Siguiente decision</h2></div>
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </header>
          {riskItems.length ? (
            <div>
              {riskItems.map((item) => (
                <Link href={item.href} key={item.id}>
                  <span className="workboard-decision-code">{item.code}</span>
                  <span><strong>{item.title}</strong><small>{item.riskLabel ?? "Requiere revision"}</small></span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ))}
            </div>
          ) : (
            <div className="workboard-all-clear">
              <span><Gauge className="h-5 w-5" aria-hidden /></span>
              <strong>Sin alertas en la seleccion</strong>
              <p>Los compromisos visibles tienen responsable y fecha bajo control.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

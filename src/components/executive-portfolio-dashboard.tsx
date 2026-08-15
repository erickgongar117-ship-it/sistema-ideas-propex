"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { EChartsOption } from "echarts";
import {
  AlertTriangle,
  ArrowRight,
  Coins,
  FolderKanban,
  GraduationCap,
  Lightbulb,
  MapPinned,
  ShieldAlert,
  TrendingUp,
  UsersRound
} from "lucide-react";
import PremiumChart from "@/components/premium-chart";

export type ExecutiveMetric = {
  id: "ideas" | "kaizen" | "genba" | "training" | "coins";
  label: string;
  value: string;
  detail: string;
  signal: string;
  color: string;
  href: string;
};

export type ExecutivePortfolioRow = {
  id: "ideas" | "kaizen" | "genba" | "training" | "coins";
  label: string;
  status: string;
  progress: number;
  active: number;
  risk: number;
  detail: string;
  href: string;
  color: string;
};

export type ExecutiveAlert = {
  id: string;
  count: number;
  title: string;
  detail: string;
  href: string;
  severity: number;
};

export type ExecutiveTrend = {
  labels: string[];
  ideasCreated: number[];
  ideasClosed: number[];
  kaizenStarted: number[];
  genbaWalks: number[];
};

export type ExecutiveRiskCell = {
  module: string;
  type: string;
  value: number;
  href: string;
};

const icons = {
  ideas: Lightbulb,
  kaizen: FolderKanban,
  genba: MapPinned,
  training: GraduationCap,
  coins: Coins
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function ExecutivePortfolioDashboard({
  metrics,
  portfolio,
  alerts,
  trend,
  riskMatrix,
  finance,
  people
}: {
  metrics: ExecutiveMetric[];
  portfolio: ExecutivePortfolioRow[];
  alerts: ExecutiveAlert[];
  trend: ExecutiveTrend;
  riskMatrix: ExecutiveRiskCell[];
  finance: { estimatedSavings: number; registeredSavings: number; awardedCoins: number; redeemedCoins: number };
  people: { active: number; participantsWithMovements: number; negativeBalances: number };
}) {
  const router = useRouter();
  const portfolioByLabel = useMemo(() => new Map(portfolio.map((row) => [row.label, row.href])), [portfolio]);
  const riskByCoordinate = useMemo(() => new Map(riskMatrix.map((cell) => [`${cell.module}|${cell.type}`, cell.href])), [riskMatrix]);
  const modules = useMemo(() => [...new Set(riskMatrix.map((cell) => cell.module))], [riskMatrix]);
  const riskTypes = useMemo(() => [...new Set(riskMatrix.map((cell) => cell.type))], [riskMatrix]);
  const maxRisk = Math.max(1, ...riskMatrix.map((cell) => cell.value));

  const trendOption = useMemo<EChartsOption>(() => ({
    aria: { enabled: true, description: "Tendencia mensual de ideas, cierres, proyectos Kaizen y recorridos GENBA." },
    animationDuration: 450,
    color: ["#ea0029", "#00a878", "#171717", "#579bfc"],
    tooltip: { trigger: "axis" },
    legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 8, textStyle: { fontSize: 11, fontWeight: 700 } },
    grid: { left: 12, right: 18, top: 44, bottom: 12, containLabel: true },
    xAxis: { type: "category", boundaryGap: false, data: trend.labels, axisTick: { show: false }, axisLine: { show: false } },
    yAxis: { type: "value", minInterval: 1, axisLine: { show: false }, splitLine: { lineStyle: { color: "#edf0f3" } } },
    series: [
      { name: "Ideas creadas", type: "line", smooth: 0.3, symbolSize: 7, data: trend.ideasCreated, lineStyle: { width: 3 }, areaStyle: { opacity: 0.06 } },
      { name: "Ideas cerradas", type: "line", smooth: 0.3, symbolSize: 7, data: trend.ideasClosed, lineStyle: { width: 3 } },
      { name: "Kaizen iniciados", type: "line", smooth: 0.3, symbolSize: 6, data: trend.kaizenStarted, lineStyle: { width: 2 } },
      { name: "GENBA realizados", type: "line", smooth: 0.3, symbolSize: 6, data: trend.genbaWalks, lineStyle: { width: 2 } }
    ]
  }), [trend]);

  const portfolioOption = useMemo<EChartsOption>(() => ({
    aria: { enabled: true, description: "Avance por frente del portafolio PROpEx." },
    animationDuration: 420,
    grid: { left: 12, right: 28, top: 12, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params as Array<{ name?: string; value?: number }> : [];
        const row = portfolio.find((candidate) => candidate.label === rows[0]?.name);
        return `<strong>${row?.label ?? "Frente"}</strong><br/>${row?.progress ?? 0}% de avance<br/>${row?.active ?? 0} activos · ${row?.risk ?? 0} en riesgo`;
      }
    },
    xAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%" }, axisLine: { show: false }, splitLine: { lineStyle: { color: "#edf0f3" } } },
    yAxis: { type: "category", data: portfolio.map((row) => row.label).reverse(), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { fontWeight: 800 } },
    series: [{
      type: "bar",
      barWidth: 20,
      showBackground: true,
      backgroundStyle: { color: "#eef1f4", borderRadius: 3 },
      data: portfolio.map((row) => ({ value: clamp(row.progress), itemStyle: { color: row.color, borderRadius: 3 } })).reverse(),
      label: { show: true, position: "right", formatter: "{c}%", fontWeight: 900 },
      cursor: "pointer"
    }]
  }), [portfolio]);

  const riskOption = useMemo<EChartsOption>(() => ({
    aria: { enabled: true, description: "Matriz de riesgos por modulo y tipo de atencion." },
    animationDuration: 420,
    tooltip: {
      position: "top",
      formatter: (params: unknown) => {
        const row = params as { data?: [number, number, number] };
        const data = row.data ?? [0, 0, 0];
        return `<strong>${modules[data[1]] ?? "Modulo"}</strong><br/>${riskTypes[data[0]] ?? "Riesgo"}: ${data[2]}`;
      }
    },
    grid: { left: 12, right: 12, top: 14, bottom: 12, containLabel: true },
    xAxis: { type: "category", data: riskTypes, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { fontWeight: 700 } },
    yAxis: { type: "category", data: modules, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { fontWeight: 800 } },
    visualMap: { min: 0, max: maxRisk, show: false, inRange: { color: ["#f4f5f7", "#ffd3db", "#ea0029"] } },
    series: [{
      type: "heatmap",
      data: riskMatrix.map((cell) => [riskTypes.indexOf(cell.type), modules.indexOf(cell.module), cell.value]),
      label: { show: true, fontWeight: 900 },
      itemStyle: { borderColor: "#ffffff", borderWidth: 4, borderRadius: 5 },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: "rgba(23,23,23,.18)" } },
      cursor: "pointer"
    }]
  }), [maxRisk, modules, riskMatrix, riskTypes]);

  const financeOption = useMemo<EChartsOption>(() => ({
    aria: { enabled: true, description: "Porcentaje de ahorro Kaizen registrado y ProbocaCoins canjeadas." },
    animationDuration: 420,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params as Array<{ name?: string; value?: number }> : [];
        const row = rows[0];
        if (row?.name === "Ahorro Kaizen") return `<strong>Ahorro Kaizen</strong><br/>$${finance.registeredSavings.toLocaleString("es-MX")} registrado de $${finance.estimatedSavings.toLocaleString("es-MX")} estimado<br/>${row.value ?? 0}% de ejecucion`;
        return `<strong>ProbocaCoins</strong><br/>${finance.redeemedCoins.toLocaleString("es-MX")} canjeadas de ${finance.awardedCoins.toLocaleString("es-MX")} otorgadas<br/>${row?.value ?? 0}% de uso`;
      }
    },
    grid: { left: 12, right: 18, top: 18, bottom: 12, containLabel: true },
    xAxis: { type: "category", data: ["Ahorro Kaizen", "ProbocaCoins"], axisTick: { show: false }, axisLine: { show: false }, axisLabel: { fontWeight: 800 } },
    yAxis: { type: "value", min: 0, max: 100, axisLine: { show: false }, splitLine: { lineStyle: { color: "#edf0f3" } }, axisLabel: { formatter: "{value}%" } },
    series: [{
      type: "bar",
      barMaxWidth: 54,
      showBackground: true,
      backgroundStyle: { color: "#eef1f4", borderRadius: 3 },
      data: [
        { value: finance.estimatedSavings ? Math.min(100, Math.round((finance.registeredSavings / finance.estimatedSavings) * 100)) : 0, itemStyle: { color: "#171717", borderRadius: [3, 3, 0, 0] } },
        { value: finance.awardedCoins ? Math.min(100, Math.round((finance.redeemedCoins / finance.awardedCoins) * 100)) : 0, itemStyle: { color: "#ea0029", borderRadius: [3, 3, 0, 0] } }
      ],
      label: { show: true, position: "top", formatter: "{c}%", fontWeight: 900 }
    }]
  }), [finance]);

  return (
    <section className="executive-dashboard" aria-label="Panel ejecutivo PROpEx">
      <div className="executive-metrics">
        {metrics.map((metric) => {
          const Icon = icons[metric.id];
          return (
            <Link href={metric.href} key={metric.id} style={{ "--executive-color": metric.color } as React.CSSProperties}>
              <span className="executive-metric-icon"><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
              <span className="executive-metric-copy"><small>{metric.label}</small><strong>{metric.value}</strong><em>{metric.detail}</em></span>
              <span className="executive-metric-signal">{metric.signal}<ArrowRight className="h-3.5 w-3.5" aria-hidden /></span>
            </Link>
          );
        })}
      </div>

      <div className="executive-layout">
        <div className="executive-canvas">
          <section className="executive-widget executive-trend-widget">
            <header><div><span>Ritmo de mejora</span><h2>Entrada y cierre mensual</h2></div><TrendingUp className="h-5 w-5" aria-hidden /></header>
            <PremiumChart option={trendOption} style={{ height: 330 }} />
          </section>

          <section className="executive-widget">
            <header><div><span>Portafolio conectado</span><h2>Avance por frente</h2></div><FolderKanban className="h-5 w-5" aria-hidden /></header>
            <PremiumChart
              onEvents={{ click: (params) => { const href = params.name ? portfolioByLabel.get(params.name) : undefined; if (href) router.push(href); } }}
              option={portfolioOption}
              style={{ height: 310 }}
            />
            <p className="executive-widget-hint">Selecciona un frente para abrir su tablero.</p>
          </section>

          <section className="executive-widget">
            <header><div><span>Control preventivo</span><h2>Matriz de atencion</h2></div><ShieldAlert className="h-5 w-5" aria-hidden /></header>
            <PremiumChart
              onEvents={{ click: (params) => {
                const data = (params as { data?: [number, number, number] }).data;
                if (!data) return;
                const href = riskByCoordinate.get(`${modules[data[1]]}|${riskTypes[data[0]]}`);
                if (href) router.push(href);
              } }}
              option={riskOption}
              style={{ height: 310 }}
            />
            <p className="executive-widget-hint">Mayor intensidad significa mayor volumen de decisiones pendientes.</p>
          </section>

          <section className="executive-widget executive-finance-widget">
            <header><div><span>Valor y reconocimiento</span><h2>Finanzas del sistema</h2></div><Coins className="h-5 w-5" aria-hidden /></header>
            <PremiumChart option={financeOption} style={{ height: 300 }} />
            <div className="executive-finance-links">
              <Link href="/kaizen">Ver ahorro Kaizen<ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link href="/probocacoins">Conciliar ProbocaCoins<ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
          </section>
        </div>

        <aside className="executive-rail">
          <section className="executive-alerts">
            <header><div><span>Cola de decisiones</span><h2>{alerts.length ? `${alerts.length} frentes requieren atencion` : "Operacion bajo control"}</h2></div><AlertTriangle className="h-5 w-5" aria-hidden /></header>
            {alerts.length ? (
              <div>
                {alerts.slice(0, 7).map((alert) => (
                  <Link className={alert.severity >= 3 ? "is-critical" : ""} href={alert.href} key={alert.id}>
                    <strong>{alert.count}</strong>
                    <span><b>{alert.title}</b><small>{alert.detail}</small></span>
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                ))}
              </div>
            ) : <div className="executive-clear"><ShieldAlert className="h-6 w-6" aria-hidden /><strong>Sin alertas críticas</strong><p>No hay compromisos vencidos, bloqueos o cierres pendientes detectados.</p></div>}
          </section>

          <section className="executive-people">
            <header><UsersRound className="h-5 w-5" aria-hidden /><div><span>Personas y adopcion</span><h2>Alcance del sistema</h2></div></header>
            <dl>
              <div><dt>Personas activas</dt><dd>{people.active.toLocaleString("es-MX")}</dd></div>
              <div><dt>Con ProbocaCoins</dt><dd>{people.participantsWithMovements.toLocaleString("es-MX")}</dd></div>
              <div><dt>Saldos a revisar</dt><dd className={people.negativeBalances ? "is-risk" : ""}>{people.negativeBalances}</dd></div>
            </dl>
            <Link href="/configuracion/estructura">Abrir organizacion<ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </section>

          <section className="executive-module-list">
            <header><span>Lectura del corte</span><h2>Salud por proceso</h2></header>
            <div>
              {portfolio.map((row) => (
                <Link href={row.href} key={row.id}>
                  <span className="executive-module-dot" style={{ backgroundColor: row.color }} />
                  <span><strong>{row.label}</strong><small>{row.status} · {row.detail}</small></span>
                  <b>{clamp(row.progress)}%</b>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

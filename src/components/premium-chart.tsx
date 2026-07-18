"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { BarChart, FunnelChart, HeatmapChart, LineChart } from "echarts/charts";
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";

echarts.use([BarChart, FunnelChart, HeatmapChart, LineChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

type LooseRecord = Record<string, unknown>;

function record(value: unknown): LooseRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as LooseRecord : {};
}

function themedAxis(value: unknown, dark: boolean) {
  const apply = (axisValue: unknown) => {
    const axis = record(axisValue);
    const axisLine = record(axis.axisLine);
    const splitLine = record(axis.splitLine);
    return {
      ...axis,
      axisLine: { ...axisLine, lineStyle: { ...record(axisLine.lineStyle), color: dark ? "#3a414c" : "#d8d8d8" } },
      axisLabel: { ...record(axis.axisLabel), color: dark ? "#aeb7c4" : "#64748b" },
      nameTextStyle: { ...record(axis.nameTextStyle), color: dark ? "#cbd5e1" : "#475569" },
      splitLine: { ...splitLine, lineStyle: { ...record(splitLine.lineStyle), color: dark ? "#292f38" : "#eeeeee" } }
    };
  };
  return Array.isArray(value) ? value.map(apply) : apply(value);
}

function themedSeries(value: unknown, dark: boolean) {
  if (!Array.isArray(value)) return value;
  return value.map((seriesValue, seriesIndex) => {
    const series = record(seriesValue);
    const label = record(series.label);
    const currentColor = typeof label.color === "string" ? label.color.toLowerCase() : "";
    const keepLightLabel = currentColor === "#fff" || currentColor === "#ffffff";
    const isFunnel = series.type === "funnel";
    const funnelPalette = ["#657181", "#526173", "#3f5268", "#b81f3a", "#ea0029"];
    const data = dark && isFunnel && Array.isArray(series.data)
      ? series.data.map((item, itemIndex) => {
        const entry = record(item);
        if (!Object.keys(entry).length) return item;
        return {
          ...entry,
          itemStyle: {
            ...record(entry.itemStyle),
            color: funnelPalette[(itemIndex + seriesIndex) % funnelPalette.length]
          }
        };
      })
      : series.data;
    return {
      ...series,
      data,
      itemStyle: isFunnel && dark
        ? { ...record(series.itemStyle), borderColor: "#111318" }
        : series.itemStyle,
      label: { ...label, color: keepLightLabel ? label.color : dark ? "#e5e7eb" : "#171717" }
    };
  });
}

function themedTextComponent(value: unknown, dark: boolean) {
  const apply = (componentValue: unknown) => {
    const component = record(componentValue);
    return {
      ...component,
      textStyle: { ...record(component.textStyle), color: dark ? "#aeb7c4" : "#64748b" }
    };
  };
  return Array.isArray(value) ? value.map(apply) : apply(value);
}

function applyChartTheme(option: EChartsOption, dark: boolean): EChartsOption {
  const source = option as unknown as LooseRecord;
  return {
    ...source,
    backgroundColor: "transparent",
    textStyle: { ...record(source.textStyle), color: dark ? "#d7dce3" : "#475569" },
    ...(source.legend ? { legend: themedTextComponent(source.legend, dark) } : {}),
    ...(source.visualMap ? { visualMap: themedTextComponent(source.visualMap, dark) } : {}),
    xAxis: source.xAxis ? themedAxis(source.xAxis, dark) : source.xAxis,
    yAxis: source.yAxis ? themedAxis(source.yAxis, dark) : source.yAxis,
    series: themedSeries(source.series, dark)
  } as EChartsOption;
}

export default function PremiumChart({ option, style, onEvents }: { option: EChartsOption; style?: CSSProperties; onEvents?: Record<string, (params: { name?: string }) => void> }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.dataset.theme === "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const themedOption = useMemo(() => applyChartTheme(option, dark), [dark, option]);
  return <ReactEChartsCore echarts={echarts} key={dark ? "dark" : "light"} lazyUpdate notMerge onEvents={onEvents} option={themedOption} style={style} />;
}

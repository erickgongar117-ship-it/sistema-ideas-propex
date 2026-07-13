"use client";

import type { CSSProperties } from "react";
import type { EChartsOption } from "echarts";
import { BarChart, FunnelChart, LineChart } from "echarts/charts";
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";

echarts.use([BarChart, FunnelChart, LineChart, AriaComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export default function PremiumChart({ option, style, onEvents }: { option: EChartsOption; style?: CSSProperties; onEvents?: Record<string, (params: { name?: string }) => void> }) {
  return <ReactEChartsCore echarts={echarts} lazyUpdate notMerge onEvents={onEvents} option={option} style={style} />;
}

"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartPeriodCaption } from "@/components/analytics/ChartPeriodCaption";
import { buildStableSeriesColorMap } from "@/lib/charts/seriesColors";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";
import {
  formatLocalChartAxisTick,
  formatLocalDateTime,
} from "@/lib/utils/date";

type MetricKind = "cpu" | "memory";

export type CpuMemoryServiceLinesChartProps = {
  metric: MetricKind;
  title: string;
  rangeLabel: string;
  chartXDomainMin: number;
  chartXDomainMax: number;
  axisShowDate: boolean;
  chartData: Record<string, string | number | null>[];
  serviceKeys: string[];
  /** Rendu plus visible pour les snapshots/fallback live avec peu de points. */
  emphasizePoints?: boolean;
};

function formatPercentTick(value: number | string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n)}%`;
}

function percentDomainMax(metric: MetricKind, dataMax: number): number {
  if (metric === "memory") return 100;
  if (!Number.isFinite(dataMax) || dataMax <= 100) return 100;
  return Math.min(400, Math.ceil(dataMax / 25) * 25);
}

export function CpuMemoryServiceLinesChart({
  metric,
  title,
  rangeLabel,
  chartXDomainMin,
  chartXDomainMax,
  axisShowDate,
  chartData,
  serviceKeys,
  emphasizePoints = false,
}: CpuMemoryServiceLinesChartProps) {
  const seriesColors = buildStableSeriesColorMap(serviceKeys);
  const prefix = metric === "cpu" ? "cpu" : "memory";

  return (
    <div className="min-w-0 rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6">
      <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100 sm:text-lg">
        {title}
      </h2>
      <ChartPeriodCaption label={rangeLabel} />
      <div className="min-h-[260px] w-full sm:min-h-[420px]">
        <ResponsiveContainer width="100%" height={420} minHeight={260}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
            <XAxis
              dataKey="timeMs"
              type="number"
              domain={[chartXDomainMin, chartXDomainMax]}
              angle={axisShowDate ? -40 : -35}
              textAnchor="end"
              height={axisShowDate ? 72 : 60}
              minTickGap={axisShowDate ? 32 : 22}
              tickFormatter={(ms) =>
                formatLocalChartAxisTick(ms, { withDate: axisShowDate })
              }
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[0, (dataMax: number) => percentDomainMax(metric, dataMax)]}
              tickFormatter={formatPercentTick}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              {...rechartsTooltipProps}
              labelFormatter={(_, payload) => {
                const ts = payload?.[0]?.payload?.timestamp;
                return ts != null ? formatLocalDateTime(String(ts)) : "—";
              }}
              formatter={(value: unknown, name: string) => [
                typeof value === "number" ? `${value.toFixed(2)}%` : "—",
                name,
              ]}
            />
            <Legend />
            {serviceKeys.map((serviceKey) => (
              <Line
                key={`${prefix}_${serviceKey}`}
                type="monotone"
                dataKey={`${prefix}_${serviceKey}`}
                stroke={seriesColors[serviceKey]}
                strokeWidth={emphasizePoints ? 3 : 2}
                name={serviceKey}
                dot={emphasizePoints ? { r: 3 } : false}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {serviceKeys.length} service(s) affiché(s) · {chartData.length} points
      </p>
    </div>
  );
}

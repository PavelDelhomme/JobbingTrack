"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatLocalChartAxisTick,
  formatLocalDateTime,
} from "@/lib/utils/date";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";
import type { SystemNetworkMbRow } from "@/lib/charts/systemMetricsSeriesModel";

export type PerformancesChartRow = {
  timeMs?: number;
  timestamp?: string;
  responseTimeMs?: number | null;
  networkRxMb?: number | null;
  networkTxMb?: number | null;
};

type AxisProps = {
  xDomainMin: number;
  xDomainMax: number;
  axisShowDate: boolean;
  height?: number;
};

export function PerformancesResponseTimeLineChart({
  chartData,
  xDomainMin,
  xDomainMax,
  axisShowDate,
  height = 280,
}: AxisProps & { chartData: PerformancesChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={height} minHeight={220}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
        <XAxis
          dataKey="timeMs"
          type="number"
          domain={[xDomainMin, xDomainMax]}
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
          tickFormatter={(v) => `${Math.round(Number(v))} ms`}
          tick={{ fontSize: 12 }}
          label={{
            value: "ms",
            angle: -90,
            position: "insideLeft",
            fill: "#9CA3AF",
            fontSize: 11,
          }}
        />
        <Tooltip
          {...rechartsTooltipProps}
          labelFormatter={(_, payload: unknown) => {
            const ts = (
              payload as Array<{ payload?: { timestamp?: string } }>
            )?.[0]?.payload?.timestamp;
            return ts != null ? formatLocalDateTime(ts) : "—";
          }}
          formatter={
            ((value: number) => [
              value != null && Number.isFinite(Number(value))
                ? `${Number(value).toFixed(1)} ms`
                : "—",
              "Temps de réponse",
            ]) as (value: number) => [string, string]
          }
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="responseTimeMs"
          stroke="#0D9488"
          strokeWidth={2}
          name="Temps de réponse (ms)"
          dot={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PerformancesNetworkCumulativeLineChart({
  chartData,
  xDomainMin,
  xDomainMax,
  axisShowDate,
  height = 280,
}: AxisProps & { chartData: PerformancesChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={height} minHeight={220}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
        <XAxis
          dataKey="timeMs"
          type="number"
          domain={[xDomainMin, xDomainMax]}
          angle={axisShowDate ? -40 : -35}
          textAnchor="end"
          height={axisShowDate ? 72 : 60}
          minTickGap={axisShowDate ? 32 : 22}
          tickFormatter={(ms) =>
            formatLocalChartAxisTick(ms, { withDate: axisShowDate })
          }
          tick={{ fontSize: 12 }}
        />
        <YAxis tickFormatter={(v) => `${v} Mo`} tick={{ fontSize: 12 }} />
        <Tooltip
          {...rechartsTooltipProps}
          labelFormatter={(_, payload: unknown) => {
            const ts = (
              payload as Array<{ payload?: { timestamp?: string } }>
            )?.[0]?.payload?.timestamp;
            return ts != null ? formatLocalDateTime(ts) : "—";
          }}
          formatter={
            ((value: number, name: string) => [
              value != null ? `${Number(value).toFixed(2)} Mo` : "—",
              name === "networkRxMb" ? "RX cumul" : "TX cumul",
            ]) as (value: number, name: string) => [string, string]
          }
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="networkRxMb"
          stroke="#8B5CF6"
          strokeWidth={2}
          name="RX (Mo)"
          dot={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="networkTxMb"
          stroke="#F59E0B"
          strokeWidth={2}
          name="TX (Mo)"
          dot={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PerformancesNetworkRateLineChart({
  networkChartRows,
  xDomainMin,
  xDomainMax,
  axisShowDate,
  networkRateYMax,
  height = 280,
}: AxisProps & {
  networkChartRows: SystemNetworkMbRow[];
  networkRateYMax: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height} minHeight={220}>
      <LineChart
        data={networkChartRows}
        margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
        <XAxis
          dataKey="timeMs"
          type="number"
          domain={[xDomainMin, xDomainMax]}
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
          domain={[0, networkRateYMax]}
          tickFormatter={(v) => `${Number(v).toFixed(3)}`}
          tick={{ fontSize: 11 }}
          label={{
            value: "Mo/min",
            angle: -90,
            position: "insideLeft",
            fill: "#9CA3AF",
            fontSize: 11,
          }}
        />
        <Tooltip
          {...rechartsTooltipProps}
          labelFormatter={(_, payload: unknown) => {
            const ts = (
              payload as Array<{ payload?: { timestamp?: string } }>
            )?.[0]?.payload?.timestamp;
            return ts != null ? formatLocalDateTime(ts) : "—";
          }}
          formatter={
            ((value: number, name: string) => [
              `${Number(value).toFixed(4)} Mo/min`,
              name === "networkRxMbPerMin" ? "RX (débit)" : "TX (débit)",
            ]) as (value: number, name: string) => [string, string]
          }
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="networkRxMbPerMin"
          stroke="#6366F1"
          strokeWidth={2}
          name="RX (Mo/min)"
          dot={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="networkTxMbPerMin"
          stroke="#EA580C"
          strokeWidth={2}
          name="TX (Mo/min)"
          dot={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export type LiveEndpointBar = { name: string; ms: number };

export function PerformancesLiveEndpointsBarChart({
  bars,
}: {
  bars: LiveEndpointBar[];
}) {
  const height = Math.max(240, bars.length * 28);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={bars}
        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="opacity-40"
          horizontal={false}
        />
        <XAxis type="number" tick={{ fontSize: 11 }} unit=" ms" />
        <YAxis
          type="category"
          dataKey="name"
          width={160}
          tick={{ fontSize: 11 }}
          interval={0}
        />
        <Tooltip
          {...rechartsTooltipProps}
          formatter={(value: number) => [
            `${Number(value).toFixed(1)} ms`,
            "Réponse",
          ]}
        />
        <Bar dataKey="ms" name="ms" fill="#0d9488" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export { SystemCpuNetworkCorrelationChart } from "./SystemCpuNetworkCorrelationChart";

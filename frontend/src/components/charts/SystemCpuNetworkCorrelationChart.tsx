"use client";

import { useMemo } from "react";
import {
  Brush,
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
import {
  systemCpuAxisMax,
  systemMemoryAxisMax,
  type SystemNetworkMbRateRow,
} from "@/lib/charts/systemMetricsSeriesModel";

export type SystemCpuNetworkCorrelationChartProps = {
  rows: SystemNetworkMbRateRow[];
  xDomainMin: number;
  xDomainMax: number;
  axisShowDate: boolean;
  /** Plafond axe droit (Mo/min) — ex. `systemNetworkRateAxisMax(rows)`. */
  rateMax: number;
  height?: number;
  brushStartIndex?: number;
  brushEndIndex?: number;
  onBrushChange?: (range: { startIndex?: number; endIndex?: number }) => void;
};

function tooltipLabel(_: unknown, payload: unknown) {
  const ts = (payload as { payload?: { timestamp?: string } }[])?.[0]?.payload
    ?.timestamp;
  return ts != null ? formatLocalDateTime(ts) : "—";
}

/**
 * **CPU / mémoire %** (axe gauche) et **débit réseau** RX/TX Mo/min (axe droit)
 * sur le même temps — corrélation visuelle.
 */
export function SystemCpuNetworkCorrelationChart({
  rows,
  xDomainMin,
  xDomainMax,
  axisShowDate,
  rateMax,
  height = 300,
  brushStartIndex,
  brushEndIndex,
  onBrushChange,
}: SystemCpuNetworkCorrelationChartProps) {
  const cpuMax = useMemo(() => systemCpuAxisMax(rows), [rows]);
  const memoryMax = useMemo(() => systemMemoryAxisMax(rows), [rows]);
  const percentMax = Math.max(cpuMax, memoryMax);

  const bottom = axisShowDate ? 72 : 60;
  const angle = axisShowDate ? -40 : -35;

  return (
    <ResponsiveContainer width="100%" height={height} minHeight={240}>
      <LineChart
        data={rows}
        margin={{ top: 8, right: 36, left: 8, bottom: bottom }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis
          dataKey="timeMs"
          type="number"
          domain={[xDomainMin, xDomainMax]}
          stroke="#9CA3AF"
          angle={angle}
          textAnchor="end"
          height={bottom}
          minTickGap={axisShowDate ? 32 : 22}
          tickFormatter={(ms) =>
            formatLocalChartAxisTick(ms, { withDate: axisShowDate })
          }
          tick={{ fontSize: 12 }}
        />
        <YAxis
          yAxisId="left"
          stroke="#3B82F6"
          domain={[0, percentMax]}
          allowDataOverflow
          unit=" %"
          tick={{ fontSize: 11 }}
          label={{
            value: "CPU / mémoire %",
            angle: -90,
            position: "insideLeft",
            fill: "#60A5FA",
            fontSize: 11,
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#A78BFA"
          domain={[0, rateMax]}
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${Number(v).toFixed(3)}`}
          label={{
            value: "Mo/min",
            angle: 90,
            position: "insideRight",
            fill: "#C4B5FD",
            fontSize: 11,
          }}
        />
        <Tooltip
          {...rechartsTooltipProps}
          labelFormatter={tooltipLabel}
          formatter={(value: number, name: string) => {
            const n = Number(value);
            if (name === "cpu")
              return [`${Number.isFinite(n) ? n.toFixed(2) : "—"} %`, "CPU"];
            if (name === "memory")
              return [
                `${Number.isFinite(n) ? n.toFixed(2) : "—"} %`,
                "Mémoire",
              ];
            if (name === "networkRxMbPerMin")
              return [`${n.toFixed(4)} Mo/min`, "RX débit"];
            if (name === "networkTxMbPerMin")
              return [`${n.toFixed(4)} Mo/min`, "TX débit"];
            return [String(value), name];
          }}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="cpu"
          name="CPU %"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="memory"
          name="Mémoire %"
          stroke="#22C55E"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="networkRxMbPerMin"
          name="RX Mo/min"
          stroke="#8B5CF6"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="networkTxMbPerMin"
          name="TX Mo/min"
          stroke="#F97316"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        {onBrushChange != null &&
        brushStartIndex != null &&
        brushEndIndex != null ? (
          <Brush
            dataKey="timeMs"
            height={18}
            travellerWidth={8}
            startIndex={brushStartIndex}
            endIndex={brushEndIndex}
            tickFormatter={(ms) =>
              formatLocalChartAxisTick(ms as number, { withDate: axisShowDate })
            }
            onChange={onBrushChange}
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Brush,
} from "recharts";
import { formatLocalChartAxisTick } from "@/lib/utils/date";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";
import { useSyncedChartBrushRange } from "@/lib/charts/useSyncedChartBrushRange";
import {
  COMPARISON_CHART_COLORS,
  downsampleByStep,
  fmtMetric1,
  shortContainerName,
  summarizeContainerWindow,
  type MergedServicePoint,
} from "@/lib/monitoring/correlationContainerMetrics";

type Props = {
  fullName: string;
  mergedRows: MergedServicePoint[];
  subChartHeight?: number;
  maxPointsPerChart?: number;
};

export function ServiceSignalsChart({
  fullName,
  mergedRows,
  subChartHeight = 110,
  maxPointsPerChart = 160,
}: Props) {
  const short = shortContainerName(fullName);
  const chartData = useMemo(
    () => downsampleByStep(mergedRows, maxPointsPerChart),
    [mergedRows, maxPointsPerChart],
  );
  const { brushStart, brushEnd, onBrushChange } = useSyncedChartBrushRange(
    chartData.length,
    80,
  );

  const xCommon = {
    dataKey: "timeMs" as const,
    type: "number" as const,
    domain: ["dataMin", "dataMax"] as [string, string],
    tickFormatter: (ms: number) =>
      formatLocalChartAxisTick(ms, { withDate: true }),
    tick: { fontSize: 10 },
    height: 46,
    minTickGap: 28,
    tickMargin: 6,
  };

  const tooltipLabel = (ms: number | string) =>
    typeof ms === "number"
      ? formatLocalChartAxisTick(ms, { withDate: true })
      : String(ms);

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {short}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Aucun point d&apos;historique pour ce conteneur sur la plage active.
        </p>
      </div>
    );
  }

  const margin = { top: 6, right: 10, left: 2, bottom: 4 };
  const brushProps = {
    dataKey: "timeMs" as const,
    height: 18,
    travellerWidth: 8,
    startIndex: brushStart,
    endIndex: brushEnd,
    tickFormatter: (ms: number) => formatLocalChartAxisTick(ms),
    onChange: onBrushChange,
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 pb-2 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {short}
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {chartData.length} pts · brush synchronisé CPU / mémoire / réseau / I/O
        </span>
      </div>

      <div className="space-y-4">
        <MetricBlock
          title="CPU (%)"
          hint="plein = conteneur · pointillés = machine"
          height={subChartHeight}
          chartData={chartData}
          margin={margin}
          xCommon={xCommon}
          tooltipLabel={tooltipLabel}
          brushProps={brushProps}
          lines={[
            { dataKey: "cpu", name: "Conteneur", stroke: "#2563EB", width: 2 },
            {
              dataKey: "system_cpu",
              name: "Machine",
              stroke: "#6B7280",
              width: 1.5,
              dash: "5 4",
            },
          ]}
        />
        <MetricBlock
          title="Mémoire (%)"
          hint="plein = conteneur · pointillés = machine"
          height={subChartHeight}
          chartData={chartData}
          margin={margin}
          xCommon={xCommon}
          tooltipLabel={tooltipLabel}
          brushProps={brushProps}
          lines={[
            { dataKey: "memory", name: "Conteneur", stroke: "#059669", width: 2 },
            {
              dataKey: "system_memory",
              name: "Machine",
              stroke: "#6B7280",
              width: 1.5,
              dash: "5 4",
            },
          ]}
        />
        <MetricBlock
          title="Réseau (Mo cumulés — Rx / Tx)"
          height={subChartHeight}
          chartData={chartData}
          margin={margin}
          xCommon={xCommon}
          tooltipLabel={tooltipLabel}
          brushProps={brushProps}
          lines={[
            {
              dataKey: "networkRxMb",
              name: "Rx Mo",
              stroke: "#D97706",
              width: 2,
            },
            {
              dataKey: "networkTxMb",
              name: "Tx Mo",
              stroke: "#EA580C",
              width: 2,
              dash: "4 3",
            },
          ]}
        />
        <MetricBlock
          title="Block I/O (Mo cumulés — lecture / écriture)"
          height={subChartHeight}
          chartData={chartData}
          margin={margin}
          xCommon={xCommon}
          tooltipLabel={tooltipLabel}
          brushProps={brushProps}
          lines={[
            { dataKey: "ioReadMb", name: "Lecture Mo", stroke: "#7C3AED", width: 2 },
            {
              dataKey: "ioWriteMb",
              name: "Écriture Mo",
              stroke: "#A855F7",
              width: 2,
              dash: "4 3",
            },
          ]}
        />
      </div>
    </div>
  );
}

function MetricBlock({
  title,
  hint,
  height,
  chartData,
  margin,
  xCommon,
  tooltipLabel,
  brushProps,
  lines,
}: {
  title: string;
  hint?: string;
  height: number;
  chartData: MergedServicePoint[];
  margin: { top: number; right: number; left: number; bottom: number };
  xCommon: Record<string, unknown>;
  tooltipLabel: (ms: number | string) => string;
  brushProps: Record<string, unknown>;
  lines: Array<{
    dataKey: string;
    name: string;
    stroke: string;
    width: number;
    dash?: string;
  }>;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
        {title}
        {hint ? (
          <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
            {hint}
          </span>
        ) : null}
      </p>
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-35" />
            <XAxis {...xCommon} />
            <YAxis width={44} tick={{ fontSize: 10 }} domain={[0, "auto"]} />
            <Tooltip
              {...rechartsTooltipProps}
              labelFormatter={tooltipLabel}
            />
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.stroke}
                strokeWidth={line.width}
                strokeDasharray={line.dash}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
            <Brush {...brushProps} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PeaksSummaryTable({
  loadedOrder,
  mergedByContainer,
}: {
  loadedOrder: string[];
  mergedByContainer: Record<string, MergedServicePoint[]>;
}) {
  if (loadedOrder.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <tr>
            <th className="px-3 py-2">Conteneur</th>
            <th className="px-3 py-2 text-right">CPU max %</th>
            <th className="px-3 py-2">Pic CPU</th>
            <th className="px-3 py-2 text-right">Mém max %</th>
            <th className="px-3 py-2">Pic mémoire</th>
            <th className="px-3 py-2 text-right">Δ réseau Mo</th>
            <th className="px-3 py-2 text-right">Δ I/O Mo</th>
            <th className="px-3 py-2 text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {loadedOrder.map((name) => {
            const summary = summarizeContainerWindow(
              mergedByContainer[name] ?? [],
            );
            return (
              <tr
                key={name}
                className="border-t border-gray-100 dark:border-gray-700"
              >
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                  {shortContainerName(name)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtMetric1(summary?.cpuMax ?? null)}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                  {summary?.cpuPeakTimeMs
                    ? formatLocalChartAxisTick(summary.cpuPeakTimeMs, {
                        withDate: true,
                      })
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtMetric1(summary?.memMax ?? null)}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                  {summary?.memPeakTimeMs
                    ? formatLocalChartAxisTick(summary.memPeakTimeMs, {
                        withDate: true,
                      })
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtMetric1(summary?.netDeltaMb ?? null)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtMetric1(summary?.ioDeltaMb ?? null)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {summary?.points ?? 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

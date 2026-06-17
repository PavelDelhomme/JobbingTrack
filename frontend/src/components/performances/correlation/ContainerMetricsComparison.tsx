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
  Legend,
} from "recharts";
import { formatLocalChartAxisTick } from "@/lib/utils/date";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";
import { useSyncedChartBrushRange } from "@/lib/charts/useSyncedChartBrushRange";
import {
  buildComparisonChartData,
  COMPARISON_CHART_COLORS,
  type ComparisonMetricKey,
  type MergedServicePoint,
} from "@/lib/monitoring/correlationContainerMetrics";

const METRIC_PANELS: Array<{
  key: ComparisonMetricKey;
  title: string;
  ySuffix?: string;
}> = [
  { key: "cpu", title: "CPU (%) — conteneurs chargés", ySuffix: "%" },
  { key: "memory", title: "Mémoire (%) — conteneurs chargés", ySuffix: "%" },
  {
    key: "networkRxMb",
    title: "Réseau Rx (Mo cumulés) — conteneurs chargés",
  },
  {
    key: "networkTxMb",
    title: "Réseau Tx (Mo cumulés) — conteneurs chargés",
  },
  {
    key: "ioReadMb",
    title: "Block I/O lecture (Mo cumulés) — conteneurs chargés",
  },
  {
    key: "ioWriteMb",
    title: "Block I/O écriture (Mo cumulés) — conteneurs chargés",
  },
];

type Props = {
  mergedByContainer: Record<string, MergedServicePoint[]>;
  loadedOrder: string[];
  chartHeight?: number;
  maxPoints?: number;
};

export function ContainerMetricsComparison({
  mergedByContainer,
  loadedOrder,
  chartHeight = 140,
  maxPoints = 120,
}: Props) {
  const loadedData = useMemo(() => {
    const out: Record<string, MergedServicePoint[]> = {};
    for (const name of loadedOrder) {
      const rows = mergedByContainer[name];
      if (rows?.length) out[name] = rows;
    }
    return out;
  }, [loadedOrder, mergedByContainer]);

  const cpuComparison = useMemo(
    () => buildComparisonChartData(loadedData, "cpu", maxPoints),
    [loadedData, maxPoints],
  );
  const referenceLength = cpuComparison.rows.length;
  const { brushStart, brushEnd, onBrushChange, resetBrush, hasCustomBrush } =
    useSyncedChartBrushRange(referenceLength, 80);

  if (loadedOrder.length < 2) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-400">
        Chargez au moins <strong>deux conteneurs</strong> (filtre + « Tout
        charger » ou clics unitaires) pour afficher la comparaison superposée et
        repérer quel service pic à quel moment.
      </p>
    );
  }

  if (referenceLength === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Historiques en cours ou indisponibles pour la comparaison.
      </p>
    );
  }

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Comparaison superposée — repérez quel conteneur drive le pic CPU,
          mémoire, réseau ou I/O sur la même fenêtre temporelle.
        </p>
        {hasCustomBrush ? (
          <button
            type="button"
            onClick={resetBrush}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Réinitialiser le zoom
          </button>
        ) : null}
      </div>

      {METRIC_PANELS.map((panel, panelIndex) => {
        const { rows, seriesKeys } = buildComparisonChartData(
          loadedData,
          panel.key,
          maxPoints,
        );
        if (rows.length === 0) return null;
        return (
          <div
            key={panel.key}
            className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/80"
          >
            <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              {panel.title}
            </p>
            <div className="w-full" style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 6, right: 10, left: 2, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-35" />
                  <XAxis
                    dataKey="timeMs"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(ms) =>
                      formatLocalChartAxisTick(ms as number, { withDate: true })
                    }
                    tick={{ fontSize: 10 }}
                    height={46}
                    minTickGap={28}
                  />
                  <YAxis
                    width={44}
                    tick={{ fontSize: 10 }}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    {...rechartsTooltipProps}
                    labelFormatter={(ms) =>
                      formatLocalChartAxisTick(Number(ms), { withDate: true })
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {seriesKeys.map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={
                        COMPARISON_CHART_COLORS[
                          index % COMPARISON_CHART_COLORS.length
                        ]
                      }
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                  {panelIndex === 0 ? <Brush {...brushProps} /> : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import {
  Area,
  AreaChart,
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
import type {
  ServiceHistoryChartRow,
  ServiceHistoryIoRow,
} from "@/lib/monitoring/serviceHistoryChartModel";
import { SeriesExportButtons } from "@/components/monitoring/SeriesExportButtons";
import type { SeriesExportRow } from "@/lib/exports/seriesExport";

export type MonitoringServiceHistoryChartsProps = {
  serviceHistoryLength: number;
  historyChartRows: ServiceHistoryChartRow[];
  historyChartRowsIo: ServiceHistoryIoRow[];
  historyCpuMax: number;
  historyMemMax: number;
  historyAxisShowDate: boolean;
  historyBlockMbMax: number;
  historyIoRateMax: number;
  exportBaseName?: string;
};

function historyTooltipLabel(_: unknown, payload: unknown) {
  const ts = (payload as { payload?: { timestamp?: string } }[])?.[0]?.payload
    ?.timestamp;
  return ts != null ? formatLocalDateTime(ts) : "—";
}

/**
 * Bloc « Historique des performances » (CPU, mémoire, réseau, Block I/O cumul + débit) — lot A1c.
 */
export function MonitoringServiceHistoryCharts({
  serviceHistoryLength,
  historyChartRows,
  historyChartRowsIo,
  historyCpuMax,
  historyMemMax,
  historyAxisShowDate,
  historyBlockMbMax,
  historyIoRateMax,
  exportBaseName = "service-history-series",
}: MonitoringServiceHistoryChartsProps) {
  const exportRows = useMemo<SeriesExportRow[]>(() => {
    const ioByTime = new Map(
      historyChartRowsIo.map((row) => [
        row.timeMs,
        {
          block_read_mb_per_min: row.block_read_mb_per_min,
          block_write_mb_per_min: row.block_write_mb_per_min,
        },
      ]),
    );

    return historyChartRows.map((row) => {
      const io = ioByTime.get(row.timeMs);
      return {
        timestamp: row.timestamp,
        time_ms: row.timeMs,
        cpu_percent: row.cpu_percent,
        memory_percent: row.memory_percent,
        network_rx_mb: row.network_rx_mb,
        network_tx_mb: row.network_tx_mb,
        block_read_mb: row.block_read_mb,
        block_write_mb: row.block_write_mb,
        block_read_mb_per_min: io?.block_read_mb_per_min,
        block_write_mb_per_min: io?.block_write_mb_per_min,
      };
    });
  }, [historyChartRows, historyChartRowsIo]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <BarChart3 className="h-6 w-6 mr-2" />
          Historique des Performances
        </h2>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="text-sm text-gray-500 text-left max-w-md sm:text-right">
            {serviceHistoryLength > 0
              ? `${serviceHistoryLength} points (fichiers agrégateur + session courante)`
              : "Aucune donnée — attendez quelques cycles ou activez l’auto-rafraîchissement"}
          </span>
          <SeriesExportButtons rows={exportRows} baseName={exportBaseName} />
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        L’axe CPU est zoomé automatiquement quand la charge est faible. Les
        points « session » s’ajoutent à chaque rafraîchissement même sans
        historique disque.
      </p>

      {serviceHistoryLength > 0 ? (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Utilisation CPU
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={historyChartRows}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="timeMs"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  stroke="#9CA3AF"
                  minTickGap={28}
                  tickFormatter={(ms) =>
                    formatLocalChartAxisTick(ms, {
                      withDate: historyAxisShowDate,
                    })
                  }
                />
                <YAxis stroke="#9CA3AF" unit="%" domain={[0, historyCpuMax]} />
                <Tooltip
                  {...rechartsTooltipProps}
                  formatter={(value: number) => [
                    `${Number(value).toFixed(4)}%`,
                    "CPU",
                  ]}
                  labelFormatter={historyTooltipLabel}
                />
                <Area
                  type="monotone"
                  dataKey="cpu_percent"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorCpu)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Utilisation Mémoire
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={historyChartRows}>
                <defs>
                  <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="timeMs"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  stroke="#9CA3AF"
                  minTickGap={28}
                  tickFormatter={(ms) =>
                    formatLocalChartAxisTick(ms, {
                      withDate: historyAxisShowDate,
                    })
                  }
                />
                <YAxis stroke="#9CA3AF" unit="%" domain={[0, historyMemMax]} />
                <Tooltip
                  {...rechartsTooltipProps}
                  formatter={(value: number) => [
                    `${Number(value).toFixed(2)}%`,
                    "Mémoire",
                  ]}
                  labelFormatter={historyTooltipLabel}
                />
                <Area
                  type="monotone"
                  dataKey="memory_percent"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorMemory)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Traffic Réseau
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historyChartRows}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="timeMs"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  stroke="#9CA3AF"
                  minTickGap={28}
                  tickFormatter={(ms) =>
                    formatLocalChartAxisTick(ms, {
                      withDate: historyAxisShowDate,
                    })
                  }
                />
                <YAxis stroke="#9CA3AF" unit=" MB" />
                <Tooltip
                  {...rechartsTooltipProps}
                  formatter={(value: number) => [`${value.toFixed(2)} MB`]}
                  labelFormatter={historyTooltipLabel}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="network_rx_mb"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  name="RX (Réception)"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="network_tx_mb"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="TX (Transmission)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
              Block I/O (cumul)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Mêmes champs que{" "}
              <code className="text-[11px]">block_read_mb</code> /{" "}
              <code className="text-[11px]">block_write_mb</code> dans les
              fichiers d&apos;historique service (
              <code className="text-[11px]">
                GET …/docker/service/&lt;nom&gt;/history
              </code>
              ), alimentés par les snapshots{" "}
              <code className="text-[11px]">
                /docker/jobbingtrack/aggregated
              </code>
              .
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historyChartRows}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="timeMs"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  stroke="#9CA3AF"
                  minTickGap={28}
                  tickFormatter={(ms) =>
                    formatLocalChartAxisTick(ms, {
                      withDate: historyAxisShowDate,
                    })
                  }
                />
                <YAxis
                  stroke="#9CA3AF"
                  unit=" MB"
                  domain={[0, historyBlockMbMax]}
                />
                <Tooltip
                  {...rechartsTooltipProps}
                  formatter={(value: number) => [
                    `${Number(value).toFixed(3)} MB`,
                  ]}
                  labelFormatter={historyTooltipLabel}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="block_read_mb"
                  stroke="#6366F1"
                  strokeWidth={2}
                  name="Lecture cumul"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="block_write_mb"
                  stroke="#A855F7"
                  strokeWidth={2}
                  name="Écriture cumul"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
              Block I/O — débit observé
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Débit dérivé des compteurs Docker persistés : Δ cumul / Δ temps
              entre points consécutifs (Mo/min). Peut chuter à 0 si le conteneur
              est recréé (cumuls remis à zéro) ou si l&apos;écart temporel est
              filtré (&gt; 1 h).
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historyChartRowsIo}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="timeMs"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  stroke="#9CA3AF"
                  minTickGap={28}
                  tickFormatter={(ms) =>
                    formatLocalChartAxisTick(ms, {
                      withDate: historyAxisShowDate,
                    })
                  }
                />
                <YAxis
                  stroke="#9CA3AF"
                  unit=" MB/min"
                  domain={[0, historyIoRateMax]}
                />
                <Tooltip
                  {...rechartsTooltipProps}
                  formatter={(value: number) => [
                    `${Number(value).toFixed(3)} MB/min`,
                  ]}
                  labelFormatter={historyTooltipLabel}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="block_read_mb_per_min"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  name="Lecture observée"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="block_write_mb_per_min"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  name="Écriture observée"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Aucun historique de performance disponible pour ce service.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Les données d&apos;historique s&apos;accumuleront au fil du temps.
          </p>
        </div>
      )}
    </div>
  );
}

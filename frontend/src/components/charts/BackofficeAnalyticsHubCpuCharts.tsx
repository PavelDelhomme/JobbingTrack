"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartPeriodCaption } from "@/components/analytics/ChartPeriodCaption";
import {
  formatLocalChartAxisTick,
  formatLocalDateTime,
} from "@/lib/utils/date";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";

export type HubCpuChartRow = {
  timeMs: number;
  time: string;
  datetime: string;
  cpu: number;
  timestamp: string;
};

export type BackofficeAnalyticsHubCpuChartsProps = {
  loading: boolean;
  cpuDataLength: number;
  chartData: HubCpuChartRow[];
  chartDataRaw: HubCpuChartRow[];
  chartXDomain: [number, number];
  chartAxisShowDate: boolean;
  chartRawAxisShowDate: boolean;
  chartPeriodLabel: string;
};

/** Bloc Recharts CPU (hub historique) — réutilisable ; le hub canonique infra est **`/b4ck0ff1ce/performances`**. */
export function BackofficeAnalyticsHubCpuCharts({
  loading,
  cpuDataLength,
  chartData,
  chartDataRaw,
  chartXDomain,
  chartAxisShowDate,
  chartRawAxisShowDate,
  chartPeriodLabel,
}: BackofficeAnalyticsHubCpuChartsProps) {
  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          CPU Système (%) -{" "}
          {cpuDataLength > chartData.length
            ? "AVEC Compression"
            : "Sans compression"}{" "}
          ({chartData.length} points)
        </h2>
        <ChartPeriodCaption label={chartPeriodLabel} />

        {loading && cpuDataLength === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500 dark:text-gray-400">
              Chargement des données...
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500 dark:text-gray-400">
              Aucune donnée disponible
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="timeMs"
                type="number"
                domain={chartXDomain}
                stroke="#9CA3AF"
                style={{ fontSize: "12px" }}
                angle={chartAxisShowDate ? -40 : -35}
                textAnchor="end"
                height={chartAxisShowDate ? 88 : 72}
                minTickGap={chartAxisShowDate ? 36 : 24}
                tickFormatter={(ms) =>
                  formatLocalChartAxisTick(ms, { withDate: chartAxisShowDate })
                }
              />
              <YAxis
                stroke="#9CA3AF"
                style={{ fontSize: "12px" }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                label={{ value: "CPU (%)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                {...rechartsTooltipProps}
                labelFormatter={(_, payload) => {
                  const ts = payload?.[0]?.payload?.timestamp;
                  return ts != null ? formatLocalDateTime(ts) : "—";
                }}
                formatter={(value: unknown) => [
                  `${Number(value).toFixed(2)}%`,
                  "CPU Système",
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#3B82F6"
                strokeWidth={2}
                name="CPU Système (%)"
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          CPU Système (%) - Données Brutes - SANS Compression (
          {chartDataRaw.length} points)
        </h2>
        <ChartPeriodCaption label={chartPeriodLabel} />

        {loading && cpuDataLength === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500 dark:text-gray-400">
              Chargement des données...
            </div>
          </div>
        ) : chartDataRaw.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500 dark:text-gray-400">
              Aucune donnée disponible
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart
              data={chartDataRaw}
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="timeMs"
                type="number"
                domain={chartXDomain}
                stroke="#9CA3AF"
                style={{ fontSize: "12px" }}
                angle={chartRawAxisShowDate ? -40 : -35}
                textAnchor="end"
                height={chartRawAxisShowDate ? 88 : 72}
                minTickGap={chartRawAxisShowDate ? 36 : 24}
                tickFormatter={(ms) =>
                  formatLocalChartAxisTick(ms, {
                    withDate: chartRawAxisShowDate,
                  })
                }
              />
              <YAxis
                stroke="#9CA3AF"
                style={{ fontSize: "12px" }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                label={{ value: "CPU (%)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                {...rechartsTooltipProps}
                labelFormatter={(_, payload) => {
                  const ts = payload?.[0]?.payload?.timestamp;
                  return ts != null ? formatLocalDateTime(ts) : "—";
                }}
                formatter={(value: unknown) => [
                  `${Number(value).toFixed(2)}%`,
                  "CPU Système",
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#EF4444"
                strokeWidth={2}
                name="CPU Système (%) - Brut"
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}

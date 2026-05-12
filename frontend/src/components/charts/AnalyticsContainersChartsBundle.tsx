'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ChartPeriodCaption } from '@/components/analytics/ChartPeriodCaption'
import { formatLocalChartAxisTick, formatLocalDateTime } from '@/lib/utils/date'
import { rechartsTooltipProps } from '@/lib/charts/rechartsTooltipTheme'

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export type AnalyticsContainersChartsBundleProps = {
  mode: 'multi' | 'single'
  rangeLabel: string
  chartXDomainMin: number
  chartXDomainMax: number
  containerAxisShowDate: boolean
  chartData: Record<string, string | number | null>[]
  containerNamesForChart: string[]
  /** Titre court (ex. sans préfixe jobbingtrack-) pour le mode single */
  selectedContainerLabel: string
  rawMetricsLength: number
}

/** Recharts pour Performances — conteneurs (`/b4ck0ff1ce/performances/containers`) — chunk séparé via `dynamic` sur la page. */
export function AnalyticsContainersChartsBundle({
  mode,
  rangeLabel,
  chartXDomainMin,
  chartXDomainMax,
  containerAxisShowDate,
  chartData,
  containerNamesForChart,
  selectedContainerLabel,
  rawMetricsLength,
}: AnalyticsContainersChartsBundleProps) {
  if (mode === 'multi') {
    return (
      <>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Tous les conteneurs — CPU (%)
          </h2>
          <ChartPeriodCaption label={rangeLabel} />
          <div className="w-full min-h-[260px] sm:min-h-[400px]">
            <ResponsiveContainer width="100%" height={400} minHeight={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                <XAxis
                  dataKey="timeMs"
                  type="number"
                  domain={[chartXDomainMin, chartXDomainMax]}
                  angle={containerAxisShowDate ? -40 : -35}
                  textAnchor="end"
                  height={containerAxisShowDate ? 72 : 60}
                  minTickGap={containerAxisShowDate ? 32 : 22}
                  tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: containerAxisShowDate })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                <Tooltip
                  {...rechartsTooltipProps}
                  labelFormatter={(_, payload) => {
                    const ts = payload?.[0]?.payload?.timestamp
                    return ts != null ? formatLocalDateTime(String(ts)) : '—'
                  }}
                />
                <Legend />
                {containerNamesForChart.map((shortName, i) => (
                  <Line
                    key={`cpu_${shortName}`}
                    type="monotone"
                    dataKey={`cpu_${shortName}`}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    name={shortName}
                    dot={false}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Tous les conteneurs — Mémoire (%)
          </h2>
          <ChartPeriodCaption label={rangeLabel} />
          <div className="w-full min-h-[260px] sm:min-h-[400px]">
            <ResponsiveContainer width="100%" height={400} minHeight={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                <XAxis
                  dataKey="timeMs"
                  type="number"
                  domain={[chartXDomainMin, chartXDomainMax]}
                  angle={containerAxisShowDate ? -40 : -35}
                  textAnchor="end"
                  height={containerAxisShowDate ? 72 : 60}
                  minTickGap={containerAxisShowDate ? 32 : 22}
                  tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: containerAxisShowDate })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                <Tooltip
                  {...rechartsTooltipProps}
                  labelFormatter={(_, payload) => {
                    const ts = payload?.[0]?.payload?.timestamp
                    return ts != null ? formatLocalDateTime(String(ts)) : '—'
                  }}
                />
                <Legend />
                {containerNamesForChart.map((shortName, i) => (
                  <Line
                    key={`memory_${shortName}`}
                    type="monotone"
                    dataKey={`memory_${shortName}`}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    name={shortName}
                    dot={false}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {containerNamesForChart.length} conteneur(s) · {chartData.length} points affichés
        </p>
      </>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {selectedContainerLabel} — CPU et mémoire (%)
      </h2>
      <ChartPeriodCaption label={rangeLabel} />
      <div className="w-full min-h-[260px] sm:min-h-[400px]">
        <ResponsiveContainer width="100%" height={400} minHeight={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
            <XAxis
              dataKey="timeMs"
              type="number"
              domain={[chartXDomainMin, chartXDomainMax]}
              angle={containerAxisShowDate ? -40 : -35}
              textAnchor="end"
              height={containerAxisShowDate ? 72 : 60}
              minTickGap={containerAxisShowDate ? 32 : 22}
              tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: containerAxisShowDate })}
              tick={{ fontSize: 12 }}
            />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
            <Tooltip
              {...rechartsTooltipProps}
              labelFormatter={(_, payload: unknown) => {
                const ts = (payload as Array<{ payload?: { timestamp?: string } }>)?.[0]?.payload?.timestamp
                return ts != null ? formatLocalDateTime(ts) : '—'
              }}
              formatter={((value: unknown, name: string) => [
                value != null && typeof value === 'number' ? `${Number(value).toFixed(2)}%` : '—',
                name === 'cpu' ? 'CPU' : 'Mémoire',
              ]) as (value: unknown, name: string) => [string, string]}
            />
            <Legend />
            <Line type="monotone" dataKey="cpu" stroke="#3B82F6" strokeWidth={2} name="CPU %" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="memory" stroke="#10B981" strokeWidth={2} name="Mémoire %" dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
        {rawMetricsLength} points → {chartData.length} affichés
      </p>
    </div>
  )
}

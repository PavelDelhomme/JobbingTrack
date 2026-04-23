'use client'

import { useId, useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatLocalChartAxisTick, formatLocalDateTime } from '@/lib/utils/date'
import { rechartsTooltipProps } from '@/lib/charts/rechartsTooltipTheme'
import {
  filterSystemPercentRows,
  systemCpuAxisMax,
  systemMemoryAxisMax,
  type SystemPercentSeriesRow,
} from '@/lib/charts/systemMetricsSeriesModel'

export type SystemCpuMemoryAreaChartsProps = {
  chartData: SystemPercentSeriesRow[]
  xDomainMin: number
  xDomainMax: number
  axisShowDate: boolean
  /** Hauteur d’un graphique (CPU ou mémoire), en px. */
  chartHeight?: number
}

function tooltipLabel(_: unknown, payload: unknown) {
  const ts = (payload as { payload?: { timestamp?: string } }[])?.[0]?.payload?.timestamp
  return ts != null ? formatLocalDateTime(ts) : '—'
}

/**
 * CPU et mémoire en **aires séparées**, axes Y zoomés comme le détail service
 * (`MonitoringServiceHistoryCharts`) — métriques système (ex. page Performances).
 */
export function SystemCpuMemoryAreaCharts({
  chartData,
  xDomainMin,
  xDomainMax,
  axisShowDate,
  chartHeight = 220,
}: SystemCpuMemoryAreaChartsProps) {
  const uid = useId().replace(/:/g, '')
  const cpuFillId = `sysCpuGrad-${uid}`
  const memFillId = `sysMemGrad-${uid}`

  const rows = useMemo(() => filterSystemPercentRows(chartData), [chartData])
  const cpuMax = useMemo(() => systemCpuAxisMax(rows), [rows])
  const memMax = useMemo(() => systemMemoryAxisMax(rows), [rows])

  const bottom = axisShowDate ? 72 : 60
  const angle = axisShowDate ? -40 : -35

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Utilisation CPU
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Axe Y zoomé automatiquement quand la charge est faible (même principe que le détail conteneur).
        </p>
        <ResponsiveContainer width="100%" height={chartHeight} minHeight={180}>
          <AreaChart data={rows} margin={{ top: 8, right: 16, left: 4, bottom: bottom }}>
            <defs>
              <linearGradient id={cpuFillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: axisShowDate })}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke="#9CA3AF"
              unit="%"
              domain={[0, cpuMax]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              {...rechartsTooltipProps}
              formatter={(value: number) => [`${Number(value).toFixed(4)}%`, 'CPU']}
              labelFormatter={tooltipLabel}
            />
            <Area
              type="monotone"
              dataKey="cpu"
              stroke="#3B82F6"
              fillOpacity={1}
              fill={`url(#${cpuFillId})`}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Utilisation mémoire
        </h3>
        <ResponsiveContainer width="100%" height={chartHeight} minHeight={180}>
          <AreaChart data={rows} margin={{ top: 8, right: 16, left: 4, bottom: bottom }}>
            <defs>
              <linearGradient id={memFillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.85} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: axisShowDate })}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke="#9CA3AF"
              unit="%"
              domain={[0, memMax]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              {...rechartsTooltipProps}
              formatter={(value: number) => [`${Number(value).toFixed(2)}%`, 'Mémoire']}
              labelFormatter={tooltipLabel}
            />
            <Area
              type="monotone"
              dataKey="memory"
              stroke="#10B981"
              fillOpacity={1}
              fill={`url(#${memFillId})`}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AdminLayout } from '@/components/features'
import { PerformancesSubNav } from '../PerformancesSubNav'
import { analyticsService } from '@/lib/api/analytics.service'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { formatLocalChartAxisTick, metricRowToTimeMs, normalizeMetricTimestampToIso } from '@/lib/utils/date'
import { rechartsTooltipProps } from '@/lib/charts/rechartsTooltipTheme'
import { chartXDomainFromDataRange } from '@/lib/charts/chartTimeDomain'

export default function PerformancesDiskStubPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      try {
        const endDate = new Date()
        const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const data = await analyticsService.getSystemMetricsHistory({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 1440,
          offset: 0,
        })
        setRows(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [])

  const chartData = useMemo(() => {
    const toGb = (bytes: unknown): number | null => {
      if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return null
      return bytes / (1024 * 1024 * 1024)
    }
    const pickGb = (row: Record<string, unknown>, gbKeys: string[], byteKeys: string[]): number | null => {
      for (const k of byteKeys) {
        const g = toGb(row[k])
        if (g != null) return g
      }
      for (const k of gbKeys) {
        const v = row[k]
        if (v != null && Number.isFinite(Number(v)) && Number(v) > 0) return Number(v)
      }
      return null
    }
    return rows
      .map((raw) => {
        const r = raw as Record<string, unknown>
        const tsIso = normalizeMetricTimestampToIso(r.timestamp as string) || String(r.timestamp ?? '')
        const timeMs = metricRowToTimeMs(r, tsIso)
        const usageRaw = r.diskUsagePercent ?? r.disk_usage_percent
        const usage = usageRaw != null && Number.isFinite(Number(usageRaw)) ? Number(usageRaw) : NaN
        const used =
          pickGb(r, ['diskUsedGb', 'disk_used_gb'], ['diskUsedBytes', 'disk_used_bytes']) ?? NaN
        const total =
          pickGb(r, ['diskTotalGb', 'disk_total_gb'], ['diskTotalBytes', 'disk_total_bytes']) ?? NaN
        return {
          timestamp: tsIso || (r.timestamp as string),
          timeMs: timeMs ?? NaN,
          usage,
          used,
          total,
        }
      })
      .filter((row) => Number.isFinite(row.timeMs))
      .sort((a, b) => a.timeMs - b.timeMs)
  }, [rows])

  const [chartXMin, chartXMax] = useMemo(() => {
    const rangeEndMs = Date.now()
    const rangeStartMs = rangeEndMs - 24 * 60 * 60 * 1000
    return chartXDomainFromDataRange(rangeStartMs, rangeEndMs, chartData.map((d) => d.timeMs))
  }, [chartData])

  const axisShowDate = chartXMax - chartXMin > 24 * 60 * 60 * 1000

  const latest = chartData.length ? chartData[chartData.length - 1] : null

  return (
    <AdminLayout>
      <div className="p-6 mx-auto max-w-6xl space-y-6">
        <PerformancesSubNav />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Disque (système)</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Historique snapshots disque sur les dernières 24h (usage %, volume utilisé/total). Pour le détail Block I/O
          par service, utiliser la page détail service.
        </p>

        {loading ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
            Chargement des snapshots disque...
          </div>
        ) : chartData.length === 0 ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
            Aucun snapshot disque disponible pour cette période.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Usage disque actuel</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {latest && Number.isFinite(latest.usage) ? `${latest.usage.toFixed(1)}%` : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Volume utilisé</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {latest && Number.isFinite(latest.used) ? `${latest.used.toFixed(1)} GB` : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Volume total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {latest && Number.isFinite(latest.total) ? `${latest.total.toFixed(1)} GB` : '—'}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                  <XAxis
                    dataKey="timeMs"
                    type="number"
                    domain={[chartXMin, chartXMax]}
                    angle={-35}
                    textAnchor="end"
                    height={axisShowDate ? 68 : 56}
                    minTickGap={axisShowDate ? 28 : 20}
                    tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: axisShowDate })}
                  />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    {...rechartsTooltipProps}
                    formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Usage disque']}
                  />
                  <Line type="monotone" dataKey="usage" stroke="#2563EB" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/b4ck0ff1ce/performances"
            className="inline-flex rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Retour synthèse Performances
          </Link>
          <Link
            href="/b4ck0ff1ce/services/b4ck0ff1ce"
            className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500"
          >
            Détail service (Block I/O)
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}

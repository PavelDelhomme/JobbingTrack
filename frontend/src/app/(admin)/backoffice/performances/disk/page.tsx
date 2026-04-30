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
import { formatLocalChartAxisTick, metricTimestampToMs } from '@/lib/utils/date'
import { rechartsTooltipProps } from '@/lib/charts/rechartsTooltipTheme'

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

  const chartData = useMemo(
    () =>
      rows
        .map((r) => {
          const timeMs = metricTimestampToMs(r.timestamp)
          const used = Number(r.diskUsedGb ?? r.disk_used_gb ?? 0)
          const total = Number(r.diskTotalGb ?? r.disk_total_gb ?? 0)
          const usage = Number(r.diskUsagePercent ?? r.disk_usage_percent ?? 0)
          return {
            timestamp: r.timestamp,
            timeMs,
            usage,
            used,
            total,
          }
        })
        .filter((r) => Number.isFinite(r.timeMs)),
    [rows]
  )

  const latest = chartData[chartData.length - 1]

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
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{latest.usage.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Volume utilisé</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{latest.used.toFixed(1)} GB</p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Volume total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{latest.total.toFixed(1)} GB</p>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                  <XAxis
                    dataKey="timeMs"
                    type="number"
                    tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: false })}
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
            href="/backoffice/performances"
            className="inline-flex rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Retour synthèse Performances
          </Link>
          <Link
            href="/backoffice/services/backoffice"
            className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500"
          >
            Détail service (Block I/O)
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}

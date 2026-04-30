'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/features'
import {
  TimeRangeSelector,
  useAnalyticsAutoRefresh,
  usePersistedSharedAnalyticsRange,
  ymdLocal,
  type TimeRangeOption,
} from '@/components/analytics'
import {
  getPeriodMs,
  formatRangeLabel,
  formatCustomRangeLabel,
  localCalendarDayBounds,
} from '@/components/analytics/timeRangeUtils'
import {
  formatLocalChartAxisTick,
  formatLocalDateTime,
  metricRowToTimeMs,
  normalizeMetricTimestampToIso,
} from '@/lib/utils/date'
import { analyticsService } from '@/lib/api/analytics.service'
import { centralMetricsService } from '@/lib/services/centralMetricsService'
import { pickSystemResponseTimeAvgMsFromRow } from '@/lib/metrics/pickSystemResponseTimeFromRow'
import type { MetricsData } from '@/lib/interfaces'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import { rechartsTooltipProps } from '@/lib/charts/rechartsTooltipTheme'

type LatencyRow = {
  timestamp: string
  timeMs: number
  responseTimeMs: number | null
}

type LiveEndpointRow = {
  name: string
  ms: number | null
  status?: string
}

export default function PerformancesLatencyPage() {
  const [rows, setRows] = useState<LatencyRow[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingLive, setLoadingLive] = useState(true)
  const [liveMetrics, setLiveMetrics] = useState<MetricsData | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('24h')
  const [windowEnd, setWindowEnd] = useState<Date>(() => new Date())
  const [followLive, setFollowLive] = useState(true)
  const [softTick, setSoftTick] = useState(0)
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return ymdLocal(d)
  })
  const [customEnd, setCustomEnd] = useState(() => ymdLocal())
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  usePersistedSharedAnalyticsRange({
    timeRange,
    setTimeRange,
    useCustomRange,
    setUseCustomRange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    windowEnd,
    setWindowEnd,
    followLive,
    setFollowLive,
  })

  const getParams = useCallback(() => {
    if (useCustomRange) {
      const { start, end } = localCalendarDayBounds(customStart, customEnd)
      const durationMs = Math.max(0, end.getTime() - start.getTime())
      const limit = Math.min(Math.ceil(durationMs / (60 * 1000)), 43200)
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit,
        rangeStart: start,
        rangeEnd: end,
      }
    }
    const { start, end, limit } = getPeriodMs(timeRange, windowEnd)
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit,
      rangeStart: start,
      rangeEnd: end,
    }
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd])

  const fetchData = useCallback(async () => {
    const { startDate, endDate, limit } = getParams()
    setLoadingHistory(true)
    setLoadingLive(true)
    try {
      const [history, live] = await Promise.all([
        analyticsService.getSystemMetricsHistory({
          startDate,
          endDate,
          limit,
          offset: 0,
        }),
        centralMetricsService.getAggregatorMetrics(),
      ])
      setLiveMetrics(live)
      const normalized = (history || [])
        .map((r: Record<string, unknown>) => {
          const timestamp = normalizeMetricTimestampToIso(r.timestamp as string)
          const timeMs = metricRowToTimeMs(r, timestamp)
          const responseTimeMs = pickSystemResponseTimeAvgMsFromRow(r)
          if (!timestamp || timeMs == null) return null
          return {
            timestamp,
            timeMs,
            responseTimeMs:
              responseTimeMs != null && Number.isFinite(Number(responseTimeMs))
                ? Number(responseTimeMs)
                : null,
          }
        })
        .filter((x): x is LatencyRow => x != null)
        .sort((a, b) => a.timeMs - b.timeMs)
      setRows(normalized)
    } finally {
      setLoadingHistory(false)
      setLoadingLive(false)
    }
  }, [getParams])

  useEffect(() => {
    void fetchData()
  }, [fetchData, softTick])

  const bumpWindowEndToNow = useCallback(() => {
    setWindowEnd(new Date())
  }, [])
  const bumpSoftRefresh = useCallback(() => {
    setSoftTick((t) => t + 1)
  }, [])

  useAnalyticsAutoRefresh({
    followLive,
    useCustomRange,
    customEnd,
    bumpWindowEndToNow,
    bumpSoftRefresh,
  })

  const { rangeStart, rangeEnd } = getParams()
  const rangeLabel = useCustomRange
    ? formatCustomRangeLabel(customStart, customEnd)
    : formatRangeLabel(rangeStart, rangeEnd, timeRange)
  const chartXDomainMin = rangeStart.getTime()
  const chartXDomainMax = rangeEnd.getTime()
  const axisShowDate = chartXDomainMax - chartXDomainMin > 24 * 60 * 60 * 1000

  const goPrev = useCallback(() => {
    setFollowLive(false)
    if (useCustomRange) return
    const { start } = getPeriodMs(timeRange, windowEnd)
    const period = windowEnd.getTime() - start.getTime()
    setWindowEnd(new Date(windowEnd.getTime() - period))
  }, [timeRange, windowEnd, useCustomRange])

  const goNext = useCallback(() => {
    setFollowLive(false)
    if (useCustomRange) return
    const now = new Date()
    const { start } = getPeriodMs(timeRange, windowEnd)
    const period = windowEnd.getTime() - start.getTime()
    const nextEnd = new Date(windowEnd.getTime() + period)
    setWindowEnd(nextEnd <= now ? nextEnd : now)
  }, [timeRange, windowEnd, useCustomRange])

  const canGoNext = useMemo(() => windowEnd.getTime() < Date.now(), [windowEnd])

  const liveEndpointRows = useMemo(() => {
    const parseMs = (v: unknown): number | null => {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
      if (typeof v === 'string') {
        const n = parseFloat(v.replace(/[^\d.]/g, ''))
        return Number.isFinite(n) && n > 0 ? n : null
      }
      return null
    }
    const list = liveMetrics?.servicesList ?? []
    return list
      .map((s) => {
        const ms = parseMs(s.responseTimeMs) ?? parseMs(s.responseTime) ?? parseMs(s.health?.responseTime)
        return {
          name: (s.displayName || s.name || 'service').slice(0, 48),
          ms,
          status: s.status ?? s.health?.status,
        }
      })
      .sort((a, b) => (b.ms ?? -1) - (a.ms ?? -1))
  }, [liveMetrics])

  const measuredRows = useMemo(
    () => liveEndpointRows.filter((r): r is LiveEndpointRow & { ms: number } => r.ms != null),
    [liveEndpointRows]
  )
  const missingRows = useMemo(() => liveEndpointRows.filter((r) => r.ms == null), [liveEndpointRows])
  const measuredServiceNames = useMemo(() => measuredRows.map((r) => r.name), [measuredRows])

  useEffect(() => {
    setSelectedServices((prev) => {
      if (prev.length === 0) return measuredServiceNames
      return prev.filter((name) => measuredServiceNames.includes(name))
    })
  }, [measuredServiceNames])

  const filteredMeasuredRows = useMemo(() => {
    if (selectedServices.length === 0) return measuredRows
    return measuredRows.filter((r) => selectedServices.includes(r.name))
  }, [measuredRows, selectedServices])

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 w-full">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Temps de réponse</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Vue détaillée latence : historique agrégé + instantané par endpoint/service.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <TimeRangeSelector
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            useCustomRange={useCustomRange}
            setUseCustomRange={setUseCustomRange}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
            rangeLabel={rangeLabel}
            goPrev={goPrev}
            goNext={goNext}
            canGoNext={canGoNext}
            onPeriodNow={() => {
              setUseCustomRange(false)
              setFollowLive(true)
              setWindowEnd(new Date())
            }}
            showNavigationHint={false}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Historique agrégé (ms)</h2>
          {loadingHistory && rows.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Aucune donnée sur la période.</p>
          ) : (
            <div className="mt-4 w-full min-h-[260px]">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={rows} margin={{ top: 8, right: 20, left: 8, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                  <XAxis
                    dataKey="timeMs"
                    type="number"
                    domain={[chartXDomainMin, chartXDomainMax]}
                    angle={axisShowDate ? -40 : -35}
                    textAnchor="end"
                    height={axisShowDate ? 72 : 60}
                    minTickGap={axisShowDate ? 32 : 22}
                    tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: axisShowDate })}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tickFormatter={(v) => `${Math.round(Number(v))} ms`} tick={{ fontSize: 12 }} />
                  <Tooltip
                    {...rechartsTooltipProps}
                    labelFormatter={(_, payload: unknown) => {
                      const ts = (payload as Array<{ payload?: { timestamp?: string } }>)?.[0]?.payload?.timestamp
                      return ts ? formatLocalDateTime(ts) : '—'
                    }}
                    formatter={(value: number) => [`${Number(value).toFixed(1)} ms`, 'Temps de réponse']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="responseTimeMs"
                    stroke="#0D9488"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    name="Temps de réponse (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Instantané par service</h2>
          {measuredRows.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedServices(measuredServiceNames)}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Tout sélectionner
              </button>
              <button
                onClick={() => setSelectedServices([])}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Tout désélectionner
              </button>
              {measuredRows.map((row) => {
                const active = selectedServices.includes(row.name)
                return (
                  <button
                    key={row.name}
                    onClick={() =>
                      setSelectedServices((prev) =>
                        active ? prev.filter((x) => x !== row.name) : [...prev, row.name]
                      )
                    }
                    className={`rounded px-2 py-1 text-xs border ${
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200'
                        : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {row.name}
                  </button>
                )
              })}
            </div>
          )}
          {loadingLive && liveEndpointRows.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
          ) : filteredMeasuredRows.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Aucune mesure instantanée exploitable.</p>
          ) : (
            <div className="mt-4 w-full min-h-[240px]">
              <ResponsiveContainer width="100%" height={Math.max(240, filteredMeasuredRows.length * 28)}>
                <BarChart layout="vertical" data={filteredMeasuredRows} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-40" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit=" ms" />
                  <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} interval={0} />
                  <Tooltip
                    {...rechartsTooltipProps}
                    formatter={(value: number) => [`${Number(value).toFixed(1)} ms`, 'Réponse']}
                  />
                  <Bar dataKey="ms" name="ms" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {missingRows.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200/90">
              <span className="font-medium">Services sans mesure instantanée :</span>{' '}
              {missingRows.map((r) => r.name).join(', ')}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

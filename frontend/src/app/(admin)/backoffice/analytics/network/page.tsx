'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/features';
import {
  TimeRangeSelector,
  ChartPeriodCaption,
  useAnalyticsAutoRefresh,
  usePersistedSharedAnalyticsRange,
  injectMetricTimeGaps,
  ymdLocal,
  type TimeRangeOption,
} from '@/components/analytics';
import {
  getPeriodMs,
  formatRangeLabel,
  formatCustomRangeLabel,
  localCalendarDayBounds,
} from '@/components/analytics/timeRangeUtils';
import {
  formatLocalChartAxisTick,
  formatLocalDateTime,
  metricRowToTimeMs,
  metricTimestampToMs,
  normalizeMetricTimestampToIso,
} from '@/lib/utils/date';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyticsService } from '@/lib/api/analytics.service';
import { rechartsTooltipProps } from '@/lib/charts/rechartsTooltipTheme';

const METRIC_GAP_MS = 15 * 60 * 1000;

interface NetPoint {
  timestamp: string;
  timeMs?: number;
  rxMb?: number;
  txMb?: number;
}

export default function NetworkPerformancePage() {
  const [chartData, setChartData] = useState<
    {
      timeMs: number;
      timestamp: string;
      time: string;
      datetime: string;
      rxMb: number | null;
      txMb: number | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('24h');
  const [windowEnd, setWindowEnd] = useState<Date>(() => new Date());
  const [followLive, setFollowLive] = useState(true);
  const [softTick, setSoftTick] = useState(0);
  const silentNextFetch = useRef(false);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return ymdLocal(d);
  });
  const [customEnd, setCustomEnd] = useState(() => ymdLocal());

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
  });

  const getParams = useCallback(() => {
    if (useCustomRange) {
      const { start, end } = localCalendarDayBounds(customStart, customEnd);
      const durationMs = Math.max(0, end.getTime() - start.getTime());
      const limit = Math.min(Math.ceil(durationMs / (60 * 1000)), 43200);
      return { startDate: start.toISOString(), endDate: end.toISOString(), limit };
    }
    const { start, end, limit } = getPeriodMs(timeRange, windowEnd);
    return { startDate: start.toISOString(), endDate: end.toISOString(), limit };
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        const { startDate, endDate, limit } = getParams();
        const raw = await analyticsService.getSystemMetricsHistory({
          startDate,
          endDate,
          limit,
          offset: 0,
        });
        const sorted: NetPoint[] = (raw || [])
          .filter((d: { timestamp?: string }) => d.timestamp)
          .map((d: Record<string, unknown>) => {
            const rawTs =
              typeof d.timestamp === 'string'
                ? d.timestamp
                : (d.timestamp as Date)?.toISOString?.() ?? '';
            const ts = normalizeMetricTimestampToIso(rawTs);
            const timeMs = metricRowToTimeMs(d, ts);
            const rxRaw =
              d.networkRxBytes != null
                ? Number(d.networkRxBytes)
                : d.total_network_rx_bytes != null
                  ? Number(d.total_network_rx_bytes)
                  : undefined;
            const txRaw =
              d.networkTxBytes != null
                ? Number(d.networkTxBytes)
                : d.total_network_tx_bytes != null
                  ? Number(d.total_network_tx_bytes)
                  : undefined;
            return {
              timestamp: ts,
              ...(timeMs != null ? { timeMs } : {}),
              rxMb: rxRaw != null && !Number.isNaN(rxRaw) ? rxRaw / (1024 * 1024) : undefined,
              txMb: txRaw != null && !Number.isNaN(txRaw) ? txRaw / (1024 * 1024) : undefined,
            };
          })
          .sort(
            (a: NetPoint, b: NetPoint) =>
              (a.timeMs ?? metricTimestampToMs(a.timestamp) ?? 0) -
              (b.timeMs ?? metricTimestampToMs(b.timestamp) ?? 0)
          );
        const withGaps = injectMetricTimeGaps(sorted, METRIC_GAP_MS, ['rxMb', 'txMb']);
        setChartData(
          withGaps
            .map((p) => {
              const timeMs =
                typeof p.timeMs === 'number' && Number.isFinite(p.timeMs)
                  ? p.timeMs
                  : (metricTimestampToMs(p.timestamp) ?? NaN);
              return {
                timeMs,
                timestamp: p.timestamp,
                time: formatLocalChartAxisTick(timeMs, { withDate: false }),
                datetime: formatLocalDateTime(p.timestamp),
                rxMb:
                  p.rxMb != null && !Number.isNaN(p.rxMb) ? Math.round(p.rxMb * 100) / 100 : null,
                txMb:
                  p.txMb != null && !Number.isNaN(p.txMb) ? Math.round(p.txMb * 100) / 100 : null,
              };
            })
            .filter((row) => Number.isFinite(row.timeMs))
        );
      } catch (e) {
        console.error(e);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [getParams]
  );

  useEffect(() => {
    const silent = silentNextFetch.current;
    silentNextFetch.current = false;
    void load({ silent });
  }, [load, softTick]);

  const bumpWindowEndToNow = useCallback(() => {
    silentNextFetch.current = true;
    setWindowEnd(new Date());
  }, []);

  const bumpSoftRefresh = useCallback(() => {
    silentNextFetch.current = true;
    setSoftTick((t) => t + 1);
  }, []);

  useAnalyticsAutoRefresh({
    followLive,
    useCustomRange,
    customEnd,
    bumpWindowEndToNow,
    bumpSoftRefresh,
  });

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (useCustomRange) {
      const { start, end } = localCalendarDayBounds(customStart, customEnd);
      return { rangeStart: start, rangeEnd: end };
    }
    const { start, end } = getPeriodMs(timeRange, windowEnd);
    return { rangeStart: start, rangeEnd: end };
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

  const chartXDomainMin = rangeStart.getTime();
  const chartXDomainMax = rangeEnd.getTime();
  const rangeLabel = useCustomRange
    ? formatCustomRangeLabel(customStart, customEnd)
    : formatRangeLabel(rangeStart, rangeEnd, timeRange);

  const goPrev = useCallback(() => {
    if (useCustomRange) {
      const { start: rs, end: re } = localCalendarDayBounds(customStart, customEnd);
      const days = Math.max(1, Math.ceil((re.getTime() - rs.getTime()) / (24 * 60 * 60 * 1000)));
      const ns = new Date(rs);
      ns.setDate(ns.getDate() - days);
      const ne = new Date(re);
      ne.setDate(ne.getDate() - days);
      setCustomStart(ymdLocal(ns));
      setCustomEnd(ymdLocal(ne));
      return;
    }
    setFollowLive(false);
    if (timeRange === 'today') {
      const d = new Date(windowEnd);
      d.setDate(d.getDate() - 1);
      setWindowEnd(d);
    } else {
      const { start } = getPeriodMs(timeRange, windowEnd);
      const period = windowEnd.getTime() - start.getTime();
      setWindowEnd(new Date(windowEnd.getTime() - period));
    }
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

  const goNext = useCallback(() => {
    if (useCustomRange) {
      const { start: rs, end: re } = localCalendarDayBounds(customStart, customEnd);
      const days = Math.max(1, Math.ceil((re.getTime() - rs.getTime()) / (24 * 60 * 60 * 1000)));
      const ns = new Date(rs);
      ns.setDate(ns.getDate() + days);
      const ne = new Date(re);
      ne.setDate(ne.getDate() + days);
      const today = ymdLocal();
      if (ymdLocal(ne) > today) {
        setCustomEnd(today);
        setCustomStart(ymdLocal(new Date(Date.now() - days * 24 * 60 * 60 * 1000)));
      } else {
        setCustomStart(ymdLocal(ns));
        setCustomEnd(ymdLocal(ne));
      }
      return;
    }
    setFollowLive(false);
    const now = new Date();
    if (timeRange === 'today') {
      const d = new Date(windowEnd);
      d.setDate(d.getDate() + 1);
      if (d <= now) setWindowEnd(d);
    } else {
      const { start } = getPeriodMs(timeRange, windowEnd);
      const period = windowEnd.getTime() - start.getTime();
      const nextEnd = new Date(windowEnd.getTime() + period);
      if (nextEnd <= now) setWindowEnd(nextEnd);
      else setWindowEnd(now);
    }
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

  const canGoNext = useMemo(() => {
    if (useCustomRange) {
      return customEnd < ymdLocal();
    }
    const now = new Date();
    if (timeRange === 'today')
      return windowEnd.toISOString().slice(0, 10) < now.toISOString().slice(0, 10);
    return windowEnd.getTime() < now.getTime();
  }, [useCustomRange, customEnd, timeRange, windowEnd]);

  const handlePeriodNow = useCallback(() => {
    setUseCustomRange(false);
    setFollowLive(true);
    setWindowEnd(new Date());
  }, []);

  const networkAxisShowDate =
    chartXDomainMax - chartXDomainMin > 24 * 60 * 60 * 1000;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 w-full">
        <Link
          href="/backoffice/analytics"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <span aria-hidden>←</span>
          Retour à la vue d&apos;ensemble
        </Link>
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Performances réseau
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
              Débit et volume réseau système (RX/TX) dans le temps.
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
              onPeriodNow={handlePeriodNow}
            />
          </div>
        </div>
        {loading && chartData.length === 0 ? (
          <div className="flex items-center justify-center min-h-[240px] sm:h-64 text-gray-500 dark:text-gray-400">
            Chargement…
          </div>
        ) : chartData.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
            Aucune donnée réseau disponible. Vérifiez que le metrics-aggregator enregistre les métriques
            système.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Réception (RX) et émission (TX) — Mo
            </h2>
            <ChartPeriodCaption label={rangeLabel} />
            <div className="w-full min-h-[240px] sm:min-h-[360px]">
              <ResponsiveContainer width="100%" height={360} minHeight={240}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                  <XAxis
                    dataKey="timeMs"
                    type="number"
                    domain={[chartXDomainMin, chartXDomainMax]}
                    angle={networkAxisShowDate ? -40 : -35}
                    textAnchor="end"
                    height={networkAxisShowDate ? 72 : 60}
                    minTickGap={networkAxisShowDate ? 32 : 22}
                    tickFormatter={(ms) => formatLocalChartAxisTick(ms, { withDate: networkAxisShowDate })}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tickFormatter={(v) => `${v} Mo`} tick={{ fontSize: 12 }} />
                  <Tooltip
                    {...rechartsTooltipProps}
                    labelFormatter={(_, payload: unknown) => {
                      const ts = (payload as Array<{ payload?: { timestamp?: string } }>)?.[0]?.payload
                        ?.timestamp;
                      return ts != null ? formatLocalDateTime(ts) : '—';
                    }}
                    formatter={
                      ((v: number | null, name: string) => [
                        v != null && !Number.isNaN(Number(v)) ? `${Number(v).toFixed(2)} Mo` : '—',
                        name === 'rxMb' ? 'RX (Mo)' : 'TX (Mo)',
                      ]) as (v: number | null, name: string) => [string, string]
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="rxMb"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    name="RX (Mo)"
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="txMb"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="TX (Mo)"
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

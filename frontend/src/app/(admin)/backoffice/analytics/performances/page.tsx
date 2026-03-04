'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/features';
import { TimeRangeSelector, type TimeRangeOption } from '@/components/analytics';
import { getPeriodMs, formatRangeLabel } from '@/components/analytics/timeRangeUtils';
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

interface SystemMetric {
  timestamp: string;
  cpuUsagePercent?: number;
  memoryUsagePercent?: number;
  networkRxBytes?: number | null;
  networkTxBytes?: number | null;
}

function compressData<T extends { timestamp: string }>(
  data: T[],
  targetMax: number,
  valueKeys: (keyof T)[]
): T[] {
  if (data.length <= targetMax) return data;
  const step = data.length / targetMax;
  const out: T[] = [];
  for (let i = 0; i < targetMax; i++) {
    const start = Math.floor(i * step);
    const end = Math.min(Math.floor((i + 1) * step), data.length);
    const slice = data.slice(start, end);
    if (slice.length === 0) continue;
    const mid = slice[Math.floor(slice.length / 2)];
    const avg: Record<string, number> = {};
    valueKeys.forEach((k) => {
      const key = String(k);
      const nums = slice
        .map((s) => (s as Record<string, unknown>)[key] as number)
        .filter((n) => typeof n === 'number' && !Number.isNaN(n));
      avg[key] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    });
    out.push({ ...mid, ...avg } as T);
  }
  return out;
}

export default function PerformancesPage() {
  const [rawData, setRawData] = useState<SystemMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('24h');
  const [windowEnd, setWindowEnd] = useState<Date>(() => new Date());
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const getParams = useCallback(() => {
    if (useCustomRange) {
      const start = new Date(customStart + 'T00:00:00.000Z');
      const end = new Date(customEnd + 'T23:59:59.999Z');
      const durationMs = Math.max(0, end.getTime() - start.getTime());
      const limit = Math.min(Math.ceil(durationMs / (60 * 1000)), 43200);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit,
        rangeStart: start,
        rangeEnd: end,
      };
    }
    const { start, end, limit } = getPeriodMs(timeRange, windowEnd);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit,
      rangeStart: start,
      rangeEnd: end,
    };
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate, limit } = getParams();
      const data = await analyticsService.getSystemMetricsHistory({
        startDate,
        endDate,
        limit,
        offset: 0,
      });
      const sorted = (data || [])
        .map((d: Record<string, unknown>) => ({
          timestamp:
            typeof d.timestamp === 'string'
              ? d.timestamp
              : (d.timestamp as Date)?.toISOString?.() ?? '',
          cpuUsagePercent:
            Number(d.cpuUsagePercent ?? d.cpu_usage_percent ?? 0) || 0,
          memoryUsagePercent:
            Number(d.memoryUsagePercent ?? d.memory_usage_percent ?? 0) || 0,
          networkRxBytes:
            d.networkRxBytes != null
              ? Number(d.networkRxBytes)
              : d.total_network_rx_bytes != null
                ? Number(d.total_network_rx_bytes)
                : null,
          networkTxBytes:
            d.networkTxBytes != null
              ? Number(d.networkTxBytes)
              : d.total_network_tx_bytes != null
                ? Number(d.total_network_tx_bytes)
                : null,
        }))
        .filter((d: { timestamp: string }) => d.timestamp)
        .sort(
          (a: { timestamp: string }, b: { timestamp: string }) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      setRawData(sorted);
    } catch (e) {
      console.error(e);
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }, [getParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { rangeStart, rangeEnd } = getParams();
  const rangeLabel = useCustomRange
    ? `Du ${new Date(customStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} au ${new Date(customEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : formatRangeLabel(rangeStart, rangeEnd, timeRange);

  const goPrev = useCallback(() => {
    if (useCustomRange) {
      const days = Math.ceil((new Date(customEnd).getTime() - new Date(customStart).getTime()) / (24 * 60 * 60 * 1000)) || 1;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      start.setDate(start.getDate() - days);
      end.setDate(end.getDate() - days);
      setCustomStart(start.toISOString().slice(0, 10));
      setCustomEnd(end.toISOString().slice(0, 10));
      return;
    }
    const now = Date.now();
    if (timeRange === 'today') {
      const d = new Date(windowEnd);
      d.setDate(d.getDate() - 1);
      setWindowEnd(d);
    } else {
      const { start } = getPeriodMs(timeRange, windowEnd);
      const period = windowEnd.getTime() - start.getTime();
      const nextEnd = new Date(windowEnd.getTime() - period);
      setWindowEnd(nextEnd);
    }
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

  const goNext = useCallback(() => {
    if (useCustomRange) {
      const days = Math.ceil((new Date(customEnd).getTime() - new Date(customStart).getTime()) / (24 * 60 * 60 * 1000)) || 1;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      start.setDate(start.getDate() + days);
      end.setDate(end.getDate() + days);
      const today = new Date().toISOString().slice(0, 10);
      if (end.toISOString().slice(0, 10) > today) {
        setCustomEnd(today);
        setCustomStart(new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      } else {
        setCustomStart(start.toISOString().slice(0, 10));
        setCustomEnd(end.toISOString().slice(0, 10));
      }
      return;
    }
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
      return new Date(customEnd).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10);
    }
    const now = new Date();
    if (timeRange === 'today') return windowEnd.toISOString().slice(0, 10) < now.toISOString().slice(0, 10);
    return windowEnd.getTime() < now.getTime();
  }, [useCustomRange, customEnd, timeRange, windowEnd]);

  const targetPoints = 200;
  const chartData = useMemo(() => {
    if (rawData.length === 0) return [];
    const keys: (keyof SystemMetric)[] = [
      'cpuUsagePercent',
      'memoryUsagePercent',
      'networkRxBytes',
      'networkTxBytes',
    ];
    const compressed = compressData(rawData, targetPoints, keys);
    return compressed.map((d) => {
      const date = new Date(d.timestamp);
      const rxMb =
        d.networkRxBytes != null ? d.networkRxBytes / (1024 * 1024) : null;
      const txMb =
        d.networkTxBytes != null ? d.networkTxBytes / (1024 * 1024) : null;
      return {
        time: date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        datetime: date.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        cpu: Number(d.cpuUsagePercent ?? 0),
        memory: Number(d.memoryUsagePercent ?? 0),
        networkRxMb: rxMb != null ? Math.round(rxMb * 100) / 100 : null,
        networkTxMb: txMb != null ? Math.round(txMb * 100) / 100 : null,
      };
    });
  }, [rawData]);

  const handlePeriodNow = useCallback(() => {
    setUseCustomRange(false);
    setWindowEnd(new Date());
  }, []);

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
              Performances complètes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
              CPU, mémoire, réseau système sur la période choisie.
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

        {loading && rawData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            Chargement…
          </div>
        ) : chartData.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            Aucune donnée disponible pour cette période. Vérifiez que le
            metrics-aggregator collecte les snapshots système.
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                CPU et mémoire (%)
              </h2>
              <div className="w-full min-h-[240px] sm:min-h-[320px]">
              <ResponsiveContainer width="100%" height={320} minHeight={240}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                  <XAxis
                    dataKey="time"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    labelFormatter={(_, payload: unknown) =>
                      (payload as Array<{ payload?: { datetime?: string } }>)?.[0]?.payload?.datetime ?? ''
                    }
                    formatter={((value: number, name: string) => [
                      `${Number(value).toFixed(2)}%`,
                      name === 'cpu' ? 'CPU' : 'Mémoire',
                    ]) as (value: number, name: string) => [string, string]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="CPU %"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Mémoire %"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>

            {(chartData.some((d) => d.networkRxMb != null || d.networkTxMb != null)) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Réseau (Mo)
                </h2>
                <div className="w-full min-h-[240px] sm:min-h-[320px]">
                <ResponsiveContainer width="100%" height={320} minHeight={240}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis
                      dataKey="time"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tickFormatter={(v) => `${v} Mo`} tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(_, payload: unknown) =>
                        (payload as Array<{ payload?: { datetime?: string } }>)?.[0]?.payload?.datetime ?? ''
                      }
                      formatter={((value: number, name: string) => [
                        value != null ? `${Number(value).toFixed(2)} Mo` : '—',
                        name === 'networkRxMb' ? 'RX' : 'TX',
                      ]) as (value: number, name: string) => [string, string]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="networkRxMb"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      name="RX (Mo)"
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="networkTxMb"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      name="TX (Mo)"
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {rawData.length} points bruts → {chartData.length} points affichés
            </p>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

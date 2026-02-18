'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/features';
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
import { ChevronLeft, ChevronRight } from '@/lib/icons';
import { analyticsService } from '@/lib/api/analytics.service';

const PERIODE_ACTUELLE_LABEL = 'Période actuelle';

type TimeRangeOption =
  | 'today'
  | '1h'
  | '6h'
  | '24h'
  | '3d'
  | '7d'
  | '14d'
  | '30d';

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

function getPeriodMs(range: TimeRangeOption, windowEnd: Date): { start: Date; end: Date; limit: number } {
  const end = new Date(windowEnd);
  const now = Date.now();
  let start: Date;
  let limit: number;
  switch (range) {
    case 'today': {
      start = new Date(end);
      start.setHours(0, 0, 0, 0);
      const endOfDay = new Date(start);
      endOfDay.setHours(23, 59, 59, 999);
      const effectiveEnd = end.getTime() > endOfDay.getTime() ? endOfDay : end;
      limit = Math.min(1440, Math.ceil((effectiveEnd.getTime() - start.getTime()) / (60 * 1000)));
      return { start, end: effectiveEnd, limit };
    }
    case '1h':
      start = new Date(end.getTime() - 60 * 60 * 1000);
      limit = 60;
      break;
    case '6h':
      start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
      limit = 360;
      break;
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      limit = 1440;
      break;
    case '3d':
      start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
      limit = 4320;
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      limit = 10080;
      break;
    case '14d':
      start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);
      limit = 20160;
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      limit = 43200;
      break;
    default:
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      limit = 1440;
  }
  return { start, end, limit };
}

function formatRangeLabel(start: Date, end: Date, range: TimeRangeOption): string {
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  if (range === 'today') return fmt(start);
  if (range === '1h' || range === '6h' || range === '24h') {
    return `${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `Du ${fmt(start)} au ${fmt(end)}`;
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
        .filter((d) => d.timestamp)
        .sort(
          (a, b) =>
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

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Performances complètes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              CPU, mémoire, réseau système sur la période choisie.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value as TimeRangeOption);
                if (!useCustomRange) setWindowEnd(new Date());
              }}
              disabled={useCustomRange}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 disabled:opacity-60"
            >
              <option value="today">Aujourd&apos;hui</option>
              <option value="1h">1 h</option>
              <option value="6h">6 h</option>
              <option value="24h">24 h</option>
              <option value="3d">3 jours</option>
              <option value="7d">7 jours</option>
              <option value="14d">14 jours</option>
              <option value="30d">30 jours</option>
            </select>
            <div className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1">
              <button
                type="button"
                onClick={goPrev}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                aria-label="Période précédente"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-[200px] text-center text-sm text-gray-700 dark:text-gray-300">
                {rangeLabel}
              </span>
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Période suivante"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setUseCustomRange(false);
                setWindowEnd(new Date());
              }}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {PERIODE_ACTUELLE_LABEL}
            </button>
          </div>
        </div>

        {/* Plage personnalisée : section séparée */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Plage personnalisée
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Définir une plage de dates pour la vue actuelle. Cochez « Utiliser cette plage » pour l&apos;appliquer.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              Du
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              au
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomRange}
                onChange={(e) => setUseCustomRange(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Utiliser cette plage pour la vue actuelle
              </span>
            </label>
          </div>
        </div>

        <Link
          href="/backoffice/analytics"
          className="text-primary-600 hover:underline dark:text-primary-400 text-sm"
        >
          ← Retour à la vue d&apos;ensemble Analytics
        </Link>

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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                CPU et mémoire (%)
              </h2>
              <ResponsiveContainer width="100%" height={320}>
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
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.datetime ?? ''
                    }
                    formatter={(value: number, name: string) => [
                      `${Number(value).toFixed(2)}%`,
                      name === 'cpu' ? 'CPU' : 'Mémoire',
                    ]}
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

            {(chartData.some((d) => d.networkRxMb != null || d.networkTxMb != null)) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Réseau (Mo)
                </h2>
                <ResponsiveContainer width="100%" height={320}>
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
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.datetime ?? ''
                      }
                      formatter={(value: number, name: string) => [
                        value != null ? `${Number(value).toFixed(2)} Mo` : '—',
                        name === 'networkRxMb' ? 'RX' : 'TX',
                      ]}
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

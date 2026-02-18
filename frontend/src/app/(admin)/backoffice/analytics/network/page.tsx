'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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

export default function NetworkPerformancePage() {
  const [data, setData] = useState<{ time: string; datetime: string; rxMb: number; txMb: number }[]>([]);
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
      return { startDate: start.toISOString(), endDate: end.toISOString(), limit };
    }
    const { start, end, limit } = getPeriodMs(timeRange, windowEnd);
    return { startDate: start.toISOString(), endDate: end.toISOString(), limit };
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate, limit } = getParams();
      const raw = await analyticsService.getSystemMetricsHistory({
        startDate,
        endDate,
        limit: Math.min(limit, 2000),
        offset: 0,
      });
      const sorted = (raw || [])
        .filter((d: { timestamp?: string }) => d.timestamp)
        .map((d: Record<string, unknown>) => {
          const ts = typeof d.timestamp === 'string' ? d.timestamp : (d.timestamp as Date)?.toISOString?.() ?? '';
          const rx = d.networkRxBytes != null ? Number(d.networkRxBytes) : d.total_network_rx_bytes != null ? Number(d.total_network_rx_bytes) : 0;
          const tx = d.networkTxBytes != null ? Number(d.networkTxBytes) : d.total_network_tx_bytes != null ? Number(d.total_network_tx_bytes) : 0;
          return { timestamp: ts, rxMb: rx / (1024 * 1024), txMb: tx / (1024 * 1024) };
        })
        .sort((a: { timestamp: string }, b: { timestamp: string }) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setData(
        sorted.map((p: { timestamp: string; rxMb: number; txMb: number }) => {
          const date = new Date(p.timestamp);
          return {
            time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }),
            datetime: date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
            rxMb: Math.round(p.rxMb * 100) / 100,
            txMb: Math.round(p.txMb * 100) / 100,
          };
        })
      );
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [getParams]);

  useEffect(() => {
    load();
  }, [load]);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (useCustomRange) {
      const start = new Date(customStart + 'T00:00:00.000Z');
      const end = new Date(customEnd + 'T23:59:59.999Z');
      return { rangeStart: start, rangeEnd: end };
    }
    const { start, end } = getPeriodMs(timeRange, windowEnd);
    return { rangeStart: start, rangeEnd: end };
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

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
    const { start } = getPeriodMs(timeRange, windowEnd);
    const period = windowEnd.getTime() - start.getTime();
    setWindowEnd(new Date(windowEnd.getTime() - period));
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
    const { start } = getPeriodMs(timeRange, windowEnd);
    const period = windowEnd.getTime() - start.getTime();
    const nextEnd = new Date(windowEnd.getTime() + period);
    setWindowEnd(nextEnd <= now ? nextEnd : now);
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

  const canGoNext = useMemo(() => {
    if (useCustomRange) return new Date(customEnd).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10);
    return windowEnd.getTime() < Date.now();
  }, [useCustomRange, customEnd, windowEnd]);

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
        {loading ? (
          <div className="flex items-center justify-center min-h-[240px] sm:h-64 text-gray-500 dark:text-gray-400">Chargement…</div>
        ) : data.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
            Aucune donnée réseau disponible. Vérifiez que le metrics-aggregator enregistre les métriques système.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Réception (RX) et émission (TX) — Mo</h2>
            <div className="w-full min-h-[240px] sm:min-h-[360px]">
              <ResponsiveContainer width="100%" height={360} minHeight={240}>
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                  <XAxis dataKey="time" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v} Mo`} tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.datetime ?? ''} formatter={(v: number, name: string) => [`${Number(v).toFixed(2)} Mo`, name === 'rxMb' ? 'RX (Mo)' : 'TX (Mo)']} />
                  <Legend />
                  <Line type="monotone" dataKey="rxMb" stroke="#8B5CF6" strokeWidth={2} name="RX (Mo)" dot={false} />
                  <Line type="monotone" dataKey="txMb" stroke="#F59E0B" strokeWidth={2} name="TX (Mo)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

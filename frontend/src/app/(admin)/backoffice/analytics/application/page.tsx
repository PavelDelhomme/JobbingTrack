'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/features';
import { TimeRangeSelector, type TimeRangeOption } from '@/components/analytics';
import { getPeriodMs, formatRangeLabel } from '@/components/analytics/timeRangeUtils';
import { centralMetricsService } from '@/lib/services/centralMetricsService';
import { statisticsService } from '@/lib/services/statisticsService';

export default function ApplicationPerformancePage() {
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [appStats, setAppStats] = useState<Record<string, unknown> | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [metricsRes, statsRes] = await Promise.all([
          centralMetricsService.fetchMetrics().catch(() => null),
          statisticsService.getCurrentStatistics().catch(() => null),
        ]);
        if (!cancelled) {
          setMetrics(metricsRes ? (metricsRes as unknown as Record<string, unknown>) : null);
          setAppStats(statsRes ? (statsRes as unknown as Record<string, unknown>) : null);
        }
      } catch (e) {
        if (!cancelled) setMetrics(null);
        setAppStats(null);
      } finally {
        if (!cancelled) setLoading(false);
        cancelled = true;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (useCustomRange) {
      return { rangeStart: new Date(customStart + 'T00:00:00.000Z'), rangeEnd: new Date(customEnd + 'T23:59:59.999Z') };
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
    setWindowEnd(new Date(windowEnd.getTime() - (windowEnd.getTime() - start.getTime())));
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
    setWindowEnd(new Date(Math.min(windowEnd.getTime() + period, now.getTime())));
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

  const canGoNext = useMemo(() => {
    if (useCustomRange) return new Date(customEnd).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10);
    return windowEnd.getTime() < Date.now();
  }, [useCustomRange, customEnd, windowEnd]);

  const handlePeriodNow = useCallback(() => {
    setUseCustomRange(false);
    setWindowEnd(new Date());
  }, []);

  const perf = metrics?.performance as Record<string, unknown> | undefined;
  const system = metrics?.system as Record<string, unknown> | undefined;
  const health = metrics?.health as Record<string, unknown> | undefined;

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
              Performances applicatives
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
              Indicateurs issus de l&apos;application utilisateur et des services (temps de réponse, disponibilité, statistiques).
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
          <div className="flex items-center justify-center min-h-[200px] sm:h-64 text-gray-500 dark:text-gray-400">Chargement…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {perf?.averageResponseTime != null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">Temps de réponse moyen</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{Number(perf.averageResponseTime).toFixed(0)} ms</p>
              </div>
            )}
            {health?.availability_percent != null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">Disponibilité</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{Number(health.availability_percent).toFixed(1)} %</p>
              </div>
            )}
            {system?.cpu != null && typeof system.cpu === 'object' && (system.cpu as Record<string, unknown>).usage != null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">CPU (système projet)</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{Number((system.cpu as Record<string, unknown>).usage).toFixed(1)} %</p>
              </div>
            )}
            {appStats?.users != null && typeof appStats.users === 'object' && (appStats.users as Record<string, unknown>).total != null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">Utilisateurs total</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{(appStats.users as Record<string, unknown>).total as number}</p>
              </div>
            )}
            {appStats?.applications != null && typeof appStats.applications === 'object' && (appStats.applications as Record<string, unknown>).total != null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">Candidatures total</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{(appStats.applications as Record<string, unknown>).total as number}</p>
              </div>
            )}
          </div>
        )}
        {!loading && !metrics && !appStats && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
            Aucune donnée de performances applicatives disponible. Vérifiez que le dashboard et les statistiques sont accessibles.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

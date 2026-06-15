"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  TimeRangeSelector,
  ChartPeriodCaption,
  useAnalyticsAutoRefresh,
  ymdLocal,
  type TimeRangeOption,
} from "@/components/analytics";
import {
  getPeriodMs,
  formatRangeLabel,
  formatCustomRangeLabel,
  localCalendarDayBounds,
} from "@/components/analytics/timeRangeUtils";
import { centralMetricsService } from "@/lib/services/centralMetricsService";
import { statisticsService } from "@/lib/services/statisticsService";
import { AnalyticsPageShell } from "../ApplicationSubNav";

export default function ApplicationPerformancePage() {
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [appStats, setAppStats] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRangeOption>("24h");
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

  useEffect(() => {
    let cancelled = false;
    const silent = silentNextFetch.current;
    silentNextFetch.current = false;
    (async () => {
      if (!silent) setLoading(true);
      try {
        const [metricsRes, statsRes] = await Promise.all([
          centralMetricsService.fetchMetrics().catch(() => null),
          statisticsService.getCurrentStatistics().catch(() => null),
        ]);
        if (!cancelled) {
          setMetrics(
            metricsRes
              ? (metricsRes as unknown as Record<string, unknown>)
              : null,
          );
          setAppStats(
            statsRes ? (statsRes as unknown as Record<string, unknown>) : null,
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [softTick]);

  const bumpWindowEndToNow = useCallback(() => {
    silentNextFetch.current = true;
    setWindowEnd(new Date());
    setSoftTick((t) => t + 1);
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

  const rangeLabel = useCustomRange
    ? formatCustomRangeLabel(customStart, customEnd)
    : formatRangeLabel(rangeStart, rangeEnd, timeRange);

  const goPrev = useCallback(() => {
    if (useCustomRange) {
      const { start: rs, end: re } = localCalendarDayBounds(
        customStart,
        customEnd,
      );
      const days = Math.max(
        1,
        Math.ceil((re.getTime() - rs.getTime()) / (24 * 60 * 60 * 1000)),
      );
      const ns = new Date(rs);
      ns.setDate(ns.getDate() - days);
      const ne = new Date(re);
      ne.setDate(ne.getDate() - days);
      setCustomStart(ymdLocal(ns));
      setCustomEnd(ymdLocal(ne));
      return;
    }
    setFollowLive(false);
    if (timeRange === "today") {
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
      const { start: rs, end: re } = localCalendarDayBounds(
        customStart,
        customEnd,
      );
      const days = Math.max(
        1,
        Math.ceil((re.getTime() - rs.getTime()) / (24 * 60 * 60 * 1000)),
      );
      const ns = new Date(rs);
      ns.setDate(ns.getDate() + days);
      const ne = new Date(re);
      ne.setDate(ne.getDate() + days);
      const today = ymdLocal();
      if (ymdLocal(ne) > today) {
        setCustomEnd(today);
        setCustomStart(
          ymdLocal(new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
        );
      } else {
        setCustomStart(ymdLocal(ns));
        setCustomEnd(ymdLocal(ne));
      }
      return;
    }
    setFollowLive(false);
    const now = new Date();
    if (timeRange === "today") {
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
    if (useCustomRange) return customEnd < ymdLocal();
    const now = new Date();
    if (timeRange === "today")
      return (
        windowEnd.toISOString().slice(0, 10) < now.toISOString().slice(0, 10)
      );
    return windowEnd.getTime() < now.getTime();
  }, [useCustomRange, customEnd, timeRange, windowEnd]);

  const handlePeriodNow = useCallback(() => {
    setUseCustomRange(false);
    setFollowLive(true);
    setWindowEnd(new Date());
    setSoftTick((t) => t + 1);
  }, []);

  const perf = metrics?.performance as Record<string, unknown> | undefined;
  const system = metrics?.system as Record<string, unknown> | undefined;
  const health = metrics?.health as Record<string, unknown> | undefined;

  return (
    <AnalyticsPageShell
      title="Application — performances live"
      description={
        <p>
          Indicateurs issus de l&apos;application utilisateur et des services
          (temps de réponse, disponibilité, statistiques).
        </p>
      }
      actions={
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
      }
      backHref="/b4ck0ff1ce/analytics"
      showApplicationSubNav
    >
      <ChartPeriodCaption label={rangeLabel} />
      {loading && !metrics && !appStats ? (
        <div className="flex items-center justify-center min-h-[200px] sm:h-64 text-gray-500 dark:text-gray-400">
          Chargement…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {perf?.averageResponseTime != null && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Temps de réponse moyen
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {Number(perf.averageResponseTime).toFixed(0)} ms
              </p>
            </div>
          )}
          {health?.availability_percent != null && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Disponibilité
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {Number(health.availability_percent).toFixed(1)} %
              </p>
            </div>
          )}
          {system?.cpu != null &&
            typeof system.cpu === "object" &&
            (system.cpu as Record<string, unknown>).usage != null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  CPU (système projet)
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Number(
                    (system.cpu as Record<string, unknown>).usage,
                  ).toFixed(1)}{" "}
                  %
                </p>
              </div>
            )}
          {appStats?.users != null &&
            typeof appStats.users === "object" &&
            (appStats.users as Record<string, unknown>).total != null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Utilisateurs total
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(appStats.users as Record<string, unknown>).total as number}
                </p>
              </div>
            )}
          {appStats?.applications != null &&
            typeof appStats.applications === "object" &&
            (appStats.applications as Record<string, unknown>).total !=
              null && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Candidatures total
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {
                    (appStats.applications as Record<string, unknown>)
                      .total as number
                  }
                </p>
              </div>
            )}
        </div>
      )}
      {!loading && !metrics && !appStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
          Aucune donnée de performances applicatives disponible. Vérifiez que le
          dashboard et les statistiques sont accessibles.
        </div>
      )}
    </AnalyticsPageShell>
  );
}

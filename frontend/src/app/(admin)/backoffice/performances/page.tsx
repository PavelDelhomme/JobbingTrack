"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AdminLayout } from "@/components/features";
import {
  TimeRangeSelector,
  useAnalyticsAutoRefresh,
  usePersistedSharedAnalyticsRange,
  injectMetricTimeGaps,
  ymdLocal,
  type TimeRangeOption,
} from "@/components/analytics";
import {
  getPeriodMs,
  formatRangeLabel,
  formatCustomRangeLabel,
  localCalendarDayBounds,
} from "@/components/analytics/timeRangeUtils";
import {
  formatLocalChartAxisTick,
  formatLocalDateTime,
  metricRowToTimeMs,
  metricTimestampToMs,
  normalizeMetricTimestampToIso,
} from "@/lib/utils/date";
import {
  buildSystemNetworkMbRateRows,
  systemNetworkRateAxisMax,
  type SystemNetworkMbRow,
  type SystemPercentSeriesRow,
} from "@/lib/charts/systemMetricsSeriesModel";
import { analyticsService } from "@/lib/api/analytics.service";
import { pickSystemResponseTimeAvgMsFromRow } from "@/lib/metrics/pickSystemResponseTimeFromRow";
import { centralMetricsService } from "@/lib/services/centralMetricsService";
import type { MetricsData } from "@/lib/interfaces";

/** Recharts en chunks séparés (évite de charger tout le bundle sur /login). */
const chartHeavyLoading = () => (
  <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-400">
    Chargement du graphique…
  </div>
);

const SystemCpuMemoryAreaCharts = dynamic(
  () =>
    import("@/components/charts/SystemCpuMemoryAreaCharts").then(
      (m) => m.SystemCpuMemoryAreaCharts,
    ),
  { ssr: false, loading: chartHeavyLoading },
);

const SystemCpuNetworkCorrelationChart = dynamic(
  () =>
    import("@/components/charts/performancesHeavyCharts").then(
      (m) => m.SystemCpuNetworkCorrelationChart,
    ),
  { ssr: false, loading: chartHeavyLoading },
);

const PerformancesResponseTimeLineChart = dynamic(
  () =>
    import("@/components/charts/performancesHeavyCharts").then(
      (m) => m.PerformancesResponseTimeLineChart,
    ),
  { ssr: false, loading: chartHeavyLoading },
);

const PerformancesNetworkCumulativeLineChart = dynamic(
  () =>
    import("@/components/charts/performancesHeavyCharts").then(
      (m) => m.PerformancesNetworkCumulativeLineChart,
    ),
  { ssr: false, loading: chartHeavyLoading },
);

const PerformancesNetworkRateLineChart = dynamic(
  () =>
    import("@/components/charts/performancesHeavyCharts").then(
      (m) => m.PerformancesNetworkRateLineChart,
    ),
  { ssr: false, loading: chartHeavyLoading },
);

const PerformancesLiveEndpointsBarChart = dynamic(
  () =>
    import("@/components/charts/performancesHeavyCharts").then(
      (m) => m.PerformancesLiveEndpointsBarChart,
    ),
  { ssr: false, loading: chartHeavyLoading },
);

interface SystemMetric {
  timestamp: string;
  /** Epoch ms (champ API `timestampMs` ou dérivé) pour l’axe / le tri. */
  timeMs?: number;
  cpuUsagePercent?: number;
  memoryUsagePercent?: number;
  /** Temps de réponse agrégé (ms) — persistance `avg_response_time_ms` / `responseTimeAvg`. */
  responseTimeAvgMs?: number | null;
  networkRxBytes?: number | null;
  networkTxBytes?: number | null;
}

function compressData<T extends { timestamp: string }>(
  data: T[],
  targetMax: number,
  valueKeys: (keyof T)[],
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
        .map((s) => (s as Record<string, unknown>)[key] as number | undefined)
        .filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
      if (nums.length) avg[key] = nums.reduce((a, b) => a + b, 0) / nums.length;
    });
    out.push({ ...mid, ...avg } as T);
  }
  return out;
}

/** Écart entre deux points au-delà duquel on insère une coupure (collecte arrêtée / trou). */
const METRIC_GAP_MS = 15 * 60 * 1000;

/**
 * Performances système (CPU, mémoire, réseau) — entrée principale **Tableau de bord → Performances**.
 * Ancienne URL `/b4ck0ff1ce/analytics/performances` redirige ici (lot A, socle graphes).
 */
export default function PerformancesPage() {
  const [rawData, setRawData] = useState<SystemMetric[]>([]);
  /** Dernier snapshot `GET /api/v1/metrics` (sondes par service / endpoints). */
  const [liveMetrics, setLiveMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRangeOption>("24h");
  const [windowEnd, setWindowEnd] = useState<Date>(() => new Date());
  /** Si vrai et préréglage, la fenêtre glissante suit « maintenant » (actualisation auto). */
  const [followLive, setFollowLive] = useState(true);
  const [softTick, setSoftTick] = useState(0);
  const silentNextFetch = useRef(false);
  const [locationHash, setLocationHash] = useState("");
  const prevLocationHashRef = useRef("");
  const scrolledLatenceAnchorRef = useRef(false);
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

  useEffect(() => {
    const read = () =>
      setLocationHash(
        typeof window !== "undefined" ? window.location.hash : "",
      );
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  useEffect(() => {
    if (
      locationHash === "#latence" &&
      prevLocationHashRef.current !== "#latence"
    ) {
      scrolledLatenceAnchorRef.current = false;
    }
    prevLocationHashRef.current = locationHash;
  }, [locationHash]);

  const getParams = useCallback(() => {
    if (useCustomRange) {
      const { start, end } = localCalendarDayBounds(customStart, customEnd);
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

  const fetchData = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        const { startDate, endDate, limit } = getParams();
        const [data, live] = await Promise.all([
          analyticsService.getSystemMetricsHistory({
            startDate,
            endDate,
            limit,
            offset: 0,
          }),
          centralMetricsService.getAggregatorMetrics(),
        ]);
        setLiveMetrics(live);
        const sorted = (data || [])
          .map((d: Record<string, unknown>) => {
            const rawTs =
              typeof d.timestamp === "number"
                ? d.timestamp
                : typeof d.timestamp === "string"
                  ? d.timestamp
                  : ((d.timestamp as Date)?.toISOString?.() ?? "");
            const timestamp = normalizeMetricTimestampToIso(rawTs);
            const timeMs = metricRowToTimeMs(d, timestamp);
            return {
              timestamp,
              ...(timeMs != null ? { timeMs } : {}),
              cpuUsagePercent:
                d.cpuUsagePercent != null || d.cpu_usage_percent != null
                  ? Number(d.cpuUsagePercent ?? d.cpu_usage_percent)
                  : undefined,
              memoryUsagePercent:
                d.memoryUsagePercent != null || d.memory_usage_percent != null
                  ? Number(d.memoryUsagePercent ?? d.memory_usage_percent)
                  : undefined,
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
              responseTimeAvgMs: pickSystemResponseTimeAvgMsFromRow(d),
            };
          })
          .filter((d: { timestamp: string }) => d.timestamp)
          .sort(
            (a: SystemMetric, b: SystemMetric) =>
              (a.timeMs ?? metricTimestampToMs(a.timestamp) ?? 0) -
              (b.timeMs ?? metricTimestampToMs(b.timestamp) ?? 0),
          );
        const withGaps = injectMetricTimeGaps(sorted, METRIC_GAP_MS, [
          "cpuUsagePercent",
          "memoryUsagePercent",
          "responseTimeAvgMs",
          "networkRxBytes",
          "networkTxBytes",
        ]);
        setRawData(withGaps);
      } catch (e) {
        console.error(e);
        if (!silent) {
          /* conserver la dernière série affichée */
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [getParams],
  );

  useEffect(() => {
    const silent = silentNextFetch.current;
    silentNextFetch.current = false;
    void fetchData({ silent });
  }, [fetchData, softTick]);

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

  const { rangeStart, rangeEnd } = getParams();
  const requestedDomainMin = rangeStart.getTime();
  const requestedDomainMax = rangeEnd.getTime();
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
      const nextEnd = new Date(windowEnd.getTime() - period);
      setWindowEnd(nextEnd);
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
    if (useCustomRange) {
      return customEnd < ymdLocal();
    }
    const now = new Date();
    if (timeRange === "today")
      return (
        windowEnd.toISOString().slice(0, 10) < now.toISOString().slice(0, 10)
      );
    return windowEnd.getTime() < now.getTime();
  }, [useCustomRange, customEnd, timeRange, windowEnd]);

  const targetPoints = 200;
  const chartData = useMemo(() => {
    if (rawData.length === 0) return [];
    const keys: (keyof SystemMetric)[] = [
      "cpuUsagePercent",
      "memoryUsagePercent",
      "responseTimeAvgMs",
      "networkRxBytes",
      "networkTxBytes",
    ];
    const compressed = compressData(rawData, targetPoints, keys);
    return compressed.map((d) => {
      const timeMs =
        typeof d.timeMs === "number" && Number.isFinite(d.timeMs)
          ? d.timeMs
          : (metricTimestampToMs(d.timestamp) ?? NaN);
      const rxMb =
        d.networkRxBytes != null ? d.networkRxBytes / (1024 * 1024) : null;
      const txMb =
        d.networkTxBytes != null ? d.networkTxBytes / (1024 * 1024) : null;
      return {
        timeMs,
        timestamp: d.timestamp,
        time: formatLocalChartAxisTick(timeMs, { withDate: false }),
        datetime: formatLocalDateTime(d.timestamp),
        cpu:
          d.cpuUsagePercent != null && !Number.isNaN(d.cpuUsagePercent)
            ? Number(d.cpuUsagePercent)
            : null,
        memory:
          d.memoryUsagePercent != null && !Number.isNaN(d.memoryUsagePercent)
            ? Number(d.memoryUsagePercent)
            : null,
        networkRxMb: rxMb != null ? Math.round(rxMb * 100) / 100 : null,
        networkTxMb: txMb != null ? Math.round(txMb * 100) / 100 : null,
        responseTimeMs:
          d.responseTimeAvgMs != null &&
          typeof d.responseTimeAvgMs === "number" &&
          !Number.isNaN(d.responseTimeAvgMs)
            ? Number(d.responseTimeAvgMs)
            : null,
      } as SystemPercentSeriesRow & {
        time: string;
        datetime: string;
        networkRxMb: number | null;
        networkTxMb: number | null;
        responseTimeMs: number | null;
      };
    });
  }, [rawData]);
  const dataTimeBounds = useMemo(() => {
    const points = chartData
      .filter((d) => Number.isFinite(d.timeMs))
      .filter(
        (d) =>
          d.cpu != null ||
          d.memory != null ||
          d.networkRxMb != null ||
          d.networkTxMb != null ||
          d.responseTimeMs != null,
      );
    if (points.length === 0) return null;
    const first = points[0]?.timeMs;
    const last = points[points.length - 1]?.timeMs;
    if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
    return { min: Number(first), max: Number(last) };
  }, [chartData]);
  const chartDomain = useMemo(() => {
    if (!dataTimeBounds) {
      return {
        min: requestedDomainMin,
        max: requestedDomainMax,
        autoFitted: false,
      };
    }
    const requestedSpan = Math.max(1, requestedDomainMax - requestedDomainMin);
    const dataSpan = Math.max(1, dataTimeBounds.max - dataTimeBounds.min);
    const coverageRatio = dataSpan / requestedSpan;
    // Si la période demandée est largement vide (service démarré récemment), on cadre sur la vraie plage.
    if (coverageRatio < 0.45) {
      return {
        min: dataTimeBounds.min,
        max: dataTimeBounds.max,
        autoFitted: true,
      };
    }
    return {
      min: requestedDomainMin,
      max: requestedDomainMax,
      autoFitted: false,
    };
  }, [dataTimeBounds, requestedDomainMin, requestedDomainMax]);
  const chartXDomainMin = chartDomain.min;
  const chartXDomainMax = chartDomain.max;

  const perfAxisShowDate =
    chartXDomainMax - chartXDomainMin > 24 * 60 * 60 * 1000;

  const networkChartRows = useMemo(
    () => buildSystemNetworkMbRateRows(chartData as SystemNetworkMbRow[]),
    [chartData],
  );
  const networkRateYMax = useMemo(
    () => systemNetworkRateAxisMax(networkChartRows),
    [networkChartRows],
  );

  const showCpuNetworkCorrelation = useMemo(() => {
    const hasNet = chartData.some(
      (d) => d.networkRxMb != null || d.networkTxMb != null,
    );
    const hasCpu = chartData.some(
      (d) => d.cpu != null && Number.isFinite(Number(d.cpu)),
    );
    return hasNet && hasCpu;
  }, [chartData]);

  const showResponseTime = useMemo(
    () =>
      chartData.some(
        (d) =>
          d.responseTimeMs != null && Number.isFinite(Number(d.responseTimeMs)),
      ),
    [chartData],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (locationHash !== "#latence") {
      scrolledLatenceAnchorRef.current = false;
      return;
    }
    if (loading) return;
    if (scrolledLatenceAnchorRef.current) return;
    const el = document.getElementById("latence");
    if (!el) return;
    scrolledLatenceAnchorRef.current = true;
    requestAnimationFrame(() =>
      el.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }, [loading, chartData.length, showResponseTime, locationHash]);

  const liveEndpointBars = useMemo(() => {
    const parseMs = (v: unknown): number | null => {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
      if (typeof v === "string") {
        const n = parseFloat(v.replace(/[^\d.]/g, ""));
        return Number.isFinite(n) && n > 0 ? n : null;
      }
      return null;
    };
    const list = liveMetrics?.servicesList ?? [];
    return list
      .map((s) => {
        const ms =
          parseMs(s.responseTimeMs) ??
          parseMs(s.responseTime) ??
          parseMs(s.health?.responseTime);
        const name = (s.displayName || s.name || "service").slice(0, 48);
        return { name, ms, status: s.status ?? s.health?.status };
      })
      .filter((r) => r.ms != null)
      .map((r) => ({ ...r, ms: r.ms as number }))
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 20);
  }, [liveMetrics]);

  const liveEndpointNoMeasure = useMemo(() => {
    const parseMs = (v: unknown): number | null => {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
      if (typeof v === "string") {
        const n = parseFloat(v.replace(/[^\d.]/g, ""));
        return Number.isFinite(n) && n > 0 ? n : null;
      }
      return null;
    };
    const list = liveMetrics?.servicesList ?? [];
    return list
      .map((s) => {
        const ms =
          parseMs(s.responseTimeMs) ??
          parseMs(s.responseTime) ??
          parseMs(s.health?.responseTime);
        const name = (s.displayName || s.name || "service").slice(0, 48);
        return { name, ms };
      })
      .filter((r) => r.ms == null)
      .map((r) => r.name)
      .slice(0, 30);
  }, [liveMetrics]);

  const liveOverviewMs = useMemo(() => {
    const m = liveMetrics?.monitoringC?.avg_response_time_ms;
    if (typeof m === "number" && Number.isFinite(m)) return m;
    const r = liveMetrics?.responseTime?.average_ms;
    if (r != null) {
      const n = Number(r);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }, [liveMetrics]);

  const handlePeriodNow = useCallback(() => {
    setUseCustomRange(false);
    setFollowLive(true);
    setWindowEnd(new Date());
  }, []);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 w-full">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link
            href="/b4ck0ff1ce"
            className="inline-flex items-center gap-2 font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <span aria-hidden>←</span>
            Tableau de bord
          </Link>
          <span className="text-gray-300 dark:text-gray-600" aria-hidden>
            |
          </span>
          <Link
            href="/b4ck0ff1ce/analytics"
            className="inline-flex items-center gap-2 font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            Analytics (appli &amp; utilisateurs)
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Performances
            </h1>
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
              showNavigationHint={false}
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
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                CPU et mémoire (%)
              </h2>
              <div className="w-full min-h-[240px] sm:min-h-[400px]">
                <SystemCpuMemoryAreaCharts
                  chartData={chartData}
                  xDomainMin={chartXDomainMin}
                  xDomainMax={chartXDomainMax}
                  axisShowDate={perfAxisShowDate}
                  chartHeight={220}
                />
              </div>
            </div>

            {showResponseTime ? (
              <div
                id="latence"
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0 scroll-mt-24"
              >
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Temps de réponse agrégé (ms)
                </h2>
                <div className="w-full min-h-[220px] sm:min-h-[280px]">
                  <PerformancesResponseTimeLineChart
                    chartData={chartData}
                    xDomainMin={chartXDomainMin}
                    xDomainMax={chartXDomainMax}
                    axisShowDate={perfAxisShowDate}
                  />
                </div>
              </div>
            ) : (
              <div
                id="latence"
                className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-400 scroll-mt-24"
              >
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  Temps de réponse
                </p>
                <p className="mt-1 text-xs">
                  Aucune série{" "}
                  <code className="text-[11px]">responseTimeAvg</code> /{" "}
                  <code className="text-[11px]">avg_response_time_ms</code> sur
                  cette période. Vérifier la collecte côté metrics-aggregator /
                  table persistance ; la vue Statistiques globale peut déjà
                  exposer un agrégat différent.
                </p>
              </div>
            )}

            {chartData.some(
              (d) => d.networkRxMb != null || d.networkTxMb != null,
            ) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0 space-y-8">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Réseau — cumul (Mo)
                  </h2>
                  <div className="w-full min-h-[240px] sm:min-h-[280px]">
                    <PerformancesNetworkCumulativeLineChart
                      chartData={chartData}
                      xDomainMin={chartXDomainMin}
                      xDomainMax={chartXDomainMax}
                      axisShowDate={perfAxisShowDate}
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Réseau — débit estimé (Mo/min)
                  </h2>
                  <div className="w-full min-h-[220px] sm:min-h-[280px]">
                    <PerformancesNetworkRateLineChart
                      networkChartRows={networkChartRows}
                      xDomainMin={chartXDomainMin}
                      xDomainMax={chartXDomainMax}
                      axisShowDate={perfAxisShowDate}
                      networkRateYMax={networkRateYMax}
                    />
                  </div>
                </div>

                {showCpuNetworkCorrelation ? (
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Corrélation CPU (%) vs débit réseau (Mo/min)
                    </h2>
                    <SystemCpuNetworkCorrelationChart
                      rows={networkChartRows}
                      xDomainMin={chartXDomainMin}
                      xDomainMax={chartXDomainMax}
                      axisShowDate={perfAxisShowDate}
                      rateMax={networkRateYMax}
                      height={320}
                    />
                  </div>
                ) : null}
              </div>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <span className="block">
                {rawData.length} points bruts → {chartData.length} points
                affichés (compression pour lisibilité).
              </span>
            </p>
          </>
        )}

        {!loading && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800 sm:p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Temps de réponse des endpoints (instantané)
            </h2>
            {liveOverviewMs != null && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Moyenne monitoring-agent-rs / agrégat :{" "}
                <strong className="font-semibold">
                  {liveOverviewMs.toFixed(1)} ms
                </strong>
              </p>
            )}
            {liveEndpointBars.length === 0 ? (
              <p className="mt-3 text-sm text-amber-800 dark:text-amber-200/90">
                Aucune mesure par service exploitable (agrégateur injoignable,
                auth, ou sondes sans temps de réponse).
              </p>
            ) : (
              <div className="mt-4 w-full min-h-[240px]">
                <PerformancesLiveEndpointsBarChart bars={liveEndpointBars} />
              </div>
            )}
            {liveEndpointNoMeasure.length > 0 && (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200/90">
                <span className="font-medium">
                  Services sans mesure instantanée :
                </span>{" "}
                {liveEndpointNoMeasure.join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

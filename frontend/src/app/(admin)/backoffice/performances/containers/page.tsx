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
import { PerformancesSubNav } from "../PerformancesSubNav";
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
import { chartXDomainFromDataRange } from "@/lib/charts/chartTimeDomain";
import { analyticsService } from "@/lib/api/analytics.service";

const AnalyticsContainersChartsBundle = dynamic(
  () =>
    import("@/components/charts/AnalyticsContainersChartsBundle").then(
      (m) => m.AnalyticsContainersChartsBundle,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-400">
        Chargement des graphiques…
      </div>
    ),
  },
);

const ALL_CONTAINERS_VALUE = "__all__";
const METRIC_GAP_MS = 15 * 60 * 1000;
/** Évite de saturer l’agrégateur / le navigateur quand « Tous les conteneurs » lance N historiques en parallèle. */
const METRICS_HISTORY_FETCH_CONCURRENCY = 5;

async function promisePool<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    out.push(...(await Promise.all(chunk.map(mapper))));
  }
  return out;
}

interface ContainerInfo {
  name: string;
  service_type?: string;
  cpu_percent?: number;
  memory_percent?: number;
  health_status?: string;
  [key: string]: unknown;
}

interface ContainerMetric {
  timestamp: string;
  timeMs?: number;
  cpuUsagePercent?: number | null;
  memoryUsagePercent?: number | null;
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
        .map(
          (s) =>
            (s as Record<string, unknown>)[key] as number | null | undefined,
        )
        .filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
      if (nums.length) avg[key] = nums.reduce((a, b) => a + b, 0) / nums.length;
    });
    out.push({ ...mid, ...avg } as T);
  }
  return out;
}

export default function ContainersAnalyticsPage() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const [rawMetrics, setRawMetrics] = useState<ContainerMetric[]>([]);
  const [rawMetricsByContainer, setRawMetricsByContainer] = useState<
    Record<string, ContainerMetric[]>
  >({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const list = await analyticsService.getContainersList();
        if (!cancelled) {
          setContainers(list);
          if (list.length > 0 && selectedContainer === "") {
            setSelectedContainer(ALL_CONTAINERS_VALUE);
          }
        }
      } catch (e) {
        if (!cancelled) setContainers([]);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedContainer) {
      setRawMetrics([]);
      setRawMetricsByContainer({});
      return;
    }
    const silent = silentNextFetch.current;
    silentNextFetch.current = false;

    const { startDate, endDate, limit } = getParams();
    const opts = { startDate, endDate, limit, offset: 0 };

    const normalize = (data: Record<string, unknown>[]) =>
      (data || [])
        .map((d) => {
          const rawTs =
            typeof d.timestamp === "string"
              ? d.timestamp
              : ((d.timestamp as Date)?.toISOString?.() ?? "");
          const timestamp = normalizeMetricTimestampToIso(rawTs);
          const timeMs = metricRowToTimeMs(d, timestamp);
          return {
            timestamp,
            ...(timeMs != null ? { timeMs } : {}),
            cpuUsagePercent:
              d.cpuUsagePercent != null
                ? Number(d.cpuUsagePercent)
                : d.cpu_usage_percent != null
                  ? Number(d.cpu_usage_percent)
                  : null,
            memoryUsagePercent:
              d.memoryUsagePercent != null
                ? Number(d.memoryUsagePercent)
                : d.memory_usage_percent != null
                  ? Number(d.memory_usage_percent)
                  : null,
          };
        })
        .filter((d) => d.timestamp)
        .sort(
          (a, b) =>
            (a.timeMs ?? metricTimestampToMs(a.timestamp) ?? 0) -
            (b.timeMs ?? metricTimestampToMs(b.timestamp) ?? 0),
        );

    const withGaps = (rows: ContainerMetric[]) =>
      injectMetricTimeGaps(rows, METRIC_GAP_MS, [
        "cpuUsagePercent",
        "memoryUsagePercent",
      ]);

    if (selectedContainer === ALL_CONTAINERS_VALUE) {
      if (containers.length === 0) {
        setRawMetricsByContainer({});
        setLoadingMetrics(false);
        return;
      }
      let cancelled = false;
      if (!silent) setLoadingMetrics(true);
      promisePool(containers, METRICS_HISTORY_FETCH_CONCURRENCY, (c) =>
        analyticsService
          .getContainerMetricsHistory(c.name, opts)
          .then((data: Record<string, unknown>[]) => ({
            name: c.name,
            data: withGaps(normalize(data)),
          })),
      )
        .then((results) => {
          if (cancelled) return;
          const byName: Record<string, ContainerMetric[]> = {};
          results.forEach((r) => {
            byName[r.name] = r.data;
          });
          setRawMetricsByContainer(byName);
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          if (!cancelled && !silent) setLoadingMetrics(false);
        });
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    if (!silent) setLoadingMetrics(true);
    setRawMetricsByContainer({});
    analyticsService
      .getContainerMetricsHistory(selectedContainer, opts)
      .then((data: Record<string, unknown>[]) => {
        if (cancelled) return;
        setRawMetrics(withGaps(normalize(data)));
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        if (!cancelled && !silent) setLoadingMetrics(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedContainer, getParams, containers, softTick]);

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
  const chartXDomainMin = rangeStart.getTime();
  const chartXDomainMax = rangeEnd.getTime();
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

  const chartData = useMemo(() => {
    if (selectedContainer !== ALL_CONTAINERS_VALUE) {
      if (rawMetrics.length === 0) return [];
      const keys: (keyof ContainerMetric)[] = [
        "cpuUsagePercent",
        "memoryUsagePercent",
      ];
      const compressed = compressData(rawMetrics, 200, keys);
      return compressed.map((d) => {
        const timeMs =
          typeof d.timeMs === "number" && Number.isFinite(d.timeMs)
            ? d.timeMs
            : (metricTimestampToMs(d.timestamp) ?? NaN);
        return {
          timeMs,
          timestamp: d.timestamp,
          time: formatLocalChartAxisTick(timeMs, { withDate: false }),
          datetime: formatLocalDateTime(d.timestamp),
          cpu: d.cpuUsagePercent != null ? Number(d.cpuUsagePercent) : null,
          memory:
            d.memoryUsagePercent != null ? Number(d.memoryUsagePercent) : null,
        };
      });
    }
    const names = Object.keys(rawMetricsByContainer).filter(
      (n) => rawMetricsByContainer[n].length > 0,
    );
    if (names.length === 0) return [];
    const toKey = (n: string) =>
      n.replace(/^jobbingtrack-/, "").replace(/-/g, "_");
    /** Les séries par conteneur n’ont pas le même horodatage exact : on aligne au point le plus proche. */
    const MAX_ALIGN_MS = 120_000;
    const rowTimeMs = (m: ContainerMetric): number | null => {
      if (typeof m.timeMs === "number" && Number.isFinite(m.timeMs))
        return m.timeMs;
      return metricTimestampToMs(m.timestamp);
    };
    const getNearestVal = (
      arr: ContainerMetric[],
      targetMs: number,
      key: "cpuUsagePercent" | "memoryUsagePercent",
    ): number | null => {
      let best: ContainerMetric | null = null;
      let bestD = Infinity;
      for (const x of arr) {
        const ms = rowTimeMs(x);
        if (ms == null || !Number.isFinite(ms)) continue;
        const d = Math.abs(ms - targetMs);
        if (d <= MAX_ALIGN_MS && d < bestD) {
          bestD = d;
          best = x;
        }
      }
      if (!best || best[key] == null) return null;
      return Number(best[key]);
    };
    const allMs = new Set<number>();
    names.forEach((n) => {
      rawMetricsByContainer[n].forEach((m) => {
        const ms = rowTimeMs(m);
        if (ms != null && Number.isFinite(ms)) allMs.add(ms);
      });
    });
    const sortedMs = Array.from(allMs).sort((a, b) => a - b);
    const target = 200;
    const step =
      sortedMs.length <= target ? 1 : Math.ceil(sortedMs.length / target);
    const sampledMs = sortedMs.filter((_, i) => i % step === 0);
    return sampledMs.map((targetMs) => {
      const iso = new Date(targetMs).toISOString();
      const point: Record<string, string | number | null> = {
        timeMs: targetMs,
        timestamp: iso,
        time: formatLocalChartAxisTick(targetMs, { withDate: false }),
        datetime: formatLocalDateTime(iso),
      };
      names.forEach((n) => {
        const k = toKey(n);
        point[`cpu_${k}`] = getNearestVal(
          rawMetricsByContainer[n],
          targetMs,
          "cpuUsagePercent",
        );
        point[`memory_${k}`] = getNearestVal(
          rawMetricsByContainer[n],
          targetMs,
          "memoryUsagePercent",
        );
      });
      return point;
    });
  }, [rawMetrics, rawMetricsByContainer, selectedContainer]);

  const [chartXDomainEffMin, chartXDomainEffMax] = useMemo(
    () =>
      chartXDomainFromDataRange(
        chartXDomainMin,
        chartXDomainMax,
        chartData.map((d) => Number(d.timeMs)),
      ),
    [chartData, chartXDomainMin, chartXDomainMax],
  );

  const containerAxisShowDate =
    chartXDomainEffMax - chartXDomainEffMin > 24 * 60 * 60 * 1000;

  const isAllContainers = selectedContainer === ALL_CONTAINERS_VALUE;
  const containerNamesForChart = isAllContainers
    ? Object.keys(rawMetricsByContainer)
        .filter((n) => rawMetricsByContainer[n].length > 0)
        .map((n) => n.replace(/^jobbingtrack-/, "").replace(/-/g, "_"))
    : [];

  const handlePeriodNow = useCallback(() => {
    setUseCustomRange(false);
    setFollowLive(true);
    setWindowEnd(new Date());
  }, []);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 w-full">
        <Link
          href="/b4ck0ff1ce/performances"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <span aria-hidden>←</span>
          Retour à Performances
        </Link>
        <PerformancesSubNav />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Performances — conteneurs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            Métriques par conteneur (CPU, mémoire) dans le temps.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
          <label className="flex items-center gap-2 min-w-0">
            <span className="text-gray-700 dark:text-gray-300 text-sm shrink-0">
              Conteneur
            </span>
            <select
              value={selectedContainer}
              onChange={(e) => setSelectedContainer(e.target.value)}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 min-w-0 w-full sm:min-w-[240px] sm:w-auto text-sm"
              disabled={loadingList}
            >
              {loadingList ? (
                <option value="">Chargement…</option>
              ) : containers.length === 0 ? (
                <option value="">Aucun conteneur</option>
              ) : (
                <>
                  <option value={ALL_CONTAINERS_VALUE}>
                    Tous les conteneurs (combiné)
                  </option>
                  {containers.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                      {c.health_status ? ` (${c.health_status})` : ""}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
          <div className="flex flex-col gap-3 w-full sm:w-auto">
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

        {!selectedContainer && !loadingList ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            Aucun conteneur disponible. Vérifiez que le metrics-aggregator et
            Docker exposent les conteneurs JobbingTrack.
          </div>
        ) : loadingMetrics &&
          (isAllContainers
            ? Object.keys(rawMetricsByContainer).length === 0
            : rawMetrics.length === 0) &&
          chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            Chargement des métriques…
          </div>
        ) : chartData.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            Aucune métrique persistée pour{" "}
            {isAllContainers ? "ces conteneurs" : "ce conteneur"} sur cette
            période.
          </div>
        ) : isAllContainers && containerNamesForChart.length > 0 ? (
          <AnalyticsContainersChartsBundle
            mode="multi"
            rangeLabel={rangeLabel}
            chartXDomainMin={chartXDomainEffMin}
            chartXDomainMax={chartXDomainEffMax}
            containerAxisShowDate={containerAxisShowDate}
            chartData={chartData}
            containerNamesForChart={containerNamesForChart}
            selectedContainerLabel=""
            rawMetricsLength={rawMetrics.length}
          />
        ) : (
          <AnalyticsContainersChartsBundle
            mode="single"
            rangeLabel={rangeLabel}
            chartXDomainMin={chartXDomainEffMin}
            chartXDomainMax={chartXDomainEffMax}
            containerAxisShowDate={containerAxisShowDate}
            chartData={chartData}
            containerNamesForChart={[]}
            selectedContainerLabel={selectedContainer.replace(
              /^jobbingtrack-/,
              "",
            )}
            rawMetricsLength={rawMetrics.length}
          />
        )}
      </div>
    </AdminLayout>
  );
}

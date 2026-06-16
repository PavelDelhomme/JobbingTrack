"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isAxiosError } from "axios";
import {
  TimeRangeSelector,
  beginUserRangeFetch,
  injectMetricTimeGaps,
  isBenignFetchAbort,
  useAnalyticsAutoRefresh,
  usePersistedSharedAnalyticsRange,
  ymdLocal,
  type TimeRangeOption,
} from "@/components/analytics";
import {
  formatCustomRangeLabel,
  formatRangeLabel,
  getPeriodMs,
  localCalendarDayBounds,
} from "@/components/analytics/timeRangeUtils";
import { CpuMemoryServiceLinesChart } from "@/components/charts/CpuMemoryServiceLinesChart";
import { SystemCpuMemoryAreaCharts } from "@/components/charts/SystemCpuMemoryAreaCharts";
import { chartXDomainFromDataRange } from "@/lib/charts/chartTimeDomain";
import { useSyncedChartBrushRange } from "@/lib/charts/useSyncedChartBrushRange";
import type { SystemPercentSeriesRow } from "@/lib/charts/systemMetricsSeriesModel";
import { analyticsService } from "@/lib/api/analytics.service";
import {
  formatLocalChartAxisTick,
  formatLocalDateTime,
  metricRowToTimeMs,
  metricTimestampToMs,
  normalizeMetricTimestampToIso,
} from "@/lib/utils/date";
import {
  PerformanceChartCard,
  PerformanceEmptyState,
  PerformanceHistoryCaption,
  PerformanceLoadingState,
  PerformancePageShell,
} from "@/components/performances";

const METRIC_GAP_MS = 15 * 60 * 1000;
const METRICS_HISTORY_FETCH_CONCURRENCY = 5;
const DEFAULT_SELECTED_SERVICE_COUNT = 6;
const SYSTEM_RENDER_POINTS = 160;
const DETAIL_RENDER_POINTS = 160;
const MANY_SERIES_DETAIL_RENDER_POINTS = 120;
const VIEWS = [
  { id: "overview", label: "Vue globale" },
  { id: "cpu", label: "CPU détaillé" },
  { id: "memory", label: "Mémoire détaillée" },
] as const;

type CpuMemoryView = (typeof VIEWS)[number]["id"];

interface ContainerInfo {
  name: string;
  cpu_percent?: number;
  memory_percent?: number;
  memory_limit_mb?: number;
  memory_usage_mb?: number;
  health_status?: string;
  [key: string]: unknown;
}

interface ContainerMetric {
  timestamp: string;
  timeMs?: number;
  cpuUsagePercent?: number | null;
  memoryUsagePercent?: number | null;
}

interface SystemMetric {
  timestamp: string;
  timeMs?: number;
  cpuUsagePercent?: number | null;
  memoryUsagePercent?: number | null;
}

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

function serviceKey(name: string): string {
  return name.replace(/^jobbingtrack-/, "").replace(/-/g, "_");
}

function normalizeMetrics(data: Record<string, unknown>[]): ContainerMetric[] {
  return (data || [])
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
}

function normalizeSystemMetrics(
  data: Record<string, unknown>[],
): SystemMetric[] {
  return (data || [])
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
}

function sampleRows<T>(rows: T[], targetMax: number): T[] {
  if (rows.length <= targetMax) return rows;
  const step = Math.ceil(rows.length / targetMax);
  return rows.filter((_, index) => index % step === 0);
}

function average(values: Array<number | undefined>): number | null {
  const nums = values.filter(
    (n): n is number => typeof n === "number" && Number.isFinite(n),
  );
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function formatPercent(value: number | null): string {
  return value == null ? "—" : `${value.toFixed(1)} %`;
}

function numberFromKeys(
  source: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value.replace("%", "").trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function containerCpu(container: ContainerInfo): number | undefined {
  return numberFromKeys(container, [
    "cpu_percent",
    "cpuPercent",
    "cpu_usage_percent",
    "cpuUsagePercent",
    "cpu",
  ]);
}

function containerMemory(container: ContainerInfo): number | undefined {
  return numberFromKeys(container, [
    "memory_percent",
    "memoryPercent",
    "memory_usage_percent",
    "memoryUsagePercent",
    "memory",
  ]);
}

export default function CpuMemoryPerformancePage() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [rawSystemMetrics, setRawSystemMetrics] = useState<SystemMetric[]>([]);
  const [rawMetricsByContainer, setRawMetricsByContainer] = useState<
    Record<string, ContainerMetric[]>
  >({});
  const [activeView, setActiveView] = useState<CpuMemoryView>("overview");
  const [selectedServiceKeys, setSelectedServiceKeys] = useState<string[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingSystemMetrics, setLoadingSystemMetrics] = useState(false);
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

  const { rangeHydrated } = usePersistedSharedAnalyticsRange({
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
      setListError(null);
      try {
        const list = await analyticsService.getContainersList();
        if (!cancelled) {
          setContainers(list);
          setSelectedServiceKeys((current) =>
            current.length
              ? current
              : list
                  .slice(0, DEFAULT_SELECTED_SERVICE_COUNT)
                  .map((container) => serviceKey(container.name)),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setContainers([]);
          const status = isAxiosError(e) ? e.response?.status : undefined;
          setListError(
            `Impossible de charger les conteneurs${status ? ` (HTTP ${status})` : ""}. Vérifiez metrics-aggregator, Docker et le proxy HTTPS dev si vous êtes sur :5443.`,
          );
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!rangeHydrated) return;
    const silent = silentNextFetch.current;
    silentNextFetch.current = false;
    const controller = new AbortController();
    const { startDate, endDate, limit } = getParams();
    let cancelled = false;

    beginUserRangeFetch(silent, setRawSystemMetrics, setLoadingSystemMetrics);
    analyticsService
      .getSystemMetricsHistory({
        startDate,
        endDate,
        limit,
        offset: 0,
        signal: controller.signal,
      })
      .then((data: Record<string, unknown>[]) => {
        if (cancelled || controller.signal.aborted) return;
        setRawSystemMetrics(
          injectMetricTimeGaps(normalizeSystemMetrics(data), METRIC_GAP_MS, [
            "cpuUsagePercent",
            "memoryUsagePercent",
          ]),
        );
      })
      .catch((e) => {
        if (!isBenignFetchAbort(e)) console.error(e);
      })
      .finally(() => {
        if (!cancelled && !controller.signal.aborted && !silent) {
          setLoadingSystemMetrics(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [getParams, rangeHydrated, softTick]);

  useEffect(() => {
    if (!rangeHydrated) return;
    if (activeView === "overview") {
      setLoadingMetrics(false);
      return;
    }
    const selectedContainers = containers.filter((container) =>
      selectedServiceKeys.includes(serviceKey(container.name)),
    );
    if (selectedContainers.length === 0) {
      setRawMetricsByContainer({});
      setLoadingMetrics(false);
      return;
    }

    const controller = new AbortController();
    const { startDate, endDate, limit } = getParams();
    const opts = {
      startDate,
      endDate,
      limit,
      offset: 0,
      signal: controller.signal,
    };
    let cancelled = false;

    setLoadingMetrics(true);
    promisePool(
      selectedContainers,
      METRICS_HISTORY_FETCH_CONCURRENCY,
      (container) =>
        analyticsService
          .getContainerMetricsHistory(container.name, opts)
          .then((data: Record<string, unknown>[]) => ({
            name: container.name,
            data: injectMetricTimeGaps(normalizeMetrics(data), METRIC_GAP_MS, [
              "cpuUsagePercent",
              "memoryUsagePercent",
            ]),
          })),
    )
      .then((results) => {
        if (cancelled || controller.signal.aborted) return;
        const byName: Record<string, ContainerMetric[]> = {};
        results.forEach((result) => {
          byName[result.name] = result.data;
        });
        setRawMetricsByContainer(byName);
      })
      .catch((e) => {
        if (!isBenignFetchAbort(e)) console.error(e);
      })
      .finally(() => {
        if (!cancelled && !controller.signal.aborted) {
          setLoadingMetrics(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeView, containers, getParams, rangeHydrated, selectedServiceKeys]);

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

  const systemChartData = useMemo<SystemPercentSeriesRow[]>(
    () =>
      sampleRows(rawSystemMetrics, SYSTEM_RENDER_POINTS).map((metric) => {
        const timeMs =
          typeof metric.timeMs === "number" && Number.isFinite(metric.timeMs)
            ? metric.timeMs
            : (metricTimestampToMs(metric.timestamp) ?? NaN);
        return {
          timeMs,
          timestamp: metric.timestamp,
          cpu:
            metric.cpuUsagePercent != null
              ? Number(metric.cpuUsagePercent)
              : null,
          memory:
            metric.memoryUsagePercent != null
              ? Number(metric.memoryUsagePercent)
              : null,
        };
      }),
    [rawSystemMetrics],
  );

  const liveSystemChartData = useMemo<SystemPercentSeriesRow[]>(() => {
    const cpu = average(containers.map(containerCpu));
    const memory = average(containers.map(containerMemory));
    if (cpu == null && memory == null) return [];
    const now = Date.now();
    const previous = now - 60_000;
    return [previous, now].map((timeMs) => ({
      timeMs,
      timestamp: new Date(timeMs).toISOString(),
      cpu,
      memory,
    }));
  }, [containers]);

  const effectiveSystemChartData =
    systemChartData.length > 0 ? systemChartData : liveSystemChartData;

  const chartData = useMemo(() => {
    const names = Object.keys(rawMetricsByContainer).filter(
      (name) => rawMetricsByContainer[name].length > 0,
    );
    if (names.length === 0) return [];

    const rowTimeMs = (metric: ContainerMetric): number | null => {
      if (typeof metric.timeMs === "number" && Number.isFinite(metric.timeMs)) {
        return metric.timeMs;
      }
      return metricTimestampToMs(metric.timestamp);
    };
    const getNearestVal = (
      metrics: ContainerMetric[],
      targetMs: number,
      key: "cpuUsagePercent" | "memoryUsagePercent",
    ): number | null => {
      let best: ContainerMetric | null = null;
      let bestDistance = Infinity;
      for (const metric of metrics) {
        const ms = rowTimeMs(metric);
        if (ms == null || !Number.isFinite(ms)) continue;
        const distance = Math.abs(ms - targetMs);
        if (distance <= 120_000 && distance < bestDistance) {
          bestDistance = distance;
          best = metric;
        }
      }
      if (!best || best[key] == null) return null;
      return Number(best[key]);
    };

    const allMs = new Set<number>();
    names.forEach((name) => {
      rawMetricsByContainer[name].forEach((metric) => {
        const ms = rowTimeMs(metric);
        if (ms != null && Number.isFinite(ms)) allMs.add(ms);
      });
    });
    const sortedMs = Array.from(allMs).sort((a, b) => a - b);
    const target =
      names.length >= DEFAULT_SELECTED_SERVICE_COUNT
        ? MANY_SERIES_DETAIL_RENDER_POINTS
        : DETAIL_RENDER_POINTS;
    const step =
      sortedMs.length <= target ? 1 : Math.ceil(sortedMs.length / target);
    const sampledMs = sortedMs.filter((_, index) => index % step === 0);

    return sampledMs.map((targetMs) => {
      const iso = new Date(targetMs).toISOString();
      const point: Record<string, string | number | null> = {
        timeMs: targetMs,
        timestamp: iso,
        time: formatLocalChartAxisTick(targetMs, { withDate: false }),
        datetime: formatLocalDateTime(iso),
      };
      names.forEach((name) => {
        const key = serviceKey(name);
        point[`cpu_${key}`] = getNearestVal(
          rawMetricsByContainer[name],
          targetMs,
          "cpuUsagePercent",
        );
        point[`memory_${key}`] = getNearestVal(
          rawMetricsByContainer[name],
          targetMs,
          "memoryUsagePercent",
        );
      });
      return point;
    });
  }, [rawMetricsByContainer]);

  const liveServiceChartData = useMemo(() => {
    const selectedContainers = containers.filter((container) =>
      selectedServiceKeys.includes(serviceKey(container.name)),
    );
    if (selectedContainers.length === 0) return [];
    const now = Date.now();
    const previous = now - 60_000;
    return [previous, now].map((timeMs) => {
      const iso = new Date(timeMs).toISOString();
      const point: Record<string, string | number | null> = {
        timeMs,
        timestamp: iso,
        time: formatLocalChartAxisTick(timeMs, { withDate: false }),
        datetime: formatLocalDateTime(iso),
      };
      selectedContainers.forEach((container) => {
        const key = serviceKey(container.name);
        point[`cpu_${key}`] = containerCpu(container) ?? null;
        point[`memory_${key}`] = containerMemory(container) ?? null;
      });
      return point;
    });
  }, [containers, selectedServiceKeys]);

  const effectiveDetailChartData =
    chartData.length > 0 ? chartData : liveServiceChartData;

  const serviceKeys = useMemo(
    () =>
      containers
        .map((container) => serviceKey(container.name))
        .filter((key, index, arr) => arr.indexOf(key) === index),
    [containers],
  );

  const fetchedServiceKeys = useMemo(
    () =>
      Object.keys(rawMetricsByContainer)
        .filter((name) => rawMetricsByContainer[name].length > 0)
        .map(serviceKey),
    [rawMetricsByContainer],
  );
  const totalRawServicePoints = useMemo(
    () =>
      Object.values(rawMetricsByContainer).reduce(
        (total, rows) => total + rows.length,
        0,
      ),
    [rawMetricsByContainer],
  );

  const liveSelectedServiceKeys = useMemo(
    () =>
      containers
        .filter((container) =>
          selectedServiceKeys.includes(serviceKey(container.name)),
        )
        .filter(
          (container) =>
            containerCpu(container) != null ||
            containerMemory(container) != null,
        )
        .map((container) => serviceKey(container.name)),
    [containers, selectedServiceKeys],
  );

  const effectiveDetailServiceKeys =
    chartData.length > 0 ? fetchedServiceKeys : liveSelectedServiceKeys;

  const activeChartData =
    activeView === "overview"
      ? effectiveSystemChartData
      : effectiveDetailChartData;

  const [chartXDomainEffMin, chartXDomainEffMax] = useMemo(
    () =>
      chartXDomainFromDataRange(
        chartXDomainMin,
        chartXDomainMax,
        activeChartData.map((row) => Number(row.timeMs)),
      ),
    [activeChartData, chartXDomainMin, chartXDomainMax],
  );
  const axisShowDate =
    chartXDomainEffMax - chartXDomainEffMin > 24 * 60 * 60 * 1000;

  const overviewSeriesLength =
    activeView === "overview" ? effectiveSystemChartData.length : 0;
  const { brushStart, brushEnd, onBrushChange, resetBrush, hasCustomBrush } =
    useSyncedChartBrushRange(overviewSeriesLength, 80);

  const liveCpuAvg = average(containers.map(containerCpu));
  const liveMemoryAvg = average(containers.map(containerMemory));
  const runningCount = containers.filter(
    (container) => container.health_status !== "exited",
  ).length;

  const toggleService = (key: string) => {
    setSelectedServiceKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const showAllServices = () => setSelectedServiceKeys(serviceKeys);
  const hideAllServices = () => setSelectedServiceKeys([]);

  const goPrev = useCallback(() => {
    if (useCustomRange) {
      const { start, end } = localCalendarDayBounds(customStart, customEnd);
      const days = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
      );
      const nextStart = new Date(start);
      const nextEnd = new Date(end);
      nextStart.setDate(nextStart.getDate() - days);
      nextEnd.setDate(nextEnd.getDate() - days);
      setCustomStart(ymdLocal(nextStart));
      setCustomEnd(ymdLocal(nextEnd));
      return;
    }
    setFollowLive(false);
    const { start } = getPeriodMs(timeRange, windowEnd);
    const period = windowEnd.getTime() - start.getTime();
    setWindowEnd(new Date(windowEnd.getTime() - period));
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

  const goNext = useCallback(() => {
    if (useCustomRange) {
      const { start, end } = localCalendarDayBounds(customStart, customEnd);
      const days = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
      );
      const nextStart = new Date(start);
      const nextEnd = new Date(end);
      nextStart.setDate(nextStart.getDate() + days);
      nextEnd.setDate(nextEnd.getDate() + days);
      const today = ymdLocal();
      if (ymdLocal(nextEnd) > today) {
        setCustomEnd(today);
        setCustomStart(
          ymdLocal(new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
        );
      } else {
        setCustomStart(ymdLocal(nextStart));
        setCustomEnd(ymdLocal(nextEnd));
      }
      return;
    }
    setFollowLive(false);
    const now = new Date();
    const { start } = getPeriodMs(timeRange, windowEnd);
    const period = windowEnd.getTime() - start.getTime();
    const nextEnd = new Date(windowEnd.getTime() + period);
    setWindowEnd(nextEnd <= now ? nextEnd : now);
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

  const canGoNext = useMemo(() => {
    if (useCustomRange) return customEnd < ymdLocal();
    return windowEnd.getTime() < Date.now();
  }, [useCustomRange, customEnd, windowEnd]);

  const handlePeriodNow = useCallback(() => {
    setUseCustomRange(false);
    setFollowLive(true);
    setWindowEnd(new Date());
  }, []);

  return (
    <PerformancePageShell
      title="Performances — CPU & Mémoire"
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
          showNavigationHint={false}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            CPU moyen live
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {formatPercent(liveCpuAvg)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mémoire moyenne live
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {formatPercent(liveMemoryAvg)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Services suivis
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {runningCount}/{containers.length || "—"}
          </p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Vues CPU et mémoire">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => setActiveView(view.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeView === view.id
                ? "bg-blue-600 text-white shadow dark:bg-blue-500"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {view.label}
          </button>
        ))}
      </nav>

      {activeView !== "overview" && serviceKeys.length > 0 ? (
        <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Services à charger
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Par défaut, seuls quelques services sont chargés pour garder la
                page rapide. Activez plus de séries si nécessaire.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={showAllServices}
                className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100"
              >
                Tout afficher
              </button>
              <button
                type="button"
                onClick={hideAllServices}
                className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100"
              >
                Tout masquer
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {serviceKeys.map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
              >
                <input
                  type="checkbox"
                  checked={selectedServiceKeys.includes(key)}
                  onChange={() => toggleService(key)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate">{key}</span>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {loadingList ||
      (activeView === "overview" &&
        loadingSystemMetrics &&
        systemChartData.length === 0) ||
      (activeView !== "overview" &&
        loadingMetrics &&
        chartData.length === 0) ? (
        <PerformanceLoadingState>
          Chargement des métriques…
        </PerformanceLoadingState>
      ) : listError ? (
        <PerformanceEmptyState className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          {listError}
        </PerformanceEmptyState>
      ) : activeView === "overview" && effectiveSystemChartData.length === 0 ? (
        <PerformanceEmptyState>
          Aucune métrique CPU/mémoire disponible pour l’instant.
        </PerformanceEmptyState>
      ) : activeView !== "overview" && selectedServiceKeys.length === 0 ? (
        <PerformanceEmptyState>
          Aucun service sélectionné. Cochez au moins une série à charger.
        </PerformanceEmptyState>
      ) : activeView === "overview" ? (
        <div className="space-y-6">
          <PerformanceHistoryCaption
            source={systemChartData.length > 0 ? "system_metrics" : "docker_live"}
            timeRangeLabel={rangeLabel}
            rawPoints={rawSystemMetrics.length}
            renderedPoints={effectiveSystemChartData.length}
            note="CPU et mémoire machine ; axe X calé sur la période demandée"
          />
          <PerformanceChartCard title="CPU & mémoire globaux">
            <SystemCpuMemoryAreaCharts
              chartData={effectiveSystemChartData}
              xDomainMin={chartXDomainEffMin}
              xDomainMax={chartXDomainEffMax}
              axisShowDate={axisShowDate}
              chartHeight={260}
              emphasizePoints={systemChartData.length === 0}
              brushStartIndex={brushStart}
              brushEndIndex={brushEnd}
              onBrushChange={onBrushChange}
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <p>
                Glissez la barre sous le graphique mémoire pour zoomer CPU et
                mémoire sur la même fenêtre.
              </p>
              {hasCustomBrush ? (
                <button
                  type="button"
                  onClick={resetBrush}
                  className="text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Réinitialiser le zoom
                </button>
              ) : null}
            </div>
          </PerformanceChartCard>
        </div>
      ) : effectiveDetailChartData.length === 0 ||
        effectiveDetailServiceKeys.length === 0 ? (
        <PerformanceEmptyState>
          Aucune métrique CPU/mémoire disponible pour les services sélectionnés.
        </PerformanceEmptyState>
      ) : (
        <div className="space-y-4">
          <PerformanceHistoryCaption
            source={chartData.length > 0 ? "container_metrics" : "docker_live"}
            timeRangeLabel={rangeLabel}
            rawPoints={totalRawServicePoints}
            renderedPoints={effectiveDetailChartData.length}
            note="Séries services ; rendu borné pour limiter le coût frontend"
          />
          <CpuMemoryServiceLinesChart
            metric={activeView === "cpu" ? "cpu" : "memory"}
            title={
              activeView === "cpu"
                ? "CPU détaillé par service"
                : "Mémoire détaillée par service"
            }
            rangeLabel={rangeLabel}
            chartXDomainMin={chartXDomainEffMin}
            chartXDomainMax={chartXDomainEffMax}
            axisShowDate={axisShowDate}
            chartData={effectiveDetailChartData}
            serviceKeys={effectiveDetailServiceKeys}
            emphasizePoints={chartData.length === 0}
          />
        </div>
      )}
    </PerformancePageShell>
  );
}

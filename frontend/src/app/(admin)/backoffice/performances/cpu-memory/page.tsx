"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { PerformancesSubNav } from "../PerformancesSubNav";
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
import { chartXDomainFromDataRange } from "@/lib/charts/chartTimeDomain";
import { analyticsService } from "@/lib/api/analytics.service";
import {
  formatLocalChartAxisTick,
  formatLocalDateTime,
  metricRowToTimeMs,
  metricTimestampToMs,
  normalizeMetricTimestampToIso,
} from "@/lib/utils/date";

const METRIC_GAP_MS = 15 * 60 * 1000;
const METRICS_HISTORY_FETCH_CONCURRENCY = 5;
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
}

interface ContainerMetric {
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

export default function CpuMemoryPerformancePage() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [rawMetricsByContainer, setRawMetricsByContainer] = useState<
    Record<string, ContainerMetric[]>
  >({});
  const [activeView, setActiveView] = useState<CpuMemoryView>("overview");
  const [hiddenServiceKeys, setHiddenServiceKeys] = useState<string[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
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
        if (!cancelled) setContainers(list);
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
    if (containers.length === 0) {
      setRawMetricsByContainer({});
      return;
    }
    const silent = silentNextFetch.current;
    silentNextFetch.current = false;
    const controller = new AbortController();
    const { startDate, endDate, limit } = getParams();
    const opts = { startDate, endDate, limit, offset: 0, signal: controller.signal };
    let cancelled = false;

    beginUserRangeFetch(
      silent,
      () => undefined,
      setLoadingMetrics,
    );
    promisePool(containers, METRICS_HISTORY_FETCH_CONCURRENCY, (container) =>
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
        if (!cancelled && !controller.signal.aborted && !silent) {
          setLoadingMetrics(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [containers, getParams, rangeHydrated, softTick]);

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
    const step =
      sortedMs.length <= 240 ? 1 : Math.ceil(sortedMs.length / 240);
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

  const serviceKeys = useMemo(
    () =>
      Object.keys(rawMetricsByContainer)
        .filter((name) => rawMetricsByContainer[name].length > 0)
        .map(serviceKey),
    [rawMetricsByContainer],
  );

  const visibleServiceKeys = useMemo(
    () => serviceKeys.filter((key) => !hiddenServiceKeys.includes(key)),
    [serviceKeys, hiddenServiceKeys],
  );

  const [chartXDomainEffMin, chartXDomainEffMax] = useMemo(
    () =>
      chartXDomainFromDataRange(
        chartXDomainMin,
        chartXDomainMax,
        chartData.map((row) => Number(row.timeMs)),
      ),
    [chartData, chartXDomainMin, chartXDomainMax],
  );
  const axisShowDate =
    chartXDomainEffMax - chartXDomainEffMin > 24 * 60 * 60 * 1000;

  const liveCpuAvg = average(containers.map((container) => container.cpu_percent));
  const liveMemoryAvg = average(
    containers.map((container) => container.memory_percent),
  );
  const runningCount = containers.filter(
    (container) => container.health_status !== "exited",
  ).length;

  const toggleService = (key: string) => {
    setHiddenServiceKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const showAllServices = () => setHiddenServiceKeys([]);
  const hideAllServices = () => setHiddenServiceKeys(serviceKeys);

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
    <AdminLayout>
      <div className="w-full space-y-6 p-6">
        <Link
          href="/b4ck0ff1ce/performances"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <span aria-hidden>←</span>
          Retour à Performances
        </Link>
        <PerformancesSubNav />

        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
            Performances — CPU & Mémoire
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Vue machine par service : CPU, mémoire, séries persistées et période
            partagée avec les autres pages Performances.
          </p>
        </div>

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

        <div className="flex flex-col gap-3">
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

        <nav
          className="flex flex-wrap gap-2"
          aria-label="Vues CPU et mémoire"
        >
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
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Services affichés
              </h2>
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
                    checked={!hiddenServiceKeys.includes(key)}
                    onChange={() => toggleService(key)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{key}</span>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {loadingList || (loadingMetrics && chartData.length === 0) ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            Chargement des métriques…
          </div>
        ) : listError ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-8 text-center text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            {listError}
          </div>
        ) : chartData.length === 0 || serviceKeys.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            Aucune série CPU/mémoire persistée sur cette période.
          </div>
        ) : activeView === "overview" ? (
          <div className="space-y-6">
            <CpuMemoryServiceLinesChart
              metric="cpu"
              title="CPU global — tous les services"
              rangeLabel={rangeLabel}
              chartXDomainMin={chartXDomainEffMin}
              chartXDomainMax={chartXDomainEffMax}
              axisShowDate={axisShowDate}
              chartData={chartData}
              serviceKeys={serviceKeys}
            />
            <CpuMemoryServiceLinesChart
              metric="memory"
              title="Mémoire globale — tous les services"
              rangeLabel={rangeLabel}
              chartXDomainMin={chartXDomainEffMin}
              chartXDomainMax={chartXDomainEffMax}
              axisShowDate={axisShowDate}
              chartData={chartData}
              serviceKeys={serviceKeys}
            />
          </div>
        ) : visibleServiceKeys.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            Aucun service sélectionné. Réactivez au moins une série.
          </div>
        ) : (
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
            chartData={chartData}
            serviceKeys={visibleServiceKeys}
          />
        )}
      </div>
    </AdminLayout>
  );
}

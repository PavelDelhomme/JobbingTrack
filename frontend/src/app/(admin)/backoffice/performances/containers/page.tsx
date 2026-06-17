"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { isAxiosError } from "axios";
import dynamic from "next/dynamic";
import {
  TimeRangeSelector,
  useAnalyticsAutoRefresh,
  usePersistedSharedAnalyticsRange,
  beginUserRangeFetch,
  isBenignFetchAbort,
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
import {
  appendBlockIoRates,
  blockIoFromContainerLive,
  blockIoFromMetricRow,
} from "@/lib/monitoring/containerBlockIoChartModel";
import { analyticsService } from "@/lib/api/analytics.service";
import {
  PerformanceEmptyState,
  PerformanceHistoryCaption,
  PerformanceLoadingState,
  PerformancePageShell,
} from "@/components/performances";

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
const SINGLE_CONTAINER_RENDER_POINTS = 160;
const MANY_CONTAINERS_RENDER_POINTS = 80;
const MEDIUM_CONTAINERS_RENDER_POINTS = 120;

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
  cpuPercent?: number;
  memory_percent?: number;
  memoryPercent?: number;
  metrics?: Record<string, unknown>;
  health_status?: string;
  [key: string]: unknown;
}

interface ContainerMetric {
  timestamp: string;
  timeMs?: number;
  cpuUsagePercent?: number | null;
  memoryUsagePercent?: number | null;
  blockReadBytes?: number | null;
  blockWriteBytes?: number | null;
  blockReadMb?: number | null;
  blockWriteMb?: number | null;
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

function numberFromKeys(
  source: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value.replace("%", "").trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function containerMetricBag(container: ContainerInfo): Record<string, unknown> {
  return container.metrics && typeof container.metrics === "object"
    ? container.metrics
    : {};
}

function containerCpu(container: ContainerInfo): number | null {
  const bag = containerMetricBag(container);
  return numberFromKeys({ ...bag, ...container }, [
    "cpuUsagePercent",
    "cpu_usage_percent",
    "cpu_percent",
    "cpuPercent",
    "cpu",
  ]);
}

function containerMemory(container: ContainerInfo): number | null {
  const bag = containerMetricBag(container);
  return numberFromKeys({ ...bag, ...container }, [
    "memoryUsagePercent",
    "memory_usage_percent",
    "memory_percent",
    "memoryPercent",
    "memory",
  ]);
}

export default function ContainersAnalyticsPage() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const [rawMetrics, setRawMetrics] = useState<ContainerMetric[]>([]);
  const [rawMetricsByContainer, setRawMetricsByContainer] = useState<
    Record<string, ContainerMetric[]>
  >({});
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
        if (!cancelled) {
          setContainers(list);
          if (list.length > 0 && selectedContainer === "") {
            setSelectedContainer(ALL_CONTAINERS_VALUE);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setContainers([]);
          const status = isAxiosError(e) ? e.response?.status : undefined;
          const hint =
            status === 404
              ? " Route /api/metrics-aggregator introuvable (souvent le proxy HTTPS dev sur :5443 — redémarrer jobbingtrack-dev-https-proxy après mise à jour nginx)."
              : "";
          setListError(
            `Impossible de charger la liste des conteneurs${status ? ` (HTTP ${status})` : ""}.${hint} Vérifiez metrics-aggregator et Docker.`,
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
    if (!selectedContainer) {
      setRawMetrics([]);
      setRawMetricsByContainer({});
      return;
    }
    const silent = silentNextFetch.current;
    silentNextFetch.current = false;
    const controller = new AbortController();

    const { startDate, endDate, limit } = getParams();
    const opts = {
      startDate,
      endDate,
      limit,
      offset: 0,
      signal: controller.signal,
    };

    const normalize = (data: Record<string, unknown>[]) =>
      (data || [])
        .map((d) => {
          const rawTs =
            typeof d.timestamp === "string"
              ? d.timestamp
              : ((d.timestamp as Date)?.toISOString?.() ?? "");
          const timestamp = normalizeMetricTimestampToIso(rawTs);
          const timeMs = metricRowToTimeMs(d, timestamp);
          const blockIo = blockIoFromMetricRow(d);
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
            blockReadBytes: blockIo.readBytes,
            blockWriteBytes: blockIo.writeBytes,
            blockReadMb: blockIo.readMb,
            blockWriteMb: blockIo.writeMb,
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
        "blockReadMb",
        "blockWriteMb",
      ]);

    if (selectedContainer === ALL_CONTAINERS_VALUE) {
      if (containers.length === 0) {
        setRawMetricsByContainer({});
        setLoadingMetrics(false);
        return;
      }
      let cancelled = false;
      if (!silent) {
        setLoadingMetrics(true);
      }
      promisePool(containers, METRICS_HISTORY_FETCH_CONCURRENCY, (c) =>
        analyticsService
          .getContainerMetricsHistory(c.name, opts)
          .then((data: Record<string, unknown>[]) => ({
            name: c.name,
            data: withGaps(normalize(data)),
          })),
      )
        .then((results) => {
          if (cancelled || controller.signal.aborted) return;
          const byName: Record<string, ContainerMetric[]> = {};
          results.forEach((r) => {
            byName[r.name] = r.data;
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
    }

    let cancelled = false;
    beginUserRangeFetch(silent, setRawMetrics, setLoadingMetrics);
    setRawMetricsByContainer({});
    analyticsService
      .getContainerMetricsHistory(selectedContainer, opts)
      .then((data: Record<string, unknown>[]) => {
        if (cancelled || controller.signal.aborted) return;
        setRawMetrics(withGaps(normalize(data)));
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
  }, [selectedContainer, getParams, containers, softTick, rangeHydrated]);

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
    const livePointTimes = () => {
      const now = Date.now();
      return [now - 60_000, now];
    };
    if (selectedContainer !== ALL_CONTAINERS_VALUE) {
      if (rawMetrics.length === 0) {
        const selected = containers.find((c) => c.name === selectedContainer);
        if (!selected) return [];
        const cpu = containerCpu(selected);
        const memory = containerMemory(selected);
        const blockIo = blockIoFromContainerLive(selected);
        if (
          cpu == null &&
          memory == null &&
          blockIo.readMb == null &&
          blockIo.writeMb == null
        ) {
          return [];
        }
        return livePointTimes().map((timeMs) => {
          const iso = new Date(timeMs).toISOString();
          return {
            timeMs,
            timestamp: iso,
            time: formatLocalChartAxisTick(timeMs, { withDate: false }),
            datetime: formatLocalDateTime(iso),
            cpu,
            memory,
            blockReadMb: blockIo.readMb,
            blockWriteMb: blockIo.writeMb,
            blockReadMbPerMin: 0,
            blockWriteMbPerMin: 0,
          };
        });
      }
      const keys: (keyof ContainerMetric)[] = [
        "cpuUsagePercent",
        "memoryUsagePercent",
        "blockReadMb",
        "blockWriteMb",
      ];
      const compressed = compressData(
        rawMetrics,
        SINGLE_CONTAINER_RENDER_POINTS,
        keys,
      );
      const mapped = compressed.map((d) => {
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
          readMb: d.blockReadMb != null ? Number(d.blockReadMb) : null,
          writeMb: d.blockWriteMb != null ? Number(d.blockWriteMb) : null,
          blockReadMb: d.blockReadMb != null ? Number(d.blockReadMb) : null,
          blockWriteMb: d.blockWriteMb != null ? Number(d.blockWriteMb) : null,
          readMbPerMin: null as number | null,
          writeMbPerMin: null as number | null,
        };
      });
      return appendBlockIoRates(mapped, METRIC_GAP_MS).map((row) => ({
        ...row,
        blockReadMbPerMin: row.readMbPerMin,
        blockWriteMbPerMin: row.writeMbPerMin,
      }));
    }
    const names = Object.keys(rawMetricsByContainer).filter(
      (n) => rawMetricsByContainer[n].length > 0,
    );
    if (names.length === 0) {
      const liveContainers = containers.filter((container) => {
        return (
          containerCpu(container) != null || containerMemory(container) != null
        );
      });
      if (liveContainers.length === 0) return [];
      return livePointTimes().map((timeMs) => {
        const iso = new Date(timeMs).toISOString();
        const point: Record<string, string | number | null> = {
          timeMs,
          timestamp: iso,
          time: formatLocalChartAxisTick(timeMs, { withDate: false }),
          datetime: formatLocalDateTime(iso),
        };
        liveContainers.forEach((container) => {
          const k = container.name
            .replace(/^jobbingtrack-/, "")
            .replace(/-/g, "_");
          point[`cpu_${k}`] = containerCpu(container);
          point[`memory_${k}`] = containerMemory(container);
        });
        return point;
      });
    }
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
    const target =
      names.length >= 16
        ? MANY_CONTAINERS_RENDER_POINTS
        : names.length >= 8
          ? MEDIUM_CONTAINERS_RENDER_POINTS
          : SINGLE_CONTAINER_RENDER_POINTS;
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
  }, [containers, rawMetrics, rawMetricsByContainer, selectedContainer]);

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
    ? Object.keys(rawMetricsByContainer).some(
        (n) => rawMetricsByContainer[n].length > 0,
      )
      ? Object.keys(rawMetricsByContainer)
          .filter((n) => rawMetricsByContainer[n].length > 0)
          .map((n) => n.replace(/^jobbingtrack-/, "").replace(/-/g, "_"))
      : containers
          .filter(
            (container) =>
              containerCpu(container) != null ||
              containerMemory(container) != null,
          )
          .map((n) => n.name.replace(/^jobbingtrack-/, "").replace(/-/g, "_"))
    : [];

  const totalRawContainerPoints = useMemo(
    () =>
      Object.values(rawMetricsByContainer).reduce(
        (sum, metrics) => sum + metrics.length,
        0,
      ),
    [rawMetricsByContainer],
  );

  const handlePeriodNow = useCallback(() => {
    setUseCustomRange(false);
    setFollowLive(true);
    setWindowEnd(new Date());
  }, []);

  return (
    <PerformancePageShell
      title="Performances — conteneurs"
      description="Métriques par conteneur (CPU, mémoire, Block I/O) — source cgroups / agent, alignée docker stats."
      actions={
        <>
          <label className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-sm text-gray-700 dark:text-gray-300">
              Conteneur
            </span>
            <select
              value={selectedContainer}
              onChange={(e) => setSelectedContainer(e.target.value)}
              className="min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 sm:w-auto sm:min-w-[240px] sm:px-4 sm:py-2"
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
        </>
      }
    >
      {!selectedContainer && !loadingList ? (
        <PerformanceEmptyState
          className={
            listError
              ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
              : "border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          }
        >
          {listError ??
            "Aucun conteneur disponible. Vérifiez que le metrics-aggregator et Docker exposent les conteneurs JobbingTrack."}
        </PerformanceEmptyState>
      ) : loadingMetrics && chartData.length === 0 ? (
        <PerformanceLoadingState>
          Chargement des métriques…
        </PerformanceLoadingState>
      ) : chartData.length === 0 ? (
        <PerformanceEmptyState>
          Aucune métrique persistée pour{" "}
          {isAllContainers ? "ces conteneurs" : "ce conteneur"} sur cette
          période.
        </PerformanceEmptyState>
      ) : isAllContainers && containerNamesForChart.length > 0 ? (
        <div className="space-y-4">
          <PerformanceHistoryCaption
            source="container_metrics"
            timeRangeLabel={rangeLabel}
            rawPoints={totalRawContainerPoints}
            renderedPoints={chartData.length}
            note="Toutes séries conteneurs ; codes C# et rendu adaptatif"
          />
          <AnalyticsContainersChartsBundle
            mode="multi"
            rangeLabel={rangeLabel}
            chartXDomainMin={chartXDomainEffMin}
            chartXDomainMax={chartXDomainEffMax}
            containerAxisShowDate={containerAxisShowDate}
            chartData={chartData}
            containerNamesForChart={containerNamesForChart}
            selectedContainerLabel=""
            rawMetricsLength={totalRawContainerPoints}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <PerformanceHistoryCaption
            source="container_metrics"
            timeRangeLabel={rangeLabel}
            rawPoints={rawMetrics.length}
            renderedPoints={chartData.length}
            note="Conteneur sélectionné ; axe X calé sur la période demandée"
          />
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
        </div>
      )}
    </PerformancePageShell>
  );
}

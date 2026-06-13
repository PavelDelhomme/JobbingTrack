"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  TimeRangeSelector,
  useAnalyticsAutoRefresh,
  usePersistedSharedAnalyticsRange,
  isBenignFetchAbort,
  ymdLocal,
  type TimeRangeOption,
} from "@/components/analytics";
import {
  formatCustomRangeLabel,
  formatRangeLabel,
  getPeriodMs,
  localCalendarDayBounds,
} from "@/components/analytics/timeRangeUtils";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatLocalChartAxisTick,
  formatLocalDateTime,
  metricRowToTimeMs,
  normalizeMetricTimestampToIso,
} from "@/lib/utils/date";
import { chartXDomainFromDataRange } from "@/lib/charts/chartTimeDomain";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";
import { analyticsService } from "@/lib/api/analytics.service";
import {
  PerformanceChartCard,
  PerformanceEmptyState,
  PerformanceInfoNotice,
  PerformanceLoadingState,
  PerformancePageShell,
} from "@/components/performances";

const METRIC_GAP_MS = 15 * 60 * 1000;
const HISTORY_FETCH_CONCURRENCY = 5;
const TARGET_POINTS = 220;

interface ContainerInfo {
  name: string;
  metrics?: Record<string, unknown>;
  diskUsagePercent?: number;
  disk_usage_percent?: number;
  diskUsedBytes?: number;
  disk_used_bytes?: number;
  diskTotalBytes?: number;
  disk_total_bytes?: number;
  blockReadBytes?: number;
  blockWriteBytes?: number;
  [key: string]: unknown;
}

interface DiskMetricRow {
  timestamp: string;
  timeMs: number;
  usage: number | null;
  used: number | null;
  total: number | null;
}

interface ContainerIoMetric {
  timestamp: string;
  timeMs: number;
  readMb: number | null;
  writeMb: number | null;
}

interface AggregatedIoRow {
  timestamp: string;
  timeMs: number;
  readMb: number | null;
  writeMb: number | null;
  readMbPerMin: number;
  writeMbPerMin: number;
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

function numberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function bytesToGb(value: unknown): number | null {
  const n = numberOrNull(value);
  if (n == null || n <= 0) return null;
  return n / 1024 ** 3;
}

function bytesToMb(value: unknown): number | null {
  const n = numberOrNull(value);
  if (n == null || n < 0) return null;
  return n / 1024 ** 2;
}

function pickGb(
  row: Record<string, unknown>,
  gbKeys: string[],
  byteKeys: string[],
): number | null {
  for (const key of byteKeys) {
    const value = bytesToGb(row[key]);
    if (value != null) return value;
  }
  for (const key of gbKeys) {
    const value = numberOrNull(row[key]);
    if (value != null && value > 0) return value;
  }
  return null;
}

function pickMbFromBytes(
  row: Record<string, unknown>,
  byteKeys: string[],
  mbKeys: string[],
): number | null {
  for (const key of byteKeys) {
    const value = bytesToMb(row[key]);
    if (value != null) return value;
  }
  for (const key of mbKeys) {
    const value = numberOrNull(row[key]);
    if (value != null && value >= 0) return value;
  }
  return null;
}

function compressRows<T extends { timeMs: number }>(rows: T[]): T[] {
  if (rows.length <= TARGET_POINTS) return rows;
  const step = Math.ceil(rows.length / TARGET_POINTS);
  return rows.filter((_, index) => index % step === 0);
}

function buildIoRateRows(rows: AggregatedIoRow[]): AggregatedIoRow[] {
  return rows.map((row, index) => {
    if (index === 0) return row;
    const prev = rows[index - 1];
    const dtMs = row.timeMs - prev.timeMs;
    if (dtMs < 4000 || dtMs > METRIC_GAP_MS) return row;
    const dtMin = dtMs / 60000;
    const readDelta =
      row.readMb != null && prev.readMb != null
        ? Math.max(0, row.readMb - prev.readMb)
        : 0;
    const writeDelta =
      row.writeMb != null && prev.writeMb != null
        ? Math.max(0, row.writeMb - prev.writeMb)
        : 0;
    return {
      ...row,
      readMbPerMin: readDelta / dtMin,
      writeMbPerMin: writeDelta / dtMin,
    };
  });
}

function maxWithFallback(values: number[], fallback = 1): number {
  const finite = values.filter((value) => Number.isFinite(value) && value > 0);
  if (finite.length === 0) return fallback;
  return Math.max(...finite) * 1.12;
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

function metricBag(row: Record<string, unknown>): Record<string, unknown> {
  return row.metrics && typeof row.metrics === "object"
    ? (row.metrics as Record<string, unknown>)
    : {};
}

export default function PerformancesDiskPage() {
  const [systemRows, setSystemRows] = useState<DiskMetricRow[]>([]);
  const [ioRows, setIoRows] = useState<AggregatedIoRow[]>([]);
  const [containersCount, setContainersCount] = useState(0);
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
  }, [customEnd, customStart, timeRange, useCustomRange, windowEnd]);

  useEffect(() => {
    if (!rangeHydrated) return;
    const silent = silentNextFetch.current;
    silentNextFetch.current = false;
    let cancelled = false;
    const controller = new AbortController();
    const { startDate, endDate, limit } = getParams();

    const normalizeSystemRows = (data: Record<string, unknown>[]) =>
      data
        .map((raw) => {
          const tsIso =
            normalizeMetricTimestampToIso(raw.timestamp) ||
            String(raw.timestamp ?? "");
          const timeMs = metricRowToTimeMs(raw, tsIso);
          const usage = numberOrNull(
            raw.diskUsagePercent ?? raw.disk_usage_percent,
          );
          return {
            timestamp: tsIso,
            timeMs: timeMs ?? NaN,
            usage,
            used: pickGb(
              raw,
              ["diskUsedGb", "disk_used_gb"],
              ["diskUsedBytes", "disk_used_bytes"],
            ),
            total: pickGb(
              raw,
              ["diskTotalGb", "disk_total_gb"],
              ["diskTotalBytes", "disk_total_bytes"],
            ),
          };
        })
        .filter((row) => Number.isFinite(row.timeMs))
        .sort((a, b) => a.timeMs - b.timeMs);

    const normalizeContainerIoRows = (data: Record<string, unknown>[]) =>
      data
        .map((raw): ContainerIoMetric => {
          const tsIso =
            normalizeMetricTimestampToIso(raw.timestamp) ||
            String(raw.timestamp ?? "");
          return {
            timestamp: tsIso,
            timeMs: metricRowToTimeMs(raw, tsIso) ?? NaN,
            readMb: pickMbFromBytes(
              raw,
              ["blockReadBytes", "block_read_bytes", "blockIOReadBytes"],
              ["block_read_mb", "blockReadMb"],
            ),
            writeMb: pickMbFromBytes(
              raw,
              ["blockWriteBytes", "block_write_bytes", "blockIOWriteBytes"],
              ["block_write_mb", "blockWriteMb"],
            ),
          };
        })
        .filter((row) => Number.isFinite(row.timeMs))
        .sort((a, b) => a.timeMs - b.timeMs);

    const nearest = (
      rows: ContainerIoMetric[],
      targetMs: number,
      key: "readMb" | "writeMb",
    ) => {
      let best: ContainerIoMetric | null = null;
      let bestDistance = Infinity;
      for (const row of rows) {
        const distance = Math.abs(row.timeMs - targetMs);
        if (distance <= 120_000 && distance < bestDistance) {
          best = row;
          bestDistance = distance;
        }
      }
      return best?.[key] ?? null;
    };

    const aggregateIo = (byContainer: Record<string, ContainerIoMetric[]>) => {
      const allMs = new Set<number>();
      Object.values(byContainer).forEach((rows) => {
        rows.forEach((row) => allMs.add(row.timeMs));
      });
      const sampled = compressRows(
        Array.from(allMs)
          .sort((a, b) => a - b)
          .map((timeMs) => ({ timeMs })),
      );
      const cumulative = sampled.map(({ timeMs }): AggregatedIoRow => {
        let readTotal = 0;
        let writeTotal = 0;
        let readSeen = false;
        let writeSeen = false;

        Object.values(byContainer).forEach((rows) => {
          const read = nearest(rows, timeMs, "readMb");
          const write = nearest(rows, timeMs, "writeMb");
          if (read != null) {
            readTotal += read;
            readSeen = true;
          }
          if (write != null) {
            writeTotal += write;
            writeSeen = true;
          }
        });

        const timestamp = new Date(timeMs).toISOString();
        return {
          timestamp,
          timeMs,
          readMb: readSeen ? readTotal : null,
          writeMb: writeSeen ? writeTotal : null,
          readMbPerMin: 0,
          writeMbPerMin: 0,
        };
      });
      return buildIoRateRows(cumulative);
    };

    (async () => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const [systemData, containers] = await Promise.all([
          analyticsService.getSystemMetricsHistory({
            startDate,
            endDate,
            limit,
            offset: 0,
            signal: controller.signal,
          }),
          analyticsService.getContainersList().catch(() => []),
        ]);
        if (cancelled || controller.signal.aborted) return;
        const normalizedSystem = normalizeSystemRows(systemData);

        const activeContainers = (containers as ContainerInfo[]).filter(
          (container) => container.name,
        );
        setContainersCount(activeContainers.length);
        const histories = await promisePool(
          activeContainers,
          HISTORY_FETCH_CONCURRENCY,
          async (container) => ({
            name: container.name,
            rows: normalizeContainerIoRows(
              await analyticsService.getContainerMetricsHistory(
                container.name,
                {
                  startDate,
                  endDate,
                  limit,
                  offset: 0,
                  signal: controller.signal,
                },
              ),
            ),
          }),
        );
        if (cancelled || controller.signal.aborted) return;
        const byContainer: Record<string, ContainerIoMetric[]> = {};
        histories.forEach((history) => {
          if (history.rows.length > 0) byContainer[history.name] = history.rows;
        });
        const aggregatedIo = aggregateIo(byContainer);
        const now = Date.now();
        const fallbackSystemRows =
          normalizedSystem.length > 0
            ? normalizedSystem
            : (() => {
                const latestRaw = (systemData || [])[0] as
                  | Record<string, unknown>
                  | undefined;
                if (!latestRaw) return [];
                const usage = numberOrNull(
                  latestRaw.diskUsagePercent ?? latestRaw.disk_usage_percent,
                );
                const used = pickGb(
                  latestRaw,
                  ["diskUsedGb", "disk_used_gb"],
                  ["diskUsedBytes", "disk_used_bytes"],
                );
                const total = pickGb(
                  latestRaw,
                  ["diskTotalGb", "disk_total_gb"],
                  ["diskTotalBytes", "disk_total_bytes"],
                );
                if (usage == null && used == null && total == null) return [];
                return [now - 60_000, now].map((timeMs) => ({
                  timestamp: new Date(timeMs).toISOString(),
                  timeMs,
                  usage,
                  used,
                  total,
                }));
              })();
        const fallbackIoRows =
          aggregatedIo.length > 0
            ? aggregatedIo
            : (() => {
                let readMb = 0;
                let writeMb = 0;
                let seenRead = false;
                let seenWrite = false;
                activeContainers.forEach((container) => {
                  const bag = metricBag(container);
                  const read =
                    pickMbFromBytes(
                      { ...bag, ...container },
                      ["blockReadBytes", "block_read_bytes"],
                      ["blockReadMb", "block_read_mb"],
                    ) ?? numberFromKeys(bag, ["block_read_mb", "blockReadMb"]);
                  const write =
                    pickMbFromBytes(
                      { ...bag, ...container },
                      ["blockWriteBytes", "block_write_bytes"],
                      ["blockWriteMb", "block_write_mb"],
                    ) ?? numberFromKeys(bag, ["block_write_mb", "blockWriteMb"]);
                  if (read != null) {
                    readMb += read;
                    seenRead = true;
                  }
                  if (write != null) {
                    writeMb += write;
                    seenWrite = true;
                  }
                });
                if (!seenRead && !seenWrite) return [];
                return [now - 60_000, now].map((timeMs) => ({
                  timestamp: new Date(timeMs).toISOString(),
                  timeMs,
                  readMb: seenRead ? readMb : null,
                  writeMb: seenWrite ? writeMb : null,
                  readMbPerMin: 0,
                  writeMbPerMin: 0,
                }));
              })();
        setSystemRows(fallbackSystemRows);
        setIoRows(fallbackIoRows);
      } catch (e) {
        if (!isBenignFetchAbort(e)) console.error(e);
      } finally {
        if (!cancelled && !controller.signal.aborted && !silent) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [getParams, softTick, rangeHydrated]);

  const bumpWindowEndToNow = useCallback(() => {
    silentNextFetch.current = true;
    setWindowEnd(new Date());
  }, []);

  const bumpSoftRefresh = useCallback(() => {
    silentNextFetch.current = true;
    setSoftTick((tick) => tick + 1);
  }, []);

  useAnalyticsAutoRefresh({
    followLive,
    useCustomRange,
    customEnd,
    bumpWindowEndToNow,
    bumpSoftRefresh,
  });

  const { rangeStart, rangeEnd } = getParams();
  const rangeLabel = useCustomRange
    ? formatCustomRangeLabel(customStart, customEnd)
    : formatRangeLabel(rangeStart, rangeEnd, timeRange);

  const [chartXMin, chartXMax] = useMemo(() => {
    return chartXDomainFromDataRange(
      rangeStart.getTime(),
      rangeEnd.getTime(),
      [...systemRows, ...ioRows].map((row) => row.timeMs),
    );
  }, [ioRows, rangeEnd, rangeStart, systemRows]);

  const axisShowDate = chartXMax - chartXMin > 24 * 60 * 60 * 1000;

  const latest = systemRows.length ? systemRows[systemRows.length - 1] : null;
  const latestIo = ioRows.length ? ioRows[ioRows.length - 1] : null;
  const ioRateMax = maxWithFallback(
    ioRows.flatMap((row) => [row.readMbPerMin, row.writeMbPerMin]),
  );
  const ioCumulativeMax = maxWithFallback(
    ioRows.flatMap((row) => [row.readMb ?? 0, row.writeMb ?? 0]),
  );

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
  }, [customEnd, customStart, timeRange, useCustomRange, windowEnd]);

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
        setCustomStart(ymdLocal(new Date(Date.now() - days * 86400000)));
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
  }, [customEnd, customStart, timeRange, useCustomRange, windowEnd]);

  const canGoNext = useMemo(() => {
    if (useCustomRange) return customEnd < ymdLocal();
    return windowEnd.getTime() < Date.now();
  }, [customEnd, useCustomRange, windowEnd]);

  const handlePeriodNow = useCallback(() => {
    setUseCustomRange(false);
    setFollowLive(true);
    setWindowEnd(new Date());
  }, []);

  const hasAnyData = systemRows.length > 0 || ioRows.length > 0;

  return (
    <PerformancePageShell
      title="Performances disque"
      description="Usage stockage système, volume utilisé/total et Block I/O agrégé depuis les conteneurs JobbingTrack."
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

        {loading && !hasAnyData ? (
          <PerformanceLoadingState />
        ) : !hasAnyData ? (
          <PerformanceEmptyState>
            Aucune donnée disque disponible sur cette période. Vérifiez que la
            persistance système et conteneurs est alimentée.
          </PerformanceEmptyState>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Usage disque actuel
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {latest && latest.usage != null
                    ? `${latest.usage.toFixed(1)}%`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Volume utilisé
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {latest && latest.used != null
                    ? `${latest.used.toFixed(1)} Go`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Block I/O écrit
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {latestIo && latestIo.writeMb != null
                    ? `${latestIo.writeMb.toFixed(1)} Mo`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {containersCount} conteneur(s) suivis
                </p>
              </div>
            </div>

            {systemRows.length > 0 ? (
              <PerformanceChartCard
                title="Usage disque système (%)"
                periodLabel={rangeLabel}
              >
                <div className="w-full min-h-[240px] sm:min-h-[340px]">
                  <ResponsiveContainer
                    width="100%"
                    height={340}
                    minHeight={240}
                  >
                    <LineChart
                      data={systemRows}
                      margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-50"
                      />
                      <XAxis
                        dataKey="timeMs"
                        type="number"
                        domain={[chartXMin, chartXMax]}
                        angle={axisShowDate ? -40 : -35}
                        textAnchor="end"
                        height={axisShowDate ? 72 : 60}
                        minTickGap={axisShowDate ? 32 : 22}
                        tickFormatter={(ms) =>
                          formatLocalChartAxisTick(ms, {
                            withDate: axisShowDate,
                          })
                        }
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        {...rechartsTooltipProps}
                        labelFormatter={(_, payload: unknown) => {
                          const ts = (
                            payload as Array<{
                              payload?: { timestamp?: string };
                            }>
                          )?.[0]?.payload?.timestamp;
                          return ts != null ? formatLocalDateTime(ts) : "—";
                        }}
                        formatter={(value) => [
                          value != null && Number.isFinite(Number(value))
                            ? `${Number(value).toFixed(1)}%`
                            : "—",
                          "Usage disque",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="usage"
                        stroke="#2563EB"
                        strokeWidth={2}
                        name="Usage disque (%)"
                        dot={false}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </PerformanceChartCard>
            ) : null}

            {systemRows.length > 0 ? (
              <PerformanceChartCard
                title="Volume disque — utilisé / total"
                periodLabel={rangeLabel}
              >
                <div className="w-full min-h-[220px] sm:min-h-[300px]">
                  <ResponsiveContainer
                    width="100%"
                    height={300}
                    minHeight={220}
                  >
                    <LineChart
                      data={systemRows}
                      margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-50"
                      />
                      <XAxis
                        dataKey="timeMs"
                        type="number"
                        domain={[chartXMin, chartXMax]}
                        angle={axisShowDate ? -40 : -35}
                        textAnchor="end"
                        height={axisShowDate ? 72 : 60}
                        minTickGap={axisShowDate ? 32 : 22}
                        tickFormatter={(ms) =>
                          formatLocalChartAxisTick(ms, {
                            withDate: axisShowDate,
                          })
                        }
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        tickFormatter={(v) => `${Number(v).toFixed(0)} Go`}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        {...rechartsTooltipProps}
                        labelFormatter={(_, payload: unknown) => {
                          const ts = (
                            payload as Array<{
                              payload?: { timestamp?: string };
                            }>
                          )?.[0]?.payload?.timestamp;
                          return ts != null ? formatLocalDateTime(ts) : "—";
                        }}
                        formatter={(value, name) => [
                          value != null && Number.isFinite(Number(value))
                            ? `${Number(value).toFixed(2)} Go`
                            : "—",
                          name === "used" ? "Utilisé" : "Total",
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="used"
                        stroke="#16A34A"
                        strokeWidth={2}
                        name="Utilisé"
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#64748B"
                        strokeWidth={2}
                        name="Total"
                        dot={false}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </PerformanceChartCard>
            ) : null}

            {ioRows.length > 0 ? (
              <PerformanceChartCard
                title="Block I/O cumulé — lecture / écriture"
                periodLabel={rangeLabel}
              >
                <div className="w-full min-h-[220px] sm:min-h-[320px]">
                  <ResponsiveContainer
                    width="100%"
                    height={320}
                    minHeight={220}
                  >
                    <LineChart
                      data={ioRows}
                      margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-50"
                      />
                      <XAxis
                        dataKey="timeMs"
                        type="number"
                        domain={[chartXMin, chartXMax]}
                        angle={axisShowDate ? -40 : -35}
                        textAnchor="end"
                        height={axisShowDate ? 72 : 60}
                        minTickGap={axisShowDate ? 32 : 22}
                        tickFormatter={(ms) =>
                          formatLocalChartAxisTick(ms, {
                            withDate: axisShowDate,
                          })
                        }
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        domain={[0, ioCumulativeMax]}
                        tickFormatter={(v) => `${Number(v).toFixed(0)} Mo`}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        {...rechartsTooltipProps}
                        labelFormatter={(_, payload: unknown) => {
                          const ts = (
                            payload as Array<{
                              payload?: { timestamp?: string };
                            }>
                          )?.[0]?.payload?.timestamp;
                          return ts != null ? formatLocalDateTime(ts) : "—";
                        }}
                        formatter={(value, name) => [
                          value != null && Number.isFinite(Number(value))
                            ? `${Number(value).toFixed(2)} Mo`
                            : "—",
                          name === "readMb" ? "Lecture" : "Écriture",
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="readMb"
                        stroke="#7C3AED"
                        strokeWidth={2}
                        name="Lecture (Mo)"
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="writeMb"
                        stroke="#EA580C"
                        strokeWidth={2}
                        name="Écriture (Mo)"
                        dot={false}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </PerformanceChartCard>
            ) : null}

            {ioRows.length > 0 ? (
              <PerformanceChartCard
                title="Débit Block I/O estimé — Mo/min"
                periodLabel={rangeLabel}
              >
                <div className="w-full min-h-[220px] sm:min-h-[300px]">
                  <ResponsiveContainer
                    width="100%"
                    height={300}
                    minHeight={220}
                  >
                    <LineChart
                      data={ioRows}
                      margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-50"
                      />
                      <XAxis
                        dataKey="timeMs"
                        type="number"
                        domain={[chartXMin, chartXMax]}
                        angle={axisShowDate ? -40 : -35}
                        textAnchor="end"
                        height={axisShowDate ? 72 : 60}
                        minTickGap={axisShowDate ? 32 : 22}
                        tickFormatter={(ms) =>
                          formatLocalChartAxisTick(ms, {
                            withDate: axisShowDate,
                          })
                        }
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        domain={[0, ioRateMax]}
                        tickFormatter={(v) => `${Number(v).toFixed(3)}`}
                        tick={{ fontSize: 11 }}
                        label={{
                          value: "Mo/min",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#9CA3AF",
                          fontSize: 11,
                        }}
                      />
                      <Tooltip
                        {...rechartsTooltipProps}
                        labelFormatter={(_, payload: unknown) => {
                          const ts = (
                            payload as Array<{
                              payload?: { timestamp?: string };
                            }>
                          )?.[0]?.payload?.timestamp;
                          return ts != null ? formatLocalDateTime(ts) : "—";
                        }}
                        formatter={(value, name) => [
                          value != null && Number.isFinite(Number(value))
                            ? `${Number(value).toFixed(4)} Mo/min`
                            : "—",
                          name === "readMbPerMin"
                            ? "Lecture (débit)"
                            : "Écriture (débit)",
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="readMbPerMin"
                        stroke="#4F46E5"
                        strokeWidth={2}
                        name="Lecture (Mo/min)"
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="writeMbPerMin"
                        stroke="#D97706"
                        strokeWidth={2}
                        name="Écriture (Mo/min)"
                        dot={false}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </PerformanceChartCard>
            ) : (
              <PerformanceInfoNotice className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
                Aucun historique Block I/O conteneur exploitable sur cette
                période. Les courbes apparaîtront dès que
                `container_metrics_snapshots.blockReadBytes/blockWriteBytes`
                seront alimentés.
              </PerformanceInfoNotice>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {systemRows.length} point(s) stockage système · {ioRows.length}{" "}
              point(s) Block I/O agrégés · {containersCount} conteneur(s)
              inspectés.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href="/b4ck0ff1ce/services"
            className="inline-flex rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Voir les détails par service
          </Link>
        </div>
    </PerformancePageShell>
  );
}

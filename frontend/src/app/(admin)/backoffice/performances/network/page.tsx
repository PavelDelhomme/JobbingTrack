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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from "recharts";
import { analyticsService } from "@/lib/api/analytics.service";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";
import { useSyncedChartBrushRange } from "@/lib/charts/useSyncedChartBrushRange";
import { pickSystemResponseTimeAvgMsFromRow } from "@/lib/metrics/pickSystemResponseTimeFromRow";
import {
  PerformanceChartCard,
  PerformanceEmptyState,
  PerformanceLoadingState,
  PerformancePageShell,
} from "@/components/performances";
import {
  buildSystemNetworkMbRateRows,
  systemNetworkRateAxisMax,
  type SystemNetworkMbRow,
} from "@/lib/charts/systemMetricsSeriesModel";
import { SystemCpuNetworkCorrelationChart } from "@/components/charts/SystemCpuNetworkCorrelationChart";
import { SeriesExportButtons } from "@/components/monitoring/SeriesExportButtons";
import type { SeriesExportRow } from "@/lib/exports/seriesExport";

const METRIC_GAP_MS = 15 * 60 * 1000;
const TARGET_POINTS = 200;

interface RawNetPoint {
  timestamp: string;
  timeMs?: number;
  rxMb?: number;
  txMb?: number;
  cpu?: number;
  memory?: number;
  responseTimeMs?: number | null;
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

type NetworkSeriesPoint = {
  timeMs: number;
  timestamp: string;
  time: string;
  datetime: string;
  rxMb: number | null;
  txMb: number | null;
  cpu: number | null;
  memory: number | null;
  responseTimeMs: number | null;
};

export default function NetworkPerformancePage() {
  const [series, setSeries] = useState<NetworkSeriesPoint[]>([]);
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
      };
    }
    const { start, end, limit } = getPeriodMs(timeRange, windowEnd);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit,
    };
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

  const load = useCallback(
    async (opts?: { silent?: boolean; signal?: AbortSignal }) => {
      const silent = opts?.silent ?? false;
      beginUserRangeFetch(silent, setSeries, setLoading);
      try {
        const { startDate, endDate, limit } = getParams();
        const raw = await analyticsService.getSystemMetricsHistory({
          startDate,
          endDate,
          limit,
          offset: 0,
          signal: opts?.signal,
        });
        if (opts?.signal?.aborted) return;
        const sorted: RawNetPoint[] = (raw || [])
          .filter((d: { timestamp?: string }) => d.timestamp)
          .map((d: Record<string, unknown>) => {
            const rawTs =
              typeof d.timestamp === "string"
                ? d.timestamp
                : ((d.timestamp as Date)?.toISOString?.() ?? "");
            const ts = normalizeMetricTimestampToIso(rawTs);
            const timeMs = metricRowToTimeMs(d, ts);
            const rxRaw =
              d.networkRxBytes != null
                ? Number(d.networkRxBytes)
                : d.total_network_rx_bytes != null
                  ? Number(d.total_network_rx_bytes)
                  : undefined;
            const txRaw =
              d.networkTxBytes != null
                ? Number(d.networkTxBytes)
                : d.total_network_tx_bytes != null
                  ? Number(d.total_network_tx_bytes)
                  : undefined;
            const cpuRaw =
              d.cpuUsagePercent != null || d.cpu_usage_percent != null
                ? Number(d.cpuUsagePercent ?? d.cpu_usage_percent)
                : undefined;
            const memRaw =
              d.memoryUsagePercent != null || d.memory_usage_percent != null
                ? Number(d.memoryUsagePercent ?? d.memory_usage_percent)
                : undefined;
            const rt = pickSystemResponseTimeAvgMsFromRow(d);
            return {
              timestamp: ts,
              ...(timeMs != null ? { timeMs } : {}),
              rxMb:
                rxRaw != null && !Number.isNaN(rxRaw)
                  ? rxRaw / (1024 * 1024)
                  : undefined,
              txMb:
                txRaw != null && !Number.isNaN(txRaw)
                  ? txRaw / (1024 * 1024)
                  : undefined,
              cpu: cpuRaw != null && !Number.isNaN(cpuRaw) ? cpuRaw : undefined,
              memory:
                memRaw != null && !Number.isNaN(memRaw) ? memRaw : undefined,
              responseTimeMs: rt,
            };
          })
          .sort(
            (a: RawNetPoint, b: RawNetPoint) =>
              (a.timeMs ?? metricTimestampToMs(a.timestamp) ?? 0) -
              (b.timeMs ?? metricTimestampToMs(b.timestamp) ?? 0),
          );
        const withGaps = injectMetricTimeGaps(sorted, METRIC_GAP_MS, [
          "rxMb",
          "txMb",
          "cpu",
          "memory",
          "responseTimeMs",
        ]);
        const keys: (keyof RawNetPoint)[] = [
          "rxMb",
          "txMb",
          "cpu",
          "memory",
          "responseTimeMs",
        ];
        const compressed = compressData(withGaps, TARGET_POINTS, keys);
        setSeries(
          compressed
            .map((p) => {
              const timeMs =
                typeof p.timeMs === "number" && Number.isFinite(p.timeMs)
                  ? p.timeMs
                  : (metricTimestampToMs(p.timestamp) ?? NaN);
              return {
                timeMs,
                timestamp: p.timestamp,
                time: formatLocalChartAxisTick(timeMs, { withDate: false }),
                datetime: formatLocalDateTime(p.timestamp),
                rxMb:
                  p.rxMb != null && !Number.isNaN(p.rxMb)
                    ? Math.round(p.rxMb * 100) / 100
                    : null,
                txMb:
                  p.txMb != null && !Number.isNaN(p.txMb)
                    ? Math.round(p.txMb * 100) / 100
                    : null,
                cpu: p.cpu != null && !Number.isNaN(p.cpu) ? p.cpu : null,
                memory:
                  p.memory != null && !Number.isNaN(p.memory) ? p.memory : null,
                responseTimeMs:
                  p.responseTimeMs != null &&
                  Number.isFinite(Number(p.responseTimeMs))
                    ? Number(p.responseTimeMs)
                    : null,
              };
            })
            .filter((row) => Number.isFinite(row.timeMs)),
        );
      } catch (e) {
        if (isBenignFetchAbort(e)) return;
        console.error(e);
      } finally {
        if (!opts?.signal?.aborted && !silent) setLoading(false);
      }
    },
    [getParams],
  );

  useEffect(() => {
    if (!rangeHydrated) return;
    const silent = silentNextFetch.current;
    silentNextFetch.current = false;
    const controller = new AbortController();
    void load({ silent, signal: controller.signal });
    return () => controller.abort();
  }, [load, softTick, rangeHydrated]);

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

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (useCustomRange) {
      const { start, end } = localCalendarDayBounds(customStart, customEnd);
      return { rangeStart: start, rangeEnd: end };
    }
    const { start, end } = getPeriodMs(timeRange, windowEnd);
    return { rangeStart: start, rangeEnd: end };
  }, [timeRange, windowEnd, useCustomRange, customStart, customEnd]);

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

  const handlePeriodNow = useCallback(() => {
    setUseCustomRange(false);
    setFollowLive(true);
    setWindowEnd(new Date());
  }, []);

  const networkAxisShowDate =
    chartXDomainMax - chartXDomainMin > 24 * 60 * 60 * 1000;

  const mbRows: SystemNetworkMbRow[] = useMemo(
    () =>
      series.map((s) => ({
        timeMs: s.timeMs,
        timestamp: s.timestamp,
        cpu: s.cpu,
        memory: s.memory,
        networkRxMb: s.rxMb,
        networkTxMb: s.txMb,
      })),
    [series],
  );

  const networkRateRows = useMemo(
    () => buildSystemNetworkMbRateRows(mbRows),
    [mbRows],
  );
  const networkRateYMax = useMemo(
    () => systemNetworkRateAxisMax(networkRateRows),
    [networkRateRows],
  );

  const { brushStart, brushEnd, onBrushChange, resetBrush, hasCustomBrush } =
    useSyncedChartBrushRange(series.length, 80);

  const chartBottomMargin = 66;

  const hasNetworkData = useMemo(
    () => series.some((d) => d.rxMb != null || d.txMb != null),
    [series],
  );

  const showCpuNetworkCorrelation = useMemo(() => {
    const hasCpu = series.some(
      (d) => d.cpu != null && Number.isFinite(Number(d.cpu)),
    );
    return hasNetworkData && hasCpu;
  }, [hasNetworkData, series]);

  const showResponseTime = useMemo(
    () =>
      series.some(
        (d) =>
          d.responseTimeMs != null && Number.isFinite(Number(d.responseTimeMs)),
      ),
    [series],
  );

  const exportRows = useMemo<SeriesExportRow[]>(
    () =>
      series.map((row, index) => {
        const rate = networkRateRows[index];
        return {
          timestamp: row.timestamp,
          datetime: row.datetime,
          rx_mb_cumulative: row.rxMb,
          tx_mb_cumulative: row.txMb,
          rx_mb_per_min: rate?.networkRxMbPerMin,
          tx_mb_per_min: rate?.networkTxMbPerMin,
          cpu_percent: row.cpu,
          memory_percent: row.memory,
          response_time_ms: row.responseTimeMs,
        };
      }),
    [series, networkRateRows],
  );

  return (
    <PerformancePageShell
      title="Performances réseau"
      description="Cumul RX/TX, débit estimé (Mo/min), corrélation avec la charge CPU et temps de réponse agrégé quand la persistance les fournit."
      actions={
        <>
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
          <SeriesExportButtons
            rows={exportRows}
            baseName="performances-network-series"
          />
        </>
      }
    >
      {loading && series.length === 0 ? (
        <PerformanceLoadingState />
      ) : series.length === 0 ? (
        <PerformanceEmptyState>
          Aucune donnée réseau disponible. Vérifiez que le metrics-aggregator
          enregistre les métriques système.
        </PerformanceEmptyState>
      ) : !hasNetworkData ? (
        <PerformanceEmptyState>
          Les métriques système sont disponibles, mais les champs réseau RX/TX
          ne sont pas alimentés sur cette période. Vérifiez la persistance
          `networkRxBytes` / `networkTxBytes` ou essayez une plage plus large.
        </PerformanceEmptyState>
      ) : (
        <div className="space-y-8">
          <PerformanceChartCard
            title="Réception (RX) et émission (TX) — Mo (cumul)"
            periodLabel={rangeLabel}
          >
            <div className="w-full min-h-[240px] sm:min-h-[360px]">
              <ResponsiveContainer width="100%" height={360} minHeight={240}>
                <LineChart
                  data={series}
                  margin={{ top: 5, right: 30, left: 20, bottom: chartBottomMargin }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                  <XAxis
                    dataKey="timeMs"
                    type="number"
                    domain={[chartXDomainMin, chartXDomainMax]}
                    angle={networkAxisShowDate ? -40 : -35}
                    textAnchor="end"
                    height={networkAxisShowDate ? 72 : 60}
                    minTickGap={networkAxisShowDate ? 32 : 22}
                    tickFormatter={(ms) =>
                      formatLocalChartAxisTick(ms, {
                        withDate: networkAxisShowDate,
                      })
                    }
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={(v) => `${v} Mo`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    {...rechartsTooltipProps}
                    labelFormatter={(_, payload: unknown) => {
                      const ts = (
                        payload as Array<{ payload?: { timestamp?: string } }>
                      )?.[0]?.payload?.timestamp;
                      return ts != null ? formatLocalDateTime(ts) : "—";
                    }}
                    formatter={(value, name) => {
                      const n =
                        typeof value === "number" ? value : Number(value);
                      const label = name === "rxMb" ? "RX (Mo)" : "TX (Mo)";
                      return [
                        value != null && value !== "" && !Number.isNaN(n)
                          ? `${n.toFixed(2)} Mo`
                          : "—",
                        label,
                      ];
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="rxMb"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    name="RX (Mo)"
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="txMb"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="TX (Mo)"
                    dot={false}
                    connectNulls={false}
                  />
                  <Brush
                    dataKey="timeMs"
                    height={18}
                    travellerWidth={8}
                    startIndex={brushStart}
                    endIndex={brushEnd}
                    tickFormatter={(ms) =>
                      formatLocalChartAxisTick(ms as number, {
                        withDate: networkAxisShowDate,
                      })
                    }
                    onChange={onBrushChange}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </PerformanceChartCard>

          <PerformanceChartCard
            title="Débit estimé — Mo/min"
            periodLabel={rangeLabel}
          >
            <div className="w-full min-h-[220px] sm:min-h-[300px]">
              <ResponsiveContainer width="100%" height={300} minHeight={220}>
                <LineChart
                  data={networkRateRows}
                  margin={{ top: 5, right: 30, left: 20, bottom: chartBottomMargin }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                  <XAxis
                    dataKey="timeMs"
                    type="number"
                    domain={[chartXDomainMin, chartXDomainMax]}
                    angle={networkAxisShowDate ? -40 : -35}
                    textAnchor="end"
                    height={networkAxisShowDate ? 72 : 60}
                    minTickGap={networkAxisShowDate ? 32 : 22}
                    tickFormatter={(ms) =>
                      formatLocalChartAxisTick(ms, {
                        withDate: networkAxisShowDate,
                      })
                    }
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, networkRateYMax]}
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
                        payload as Array<{ payload?: { timestamp?: string } }>
                      )?.[0]?.payload?.timestamp;
                      return ts != null ? formatLocalDateTime(ts) : "—";
                    }}
                    formatter={
                      ((value: number, name: string) => [
                        `${Number(value).toFixed(4)} Mo/min`,
                        name === "networkRxMbPerMin"
                          ? "RX (débit)"
                          : "TX (débit)",
                      ]) as (value: number, name: string) => [string, string]
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="networkRxMbPerMin"
                    stroke="#6366F1"
                    strokeWidth={2}
                    name="RX (Mo/min)"
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="networkTxMbPerMin"
                    stroke="#EA580C"
                    strokeWidth={2}
                    name="TX (Mo/min)"
                    dot={false}
                    connectNulls={false}
                  />
                  <Brush
                    dataKey="timeMs"
                    height={18}
                    travellerWidth={8}
                    startIndex={brushStart}
                    endIndex={brushEnd}
                    tickFormatter={(ms) =>
                      formatLocalChartAxisTick(ms as number, {
                        withDate: networkAxisShowDate,
                      })
                    }
                    onChange={onBrushChange}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </PerformanceChartCard>

          {showResponseTime ? (
            <PerformanceChartCard
              title="Temps de réponse agrégé (ms)"
              periodLabel={rangeLabel}
            >
              <div className="w-full min-h-[220px] sm:min-h-[280px]">
                <ResponsiveContainer width="100%" height={280} minHeight={220}>
                  <LineChart
                    data={series}
                    margin={{ top: 5, right: 30, left: 20, bottom: chartBottomMargin }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-50"
                    />
                    <XAxis
                      dataKey="timeMs"
                      type="number"
                      domain={[chartXDomainMin, chartXDomainMax]}
                      angle={networkAxisShowDate ? -40 : -35}
                      textAnchor="end"
                      height={networkAxisShowDate ? 72 : 60}
                      minTickGap={networkAxisShowDate ? 32 : 22}
                      tickFormatter={(ms) =>
                        formatLocalChartAxisTick(ms, {
                          withDate: networkAxisShowDate,
                        })
                      }
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(Number(v))} ms`}
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
                      formatter={
                        ((value: number) => [
                          value != null && Number.isFinite(Number(value))
                            ? `${Number(value).toFixed(1)} ms`
                            : "—",
                          "Temps de réponse",
                        ]) as (value: number) => [string, string]
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="responseTimeMs"
                      stroke="#0D9488"
                      strokeWidth={2}
                      name="Temps de réponse (ms)"
                      dot={false}
                      connectNulls={false}
                    />
                    <Brush
                      dataKey="timeMs"
                      height={18}
                      travellerWidth={8}
                      startIndex={brushStart}
                      endIndex={brushEnd}
                      tickFormatter={(ms) =>
                        formatLocalChartAxisTick(ms as number, {
                          withDate: networkAxisShowDate,
                        })
                      }
                      onChange={onBrushChange}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </PerformanceChartCard>
          ) : null}

          {showCpuNetworkCorrelation ? (
            <PerformanceChartCard
              title="Corrélation CPU (%) vs débit réseau (Mo/min)"
              periodLabel={rangeLabel}
            >
              <SystemCpuNetworkCorrelationChart
                rows={networkRateRows}
                xDomainMin={chartXDomainMin}
                xDomainMax={chartXDomainMax}
                axisShowDate={networkAxisShowDate}
                rateMax={networkRateYMax}
                height={320}
                brushStartIndex={brushStart}
                brushEndIndex={brushEnd}
                onBrushChange={onBrushChange}
              />
            </PerformanceChartCard>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <p>
              {series.length} points affichés après compression (max{" "}
              {TARGET_POINTS}) pour lisibilité.
            </p>
            <p>
              Glissez la barre sous un graphe pour zoomer la même fenêtre sur
              tous les graphes de la page.
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
        </div>
      )}
    </PerformancePageShell>
  );
}

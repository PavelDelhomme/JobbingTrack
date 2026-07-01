"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  getPeriodMs,
  formatRangeLabel,
  formatCustomRangeLabel,
  type TimeRangeOption,
  useAnalyticsAutoRefresh,
  ymdLocal,
} from "@/components/analytics";
import { localCalendarDayBounds } from "@/components/analytics/timeRangeUtils";

export function useApplicationTimeRange(options?: {
  liveRefreshMs?: number;
  initialTimeRange?: TimeRangeOption;
}) {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>(
    options?.initialTimeRange ?? "24h",
  );
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
    intervalMs: options?.liveRefreshMs ?? 45000,
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

  const rangeQuery = useMemo(() => {
    const startDate = rangeStart.toISOString();
    const endDate = rangeEnd.toISOString();
    return `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  }, [rangeStart, rangeEnd]);

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

  const handleClearCustomRange = useCallback(() => {
    setUseCustomRange(false);
    setFollowLive(true);
    setWindowEnd(new Date());
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setCustomStart(ymdLocal(d));
    setCustomEnd(ymdLocal());
    setSoftTick((t) => t + 1);
  }, []);

  const consumeSilentFetch = useCallback(() => {
    const silent = silentNextFetch.current;
    silentNextFetch.current = false;
    return silent;
  }, []);

  return {
    timeRange,
    setTimeRange,
    useCustomRange,
    setUseCustomRange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    rangeLabel,
    rangeQuery,
    rangeStart,
    rangeEnd,
    goPrev,
    goNext,
    canGoNext,
    handlePeriodNow,
    handleClearCustomRange,
    softTick,
    consumeSilentFetch,
    bumpSoftRefresh,
  };
}

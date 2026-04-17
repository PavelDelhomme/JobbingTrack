'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { TimeRangeOption } from './TimeRangeSelector';

const STORAGE_KEY = 'jobbingtrack:analytics:shared-time-v1';

type StoredShape = {
  timeRange?: unknown;
  useCustomRange?: unknown;
  customStart?: unknown;
  customEnd?: unknown;
  windowEndIso?: unknown;
  followLive?: unknown;
};

const VALID_RANGES: readonly string[] = [
  'today',
  '1h',
  '6h',
  '24h',
  '3d',
  '7d',
  '14d',
  '21d',
  '30d',
];

function isTimeRangeOption(v: unknown): v is TimeRangeOption {
  return typeof v === 'string' && VALID_RANGES.includes(v);
}

function isYmdLocal(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * Lit / écrit dans localStorage la même fenêtre temporelle pour les pages
 * analytics système (performances, réseau, conteneurs) afin de garder la
 * dernière période choisie entre navigations.
 */
export function usePersistedSharedAnalyticsRange({
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
}: {
  timeRange: TimeRangeOption;
  setTimeRange: Dispatch<SetStateAction<TimeRangeOption>>;
  useCustomRange: boolean;
  setUseCustomRange: Dispatch<SetStateAction<boolean>>;
  customStart: string;
  setCustomStart: Dispatch<SetStateAction<string>>;
  customEnd: string;
  setCustomEnd: Dispatch<SetStateAction<string>>;
  windowEnd: Date;
  setWindowEnd: Dispatch<SetStateAction<Date>>;
  followLive: boolean;
  setFollowLive: Dispatch<SetStateAction<boolean>>;
}): void {
  const didRestore = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (didRestore.current) return;
    didRestore.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as StoredShape;
      if (isTimeRangeOption(p.timeRange)) setTimeRange(p.timeRange);
      if (typeof p.useCustomRange === 'boolean') setUseCustomRange(p.useCustomRange);
      if (isYmdLocal(p.customStart)) setCustomStart(p.customStart);
      if (isYmdLocal(p.customEnd)) setCustomEnd(p.customEnd);
      if (typeof p.followLive === 'boolean') setFollowLive(p.followLive);
      if (typeof p.followLive === 'boolean' && p.followLive) {
        setWindowEnd(new Date());
      } else if (typeof p.windowEndIso === 'string' && p.windowEndIso) {
        const d = new Date(p.windowEndIso);
        if (!Number.isNaN(d.getTime())) setWindowEnd(d);
      }
    } catch {
      /* ignore */
    }
  }, [
    setTimeRange,
    setUseCustomRange,
    setCustomStart,
    setCustomEnd,
    setWindowEnd,
    setFollowLive,
  ]);

  const persistRuns = useRef(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistRuns.current += 1;
    if (persistRuns.current <= 1) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          timeRange,
          useCustomRange,
          customStart,
          customEnd,
          windowEndIso: windowEnd.toISOString(),
          followLive,
        })
      );
    } catch {
      /* quota / navigation privée */
    }
  }, [timeRange, useCustomRange, customStart, customEnd, windowEnd, followLive]);
}

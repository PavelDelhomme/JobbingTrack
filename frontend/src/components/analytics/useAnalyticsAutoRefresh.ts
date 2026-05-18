"use client";

import { useEffect, useRef } from "react";

/** Date locale `YYYY-MM-DD` (alignée sur les champs `<input type="date">`). */
export function ymdLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Actualisation périodique des graphiques analytics :
 * - préréglages glissants : avance la borne droite sur « maintenant » si `followLive` ;
 * - plage personnalisée : pas d’actualisation, sauf si la date de fin = aujourd’hui (rafraîchissement doux uniquement).
 */
export function useAnalyticsAutoRefresh(opts: {
  followLive: boolean;
  useCustomRange: boolean;
  customEnd: string;
  intervalMs?: number;
  bumpWindowEndToNow: () => void;
  bumpSoftRefresh: () => void;
}) {
  const {
    followLive,
    useCustomRange,
    customEnd,
    intervalMs = 45000,
    bumpWindowEndToNow,
    bumpSoftRefresh,
  } = opts;

  const winRef = useRef(bumpWindowEndToNow);
  const softRef = useRef(bumpSoftRefresh);
  winRef.current = bumpWindowEndToNow;
  softRef.current = bumpSoftRefresh;

  useEffect(() => {
    const presetLive = !useCustomRange && followLive;
    const customEndsToday = useCustomRange && customEnd === ymdLocal();
    if (!presetLive && !customEndsToday) return;

    const id = setInterval(() => {
      if (presetLive) winRef.current();
      else softRef.current();
    }, intervalMs);

    return () => clearInterval(id);
  }, [useCustomRange, followLive, customEnd, intervalMs]);
}

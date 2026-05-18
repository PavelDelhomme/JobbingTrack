import type { TimeRangeOption } from "./TimeRangeSelector";
import { displayTimeZoneOptions } from "@/lib/utils/date";

export function getPeriodMs(
  range: TimeRangeOption,
  windowEnd: Date,
): { start: Date; end: Date; limit: number } {
  const end = new Date(windowEnd);
  let start: Date;
  let limit: number;
  switch (range) {
    case "today": {
      start = new Date(end);
      start.setHours(0, 0, 0, 0);
      const endOfDay = new Date(start);
      endOfDay.setHours(23, 59, 59, 999);
      const effectiveEnd = end.getTime() > endOfDay.getTime() ? endOfDay : end;
      limit = Math.min(
        1440,
        Math.ceil((effectiveEnd.getTime() - start.getTime()) / (60 * 1000)),
      );
      return { start, end: effectiveEnd, limit };
    }
    case "1h":
      start = new Date(end.getTime() - 60 * 60 * 1000);
      limit = 60;
      break;
    case "6h":
      start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
      limit = 360;
      break;
    case "24h":
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      limit = 1440;
      break;
    case "3d":
      start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
      limit = 4320;
      break;
    case "7d":
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      limit = 10080;
      break;
    case "14d":
      start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);
      limit = 20160;
      break;
    case "21d":
      start = new Date(end.getTime() - 21 * 24 * 60 * 60 * 1000);
      limit = 30240;
      break;
    case "30d":
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      limit = 43200;
      break;
    default:
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      limit = 1440;
  }
  return { start, end, limit };
}

function defaultLocale(): string {
  if (typeof navigator !== "undefined" && navigator.language)
    return navigator.language;
  return "fr-FR";
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

/** Borne locale : « jeu. 09/04 — 23:30 » (jour court + date + heure). Même fuseau que les graphiques (`displayTimeZoneOptions`). */
export function formatRangeEndpoint(
  d: Date,
  locale: string = defaultLocale(),
): string {
  const tz = displayTimeZoneOptions();
  const wd = capitalizeFirst(
    new Intl.DateTimeFormat(locale, { weekday: "short", ...tz }).format(d),
  );
  const dm = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    ...tz,
  }).format(d);
  const hm = new Intl.DateTimeFormat(locale, {
    ...tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${wd} ${dm} — ${hm}`;
}

/**
 * Libellé de plage pour la navigation ◀ ▶ (fuseau local du navigateur).
 * Fenêtres courtes : deux bornes explicites (évite « 23:30 – 23:30 » ambigu).
 */
export function formatRangeLabel(
  start: Date,
  end: Date,
  range: TimeRangeOption,
): string {
  const locale = defaultLocale();
  if (range === "today") {
    return `${formatRangeEndpoint(start, locale)}  →  ${formatRangeEndpoint(end, locale)} (journée locale)`;
  }
  if (range === "1h" || range === "6h" || range === "24h") {
    return `${formatRangeEndpoint(start, locale)}  →  ${formatRangeEndpoint(end, locale)}`;
  }
  return `${formatRangeEndpoint(start, locale)}  →  ${formatRangeEndpoint(end, locale)}`;
}

/** Plage « date seule » (saisie calendrier), interprétée en date locale minuit → fin de journée locale. */
export function formatCustomRangeLabel(
  ymdStart: string,
  ymdEnd: string,
): string {
  const locale = defaultLocale();
  const [ys, ms, ds] = ymdStart.split("-").map((x) => parseInt(x, 10));
  const [ye, me, de] = ymdEnd.split("-").map((x) => parseInt(x, 10));
  if ([ys, ms, ds, ye, me, de].some((n) => Number.isNaN(n))) {
    return `Du ${ymdStart} au ${ymdEnd}`;
  }
  const s = new Date(ys, ms - 1, ds, 0, 0, 0, 0);
  const e = new Date(ye, me - 1, de, 23, 59, 59, 999);
  return `${formatRangeEndpoint(s, locale)}  →  ${formatRangeEndpoint(e, locale)} (plage calendaire locale)`;
}

/** `YYYY-MM-DD` du date picker → minuit **local** et fin de journée **locale** (pas minuit UTC). */
export function localCalendarDayBounds(
  ymdStart: string,
  ymdEnd: string,
): { start: Date; end: Date } {
  const parseDay = (ymd: string, endOfDay: boolean): Date => {
    const parts = ymd
      .trim()
      .split("-")
      .map((x) => parseInt(x, 10));
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    if (!y || !m || !d) return new Date(NaN);
    return endOfDay
      ? new Date(y, m - 1, d, 23, 59, 59, 999)
      : new Date(y, m - 1, d, 0, 0, 0, 0);
  };
  return { start: parseDay(ymdStart, false), end: parseDay(ymdEnd, true) };
}

import type { StatisticsTimelineEntry } from "@/lib/services/statisticsService";
import { metricTimestampToMs } from "@/lib/utils/date";

export interface StatisticsTimelineResult {
  timeline: StatisticsTimelineEntry[];
  note: string | null;
  timeRange: string | null;
  limit: number | null;
}

export const APP_DATA_SERIES_OPTIONS = [
  { key: "applications", label: "Candidatures", color: "#7c3aed" },
  { key: "users", label: "Utilisateurs", color: "#2563eb" },
  { key: "companies", label: "Entreprises", color: "#059669" },
  { key: "contacts", label: "Contacts", color: "#ea580c" },
  { key: "interviews", label: "Entretiens", color: "#dc2626" },
  { key: "calls", label: "Appels", color: "#0891b2" },
  { key: "followups", label: "Relances", color: "#ca8a04" },
  { key: "events", label: "Événements", color: "#be123c" },
] as const;

export type AppDataSeriesKey = (typeof APP_DATA_SERIES_OPTIONS)[number]["key"];

/** Convertit une fenêtre en jours vers le paramètre API `time_range`. */
export function periodDaysToTimeRange(periodDays: number): string {
  if (periodDays <= 1) return "24h";
  return `${periodDays}d`;
}

export function appDataSampleRangeLabel(
  rows: Array<{ timeMs: number }>,
  periodDays: number,
): string | null {
  if (rows.length === 0) return null;
  const now = Date.now();
  const rangeStart = now - periodDays * 24 * 60 * 60 * 1000;
  let minMs = rows[0]?.timeMs ?? null;
  let maxMs = rows[0]?.timeMs ?? null;
  for (const row of rows) {
    if (!Number.isFinite(row.timeMs)) continue;
    if (minMs == null || row.timeMs < minMs) minMs = row.timeMs;
    if (maxMs == null || row.timeMs > maxMs) maxMs = row.timeMs;
  }
  if (minMs == null || maxMs == null) return null;
  const fmt = (ms: number) =>
    new Date(ms).toLocaleString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  const clampedMin = Math.max(minMs, rangeStart);
  const clampedMax = Math.min(maxMs, now);
  return `${fmt(clampedMin)} → ${fmt(clampedMax)}`;
}

export function buildAppDataChartRows(
  timeline: StatisticsTimelineEntry[],
): Array<{
  timeMs: number;
  label: string;
  applications: number;
  users: number;
  companies: number;
  contacts: number;
  interviews: number;
  calls: number;
  followups: number;
  events: number;
}> {
  return timeline
    .map((row) => {
      const ms = metricTimestampToMs(row.timestamp);
      return {
        timeMs: ms ?? NaN,
        label: row.timestamp,
        applications: row.total_applications,
        users: row.total_users,
        companies: row.total_companies,
        contacts: row.total_contacts,
        interviews: row.total_interviews,
        calls: row.total_calls ?? 0,
        followups: row.total_followups ?? 0,
        events: row.total_events ?? 0,
      };
    })
    .filter((row) => Number.isFinite(row.timeMs))
    .sort((a, b) => a.timeMs - b.timeMs);
}

export function normalizeStatisticsTimelineResponse(
  payload: unknown,
): StatisticsTimelineResult {
  if (!payload || typeof payload !== "object") {
    return { timeline: [], note: null, timeRange: null, limit: null };
  }

  const data = payload as {
    timeline?: unknown;
    note?: unknown;
    time_range?: unknown;
    limit?: unknown;
  };
  const limit =
    typeof data.limit === "number" && Number.isFinite(data.limit)
      ? data.limit
      : typeof data.limit === "string" && Number.isFinite(Number(data.limit))
        ? Number(data.limit)
        : null;

  return {
    timeline: Array.isArray(data.timeline)
      ? (data.timeline as StatisticsTimelineEntry[])
      : [],
    note: typeof data.note === "string" && data.note.trim() ? data.note : null,
    timeRange:
      typeof data.time_range === "string" && data.time_range.trim()
        ? data.time_range
        : null,
    limit,
  };
}

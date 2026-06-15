import type { StatisticsTimelineEntry } from "@/lib/services/statisticsService";

export interface StatisticsTimelineResult {
  timeline: StatisticsTimelineEntry[];
  note: string | null;
  timeRange: string | null;
  limit: number | null;
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

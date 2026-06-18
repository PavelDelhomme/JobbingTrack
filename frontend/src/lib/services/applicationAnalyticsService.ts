import axios from "axios";
import { FRONTEND_URLS } from "@/config/ports.config";

export interface ApplicationAnalyticsEvent {
  id: string;
  eventType: string;
  eventName: string;
  category?: string | null;
  page?: string | null;
  platform?: string | null;
  deviceId?: string | null;
  sessionId?: string | null;
  appVersion?: string | null;
  userId?: string | null;
  timestamp: string;
  properties?: Record<string, unknown> | null;
}

export interface ApplicationPerformanceMetric {
  id: string;
  metricType: string;
  metricName: string;
  duration?: number | null;
  memoryUsage?: number | null;
  networkLatency?: number | null;
  cpuUsage?: number | null;
  value?: number | null;
  page?: string | null;
  platform?: string | null;
  deviceId?: string | null;
  sessionId?: string | null;
  appVersion?: string | null;
  userId?: string | null;
  timestamp: string;
}

export interface AnalyticsPaginationMeta {
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

export interface PaginatedAnalyticsResult<T> {
  data: T[];
  pagination: AnalyticsPaginationMeta;
}

export interface CrashReportSummary {
  id: string;
  timestamp: string;
  crashType: string;
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function buildParams(
  rangeQuery: string,
  extra: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();
  for (const part of rangeQuery.split("&")) {
    const [k, v] = part.split("=");
    if (k && v) params.set(k, decodeURIComponent(v));
  }
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  return params;
}

export async function fetchApplicationEvents(
  token: string,
  rangeQuery: string,
  filters?: { eventType?: string; eventName?: string; limit?: number; offset?: number },
): Promise<PaginatedAnalyticsResult<ApplicationAnalyticsEvent>> {
  const params = buildParams(rangeQuery, {
    scope: "application",
    platform: "mobile",
    limit: filters?.limit ?? 200,
    offset: filters?.offset ?? 0,
    eventType: filters?.eventType,
    eventName: filters?.eventName,
  });

  const res = await axios.get(
    `${FRONTEND_URLS.api}/api/v1/analytics/events?${params.toString()}`,
    { headers: authHeaders(token) },
  );
  if (!res.data?.success) {
    return {
      data: [],
      pagination: { total: 0, limit: filters?.limit ?? 200, offset: 0, pages: 0 },
    };
  }
  return {
    data: res.data.data ?? [],
    pagination: res.data.pagination ?? {
      total: (res.data.data ?? []).length,
      limit: filters?.limit ?? 200,
      offset: filters?.offset ?? 0,
      pages: 1,
    },
  };
}

export async function fetchApplicationPerformance(
  token: string,
  rangeQuery: string,
  options?: { limit?: number; offset?: number; metricType?: string },
): Promise<PaginatedAnalyticsResult<ApplicationPerformanceMetric>> {
  const params = buildParams(rangeQuery, {
    scope: "application",
    platform: "mobile",
    limit: options?.limit ?? 200,
    offset: options?.offset ?? 0,
    metricType: options?.metricType,
  });

  const res = await axios.get(
    `${FRONTEND_URLS.api}/api/v1/analytics/performance?${params.toString()}`,
    { headers: authHeaders(token) },
  );
  if (!res.data?.success) {
    return {
      data: [],
      pagination: { total: 0, limit: options?.limit ?? 200, offset: 0, pages: 0 },
    };
  }
  return {
    data: res.data.data ?? [],
    pagination: res.data.pagination ?? {
      total: (res.data.data ?? []).length,
      limit: options?.limit ?? 200,
      offset: options?.offset ?? 0,
      pages: 1,
    },
  };
}

export async function fetchCrashReports(
  token: string,
  limit = 100,
): Promise<CrashReportSummary[]> {
  const res = await axios.get(
    `${FRONTEND_URLS.api}/api/v1/crashes?limit=${limit}`,
    { headers: authHeaders(token) },
  );
  if (!res.data?.success) return [];
  return res.data.data ?? [];
}

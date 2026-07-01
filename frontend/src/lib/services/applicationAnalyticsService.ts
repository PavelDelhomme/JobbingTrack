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

export interface ApplicationAnalyticsError {
  id: string;
  errorType: string;
  errorName: string;
  errorMessage: string;
  severity: string;
  page?: string | null;
  platform?: string | null;
  deviceId?: string | null;
  appVersion?: string | null;
  resolved: boolean;
  timestamp: string;
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
  const base =
    typeof window !== "undefined"
      ? ""
      : FRONTEND_URLS.api.replace(/\/$/, "");
  const res = await axios.get(
    `${base}/api/v1/crashes?limit=${limit}`,
    { headers: authHeaders(token) },
  );
  if (!res.data?.success) return [];
  return res.data.data ?? [];
}

export async function fetchApplicationErrors(
  token: string,
  rangeQuery: string,
  options?: {
    limit?: number;
    offset?: number;
    resolved?: boolean;
    severity?: string;
    excludeFeedback?: boolean;
  },
): Promise<PaginatedAnalyticsResult<ApplicationAnalyticsError>> {
  const params = buildParams(rangeQuery, {
    scope: "application",
    platform: "mobile",
    limit: options?.limit ?? 100,
    offset: options?.offset ?? 0,
    resolved:
      options?.resolved === undefined
        ? undefined
        : options.resolved
          ? "true"
          : "false",
    severity: options?.severity,
    excludeFeedback:
      options?.excludeFeedback === true ? "true" : undefined,
  });

  const res = await axios.get(
    `${FRONTEND_URLS.api}/api/v1/analytics/errors?${params.toString()}`,
    { headers: authHeaders(token) },
  );
  if (!res.data?.success) {
    return {
      data: [],
      pagination: { total: 0, limit: options?.limit ?? 100, offset: 0, pages: 0 },
    };
  }
  return {
    data: res.data.data ?? [],
    pagination: res.data.pagination ?? {
      total: (res.data.data ?? []).length,
      limit: options?.limit ?? 100,
      offset: options?.offset ?? 0,
      pages: 1,
    },
  };
}

export async function resolveApplicationError(
  token: string,
  errorId: string,
  resolved = true,
): Promise<void> {
  await axios.patch(
    `${FRONTEND_URLS.api}/api/v1/analytics/errors/${encodeURIComponent(errorId)}/resolve`,
    { resolved },
    { headers: authHeaders(token) },
  );
}

export async function purgeMobileMonitoringData(token: string): Promise<{
  deletedErrors: number;
  deletedEvents: number;
  deletedPerformance: number;
}> {
  const res = await axios.delete(
    `${FRONTEND_URLS.api}/api/v1/analytics/mobile-monitoring/purge`,
    { headers: authHeaders(token) },
  );
  if (!res.data?.success) {
    throw new Error(res.data?.error || "Purge mobile échouée");
  }
  return res.data.data ?? { deletedErrors: 0, deletedEvents: 0, deletedPerformance: 0 };
}

export async function purgeCrashReports(token: string): Promise<{ deletedFiles: number }> {
  const res = await axios.delete(`${FRONTEND_URLS.api}/api/v1/crashes`, {
    headers: authHeaders(token),
  });
  if (!res.data?.success) {
    throw new Error(res.data?.error || "Purge crashs échouée");
  }
  return res.data.data ?? { deletedFiles: 0 };
}

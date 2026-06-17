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
  value?: number | null;
  page?: string | null;
  platform?: string | null;
  deviceId?: string | null;
  timestamp: string;
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

export async function fetchApplicationEvents(
  token: string,
  rangeQuery: string,
  filters?: { eventType?: string; eventName?: string },
): Promise<ApplicationAnalyticsEvent[]> {
  const params = new URLSearchParams({
    scope: "application",
    platform: "mobile",
    limit: "200",
  });
  for (const part of rangeQuery.split("&")) {
    const [k, v] = part.split("=");
    if (k && v) params.set(k, decodeURIComponent(v));
  }
  if (filters?.eventType) params.set("eventType", filters.eventType);
  if (filters?.eventName) params.set("eventName", filters.eventName);

  const res = await axios.get(
    `${FRONTEND_URLS.api}/api/v1/analytics/events?${params.toString()}`,
    { headers: authHeaders(token) },
  );
  if (!res.data?.success) return [];
  return res.data.data ?? [];
}

export async function fetchApplicationPerformance(
  token: string,
  rangeQuery: string,
): Promise<ApplicationPerformanceMetric[]> {
  const params = new URLSearchParams({
    scope: "application",
    platform: "mobile",
    limit: "200",
  });
  for (const part of rangeQuery.split("&")) {
    const [k, v] = part.split("=");
    if (k && v) params.set(k, decodeURIComponent(v));
  }

  const res = await axios.get(
    `${FRONTEND_URLS.api}/api/v1/analytics/performance?${params.toString()}`,
    { headers: authHeaders(token) },
  );
  if (!res.data?.success) return [];
  return res.data.data ?? [];
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

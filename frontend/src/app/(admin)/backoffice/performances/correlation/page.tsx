"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { PerformancesSubNav } from "../PerformancesSubNav";
import { analyticsService } from "@/lib/api/analytics.service";
import { FRONTEND_URLS } from "@/config/ports.config";
import {
  normalizeMetricTimestampToIso,
  metricRowToTimeMs,
  formatLocalChartAxisTick,
} from "@/lib/utils/date";
import {
  buildIncidentEmptyReason,
  formatIncidentTableCell,
} from "@/lib/metrics/performanceCorrelationModel";
import {
  enrichAggLogRows,
  isCorrelationTableEligibleRow,
  isIpLikeString,
  mergeAggLogMetadata,
  readFirstIpFromUnknownList,
} from "@/lib/metrics/incidentForensics";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Brush,
} from "recharts";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";

type PerfMode = "light" | "full";

const PERF_MODE_STORAGE_KEY = "jobbingtrack-perf-correlation-mode";
const AUTO_REFRESH_STORAGE_KEY = "jobbingtrack-perf-correlation-auto-refresh";
const FETCH_CONCURRENCY = 3;
const MERGE_SYSTEM_MAX_DELTA_MS = 180_000;
const MERGE_AVAILABILITY_MAX_DELTA_MS = 120_000;
const INCIDENT_ALIGNMENT_MAX_DELTA_MS = 45 * 60 * 1000;
const DEFAULT_FOCUS_SERVICE_HINTS = [
  "jobbingtrack-security-service",
  "jobbingtrack-auth-service",
  "jobbingtrack-contact-service",
  "jobbingtrack-api-gateway",
  "jobbingtrack-metrics-aggregator",
];

function readStoredPerfMode(): PerfMode {
  if (typeof window === "undefined") return "light";
  try {
    const v = window.sessionStorage.getItem(PERF_MODE_STORAGE_KEY);
    return v === "full" ? "full" : "light";
  } catch {
    return "light";
  }
}

function readStoredAutoRefreshEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(AUTO_REFRESH_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function limitsForMode(mode: PerfMode) {
  if (mode === "full") {
    return {
      maxHistoriesLoaded: 24,
      historyLimit: 120,
      systemHistoryLimit: 360,
      pointsPerSubchart: 180,
      autoRefreshMs: 120_000,
      subChartHeight: 120,
    };
  }
  return {
    maxHistoriesLoaded: 8,
    historyLimit: 90,
    systemHistoryLimit: 180,
    pointsPerSubchart: 160,
    autoRefreshMs: 90_000,
    subChartHeight: 102,
  };
}

/** Plage personnalisée : au-delà, on tronque côté client (requêtes déjà plafonnées). */
const MAX_CUSTOM_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type WindowMode = "preset" | "custom";

function computeQueryBounds(params: {
  windowMode: WindowMode;
  presetHours: number;
  appliedCustom: { startIso: string; endIso: string } | null;
}): { start: Date; end: Date } {
  const now = new Date();
  if (params.windowMode === "custom" && params.appliedCustom) {
    const start = new Date(params.appliedCustom.startIso);
    const end = new Date(params.appliedCustom.endIso);
    if (
      Number.isFinite(start.getTime()) &&
      Number.isFinite(end.getTime()) &&
      start < end
    ) {
      let s = start;
      let e = end;
      if (e > now) e = now;
      if (e <= s) {
        s = new Date(e.getTime() - 60 * 60 * 1000);
      }
      if (e.getTime() - s.getTime() > MAX_CUSTOM_RANGE_MS) {
        s = new Date(e.getTime() - MAX_CUSTOM_RANGE_MS);
      }
      return { start: s, end: e };
    }
  }
  const h = Math.max(1, params.presetHours);
  return { start: new Date(now.getTime() - h * 3600 * 1000), end: now };
}

function hoursBetween(start: Date, end: Date): number {
  return Math.max(1 / 60, (end.getTime() - start.getTime()) / (3600 * 1000));
}

function scaledFetchLimits(
  hours: number,
  base: ReturnType<typeof limitsForMode>,
): { historyLimit: number; systemHistoryLimit: number } {
  const days = hours / 24;
  const mult = Math.min(40, Math.max(1, Math.ceil(days)));
  return {
    historyLimit: Math.min(12000, Math.floor(base.historyLimit * mult)),
    systemHistoryLimit: Math.min(
      20000,
      Math.floor(base.systemHistoryLimit * mult),
    ),
  };
}

async function promisePool<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    out.push(...(await Promise.all(chunk.map(mapper))));
  }
  return out;
}

/** Évite qu’un appel metrics optionnel fasse échouer tout le lot (stats live Docker). */
async function settleMetricCall<T>(
  promise: Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

type ContainerPoint = {
  timeMs: number;
  timestamp: string;
  cpu: number | null;
  memory: number | null;
  networkRxMb: number | null;
  networkTxMb: number | null;
  ioReadMb: number | null;
  ioWriteMb: number | null;
};

type SystemPoint = {
  timeMs: number;
  timestamp: string;
  system_cpu: number | null;
  system_memory: number | null;
};

type WithSystemPoint = ContainerPoint & {
  system_cpu: number | null;
  system_memory: number | null;
};

type AvailabilityPoint = {
  timeMs: number;
  responseTimeMs: number | null;
};

type AvailabilityStatsLike = Record<string, unknown> & {
  lastCheck?: Record<string, unknown> | null;
};

type ServiceDataQuality = {
  ioPoints: number;
  totalPoints: number;
  trSource: "history" | "stats-fallback" | "none";
  trPoints: number;
};

type MergedServicePoint = WithSystemPoint & {
  /** Temps de réponse du health check **de ce service** (`service_availability_history`). */
  responseTimeMs: number | null;
};

function readNumericField(
  row: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const raw = row[key];
    if (raw == null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readMetricValueAsMb(
  row: Record<string, unknown>,
  byteKeys: string[],
  mbKeys: string[],
): number | null {
  const asBytes = readNumericField(row, byteKeys);
  if (asBytes != null) return asBytes / (1024 * 1024);
  const asMb = readNumericField(row, mbKeys);
  if (asMb != null) return asMb;
  return null;
}

function readNestedNumber(
  obj: Record<string, unknown>,
  path: string[],
): number | null {
  let cur: unknown = obj;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  const n = Number(cur);
  return Number.isFinite(n) ? n : null;
}

type AggLogRow = {
  id?: string | null;
  level?: string | null;
  message?: string | null;
  serviceName?: string | null;
  timestamp?: string | Date;
  eventType?: string | null;
  requestId?: string | null;
  method?: string | null;
  httpMethod?: string | null;
  endpoint?: string | null;
  path?: string | null;
  url?: string | null;
  sourceIP?: string | null;
  sourceIp?: string | null;
  source_ip?: string | null;
  clientIp?: string | null;
  client_ip?: string | null;
  ip?: string | null;
  statusCode?: string | number | null;
  httpStatus?: string | number | null;
  metadata?: Record<string, unknown> | null;
};

type SecurityLogApiRow = {
  id?: string | null;
  timestamp?: string | Date;
  level?: string | null;
  category?: string | null;
  eventType?: string | null;
  message?: string | null;
  sourceIP?: string | null;
  userId?: string | null;
  endpoint?: string | null;
  method?: string | null;
  statusCode?: number | string | null;
  responseTime?: number | string | null;
  isBlocked?: boolean | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type FocusIncidentSummary = {
  total: number;
  errorCount: number;
  warnCount: number;
  securitySignals: number;
};

type IncidentContextFieldKey =
  | "requestId"
  | "httpMethod"
  | "endpoint"
  | "ip"
  | "httpStatus"
  | "protocol"
  | "port";

type IncidentContextFieldDiagnostic = {
  field: IncidentContextFieldKey;
  label: string;
  value: string | null;
  /** Où la valeur a été lue (ou pourquoi elle est absente). */
  sourceTechnical: string;
  /** Détail si valeur vide. */
  emptyDetail: string | null;
  /** Action côté services / logs pour combler le trou. */
  fixHint: string | null;
};

type FocusIncidentAlignedRow = {
  timestamp: string;
  level: string;
  requestId: string | null;
  httpMethod: string | null;
  endpoint: string | null;
  ip: string | null;
  protocol: string | null;
  port: string | null;
  /** Code HTTP issu des métadonnées persistées (ex. proxy gateway : upstreamHttpStatus). */
  httpStatus: string | null;
  message: string;
  nearestCpu: number | null;
  nearestMemory: number | null;
  nearestRtMs: number | null;
  deltaSec: number | null;
  emptyReason: string | null;
  /** Log brut agrégateur (diagnostic champ par champ). */
  rawLog: AggLogRow;
};

type SortDirection = "asc" | "desc" | null;
type SummarySortKey =
  | "name"
  | "points"
  | "cpuMax"
  | "memMax"
  | "netDeltaMb"
  | "ioDeltaMb"
  | "rtMaxMs"
  | "rtLastMs";
type IncidentSortKey =
  | "timestamp"
  | "level"
  | "requestId"
  | "httpMethod"
  | "endpoint"
  | "ip"
  | "httpStatus"
  | "nearestCpu"
  | "nearestMemory"
  | "nearestRtMs"
  | "deltaSec";

function hoursFromBounds(start: Date, end: Date): number {
  return Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (3600 * 1000)),
  );
}

function countSecuritySignalsInLogs(rows: AggLogRow[]): number {
  return rows.filter((row) => {
    const eventType = String(row.eventType || "").toLowerCase();
    const msg = String(row.message || "").toLowerCase();
    return (
      eventType.includes("threat") ||
      eventType.includes("waf") ||
      eventType.includes("intrusion") ||
      msg.includes("sql_injection") ||
      msg.includes("sql injection") ||
      msg.includes("<script") ||
      msg.includes("xss") ||
      msg.includes("waf") ||
      msg.includes("blocked ip") ||
      msg.includes("suspicious")
    );
  }).length;
}

function readLooseString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function firstMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[],
): string | null {
  if (!metadata) return null;
  for (const key of keys) {
    const value = readLooseString(metadata[key]);
    if (value) return value;
  }
  return null;
}

function serviceAliasesForName(name: string): string[] {
  const clean = String(name || "").trim();
  if (!clean) return [];
  const noPrefix = clean.replace(/^jobbingtrack-/, "");
  const withPrefix = noPrefix.startsWith("jobbingtrack-")
    ? noPrefix
    : `jobbingtrack-${noPrefix}`;
  return Array.from(new Set([clean, noPrefix, withPrefix]));
}

function inferServiceNameFromEndpoint(endpoint: string | null): string | null {
  if (!endpoint) return null;
  const path = endpoint.startsWith("http")
    ? parseEndpointUrl(endpoint).endpoint
    : endpoint;
  if (!path) return null;
  const routes: Array<[RegExp, string]> = [
    [/^\/api\/v1\/(auth|users|emails|preferences)\b/, "auth-service"],
    [/^\/api\/v1\/applications\b/, "application-service"],
    [/^\/api\/v1\/companies\b/, "company-service"],
    [/^\/api\/v1\/contacts\b/, "contact-service"],
    [/^\/api\/v1\/interviews\b/, "interview-service"],
    [/^\/api\/v1\/notifications\b/, "notification-service"],
    [/^\/api\/v1\/(dashboard|statistics|analytics)\b/, "dashboard-service"],
    [/^\/api\/v1\/calls\b/, "call-service"],
    [/^\/api\/v1\/profile\b/, "profile-service"],
    [/^\/api\/v1\/events\b/, "event-service"],
    [/^\/api\/v1\/followups\b/, "followup-service"],
    [/^\/api\/v1\/workflows\b/, "workflow-service"],
    [
      /^\/api\/v1\/(security|logs|alerts|intrusions|ddos|vulnerabilities)\b/,
      "security-service",
    ],
  ];
  return routes.find(([pattern]) => pattern.test(path))?.[1] ?? null;
}

function pickSecurityLogRequestId(row: SecurityLogApiRow): string | null {
  return (
    readLooseString(row.requestId) ||
    firstMetadataString(row.metadata, [
      "requestId",
      "correlationId",
      "xRequestId",
      "x-request-id",
    ])
  );
}

function securityLogServiceCandidates(row: SecurityLogApiRow): string[] {
  const metadata = row.metadata || {};
  const candidates = new Set<string>();
  const directService = firstMetadataString(metadata, [
    "serviceName",
    "service",
    "targetService",
    "containerName",
  ]);
  const source = firstMetadataString(metadata, ["source", "sourceService"]);
  const endpointService = inferServiceNameFromEndpoint(row.endpoint || null);

  for (const value of [directService, endpointService, source]) {
    if (!value) continue;
    const normalized =
      value.includes("api-gateway") || value.startsWith("api-gateway-")
        ? "api-gateway"
        : value;
    serviceAliasesForName(normalized).forEach((alias) => candidates.add(alias));
  }

  if (source?.includes("api-gateway")) {
    serviceAliasesForName("api-gateway").forEach((alias) =>
      candidates.add(alias),
    );
  }

  // Ces lignes viennent de security_logs : le service sécurité doit toujours pouvoir les diagnostiquer.
  serviceAliasesForName("security-service").forEach((alias) =>
    candidates.add(alias),
  );
  return Array.from(candidates);
}

function securityLogMatchesFocus(
  row: SecurityLogApiRow,
  focusAliases: string[],
): boolean {
  const wanted = new Set(focusAliases.map((value) => value.toLowerCase()));
  return securityLogServiceCandidates(row).some((candidate) =>
    wanted.has(candidate.toLowerCase()),
  );
}

function mapSecurityLogToAggLog(row: SecurityLogApiRow): AggLogRow {
  const metadata =
    row.metadata &&
    typeof row.metadata === "object" &&
    !Array.isArray(row.metadata)
      ? { ...row.metadata }
      : {};
  const requestId = pickSecurityLogRequestId(row);
  const endpoint = readLooseString(row.endpoint);
  const endpointParsed = parseEndpointUrl(endpoint);
  const statusCode = readLooseString(row.statusCode);
  const sourceIp = readLooseString(row.sourceIP);
  const method = readLooseString(row.method);
  const primaryService =
    firstMetadataString(metadata, [
      "serviceName",
      "service",
      "targetService",
    ]) ||
    inferServiceNameFromEndpoint(endpoint) ||
    "security-service";

  return {
    id: row.id,
    level: row.level,
    message: row.message,
    serviceName: primaryService,
    timestamp: row.timestamp,
    eventType: row.eventType,
    requestId,
    metadata: {
      ...metadata,
      sourceTable: "security_logs",
      securityLogId: row.id || null,
      category: row.category || metadata.category,
      eventType: row.eventType || metadata.eventType,
      requestId: requestId || metadata.requestId,
      method: method || metadata.method,
      endpoint: endpointParsed.endpoint || endpoint || metadata.endpoint,
      originalUrl: endpoint || metadata.originalUrl,
      httpStatus: statusCode || metadata.httpStatus,
      statusCode: statusCode || metadata.statusCode,
      clientIp: sourceIp || metadata.clientIp,
      ip: sourceIp || metadata.ip,
      sourceIP: sourceIp || metadata.sourceIP,
      responseTime: readLooseString(row.responseTime) || metadata.responseTime,
      isBlocked: row.isBlocked ?? metadata.isBlocked,
      serviceName: primaryService,
      protocol: metadata.protocol || metadata.proto || endpointParsed.protocol,
      port: metadata.port || endpointParsed.port,
      serviceCandidates: securityLogServiceCandidates(row),
    },
  };
}

async function fetchSecurityLogsForCorrelation(options: {
  startDate: string;
  endDate: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<SecurityLogApiRow[]> {
  const params = new URLSearchParams({
    startDate: options.startDate,
    endDate: options.endDate,
    limit: String(options.limit ?? 1200),
    order: "desc",
  });
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(
    `${FRONTEND_URLS.api}/api/v1/security/logs?${params}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: options.signal,
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    throw new Error(
      json?.message || `Logs sécurité indisponibles (HTTP ${res.status})`,
    );
  }
  return Array.isArray(json?.data) ? json.data : [];
}

function parseJsonObjectFromLogMessage(
  message: string,
): Record<string, unknown> | null {
  const trimmed = String(message || "").trim();
  if (!trimmed) return null;
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  const candidate = trimmed.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

type ParsedIncidentContext = {
  requestId: string | null;
  httpMethod: string | null;
  endpoint: string | null;
  ip: string | null;
  protocol: string | null;
  port: string | null;
  httpStatus: string | null;
  /** Provenance par champ (libellé technique, même si valeur vide). */
  sources: Record<IncidentContextFieldKey, string>;
};

function readContextString(
  ctx: Record<string, unknown>,
  path: readonly string[],
): string | null {
  let cur: unknown = ctx;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  if (typeof cur !== "string" && typeof cur !== "number") return null;
  const value = String(cur).trim();
  return value.length > 0 ? value : null;
}

function normalizeHttpMethod(value: string | null): string | null {
  if (!value) return null;
  const method = value.trim().toUpperCase();
  return /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(method)
    ? method
    : null;
}

function parseEndpointUrl(value: string | null): {
  endpoint: string | null;
  protocol: string | null;
  port: string | null;
} {
  if (!value) return { endpoint: null, protocol: null, port: null };
  try {
    const parsed = new URL(value);
    return {
      endpoint: `${parsed.pathname}${parsed.search}`,
      protocol: parsed.protocol.replace(/:$/, "") || null,
      port:
        parsed.port ||
        (parsed.protocol === "https:"
          ? "443"
          : parsed.protocol === "http:"
            ? "80"
            : null),
    };
  } catch {
    return {
      endpoint: value,
      protocol: null,
      port: null,
    };
  }
}

function parsePortFromHost(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/:(\d{2,5})$/);
  return match?.[1] ?? null;
}

function parseIncidentContextFull(row: AggLogRow): ParsedIncidentContext {
  const metadata = mergeAggLogMetadata(row);
  const message = String(row.message || "");
  const messageJson = parseJsonObjectFromLogMessage(message);
  const ctx: Record<string, unknown> = {
    serviceName: row.serviceName,
    requestId: row.requestId,
    method: row.method,
    httpMethod: row.httpMethod,
    endpoint: row.endpoint,
    path: row.path,
    url: row.url,
    sourceIP: row.sourceIP,
    sourceIp: row.sourceIp,
    source_ip: row.source_ip,
    clientIp: row.clientIp,
    client_ip: row.client_ip,
    ip: row.ip,
    statusCode: row.statusCode,
    httpStatus: row.httpStatus,
    ...(metadata || {}),
    ...(messageJson || {}),
  };
  const hasMetadata = Boolean(metadata && Object.keys(metadata).length > 0);
  const hasMessageJson = Boolean(messageJson);

  const requestIdFromMessage =
    message.match(
      /\b(?:request[_ -]?id|correlation[_ -]?id)\s*[:=]\s*([a-zA-Z0-9-]{6,})/i,
    )?.[1] ??
    message.match(
      /"(?:requestId|correlationId)"\s*:\s*"([a-zA-Z0-9-]{6,})"/i,
    )?.[1] ??
    null;

  let requestId: string | null = null;
  let requestIdSrc = "";
  if (typeof row.requestId === "string" && row.requestId.trim()) {
    requestId = row.requestId.trim();
    requestIdSrc = "colonne API requestId (aggregated_logs)";
  } else if (typeof ctx.requestId === "string" && ctx.requestId.trim()) {
    requestId = ctx.requestId.trim();
    requestIdSrc = "metadata.requestId (fusion metadata + JSON dans message)";
  } else if (
    typeof ctx.correlationId === "string" &&
    ctx.correlationId.trim()
  ) {
    requestId = ctx.correlationId.trim();
    requestIdSrc =
      "metadata.correlationId (fusion metadata + JSON dans message)";
  } else if (typeof ctx.xRequestId === "string" && ctx.xRequestId.trim()) {
    requestId = ctx.xRequestId.trim();
    requestIdSrc = "metadata.xRequestId (fusion metadata + JSON dans message)";
  } else if (
    typeof ctx["x-request-id"] === "string" &&
    ctx["x-request-id"].trim()
  ) {
    requestId = ctx["x-request-id"].trim();
    requestIdSrc =
      "metadata['x-request-id'] (fusion metadata + JSON dans message)";
  } else if (requestIdFromMessage) {
    requestId = requestIdFromMessage;
    requestIdSrc =
      "heuristique texte message (motif requestId / correlationId)";
  } else {
    requestIdSrc =
      hasMetadata || hasMessageJson
        ? "aucune valeur (colonnes metadata.requestId / correlationId et motifs message vides)"
        : "aucune valeur (pas de metadata exploitable ni JSON parseable dans le message)";
  }

  let httpMethod: string | null = null;
  let httpMethodSrc = "";
  const methodCandidates: Array<[string[], string]> = [
    [["method"], "metadata.method"],
    [["httpMethod"], "metadata.httpMethod"],
    [["requestMethod"], "metadata.requestMethod"],
    [["context", "method"], "metadata.context.method"],
    [["context", "httpMethod"], "metadata.context.httpMethod"],
    [["request", "method"], "metadata.request.method"],
    [["req", "method"], "metadata.req.method"],
  ];
  for (const [path, label] of methodCandidates) {
    const method = normalizeHttpMethod(readContextString(ctx, path));
    if (method) {
      httpMethod = method;
      httpMethodSrc = `${label} (fusion metadata + JSON message)`;
      break;
    }
  }
  if (!httpMethod) {
    const methodFromMessage =
      message.match(
        /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+([^\s]+)/i,
      )?.[1] ??
      message.match(
        /"(?:method|httpMethod|requestMethod)"\s*:\s*"([^"]+)"/i,
      )?.[1] ??
      null;
    httpMethod = normalizeHttpMethod(methodFromMessage);
    httpMethodSrc = httpMethod
      ? "heuristique message (méthode HTTP ou JSON method)"
      : hasMetadata || hasMessageJson
        ? "aucune valeur (method / httpMethod / request.method absents du contexte)"
        : "aucune valeur (pas de metadata ni motif méthode HTTP dans le message)";
  }

  let endpoint: string | null = null;
  let endpointSrc = "";
  let urlProtocol: string | null = null;
  let urlPort: string | null = null;
  const epCandidates: Array<[string[], string]> = [
    [["endpoint"], "metadata.endpoint"],
    [["originalUrl"], "metadata.originalUrl"],
    [["requestPath"], "metadata.requestPath"],
    [["route"], "metadata.route"],
    [["path"], "metadata.path"],
    [["url"], "metadata.url"],
    [["requestUrl"], "metadata.requestUrl"],
    [["context", "endpoint"], "metadata.context.endpoint"],
    [["context", "originalUrl"], "metadata.context.originalUrl"],
    [["context", "url"], "metadata.context.url"],
    [["request", "url"], "metadata.request.url"],
    [["request", "path"], "metadata.request.path"],
    [["req", "originalUrl"], "metadata.req.originalUrl"],
    [["req", "url"], "metadata.req.url"],
    [["req", "path"], "metadata.req.path"],
  ];
  for (const [path, label] of epCandidates) {
    const v = readContextString(ctx, path);
    if (v) {
      const parsed = parseEndpointUrl(v);
      endpoint = parsed.endpoint;
      urlProtocol = parsed.protocol;
      urlPort = parsed.port;
      endpointSrc = `${label} (fusion metadata + JSON message)`;
      break;
    }
  }
  if (!endpoint) {
    const m = message.match(
      /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+([^\s]+)/i,
    );
    if (m?.[2]) {
      const parsed = parseEndpointUrl(m[2]);
      endpoint = parsed.endpoint;
      urlProtocol = parsed.protocol;
      urlPort = parsed.port;
      endpointSrc = "heuristique message (MÉTHODE + chemin)";
    } else {
      endpointSrc =
        hasMetadata || hasMessageJson
          ? "aucune valeur (champs endpoint / originalUrl / path / url absents du contexte fusionné)"
          : "aucune valeur (pas de metadata ni JSON message pour endpoint)";
    }
  }

  let ip: string | null = null;
  let ipSrc = "";
  const suspiciousIp = readFirstIpFromUnknownList(ctx.suspiciousIPs);
  const sourceAsIp =
    typeof ctx.source === "string" && isIpLikeString(ctx.source)
      ? ctx.source.trim()
      : null;
  const ipCandidates: [unknown, string][] = [
    [suspiciousIp, "metadata.suspiciousIPs[0] (analyse agrégée)"],
    [sourceAsIp, "metadata.source (adresse IP attaquant)"],
    [ctx.ip, "metadata.ip"],
    [ctx.sourceIP, "metadata.sourceIP"],
    [ctx.sourceIp, "metadata.sourceIp"],
    [ctx.source_ip, "metadata.source_ip"],
    [ctx.clientIp, "metadata.clientIp"],
    [ctx.client_ip, "metadata.client_ip"],
    [ctx.client_ip_address, "metadata.client_ip_address"],
    [ctx.ipAddress, "metadata.ipAddress"],
    [ctx.ip_address, "metadata.ip_address"],
    [
      (ctx.context as Record<string, unknown> | undefined)?.clientIp,
      "metadata.context.clientIp",
    ],
    [
      (ctx.context as Record<string, unknown> | undefined)?.client_ip,
      "metadata.context.client_ip",
    ],
    [
      (ctx.context as Record<string, unknown> | undefined)?.ip,
      "metadata.context.ip",
    ],
    [
      (ctx.request as Record<string, unknown> | undefined)?.ip,
      "metadata.request.ip",
    ],
    [
      (ctx.request as Record<string, unknown> | undefined)?.clientIp,
      "metadata.request.clientIp",
    ],
    [(ctx.req as Record<string, unknown> | undefined)?.ip, "metadata.req.ip"],
    [
      (ctx.req as Record<string, unknown> | undefined)?.clientIp,
      "metadata.req.clientIp",
    ],
    [ctx.forwardedFor, "metadata.forwardedFor (1re valeur)"],
    [ctx.xForwardedFor, "metadata.xForwardedFor (1re valeur)"],
    [ctx["x-forwarded-for"], "metadata['x-forwarded-for'] (1re valeur)"],
    [
      (ctx.headers as Record<string, unknown> | undefined)?.["x-forwarded-for"],
      "metadata.headers['x-forwarded-for'] (1re valeur)",
    ],
    [
      (ctx.headers as Record<string, unknown> | undefined)?.["x-real-ip"],
      "metadata.headers['x-real-ip']",
    ],
    [
      (ctx.headers as Record<string, unknown> | undefined)?.[
        "cf-connecting-ip"
      ],
      "metadata.headers['cf-connecting-ip']",
    ],
    [ctx.remoteAddress, "metadata.remoteAddress"],
    [ctx.remote_address, "metadata.remote_address"],
  ];
  for (const [v, label] of ipCandidates) {
    if (typeof v === "string" && v.trim()) {
      const first = label.includes("forwarded")
        ? v.split(",")[0]?.trim()
        : v.trim();
      if (first) {
        ip = first;
        ipSrc = `${label} (fusion metadata + JSON message)`;
        break;
      }
    }
  }
  if (!ip) {
    const m = message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    if (m?.[0]) {
      ip = m[0];
      ipSrc = "heuristique message (adresse IPv4)";
    } else {
      ipSrc =
        hasMetadata || hasMessageJson
          ? "aucune valeur (ip / clientIp / X-Forwarded-For / remoteAddress absents)"
          : "aucune valeur (pas de metadata ni motif IPv4 dans le message)";
    }
  }

  let protocol: string | null = null;
  let protocolSrc = "";
  for (const [path, label] of [
    [["protocol"], "metadata.protocol"],
    [["proto"], "metadata.proto"],
    [["scheme"], "metadata.scheme"],
    [["context", "protocol"], "metadata.context.protocol"],
    [["context", "proto"], "metadata.context.proto"],
    [["request", "protocol"], "metadata.request.protocol"],
    [["req", "protocol"], "metadata.req.protocol"],
  ] as const) {
    const v = readContextString(ctx, path);
    if (v) {
      protocol = v.replace(/:$/, "").trim().toLowerCase();
      protocolSrc = `${label} (fusion metadata + JSON message)`;
      break;
    }
  }
  if (!protocol) {
    if (urlProtocol) {
      protocol = urlProtocol;
      protocolSrc = "URL endpoint complète (protocole déduit)";
    } else {
      const m = message.match(/\b(https?|grpc|ws|wss)\b/i);
      if (m?.[1]) {
        protocol = m[1].toLowerCase();
        protocolSrc = "heuristique message (mot-clé http/https/grpc/ws)";
      } else {
        protocolSrc =
          hasMetadata || hasMessageJson
            ? "aucune valeur (protocol / proto / scheme absents du contexte)"
            : "aucune valeur (pas de metadata ni motif protocole dans le message)";
      }
    }
  }

  let port: string | null = null;
  let portSrc = "";
  const portFromCtx =
    readContextString(ctx, ["port"]) ||
    readContextString(ctx, ["localPort"]) ||
    readContextString(ctx, ["serverPort"]) ||
    readContextString(ctx, ["remotePort"]) ||
    readContextString(ctx, ["context", "port"]) ||
    readContextString(ctx, ["context", "localPort"]) ||
    readContextString(ctx, ["context", "serverPort"]) ||
    readContextString(ctx, ["request", "port"]) ||
    readContextString(ctx, ["req", "port"]);
  if (portFromCtx) {
    port = portFromCtx;
    portSrc = "metadata.port | localPort | serverPort | remotePort (fusion)";
  } else if (urlPort) {
    port = urlPort;
    portSrc = "URL endpoint complète (port déduit)";
  } else {
    const hostPort =
      parsePortFromHost(
        readContextString(ctx, ["host"]) ||
          readContextString(ctx, ["hostname"]),
      ) || parsePortFromHost(readContextString(ctx, ["headers", "host"]));
    if (hostPort) {
      port = hostPort;
      portSrc = "metadata.host / headers.host (port déduit)";
    } else {
      const m1 = message.match(/"port"\s*:\s*(\d{2,5})/i)?.[1];
      const m2 = message.match(/\bport\s*[:=]?\s*(\d{2,5})\b/i)?.[1];
      if (m1 || m2) {
        port = m1 || m2 || null;
        portSrc = "heuristique message (clé port dans JSON ou texte)";
      } else {
        portSrc =
          hasMetadata || hasMessageJson
            ? "aucune valeur (port / localPort / serverPort absents du contexte)"
            : "aucune valeur (pas de metadata ni motif port dans le message)";
      }
    }
  }

  let httpStatus: string | null = null;
  let httpSrc = "";
  for (const [path, label] of [
    [["httpStatus"], "metadata.httpStatus"],
    [["statusCode"], "metadata.statusCode"],
    [["status"], "metadata.status"],
    [["upstreamHttpStatus"], "metadata.upstreamHttpStatus"],
    [["context", "httpStatus"], "metadata.context.httpStatus"],
    [["context", "statusCode"], "metadata.context.statusCode"],
    [["response", "statusCode"], "metadata.response.statusCode"],
    [["res", "statusCode"], "metadata.res.statusCode"],
  ] as const) {
    const v = readContextString(ctx, path);
    if (v && /^\d{1,3}$/.test(v.trim())) {
      httpStatus = v.trim();
      httpSrc = `${label} (contexte fusionné)`;
      break;
    }
    const direct = path.length === 1 ? ctx[path[0]] : null;
    const vNumber = typeof direct === "number" ? direct : null;
    if (vNumber != null && Number.isFinite(vNumber)) {
      httpStatus = String(Math.trunc(vNumber));
      httpSrc = `${label} (nombre)`;
      break;
    }
  }
  if (!httpStatus) {
    for (const k of [
      "httpStatus",
      "statusCode",
      "upstreamHttpStatus",
    ] as const) {
      const v = ctx[k];
      if (typeof v === "number" && Number.isFinite(v)) {
        httpStatus = String(Math.trunc(v));
        httpSrc = `metadata.${k} (nombre)`;
        break;
      }
      if (typeof v === "string" && /^\d{1,3}$/.test(v.trim())) {
        httpStatus = v.trim();
        httpSrc = `metadata.${k} (chaîne numérique)`;
        break;
      }
    }
  }
  if (!httpStatus) {
    const m1 = message.match(
      /"(?:httpStatus|statusCode|upstreamHttpStatus)"\s*:\s*(\d{3})/i,
    )?.[1];
    const m2 = message.match(/\b(?:status|HTTP)\s*[:=]?\s*(\d{3})\b/i)?.[1];
    if (m1 || m2) {
      httpStatus = m1 || m2 || null;
      httpSrc = "heuristique message (JSON ou motif HTTP nnn)";
    } else {
      httpSrc =
        hasMetadata || hasMessageJson
          ? "aucune valeur (httpStatus / statusCode / upstreamHttpStatus absents ou non numériques)"
          : "aucune valeur (pas de metadata ni code HTTP dans le message)";
    }
  }

  return {
    requestId,
    httpMethod,
    endpoint,
    ip,
    protocol,
    port,
    httpStatus,
    sources: {
      requestId: requestIdSrc,
      httpMethod: httpMethodSrc,
      endpoint: endpointSrc,
      ip: ipSrc,
      protocol: protocolSrc,
      port: portSrc,
      httpStatus: httpSrc,
    },
  };
}

function parseIncidentContext(row: AggLogRow): {
  requestId: string | null;
  httpMethod: string | null;
  endpoint: string | null;
  ip: string | null;
  protocol: string | null;
  port: string | null;
  httpStatus: string | null;
} {
  const p = parseIncidentContextFull(row);
  return {
    requestId: p.requestId,
    httpMethod: p.httpMethod,
    endpoint: p.endpoint,
    ip: p.ip,
    protocol: p.protocol,
    port: p.port,
    httpStatus: p.httpStatus,
  };
}

const INCIDENT_FIELD_LABELS: Record<IncidentContextFieldKey, string> = {
  requestId: "requestId / correlationId",
  httpMethod: "Méthode HTTP",
  endpoint: "Endpoint (chemin / URL)",
  ip: "IP client",
  httpStatus: "Code HTTP",
  protocol: "Protocole",
  port: "Port",
};

const INCIDENT_FIELD_FIX: Record<IncidentContextFieldKey, string> = {
  requestId:
    "Propager requestId/correlationId dans le middleware (gateway + services) et les inclure dans metadata du central logger sur WARN/ERROR.",
  httpMethod:
    "Inclure method/httpMethod/request.method dans metadata du central logger sur WARN/ERROR et proxy gateway.",
  endpoint:
    "Enrichir metadata (originalUrl, path ou route) depuis la requête Express/Fastify au moment du log.",
  ip: "Journaliser IP réelle (req.ip / X-Forwarded-For tronqué) dans metadata pour les routes exposées derrière proxy.",
  httpStatus:
    "Persister statusCode ou upstreamHttpStatus (proxy) dans metadata sur erreurs et réponses.",
  protocol:
    "Ajouter scheme ou protocol (TLS) dans metadata si pertinent pour le diagnostic.",
  port: "Exposer serverPort / connect.port dans metadata uniquement si utile au forensics (sinon laisser vide).",
};

function buildIncidentContextFieldDiagnostics(
  row: AggLogRow,
): IncidentContextFieldDiagnostic[] {
  const p = parseIncidentContextFull(row);
  const keys: IncidentContextFieldKey[] = [
    "requestId",
    "httpMethod",
    "endpoint",
    "ip",
    "httpStatus",
    "protocol",
    "port",
  ];
  return keys.map((field) => {
    const value = p[field];
    const filled = typeof value === "string" && value.trim().length > 0;
    return {
      field,
      label: INCIDENT_FIELD_LABELS[field],
      value: filled ? value : null,
      sourceTechnical: p.sources[field],
      emptyDetail: filled
        ? null
        : "Absent après priorité parseur (voir source technique).",
      fixHint: filled ? null : INCIDENT_FIELD_FIX[field],
    };
  });
}

function stableIncidentRowKey(r: FocusIncidentAlignedRow): string {
  const rawTs = String(r.rawLog.timestamp ?? "");
  return `${r.timestamp}\u001f${rawTs}\u001f${r.message.slice(0, 200)}`;
}

function nextSortDirection(curr: SortDirection): SortDirection {
  if (curr == null) return "asc";
  if (curr === "asc") return "desc";
  return null;
}

function sortGlyph(active: boolean, direction: SortDirection): string {
  if (!active || direction == null) return "↕";
  return direction === "asc" ? "↑" : "↓";
}

function downsampleByStep<T>(rows: T[], max: number): T[] {
  if (rows.length <= max) return rows;
  const step = Math.ceil(rows.length / max);
  return rows.filter((_, i) => i % step === 0);
}

function mergeSystemNearestOntoContainer(
  containerRows: ContainerPoint[],
  systemRows: SystemPoint[],
  maxDeltaMs: number,
): WithSystemPoint[] {
  if (containerRows.length === 0) return [];
  const sys = [...systemRows].sort((a, b) => a.timeMs - b.timeMs);
  const cr = [...containerRows].sort((a, b) => a.timeMs - b.timeMs);
  let j = 0;
  const out: WithSystemPoint[] = [];
  for (const c of cr) {
    const t = c.timeMs;
    while (j < sys.length - 1 && sys[j + 1].timeMs <= t) j += 1;
    let bestIdx = -1;
    let bestD = Infinity;
    for (const idx of [j - 1, j, j + 1]) {
      if (idx < 0 || idx >= sys.length) continue;
      const d = Math.abs(sys[idx].timeMs - t);
      if (d < bestD) {
        bestD = d;
        bestIdx = idx;
      }
    }
    const ok = bestIdx >= 0 && bestD <= maxDeltaMs;
    const s = ok ? sys[bestIdx] : null;
    out.push({
      ...c,
      system_cpu: s?.system_cpu ?? null,
      system_memory: s?.system_memory ?? null,
    });
  }
  return out;
}

function parseAvailabilityHistoryRows(
  raw: Record<string, unknown>[],
): AvailabilityPoint[] {
  return raw
    .map((r) => {
      const ts = normalizeMetricTimestampToIso(String(r.timestamp ?? ""));
      const timeMs = metricRowToTimeMs(r, ts);
      if (!ts || timeMs == null) return null;
      const n = readNumericField(r, [
        "responseTimeMs",
        "response_time_ms",
        "avgResponseTimeMs",
        "avg_response_time_ms",
      ]);
      return {
        timeMs,
        responseTimeMs: n != null && Number.isFinite(n) && n >= 0 ? n : null,
      };
    })
    .filter((x): x is AvailabilityPoint => x != null)
    .sort((a, b) => a.timeMs - b.timeMs);
}

function buildAvailabilityFallbackFromStats(
  stats: AvailabilityStatsLike | null | undefined,
  bounds: { start: Date; end: Date },
): AvailabilityPoint[] {
  if (!stats || typeof stats !== "object") return [];
  const lastCheck = (
    stats.lastCheck && typeof stats.lastCheck === "object"
      ? stats.lastCheck
      : null
  ) as Record<string, unknown> | null;
  const rtLast =
    readNumericField(lastCheck || {}, ["responseTimeMs", "response_time_ms"]) ??
    readNumericField(stats, ["avgResponseTime", "avg_response_time_ms"]);
  const rtMax = readNumericField(stats, [
    "maxResponseTime",
    "max_response_time_ms",
  ]);
  const p1: AvailabilityPoint = {
    timeMs: bounds.start.getTime(),
    responseTimeMs:
      rtMax != null && rtMax >= 0
        ? rtMax
        : rtLast != null && rtLast >= 0
          ? rtLast
          : null,
  };
  const p2: AvailabilityPoint = {
    timeMs: bounds.end.getTime(),
    responseTimeMs:
      rtLast != null && rtLast >= 0
        ? rtLast
        : rtMax != null && rtMax >= 0
          ? rtMax
          : null,
  };
  return [p1, p2].filter((p) => p.responseTimeMs != null);
}

function mergeAvailabilityOntoMerged(
  rows: WithSystemPoint[],
  avail: AvailabilityPoint[],
  maxDeltaMs: number,
): MergedServicePoint[] {
  if (rows.length === 0) return [];
  if (avail.length === 0) {
    return rows.map((r) => ({ ...r, responseTimeMs: null }));
  }
  const sorted = [...avail].sort((a, b) => a.timeMs - b.timeMs);
  let j = 0;
  return rows.map((p) => {
    const t = p.timeMs;
    while (j < sorted.length - 1 && sorted[j + 1].timeMs <= t) j += 1;
    let bestD = Infinity;
    let bestRt: number | null = null;
    for (const idx of [j - 1, j, j + 1]) {
      if (idx < 0 || idx >= sorted.length) continue;
      const d = Math.abs(sorted[idx].timeMs - t);
      if (d < bestD) {
        bestD = d;
        bestRt = sorted[idx].responseTimeMs;
      }
    }
    const rt = bestD <= maxDeltaMs ? bestRt : null;
    return { ...p, responseTimeMs: rt };
  });
}

/** Alias `serviceName` en base (logs centralisés) vs nom conteneur Docker `jobbingtrack-*`. */
function persistenceServiceAliases(containerFullName: string): string[] {
  const full = containerFullName.trim();
  if (!full) return [];
  const out = new Set<string>([full]);
  const noPrefix = full.replace(/^jobbingtrack-/, "");
  if (noPrefix && noPrefix !== full) {
    out.add(noPrefix);
    out.add(`jobbingtrack-${noPrefix}`);
  }
  return [...out];
}

function shortContainerName(full: string) {
  return full.replace(/^jobbingtrack-/, "");
}

function pickInitialFocusService(names: string[]): string | null {
  for (const preferred of DEFAULT_FOCUS_SERVICE_HINTS) {
    const found = names.find((name) => name === preferred);
    if (found) return found;
  }
  return names[0] ?? null;
}

/** Pousse `name` en fin de file (MRU) et coupe au plafond — le plus ancien sort en premier. */
function pushLoadedOrder(prev: string[], name: string, cap: number): string[] {
  const dedup = prev.filter((n) => n !== name);
  const next = [...dedup, name];
  while (next.length > cap) next.shift();
  return next;
}

type RowSummary = {
  points: number;
  cpuMax: number | null;
  memMax: number | null;
  netDeltaMb: number | null;
  ioDeltaMb: number | null;
  rtMaxMs: number | null;
  rtLastMs: number | null;
};

type LiveContainerFallback = {
  cpuPercent: number | null;
  memoryPercent: number | null;
  networkRxMb: number | null;
  networkTxMb: number | null;
  ioReadMb: number | null;
  ioWriteMb: number | null;
};

function finiteNums(xs: (number | null | undefined)[]): number[] {
  return xs.filter((x): x is number => x != null && Number.isFinite(x));
}

/** Delta cumul robuste : somme des incréments positifs entre points (ignore resets / trous). */
function cumulativePositiveIncrements(
  values: (number | null | undefined)[],
): number | null {
  let prev: number | null = null;
  let total = 0;
  let hasSegment = false;
  let lastFinite: number | null = null;
  for (const v of values) {
    if (v == null || !Number.isFinite(v)) continue;
    lastFinite = v;
    if (prev != null) {
      const d = v - prev;
      if (d >= 0) {
        total += d;
        hasSegment = true;
      }
    }
    prev = v;
  }
  if (!hasSegment && lastFinite != null && lastFinite >= 0) {
    return lastFinite;
  }
  return hasSegment ? total : null;
}

function numericRangeDelta(
  values: (number | null | undefined)[],
): number | null {
  const nums = finiteNums(values);
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const d = max - min;
  return d > 0 ? d : null;
}

function summarizeWindow(
  rows: ContainerPoint[],
  merged: MergedServicePoint[],
  availability?: AvailabilityPoint[],
  liveFallback?: LiveContainerFallback,
): RowSummary | null {
  if (rows.length === 0) {
    const rtAvail = finiteNums(
      (availability ?? []).map((a) => a.responseTimeMs),
    );
    const rtMaxMs = rtAvail.length ? Math.max(...rtAvail) : null;
    const rtLastMs = rtAvail.length ? rtAvail[rtAvail.length - 1] : null;
    if (!liveFallback && rtMaxMs == null && rtLastMs == null) return null;
    return {
      points: 0,
      cpuMax: liveFallback?.cpuPercent ?? null,
      memMax: liveFallback?.memoryPercent ?? null,
      netDeltaMb:
        liveFallback &&
        (liveFallback.networkRxMb != null || liveFallback.networkTxMb != null)
          ? (liveFallback.networkRxMb ?? 0) + (liveFallback.networkTxMb ?? 0)
          : null,
      ioDeltaMb:
        liveFallback &&
        (liveFallback.ioReadMb != null || liveFallback.ioWriteMb != null)
          ? (liveFallback.ioReadMb ?? 0) + (liveFallback.ioWriteMb ?? 0)
          : null,
      rtMaxMs,
      rtLastMs,
    };
  }
  const cpu = finiteNums(rows.map((r) => r.cpu));
  const mem = finiteNums(rows.map((r) => r.memory));
  const rx = rows.map((r) => r.networkRxMb);
  const tx = rows.map((r) => r.networkTxMb);
  const ir = rows.map((r) => r.ioReadMb);
  const iw = rows.map((r) => r.ioWriteMb);

  let netDeltaMb: number | null = null;
  const drx = cumulativePositiveIncrements(rx);
  const dtx = cumulativePositiveIncrements(tx);
  if (drx != null || dtx != null) netDeltaMb = (drx ?? 0) + (dtx ?? 0);
  if (netDeltaMb == null || netDeltaMb <= 0) {
    const rrx = numericRangeDelta(rx);
    const rtx = numericRangeDelta(tx);
    if (rrx != null || rtx != null) netDeltaMb = (rrx ?? 0) + (rtx ?? 0);
  }
  if ((netDeltaMb == null || netDeltaMb <= 0) && liveFallback) {
    const rxNow = liveFallback.networkRxMb;
    const txNow = liveFallback.networkTxMb;
    if (rxNow != null || txNow != null) {
      netDeltaMb = (rxNow ?? 0) + (txNow ?? 0);
    }
  }

  let ioDeltaMb: number | null = null;
  const dir = cumulativePositiveIncrements(ir);
  const diw = cumulativePositiveIncrements(iw);
  if (dir != null || diw != null) ioDeltaMb = (dir ?? 0) + (diw ?? 0);
  if (ioDeltaMb == null || ioDeltaMb <= 0) {
    const rir = numericRangeDelta(ir);
    const riw = numericRangeDelta(iw);
    if (rir != null || riw != null) ioDeltaMb = (rir ?? 0) + (riw ?? 0);
  }
  if ((ioDeltaMb == null || ioDeltaMb <= 0) && liveFallback) {
    const readNow = liveFallback.ioReadMb;
    const writeNow = liveFallback.ioWriteMb;
    if (readNow != null || writeNow != null) {
      ioDeltaMb = (readNow ?? 0) + (writeNow ?? 0);
    }
  }

  const rtMerged = finiteNums(merged.map((m) => m.responseTimeMs));
  const rtAvail = finiteNums((availability ?? []).map((a) => a.responseTimeMs));
  const rtPool =
    rtMerged.length || rtAvail.length ? [...rtMerged, ...rtAvail] : [];
  const rtMaxMs = rtPool.length ? Math.max(...rtPool) : null;

  let rtLastMs: number | null = null;
  const availSorted = [...(availability ?? [])].sort(
    (a, b) => a.timeMs - b.timeMs,
  );
  for (let i = availSorted.length - 1; i >= 0; i--) {
    const v = availSorted[i].responseTimeMs;
    if (v != null && Number.isFinite(v)) {
      rtLastMs = v;
      break;
    }
  }
  if (rtLastMs == null) {
    for (let i = merged.length - 1; i >= 0; i--) {
      const v = merged[i].responseTimeMs;
      if (v != null && Number.isFinite(v)) {
        rtLastMs = v;
        break;
      }
    }
  }

  return {
    points: rows.length,
    cpuMax: cpu.length ? Math.max(...cpu) : (liveFallback?.cpuPercent ?? null),
    memMax: mem.length
      ? Math.max(...mem)
      : (liveFallback?.memoryPercent ?? null),
    netDeltaMb,
    ioDeltaMb,
    rtMaxMs,
    rtLastMs,
  };
}

function fmt1(v: number | null, suffix = "") {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(1)}${suffix}`;
}

function fmt0(v: number | null) {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${Math.round(v)}`;
}

function ServiceDashboardCard({
  fullName,
  mergedRows,
  subChartHeight,
  maxPointsPerChart,
}: {
  fullName: string;
  mergedRows: MergedServicePoint[];
  subChartHeight: number;
  maxPointsPerChart: number;
}) {
  const short = shortContainerName(fullName);
  const chartData = useMemo(
    () => downsampleByStep(mergedRows, maxPointsPerChart),
    [mergedRows, maxPointsPerChart],
  );
  const [brushRange, setBrushRange] = useState<{
    startIndex: number;
    endIndex: number;
  } | null>(null);
  const brushStart =
    brushRange?.startIndex ??
    Math.max(0, chartData.length - Math.min(chartData.length, 80));
  const brushEnd = brushRange?.endIndex ?? Math.max(0, chartData.length - 1);

  useEffect(() => {
    setBrushRange((prev) => {
      if (!prev) return null;
      if (chartData.length === 0) return null;
      const nextStart = Math.max(
        0,
        Math.min(prev.startIndex, chartData.length - 1),
      );
      const nextEnd = Math.max(
        nextStart,
        Math.min(prev.endIndex, chartData.length - 1),
      );
      if (nextStart === prev.startIndex && nextEnd === prev.endIndex)
        return prev;
      return { startIndex: nextStart, endIndex: nextEnd };
    });
  }, [chartData.length]);

  const onBrushChange = useCallback(
    (range: { startIndex?: number; endIndex?: number }) => {
      if (chartData.length === 0) return;
      const startIndex = Math.max(
        0,
        Math.min(range.startIndex ?? 0, chartData.length - 1),
      );
      const endIndex = Math.max(
        startIndex,
        Math.min(range.endIndex ?? chartData.length - 1, chartData.length - 1),
      );
      setBrushRange({ startIndex, endIndex });
    },
    [chartData.length],
  );

  const xCommon = {
    dataKey: "timeMs" as const,
    type: "number" as const,
    domain: ["dataMin", "dataMax"] as [string, string],
    tickFormatter: (ms: number) =>
      formatLocalChartAxisTick(ms, { withDate: true }),
    tick: { fontSize: 10 },
    height: 46,
    minTickGap: 28,
    tickMargin: 6,
  };

  const tooltipLabel = (ms: number | string) =>
    typeof ms === "number"
      ? formatLocalChartAxisTick(ms, { withDate: true })
      : String(ms);

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {short}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Aucun point d&apos;historique pour ce conteneur.
        </p>
      </div>
    );
  }

  const margin = { top: 6, right: 10, left: 2, bottom: 4 };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 pb-2 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {short}
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Détail 24 h · {chartData.length} pts / courbe · date + heure sur
          l&apos;axe
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
            CPU (%)
            <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
              plein = service · pointillés = machine
            </span>
          </p>
          <div className="w-full" style={{ height: subChartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={margin}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-35" />
                <XAxis {...xCommon} />
                <YAxis
                  width={40}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${v}`}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  {...rechartsTooltipProps}
                  labelFormatter={tooltipLabel}
                />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  name="Service"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="system_cpu"
                  name="Machine"
                  stroke="#6B7280"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Brush
                  dataKey="timeMs"
                  height={18}
                  travellerWidth={8}
                  startIndex={brushStart}
                  endIndex={brushEnd}
                  tickFormatter={(ms) => formatLocalChartAxisTick(ms as number)}
                  onChange={onBrushChange}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
            Mémoire (%)
            <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
              plein = service · pointillés = machine
            </span>
          </p>
          <div className="w-full" style={{ height: subChartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={margin}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-35" />
                <XAxis {...xCommon} />
                <YAxis
                  width={40}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${v}`}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  {...rechartsTooltipProps}
                  labelFormatter={tooltipLabel}
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  name="Service"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="system_memory"
                  name="Machine"
                  stroke="#6B7280"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Brush
                  dataKey="timeMs"
                  height={18}
                  travellerWidth={8}
                  startIndex={brushStart}
                  endIndex={brushEnd}
                  tickFormatter={(ms) => formatLocalChartAxisTick(ms as number)}
                  onChange={onBrushChange}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
            Réseau (Mo cumulés — Rx / Tx)
          </p>
          <div className="w-full" style={{ height: subChartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={margin}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-35" />
                <XAxis {...xCommon} />
                <YAxis
                  width={44}
                  tick={{ fontSize: 10 }}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  {...rechartsTooltipProps}
                  labelFormatter={tooltipLabel}
                />
                <Line
                  type="monotone"
                  dataKey="networkRxMb"
                  name="Rx Mo"
                  stroke="#D97706"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="networkTxMb"
                  name="Tx Mo"
                  stroke="#EA580C"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Brush
                  dataKey="timeMs"
                  height={18}
                  travellerWidth={8}
                  startIndex={brushStart}
                  endIndex={brushEnd}
                  tickFormatter={(ms) => formatLocalChartAxisTick(ms as number)}
                  onChange={onBrushChange}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
            I/O bloc (Mo cumulés — lecture / écriture)
          </p>
          <div className="w-full" style={{ height: subChartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={margin}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-35" />
                <XAxis {...xCommon} />
                <YAxis
                  width={44}
                  tick={{ fontSize: 10 }}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  {...rechartsTooltipProps}
                  labelFormatter={tooltipLabel}
                />
                <Line
                  type="monotone"
                  dataKey="ioReadMb"
                  name="Lecture Mo"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="ioWriteMb"
                  name="Écriture Mo"
                  stroke="#A855F7"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Brush
                  dataKey="timeMs"
                  height={18}
                  travellerWidth={8}
                  startIndex={brushStart}
                  endIndex={brushEnd}
                  tickFormatter={(ms) => formatLocalChartAxisTick(ms as number)}
                  onChange={onBrushChange}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
            Temps de réponse (ms)
            <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
              health du service (BDD{" "}
              <code className="text-[10px]">service_availability_history</code>)
            </span>
          </p>
          <div className="w-full" style={{ height: subChartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={margin}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-35" />
                <XAxis {...xCommon} />
                <YAxis
                  width={44}
                  tick={{ fontSize: 10 }}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  {...rechartsTooltipProps}
                  labelFormatter={tooltipLabel}
                />
                <Line
                  type="monotone"
                  dataKey="responseTimeMs"
                  name="Temps de réponse (ms)"
                  stroke="#DC2626"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Brush
                  dataKey="timeMs"
                  height={18}
                  travellerWidth={8}
                  startIndex={brushStart}
                  endIndex={brushEnd}
                  tickFormatter={(ms) => formatLocalChartAxisTick(ms as number)}
                  onChange={onBrushChange}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PerformancesCorrelationPage() {
  const [perfMode, setPerfMode] = useState<PerfMode>("light");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const limits = useMemo(() => limitsForMode(perfMode), [perfMode]);
  const firstRequestRef = useRef(true);
  const bootstrappedRef = useRef(false);
  const loadAbortRef = useRef<AbortController | null>(null);
  const incidentsAbortRef = useRef<AbortController | null>(null);
  const containerRowsRef = useRef<Record<string, ContainerPoint[]>>({});
  const availabilityByServiceRef = useRef<Record<string, AvailabilityPoint[]>>(
    {},
  );
  const historyRangeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setPerfMode(readStoredPerfMode());
    setAutoRefreshEnabled(readStoredAutoRefreshEnabled());
  }, []);

  const persistPerfMode = (mode: PerfMode) => {
    setPerfMode(mode);
    try {
      window.sessionStorage.setItem(PERF_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const persistAutoRefreshEnabled = (enabled: boolean) => {
    setAutoRefreshEnabled(enabled);
    try {
      window.sessionStorage.setItem(
        AUTO_REFRESH_STORAGE_KEY,
        enabled ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  };

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historiesLoading, setHistoriesLoading] = useState(false);
  const [containers, setContainers] = useState<string[]>([]);
  const [focusName, setFocusName] = useState<string | null>(null);
  const [loadedOrder, setLoadedOrder] = useState<string[]>([]);
  const [listFilter, setListFilter] = useState("");
  const [systemRows, setSystemRows] = useState<SystemPoint[]>([]);
  const [containerRows, setContainerRows] = useState<
    Record<string, ContainerPoint[]>
  >({});
  const [availabilityByService, setAvailabilityByService] = useState<
    Record<string, AvailabilityPoint[]>
  >({});
  const [dataQualityByService, setDataQualityByService] = useState<
    Record<string, ServiceDataQuality>
  >({});
  const [liveFallbackByService, setLiveFallbackByService] = useState<
    Record<string, LiveContainerFallback>
  >({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [focusIncidents, setFocusIncidents] =
    useState<FocusIncidentSummary | null>(null);
  /** Logs persistés (table incidents + 3 premières cartes KPI). */
  const [focusPersistenceLogsLoading, setFocusPersistenceLogsLoading] =
    useState(false);
  /** Résumé score sécurité fenêtre (4e carte). */
  const [focusSecuritySummaryLoading, setFocusSecuritySummaryLoading] =
    useState(false);
  const [securityWindowScore, setSecurityWindowScore] = useState<number | null>(
    null,
  );
  const [focusLogs, setFocusLogs] = useState<AggLogRow[]>([]);
  const [summarySort, setSummarySort] = useState<{
    key: SummarySortKey;
    direction: SortDirection;
  }>({
    key: "name",
    direction: null,
  });
  const [incidentSort, setIncidentSort] = useState<{
    key: IncidentSortKey;
    direction: SortDirection;
  }>({
    key: "timestamp",
    direction: "desc",
  });
  const [incidentLevelFilter, setIncidentLevelFilter] = useState<
    "all" | "ERROR" | "WARN" | "INFO"
  >("all");
  const [incidentNeedRequestId, setIncidentNeedRequestId] = useState(false);
  const [incidentSearch, setIncidentSearch] = useState("");
  /** Ligne incidents sélectionnée pour le tableau diagnostic contexte (clé stable). */
  const [incidentContextDiagKey, setIncidentContextDiagKey] = useState<
    string | null
  >(null);

  const [windowMode, setWindowMode] = useState<WindowMode>("preset");
  const [presetHours, setPresetHours] = useState(24);
  const [customStartInput, setCustomStartInput] = useState("");
  const [customEndInput, setCustomEndInput] = useState("");
  const [appliedCustom, setAppliedCustom] = useState<{
    startIso: string;
    endIso: string;
  } | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [bulkHint, setBulkHint] = useState<string | null>(null);

  useEffect(() => {
    containerRowsRef.current = containerRows;
  }, [containerRows]);

  useEffect(() => {
    availabilityByServiceRef.current = availabilityByService;
  }, [availabilityByService]);

  const enterCustomRangeDefaults = useCallback(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    setCustomStartInput(toDatetimeLocalValue(start));
    setCustomEndInput(toDatetimeLocalValue(end));
    setAppliedCustom({
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    });
    setWindowMode("custom");
    setRangeError(null);
  }, []);

  const applyCustomRangeFromInputs = useCallback(() => {
    const start = new Date(customStartInput);
    const end = new Date(customEndInput);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      setRangeError("Dates invalides.");
      return;
    }
    if (!(start < end)) {
      setRangeError("La fin doit être après le début.");
      return;
    }
    if (end.getTime() - start.getTime() > MAX_CUSTOM_RANGE_MS) {
      setRangeError("Plage maximale : 90 jours.");
      return;
    }
    setRangeError(null);
    setAppliedCustom({
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    });
  }, [customStartInput, customEndInput]);

  const load = useCallback(async () => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    if (firstRequestRef.current) setInitialLoading(true);
    else setRefreshing(true);
    try {
      const bounds = computeQueryBounds({
        windowMode,
        presetHours,
        appliedCustom,
      });
      const hours = hoursBetween(bounds.start, bounds.end);
      const fetchLimits = scaledFetchLimits(hours, limits);
      const [systemHistory, rawContainers] = await Promise.all([
        analyticsService.getSystemMetricsHistory({
          startDate: bounds.start.toISOString(),
          endDate: bounds.end.toISOString(),
          limit: fetchLimits.systemHistoryLimit,
          offset: 0,
          signal: controller.signal,
        }),
        analyticsService.getContainersList({
          timeoutMs: 45_000,
          signal: controller.signal,
        }),
      ]);
      if (controller.signal.aborted) return;

      const names = (rawContainers || [])
        .map((c) => c.name)
        .filter(
          (n): n is string =>
            typeof n === "string" && n.startsWith("jobbingtrack-"),
        );

      setContainers(names);

      if (!bootstrappedRef.current && names.length > 0) {
        bootstrappedRef.current = true;
        const first = pickInitialFocusService(names);
        setFocusName(first);
        setLoadedOrder(first ? [first] : []);
      } else {
        setFocusName((prev) => {
          if (prev && names.includes(prev)) return prev;
          return names[0] ?? null;
        });
        setLoadedOrder((prev) => {
          const kept = prev
            .filter((n) => names.includes(n))
            .slice(-limits.maxHistoriesLoaded);
          if (kept.length > 0) return kept;
          return names[0] ? [names[0]] : [];
        });
      }

      const normalizedSystem: SystemPoint[] = (systemHistory || [])
        .map((r: Record<string, unknown>) => {
          const ts = normalizeMetricTimestampToIso(String(r.timestamp ?? ""));
          const timeMs = metricRowToTimeMs(r, ts);
          if (!ts || timeMs == null) return null;
          const cpu =
            r.cpuUsagePercent != null
              ? Number(r.cpuUsagePercent)
              : r.cpu_usage_percent != null
                ? Number(r.cpu_usage_percent)
                : null;
          const mem =
            r.memoryUsagePercent != null
              ? Number(r.memoryUsagePercent)
              : r.memory_usage_percent != null
                ? Number(r.memory_usage_percent)
                : null;
          return {
            timeMs,
            timestamp: ts,
            system_cpu: Number.isFinite(cpu as number) ? (cpu as number) : null,
            system_memory: Number.isFinite(mem as number)
              ? (mem as number)
              : null,
          };
        })
        .filter((r): r is SystemPoint => r != null);

      setSystemRows(normalizedSystem);
      setLastUpdatedAt(new Date().toISOString());
    } finally {
      if (loadAbortRef.current === controller) {
        loadAbortRef.current = null;
      }
      if (!controller.signal.aborted) {
        setInitialLoading(false);
        setRefreshing(false);
      }
      firstRequestRef.current = false;
    }
  }, [limits, windowMode, presetHours, appliedCustom]);

  useEffect(() => {
    void load();
    return () => {
      loadAbortRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    setLoadedOrder((prev) => prev.slice(-limits.maxHistoriesLoaded));
  }, [limits.maxHistoriesLoaded]);

  /** Garde le focus sur un service encore chargé (LRU, retrait manuel, ou réduction du plafond). */
  useEffect(() => {
    setFocusName((f) => {
      if (loadedOrder.length === 0) return null;
      if (f && loadedOrder.includes(f)) return f;
      return loadedOrder[loadedOrder.length - 1] ?? null;
    });
  }, [loadedOrder]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    if (loadedOrder.length === 0) {
      setHistoriesLoading(false);
      setContainerRows({});
      setAvailabilityByService({});
      setDataQualityByService({});
      setLiveFallbackByService({});
      return;
    }
    setHistoriesLoading(true);
    (async () => {
      try {
        const bounds = computeQueryBounds({
          windowMode,
          presetHours,
          appliedCustom,
        });
        const hours = hoursBetween(bounds.start, bounds.end);
        const fetchLimits = scaledFetchLimits(hours, limits);
        const opts = {
          startDate: bounds.start.toISOString(),
          endDate: bounds.end.toISOString(),
          limit: fetchLimits.historyLimit,
          offset: 0,
        };
        const availLimit = Math.min(
          15000,
          Math.max(200, fetchLimits.historyLimit * 3),
        );
        const rangeKey = [
          opts.startDate,
          opts.endDate,
          fetchLimits.historyLimit,
          availLimit,
        ].join("|");
        const refreshAll = historyRangeKeyRef.current !== rangeKey;
        const namesToFetch = refreshAll
          ? loadedOrder
          : loadedOrder.filter(
              (name) =>
                (containerRowsRef.current[name]?.length ?? 0) === 0 ||
                (availabilityByServiceRef.current[name]?.length ?? 0) === 0,
            );

        if (namesToFetch.length === 0) {
          setHistoriesLoading(false);
          return;
        }

        const results = await promisePool(
          namesToFetch,
          FETCH_CONCURRENCY,
          async (name) => {
            const [rows, availRaw, availStats, liveStats] = await Promise.all([
              settleMetricCall(
                analyticsService.getContainerMetricsHistory(name, {
                  ...opts,
                  signal: controller.signal,
                }),
                [] as Record<string, unknown>[],
              ),
              settleMetricCall(
                analyticsService.getServiceAvailabilityHistory(name, {
                  startDate: opts.startDate,
                  endDate: opts.endDate,
                  limit: availLimit,
                  signal: controller.signal,
                }),
                [] as Record<string, unknown>[],
              ),
              settleMetricCall(
                analyticsService.getServiceAvailabilityStats(
                  name,
                  Math.max(1, Math.ceil(hours)),
                  controller.signal,
                ),
                null,
              ),
              settleMetricCall(
                analyticsService.getContainerStats(name, controller.signal, {
                  timeoutMs: 10_000,
                }),
                null,
              ),
            ]);
            const parsed: ContainerPoint[] = (rows || [])
              .map((r: Record<string, unknown>) => {
                const ts = normalizeMetricTimestampToIso(
                  String(r.timestamp ?? ""),
                );
                const timeMs = metricRowToTimeMs(r, ts);
                if (!ts || timeMs == null) return null;
                const networkRxBytes = readNumericField(r, [
                  "networkRxBytes",
                  "network_rx_bytes",
                  "total_network_rx_bytes",
                  "totalNetworkRxBytes",
                ]);
                const networkTxBytes = readNumericField(r, [
                  "networkTxBytes",
                  "network_tx_bytes",
                  "total_network_tx_bytes",
                  "totalNetworkTxBytes",
                ]);
                const ioReadMb = readMetricValueAsMb(
                  r,
                  [
                    "blockIoReadBytes",
                    "block_io_read_bytes",
                    "blockReadBytes",
                    "block_read_bytes",
                    "blkioReadBytes",
                    "blkio_read_bytes",
                    "ioReadBytes",
                    "io_read_bytes",
                  ],
                  [
                    "block_io_read_mb",
                    "blockReadMb",
                    "blkio_read_mb",
                    "io_read_mb",
                  ],
                );
                const ioWriteMb = readMetricValueAsMb(
                  r,
                  [
                    "blockIoWriteBytes",
                    "block_io_write_bytes",
                    "blockWriteBytes",
                    "block_write_bytes",
                    "blkioWriteBytes",
                    "blkio_write_bytes",
                    "ioWriteBytes",
                    "io_write_bytes",
                  ],
                  [
                    "block_io_write_mb",
                    "blockWriteMb",
                    "blkio_write_mb",
                    "io_write_mb",
                  ],
                );
                const cpu = readNumericField(r, [
                  "cpuUsagePercent",
                  "cpu_usage_percent",
                  "cpu_percent",
                ]);
                const memoryPct = readNumericField(r, [
                  "memoryUsagePercent",
                  "memory_usage_percent",
                  "memory_percent",
                ]);
                const memoryUsedBytes = readNumericField(r, [
                  "memoryUsageBytes",
                  "memory_usage_bytes",
                  "memory_used_bytes",
                ]);
                const memoryLimitBytes = readNumericField(r, [
                  "memoryLimitBytes",
                  "memory_limit_bytes",
                  "memory_total_bytes",
                ]);
                const memory =
                  memoryPct != null
                    ? memoryPct
                    : memoryUsedBytes != null &&
                        memoryLimitBytes != null &&
                        memoryLimitBytes > 0
                      ? (memoryUsedBytes / memoryLimitBytes) * 100
                      : null;
                const networkRxMb = readMetricValueAsMb(
                  r,
                  [
                    "networkRxBytes",
                    "network_rx_bytes",
                    "total_network_rx_bytes",
                    "totalNetworkRxBytes",
                  ],
                  ["network_rx_mb", "networkRxMb", "total_network_rx_mb"],
                );
                const networkTxMb = readMetricValueAsMb(
                  r,
                  [
                    "networkTxBytes",
                    "network_tx_bytes",
                    "total_network_tx_bytes",
                    "totalNetworkTxBytes",
                  ],
                  ["network_tx_mb", "networkTxMb", "total_network_tx_mb"],
                );
                return {
                  timeMs,
                  timestamp: ts,
                  cpu,
                  memory,
                  networkRxMb,
                  networkTxMb,
                  ioReadMb,
                  ioWriteMb,
                };
              })
              .filter((x): x is ContainerPoint => x != null);
            const availabilityHistory = parseAvailabilityHistoryRows(
              (availRaw || []) as Record<string, unknown>[],
            );
            const availability =
              availabilityHistory.length > 0
                ? availabilityHistory
                : buildAvailabilityFallbackFromStats(
                    availStats as AvailabilityStatsLike,
                    bounds,
                  );
            const liveRaw = (
              liveStats && typeof liveStats === "object"
                ? (liveStats as Record<string, unknown>)
                : {}
            ) as Record<string, unknown>;
            const liveMemoryPct =
              readNumericField(liveRaw, ["memory_percent", "memoryPercent"]) ??
              readNestedNumber(liveRaw, ["memory", "percentage"]);
            const liveCpuPct =
              readNumericField(liveRaw, ["cpu_percent", "cpuPercent"]) ??
              readNestedNumber(liveRaw, ["cpu", "percentage"]);
            const liveNetworkRxMb =
              readMetricValueAsMb(
                liveRaw,
                ["network_rx", "networkRxBytes"],
                ["network_rx_mb", "networkRxMb"],
              ) ??
              (readNestedNumber(liveRaw, ["network", "rx"]) != null
                ? readNestedNumber(liveRaw, ["network", "rx"])! / (1024 * 1024)
                : null);
            const liveNetworkTxMb =
              readMetricValueAsMb(
                liveRaw,
                ["network_tx", "networkTxBytes"],
                ["network_tx_mb", "networkTxMb"],
              ) ??
              (readNestedNumber(liveRaw, ["network", "tx"]) != null
                ? readNestedNumber(liveRaw, ["network", "tx"])! / (1024 * 1024)
                : null);
            const liveIoReadMb =
              readMetricValueAsMb(
                liveRaw,
                ["block_read", "blockReadBytes", "block_io_read_bytes"],
                ["block_read_mb", "blockIoReadMb", "block_io_read_mb"],
              ) ??
              (readNestedNumber(liveRaw, ["blockIO", "read"]) != null
                ? readNestedNumber(liveRaw, ["blockIO", "read"])! /
                  (1024 * 1024)
                : null);
            const liveIoWriteMb =
              readMetricValueAsMb(
                liveRaw,
                ["block_write", "blockWriteBytes", "block_io_write_bytes"],
                ["block_write_mb", "blockIoWriteMb", "block_io_write_mb"],
              ) ??
              (readNestedNumber(liveRaw, ["blockIO", "write"]) != null
                ? readNestedNumber(liveRaw, ["blockIO", "write"])! /
                  (1024 * 1024)
                : null);
            const liveFallback: LiveContainerFallback = {
              cpuPercent: liveCpuPct,
              memoryPercent: liveMemoryPct,
              networkRxMb: liveNetworkRxMb,
              networkTxMb: liveNetworkTxMb,
              ioReadMb: Number.isFinite(liveIoReadMb) ? liveIoReadMb : null,
              ioWriteMb: Number.isFinite(liveIoWriteMb) ? liveIoWriteMb : null,
            };
            const ioPoints = parsed.filter(
              (p) => p.ioReadMb != null || p.ioWriteMb != null,
            ).length;
            const trSource: ServiceDataQuality["trSource"] =
              availabilityHistory.length > 0
                ? "history"
                : availability.length > 0
                  ? "stats-fallback"
                  : "none";
            return {
              name,
              rows: parsed,
              availability,
              quality: {
                ioPoints,
                totalPoints: parsed.length,
                trSource,
                trPoints: availability.length,
              } satisfies ServiceDataQuality,
              liveFallback,
            };
          },
        );
        if (cancelled) return;
        historyRangeKeyRef.current = rangeKey;
        setContainerRows((prev) => {
          const next: Record<string, ContainerPoint[]> = { ...prev };
          for (const k of Object.keys(next)) {
            if (!loadedOrder.includes(k)) delete next[k];
          }
          results.forEach((r) => {
            next[r.name] = r.rows;
          });
          return next;
        });
        setAvailabilityByService((prev) => {
          const next: Record<string, AvailabilityPoint[]> = { ...prev };
          for (const k of Object.keys(next)) {
            if (!loadedOrder.includes(k)) delete next[k];
          }
          results.forEach((r) => {
            next[r.name] = r.availability;
          });
          return next;
        });
        setDataQualityByService((prev) => {
          const next: Record<string, ServiceDataQuality> = { ...prev };
          for (const k of Object.keys(next)) {
            if (!loadedOrder.includes(k)) delete next[k];
          }
          results.forEach((r) => {
            next[r.name] = r.quality;
          });
          return next;
        });
        setLiveFallbackByService((prev) => {
          const next: Record<string, LiveContainerFallback> = { ...prev };
          for (const k of Object.keys(next)) {
            if (!loadedOrder.includes(k)) delete next[k];
          }
          results.forEach((r) => {
            next[r.name] = r.liveFallback;
          });
          return next;
        });
      } finally {
        if (!cancelled) setHistoriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [loadedOrder, limits, windowMode, presetHours, appliedCustom]);

  const loadFocusIncidentData = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      incidentsAbortRef.current?.abort();
      const controller = new AbortController();
      incidentsAbortRef.current = controller;
      if (!focusName) {
        setFocusIncidents(null);
        setSecurityWindowScore(null);
        setFocusLogs([]);
        setFocusPersistenceLogsLoading(false);
        setFocusSecuritySummaryLoading(false);
        return;
      }
      const activeFocusName = focusName;
      if (showLoading) {
        setFocusPersistenceLogsLoading(true);
        setFocusSecuritySummaryLoading(true);
      }
      const bounds = computeQueryBounds({
        windowMode,
        presetHours,
        appliedCustom,
      });
      const hours = hoursFromBounds(bounds.start, bounds.end);

      const loadLogs = async () => {
        try {
          const focusAliases = persistenceServiceAliases(activeFocusName);
          const [persistedLogs, securityLogs] = await Promise.all([
            analyticsService.getPersistenceLogs({
              serviceNames: focusAliases,
              startDate: bounds.start.toISOString(),
              endDate: bounds.end.toISOString(),
              limit: 1200,
              signal: controller.signal,
            }),
            fetchSecurityLogsForCorrelation({
              startDate: bounds.start.toISOString(),
              endDate: bounds.end.toISOString(),
              limit: 1200,
              signal: controller.signal,
            }).catch((error) => {
              console.warn(
                "Logs sécurité indisponibles pour la corrélation fine:",
                error instanceof Error ? error.message : error,
              );
              return [];
            }),
          ]);
          if (controller.signal.aborted) return;
          const securityLogsRaw = Array.isArray(securityLogs)
            ? securityLogs
            : [];
          const persistenceRows = enrichAggLogRows(
            (Array.isArray(persistedLogs) ? persistedLogs : []) as AggLogRow[],
            securityLogsRaw,
          );
          const securityRows = securityLogsRaw
            .filter((row) => securityLogMatchesFocus(row, focusAliases))
            .map(mapSecurityLogToAggLog)
            .map((row) => enrichAggLogRows([row], securityLogsRaw)[0] ?? row);
          const rows = [...persistenceRows, ...securityRows].sort((a, b) => {
            const ta = new Date(String(a.timestamp || 0)).getTime();
            const tb = new Date(String(b.timestamp || 0)).getTime();
            return tb - ta;
          });
          setFocusLogs(rows);
          const errorCount = rows.filter(
            (r) =>
              String(r.level || "").toUpperCase() === "ERROR" ||
              String(r.level || "").toUpperCase() === "CRITICAL" ||
              String(r.level || "").toUpperCase() === "FATAL",
          ).length;
          const warnCount = rows.filter(
            (r) =>
              String(r.level || "").toUpperCase() === "WARN" ||
              String(r.level || "").toUpperCase() === "WARNING",
          ).length;
          setFocusIncidents({
            total: rows.length,
            errorCount,
            warnCount,
            securitySignals: countSecuritySignalsInLogs(rows),
          });
        } finally {
          if (
            showLoading &&
            !controller.signal.aborted &&
            incidentsAbortRef.current === controller
          ) {
            setFocusPersistenceLogsLoading(false);
          }
        }
      };

      const loadSecuritySummary = async () => {
        try {
          const secSummary =
            await analyticsService.getSecurityPersistenceSummary(
              hours,
              controller.signal,
            );
          if (controller.signal.aborted) return;
          const avg =
            secSummary && typeof secSummary === "object"
              ? readNumericField(secSummary, ["avgSecurityScore"])
              : null;
          setSecurityWindowScore(avg);
        } finally {
          if (
            showLoading &&
            !controller.signal.aborted &&
            incidentsAbortRef.current === controller
          ) {
            setFocusSecuritySummaryLoading(false);
          }
        }
      };

      await Promise.all([loadLogs(), loadSecuritySummary()]);
    },
    [focusName, windowMode, presetHours, appliedCustom],
  );

  useEffect(() => {
    void loadFocusIncidentData({ showLoading: true });
    return () => {
      incidentsAbortRef.current?.abort();
      setFocusPersistenceLogsLoading(false);
      setFocusSecuritySummaryLoading(false);
    };
  }, [loadFocusIncidentData]);

  useEffect(() => {
    if (!autoRefreshEnabled || typeof window === "undefined") return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadFocusIncidentData({ showLoading: false });
      }
    }, limits.autoRefreshMs);
    return () => window.clearInterval(id);
  }, [autoRefreshEnabled, limits.autoRefreshMs, loadFocusIncidentData]);

  useEffect(() => {
    setIncidentContextDiagKey(null);
  }, [focusName, focusLogs]);

  const mergedByContainer = useMemo(() => {
    const map: Record<string, MergedServicePoint[]> = {};
    for (const name of loadedOrder) {
      const cr = containerRows[name] || [];
      const withSystem = mergeSystemNearestOntoContainer(
        cr,
        systemRows,
        MERGE_SYSTEM_MAX_DELTA_MS,
      );
      const avail = availabilityByService[name] || [];
      map[name] = mergeAvailabilityOntoMerged(
        withSystem,
        avail,
        MERGE_AVAILABILITY_MAX_DELTA_MS,
      );
    }
    return map;
  }, [loadedOrder, containerRows, systemRows, availabilityByService]);

  const tableRows = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    return containers
      .filter((name) => shortContainerName(name).toLowerCase().includes(q))
      .map((name) => {
        const loaded = loadedOrder.includes(name);
        const rows = containerRows[name];
        const merged = mergedByContainer[name] || [];
        const sum =
          loaded && rows && rows.length > 0
            ? summarizeWindow(
                rows,
                merged,
                availabilityByService[name],
                liveFallbackByService[name],
              )
            : null;
        return { name, loaded, sum, isFocus: focusName === name };
      });
  }, [
    containers,
    listFilter,
    loadedOrder,
    containerRows,
    mergedByContainer,
    focusName,
    availabilityByService,
    liveFallbackByService,
  ]);

  const sortedTableRows = useMemo(() => {
    if (summarySort.direction == null) return tableRows;
    const dir = summarySort.direction === "asc" ? 1 : -1;
    const asNum = (v: number | null | undefined) =>
      v == null || !Number.isFinite(v) ? Number.NEGATIVE_INFINITY : v;
    const arr = [...tableRows];
    arr.sort((a, b) => {
      if (summarySort.key === "name") return a.name.localeCompare(b.name) * dir;
      const av = a.sum
        ? asNum(a.sum[summarySort.key])
        : Number.NEGATIVE_INFINITY;
      const bv = b.sum
        ? asNum(b.sum[summarySort.key])
        : Number.NEGATIVE_INFINITY;
      if (av === bv) return a.name.localeCompare(b.name);
      return (av - bv) * dir;
    });
    return arr;
  }, [tableRows, summarySort]);

  const focusIncidentAlignedRows = useMemo<FocusIncidentAlignedRow[]>(() => {
    if (!focusName) return [];
    const merged = mergedByContainer[focusName] || [];
    const availability = availabilityByService[focusName] || [];
    if (focusLogs.length === 0) return [];
    const findNearest = (timeMs: number) => {
      if (merged.length === 0) return null;
      let best = merged[0];
      let bestD = Math.abs(merged[0].timeMs - timeMs);
      for (let i = 1; i < merged.length; i++) {
        const d = Math.abs(merged[i].timeMs - timeMs);
        if (d < bestD) {
          best = merged[i];
          bestD = d;
        }
      }
      if (bestD > INCIDENT_ALIGNMENT_MAX_DELTA_MS) return null;
      return { point: best, deltaSec: Math.round(bestD / 1000) };
    };
    const findNearestSystem = (timeMs: number) => {
      if (systemRows.length === 0) return null;
      let best = systemRows[0];
      let bestD = Math.abs(systemRows[0].timeMs - timeMs);
      for (let i = 1; i < systemRows.length; i++) {
        const d = Math.abs(systemRows[i].timeMs - timeMs);
        if (d < bestD) {
          best = systemRows[i];
          bestD = d;
        }
      }
      if (bestD > INCIDENT_ALIGNMENT_MAX_DELTA_MS) return null;
      return best;
    };
    const findNearestResponseTime = (timeMs: number): number | null => {
      if (availability.length === 0) return null;
      let best = availability[0];
      let bestD = Math.abs(availability[0].timeMs - timeMs);
      for (let i = 1; i < availability.length; i++) {
        const d = Math.abs(availability[i].timeMs - timeMs);
        if (d < bestD) {
          best = availability[i];
          bestD = d;
        }
      }
      if (bestD > INCIDENT_ALIGNMENT_MAX_DELTA_MS) return null;
      return best.responseTimeMs;
    };
    const rows: FocusIncidentAlignedRow[] = focusLogs
      .map((row): FocusIncidentAlignedRow | null => {
        const ts = new Date(String(row.timestamp || "")).getTime();
        if (!Number.isFinite(ts)) return null;
        const ctx = parseIncidentContext(row);
        const near = findNearest(ts);
        const nearSystem = findNearestSystem(ts);
        return {
          timestamp: new Date(ts).toISOString(),
          level: String(row.level || "INFO").toUpperCase(),
          requestId: ctx.requestId,
          httpMethod: ctx.httpMethod,
          endpoint: ctx.endpoint,
          ip: ctx.ip,
          protocol: ctx.protocol,
          port: ctx.port,
          httpStatus: ctx.httpStatus,
          message: String(row.message || ""),
          nearestCpu:
            near?.point.cpu ??
            near?.point.system_cpu ??
            nearSystem?.system_cpu ??
            null,
          nearestMemory:
            near?.point.memory ??
            near?.point.system_memory ??
            nearSystem?.system_memory ??
            null,
          nearestRtMs:
            near?.point.responseTimeMs ?? findNearestResponseTime(ts),
          deltaSec: near?.deltaSec ?? null,
          emptyReason: null,
          rawLog: row,
        };
      })
      .filter((x): x is FocusIncidentAlignedRow => x != null)
      .filter((row) =>
        isCorrelationTableEligibleRow(row.rawLog, {
          requestId: row.requestId,
          httpMethod: row.httpMethod,
          endpoint: row.endpoint,
          ip: row.ip,
          protocol: row.protocol,
          port: row.port,
          httpStatus: row.httpStatus,
        }),
      )
      .map(
        (row): FocusIncidentAlignedRow => ({
          ...row,
          emptyReason: buildIncidentEmptyReason(row),
        }),
      );
    return rows
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 30);
  }, [
    focusLogs,
    focusName,
    mergedByContainer,
    availabilityByService,
    systemRows,
  ]);

  const filteredSortedIncidentRows = useMemo(() => {
    let rows = focusIncidentAlignedRows;
    if (incidentLevelFilter !== "all") {
      rows = rows.filter((r) => r.level === incidentLevelFilter);
    }
    if (incidentNeedRequestId) {
      rows = rows.filter((r) =>
        Boolean(r.requestId && r.requestId.trim().length > 0),
      );
    }
    const q = incidentSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [
          r.message,
          r.httpMethod,
          r.endpoint,
          r.ip,
          r.requestId,
          r.protocol,
          r.port,
          r.httpStatus,
        ]
          .filter((v): v is string => typeof v === "string")
          .some((v) => v.toLowerCase().includes(q)),
      );
    }
    if (incidentSort.direction == null) return rows;
    const dir = incidentSort.direction === "asc" ? 1 : -1;
    const withNum = (v: number | null | undefined) =>
      v == null || !Number.isFinite(v) ? Number.NEGATIVE_INFINITY : v;
    const withStr = (v: string | null | undefined) => (v || "").toLowerCase();
    const arr = [...rows];
    arr.sort((a, b) => {
      switch (incidentSort.key) {
        case "timestamp":
          return (
            (new Date(a.timestamp).getTime() -
              new Date(b.timestamp).getTime()) *
            dir
          );
        case "level":
          return a.level.localeCompare(b.level) * dir;
        case "requestId":
          return withStr(a.requestId).localeCompare(withStr(b.requestId)) * dir;
        case "httpMethod":
          return (
            withStr(a.httpMethod).localeCompare(withStr(b.httpMethod)) * dir
          );
        case "endpoint":
          return withStr(a.endpoint).localeCompare(withStr(b.endpoint)) * dir;
        case "ip":
          return withStr(a.ip).localeCompare(withStr(b.ip)) * dir;
        case "httpStatus": {
          const av = withNum(Number.parseInt(withStr(a.httpStatus), 10));
          const bv = withNum(Number.parseInt(withStr(b.httpStatus), 10));
          if (av === bv) return 0;
          return (av - bv) * dir;
        }
        case "nearestCpu":
          return (withNum(a.nearestCpu) - withNum(b.nearestCpu)) * dir;
        case "nearestMemory":
          return (withNum(a.nearestMemory) - withNum(b.nearestMemory)) * dir;
        case "nearestRtMs":
          return (withNum(a.nearestRtMs) - withNum(b.nearestRtMs)) * dir;
        case "deltaSec":
          return (withNum(a.deltaSec) - withNum(b.deltaSec)) * dir;
        default:
          return 0;
      }
    });
    return arr;
  }, [
    focusIncidentAlignedRows,
    incidentLevelFilter,
    incidentNeedRequestId,
    incidentSearch,
    incidentSort,
  ]);

  const incidentContextDiagnostics = useMemo(() => {
    const row = filteredSortedIncidentRows.find(
      (r) => stableIncidentRowKey(r) === incidentContextDiagKey,
    );
    if (!row) return null;
    return buildIncidentContextFieldDiagnostics(row.rawLog);
  }, [filteredSortedIncidentRows, incidentContextDiagKey]);

  /** Métriques conteneur + fusion dispo pour le service en focus (colonnes CPU / mémoire / TR / écart). */
  const focusMetricsReady = useMemo(
    () => Boolean(focusName && loadedOrder.includes(focusName)),
    [focusName, loadedOrder],
  );

  const onToggleSummarySort = useCallback((key: SummarySortKey) => {
    setSummarySort((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      return { key, direction: nextSortDirection(prev.direction) };
    });
  }, []);

  const onToggleIncidentSort = useCallback((key: IncidentSortKey) => {
    setIncidentSort((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      return { key, direction: nextSortDirection(prev.direction) };
    });
  }, []);

  const onSelectService = useCallback(
    (name: string) => {
      setFocusName(name);
      setLoadedOrder((prev) =>
        pushLoadedOrder(prev, name, limits.maxHistoriesLoaded),
      );
    },
    [limits.maxHistoriesLoaded],
  );

  const onSelectServiceAndFilter = useCallback(
    (name: string) => {
      setListFilter(shortContainerName(name));
      setBulkHint(null);
      onSelectService(name);
    },
    [onSelectService],
  );

  const unloadService = useCallback((name: string) => {
    setLoadedOrder((prev) => prev.filter((n) => n !== name));
  }, []);

  const loadedWithData = useMemo(
    () => loadedOrder.filter((n) => (containerRows[n]?.length ?? 0) > 0).length,
    [loadedOrder, containerRows],
  );

  const filteredList = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    const filtered = containers.filter((name) =>
      shortContainerName(name).toLowerCase().includes(q),
    );
    return [...filtered].sort((a, b) => {
      const aLoaded = loadedOrder.includes(a);
      const bLoaded = loadedOrder.includes(b);
      if (aLoaded !== bLoaded) return aLoaded ? -1 : 1;
      return shortContainerName(a).localeCompare(shortContainerName(b), "fr", {
        sensitivity: "base",
      });
    });
  }, [containers, listFilter, loadedOrder]);

  const loadAllFiltered = useCallback(() => {
    const all = filteredList;
    const cap = limits.maxHistoriesLoaded;
    if (all.length === 0) {
      setBulkHint("Aucun service ne correspond au filtre.");
      return;
    }
    setBulkHint(null);
    setLoadedOrder(all.slice(0, cap));
    if (all.length > cap) {
      setBulkHint(
        `${all.length} correspondances, ${cap} chargés (plafond ${cap}). Réduisez le filtre pour en couvrir d’autres.`,
      );
    }
  }, [filteredList, limits.maxHistoriesLoaded]);

  const clearAllLoaded = useCallback(() => {
    setLoadedOrder([]);
    setBulkHint(null);
  }, []);

  const activeBounds = computeQueryBounds({
    windowMode,
    presetHours,
    appliedCustom,
  });
  const activeBoundsLabel = `${activeBounds.start.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  })} → ${activeBounds.end.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 w-full max-w-[1600px] mx-auto">
        <Link
          href="/backoffice/performances"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <span aria-hidden>←</span>
          Retour à Performances
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Performances — corrélation
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
            Synthèse + détail par service sur la période définie ci-dessous. Les
            métriques ne sont chargées que pour les services présents dans la
            file mémoire (bouton « tout le filtre » ou clic unitaire).
          </p>
        </div>
        <PerformancesSubNav />

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Mode :
            </span>
            <button
              type="button"
              onClick={() => persistPerfMode("light")}
              className={`rounded border px-2 py-1 text-xs ${
                perfMode === "light"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-200"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Léger
            </button>
            <button
              type="button"
              onClick={() => persistPerfMode("full")}
              className={`rounded border px-2 py-1 text-xs ${
                perfMode === "full"
                  ? "border-amber-600 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-200"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Complet
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Rafraîchir
            </button>
            <button
              type="button"
              onClick={() => persistAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`rounded border px-2 py-1 text-xs ${
                autoRefreshEnabled
                  ? "border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-100"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Auto-refresh {autoRefreshEnabled ? "actif" : "en pause"}
            </button>
            {refreshing && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Actualisation…
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Synthèse chargée: {loadedWithData}/{loadedOrder.length}
              {historiesLoading ? " (chargement des courbes…)" : ""} · liste:{" "}
              {containers.length} services
            </span>
            {lastUpdatedAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                · MAJ {new Date(lastUpdatedAt).toLocaleTimeString("fr-FR")}
              </span>
            )}
          </div>
          {!autoRefreshEnabled && (
            <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
              Auto-refresh en pause : les historiques lourds restent stables
              pendant l'analyse. Utilisez <strong>Rafraîchir</strong> pour
              reprendre un instantané.
            </p>
          )}

          <div className="mb-4 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-600 dark:bg-gray-900/40">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Période :
              </span>
              <select
                aria-label="Fenêtre temporelle"
                value={windowMode === "custom" ? "custom" : String(presetHours)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "custom") {
                    enterCustomRangeDefaults();
                  } else {
                    setWindowMode("preset");
                    setAppliedCustom(null);
                    setRangeError(null);
                    setPresetHours(Number(v));
                  }
                }}
                className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="24">24 h</option>
                <option value="168">7 j</option>
                <option value="720">30 j</option>
                <option value="custom">Plage fixe</option>
              </select>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium">Actif :</span> {activeBoundsLabel}
            </p>
            {windowMode === "custom" && (
              <div className="flex flex-wrap items-end gap-3 border-t border-gray-200 pt-3 dark:border-gray-600">
                <div className="flex min-w-[10rem] flex-col gap-0.5">
                  <label
                    htmlFor="corr-range-start"
                    className="text-[11px] font-medium text-gray-600 dark:text-gray-400"
                  >
                    Début (local)
                  </label>
                  <input
                    id="corr-range-start"
                    type="datetime-local"
                    value={customStartInput}
                    onChange={(e) => setCustomStartInput(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex min-w-[10rem] flex-col gap-0.5">
                  <label
                    htmlFor="corr-range-end"
                    className="text-[11px] font-medium text-gray-600 dark:text-gray-400"
                  >
                    Fin (local)
                  </label>
                  <input
                    id="corr-range-end"
                    type="datetime-local"
                    value={customEndInput}
                    onChange={(e) => setCustomEndInput(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => applyCustomRangeFromInputs()}
                  className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Appliquer la plage
                </button>
                {rangeError && (
                  <p
                    className="w-full text-sm text-red-600 dark:text-red-400"
                    role="alert"
                  >
                    {rangeError}
                  </p>
                )}
              </div>
            )}
          </div>

          {initialLoading && containers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Chargement…
            </p>
          ) : (
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
              <aside className="order-2 w-full shrink-0 space-y-2 xl:order-1 xl:sticky xl:top-4 xl:w-[min(100%,20rem)] xl:min-w-[17rem]">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Services
                </label>
                <input
                  type="search"
                  value={listFilter}
                  onChange={(e) => {
                    setListFilter(e.target.value);
                    setBulkHint(null);
                  }}
                  placeholder="Filtrer…"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadAllFiltered()}
                    className="flex-1 min-w-[8rem] rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    Tout charger (filtre)
                  </button>
                  <button
                    type="button"
                    onClick={() => clearAllLoaded()}
                    className="rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Vider mémoire
                  </button>
                </div>
                {bulkHint && (
                  <p
                    className="text-[11px] text-amber-800 dark:text-amber-200/90"
                    role="status"
                  >
                    {bulkHint}
                  </p>
                )}
                <ul className="max-h-[min(420px,50vh)] overflow-y-auto overscroll-y-contain rounded-md border border-gray-200 bg-white [scrollbar-gutter:stable] dark:border-gray-600 dark:bg-gray-900/40">
                  {filteredList.map((name) => {
                    const short = shortContainerName(name);
                    const loaded = loadedOrder.includes(name);
                    const focus = focusName === name;
                    return (
                      <li
                        key={name}
                        className="border-b border-gray-100 last:border-b-0 dark:border-gray-700/80"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectService(name)}
                          className={`flex w-full min-h-[48px] flex-col items-stretch justify-center px-3 py-2.5 text-left text-sm transition-colors active:bg-gray-100 dark:active:bg-gray-800 ${
                            focus
                              ? "bg-blue-50 font-medium text-blue-900 dark:bg-blue-950/60 dark:text-blue-100"
                              : "text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/60"
                          }`}
                        >
                          <span className="truncate">{short}</span>
                          {loaded ? (
                            <span className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                              En mémoire
                            </span>
                          ) : (
                            <span className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-500">
                              Non chargé
                            </span>
                          )}
                        </button>
                        {loaded && (
                          <div className="border-t border-gray-100 px-3 pb-3 pt-2 dark:border-gray-700/80">
                            <button
                              type="button"
                              onClick={() => unloadService(name)}
                              className="flex w-full min-h-[44px] items-center justify-center rounded-lg border border-red-200/90 bg-red-50 px-3 text-sm font-medium text-red-800 shadow-sm transition-colors hover:bg-red-100 active:bg-red-200 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/80 dark:active:bg-red-900/50"
                            >
                              Retirer de la mémoire
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Max {limits.maxHistoriesLoaded} en mémoire (LRU au clic). «
                  Tout charger » = résultats du filtre, dans la limite. Cliquez
                  un nom de service pour le placer en focus et isoler le filtre.
                </p>
              </aside>

              <div className="order-1 min-w-0 flex-1 space-y-6 xl:order-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Synthèse sur la période active (filtre liste)
                  </h3>
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    {activeBoundsLabel}
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                    <table className="w-full min-w-[820px] text-left text-sm">
                      <thead className="sticky top-0 z-[1] bg-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                        <tr>
                          <th className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => onToggleSummarySort("name")}
                              className="inline-flex items-center gap-1 hover:underline"
                            >
                              Service
                              <span className="text-[10px] text-gray-500">
                                {sortGlyph(
                                  summarySort.key === "name",
                                  summarySort.direction,
                                )}
                              </span>
                            </button>
                          </th>
                          <th className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => onToggleSummarySort("points")}
                              className="inline-flex items-center gap-1 hover:underline"
                            >
                              Pts
                              <span className="text-[10px] text-gray-500">
                                {sortGlyph(
                                  summarySort.key === "points",
                                  summarySort.direction,
                                )}
                              </span>
                            </button>
                          </th>
                          <th className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => onToggleSummarySort("cpuMax")}
                              className="inline-flex items-center gap-1 hover:underline"
                            >
                              CPU max
                              <span className="text-[10px] text-gray-500">
                                {sortGlyph(
                                  summarySort.key === "cpuMax",
                                  summarySort.direction,
                                )}
                              </span>
                            </button>
                          </th>
                          <th className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => onToggleSummarySort("memMax")}
                              className="inline-flex items-center gap-1 hover:underline"
                            >
                              Mémoire max
                              <span className="text-[10px] text-gray-500">
                                {sortGlyph(
                                  summarySort.key === "memMax",
                                  summarySort.direction,
                                )}
                              </span>
                            </button>
                          </th>
                          <th
                            className="px-3 py-2 text-right"
                            title="Variation cumul Rx+Tx (Mo) entre premier et dernier point valide ; vide si reset compteur."
                          >
                            <button
                              type="button"
                              onClick={() => onToggleSummarySort("netDeltaMb")}
                              className="inline-flex items-center gap-1 hover:underline"
                            >
                              Δ Réseau
                              <span className="text-[10px] text-gray-500">
                                {sortGlyph(
                                  summarySort.key === "netDeltaMb",
                                  summarySort.direction,
                                )}
                              </span>
                            </button>
                          </th>
                          <th
                            className="px-3 py-2 text-right"
                            title="Idem lecture+écriture bloc (Mo)."
                          >
                            <button
                              type="button"
                              onClick={() => onToggleSummarySort("ioDeltaMb")}
                              className="inline-flex items-center gap-1 hover:underline"
                            >
                              Δ I/O
                              <span className="text-[10px] text-gray-500">
                                {sortGlyph(
                                  summarySort.key === "ioDeltaMb",
                                  summarySort.direction,
                                )}
                              </span>
                            </button>
                          </th>
                          <th
                            className="px-3 py-2 text-right"
                            title="Max sur la période (health + alignement conteneur)."
                          >
                            <button
                              type="button"
                              onClick={() => onToggleSummarySort("rtMaxMs")}
                              className="inline-flex items-center gap-1 hover:underline"
                            >
                              TR max
                              <span className="text-[10px] text-gray-500">
                                {sortGlyph(
                                  summarySort.key === "rtMaxMs",
                                  summarySort.direction,
                                )}
                              </span>
                            </button>
                          </th>
                          <th
                            className="px-3 py-2 text-right"
                            title="Dernier check health avec temps connu."
                          >
                            <button
                              type="button"
                              onClick={() => onToggleSummarySort("rtLastMs")}
                              className="inline-flex items-center gap-1 hover:underline"
                            >
                              TR fin
                              <span className="text-[10px] text-gray-500">
                                {sortGlyph(
                                  summarySort.key === "rtLastMs",
                                  summarySort.direction,
                                )}
                              </span>
                            </button>
                          </th>
                          <th className="px-3 py-2 w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {sortedTableRows.map(
                          ({ name, loaded, sum, isFocus }) => {
                            const short = shortContainerName(name);
                            return (
                              <tr
                                key={name}
                                className={
                                  isFocus
                                    ? "bg-blue-50/80 dark:bg-blue-950/30"
                                    : loaded
                                      ? "bg-white dark:bg-gray-800/80"
                                      : "bg-gray-50/50 dark:bg-gray-900/40"
                                }
                              >
                                <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSelectServiceAndFilter(name)
                                    }
                                    className="max-w-[16rem] truncate text-left hover:underline"
                                    title={`Filtrer et afficher ${short}`}
                                  >
                                    {short}
                                  </button>
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                  {sum ? sum.points : loaded ? "0" : "—"}
                                </td>
                                <td
                                  className={`px-3 py-2 text-right tabular-nums ${
                                    sum?.cpuMax != null && sum.cpuMax >= 85
                                      ? "font-semibold text-red-700 dark:text-red-400"
                                      : "text-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  {sum ? fmt1(sum.cpuMax, "%") : "—"}
                                </td>
                                <td
                                  className={`px-3 py-2 text-right tabular-nums ${
                                    sum?.memMax != null && sum.memMax >= 90
                                      ? "font-semibold text-red-700 dark:text-red-400"
                                      : "text-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  {sum ? fmt1(sum.memMax, "%") : "—"}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                  {sum ? fmt1(sum.netDeltaMb) : "—"}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                  {sum ? fmt1(sum.ioDeltaMb) : "—"}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                  {sum ? fmt0(sum.rtMaxMs) : "—"}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                  {sum ? fmt0(sum.rtLastMs) : "—"}
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={() => onSelectService(name)}
                                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                  >
                                    {isFocus
                                      ? "Actif"
                                      : loaded
                                        ? "Voir"
                                        : "Charger"}
                                  </button>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Δ Mo : dernier cumul valide − premier (réseau / I/O). Vide
                    si compteur a diminué. TR : health par service.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Détail graphique (un service)
                  </h3>
                  {!focusName ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Choisissez un service dans la liste.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const q = dataQualityByService[focusName];
                        return (
                          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Qualité des données :
                              <span className="ml-2">
                                I/O {q ? `${q.ioPoints}/${q.totalPoints}` : "—"}{" "}
                                points · TR source{" "}
                                {q?.trSource === "history"
                                  ? "historique"
                                  : q?.trSource === "stats-fallback"
                                    ? "fallback stats"
                                    : "indisponible"}{" "}
                                ({q?.trPoints ?? 0} pts)
                              </span>
                            </p>
                          </div>
                        );
                      })()}
                      {historiesLoading &&
                      (mergedByContainer[focusName]?.length ?? 0) === 0 ? (
                        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Chargement des courbes de corrélation…
                          </p>
                          <p className="mt-1 text-xs text-blue-800/80 dark:text-blue-100/80">
                            Les historiques conteneur, disponibilité et
                            métriques système sont chargés en parallèle avec une
                            concurrence limitée pour préserver le dev server.
                          </p>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="h-28 animate-pulse rounded-lg bg-blue-100 dark:bg-blue-900/40" />
                            <div className="h-28 animate-pulse rounded-lg bg-blue-100 dark:bg-blue-900/40" />
                          </div>
                        </div>
                      ) : (
                        <ServiceDashboardCard
                          fullName={focusName}
                          mergedRows={mergedByContainer[focusName] || []}
                          subChartHeight={limits.subChartHeight}
                          maxPointsPerChart={limits.pointsPerSubchart}
                        />
                      )}
                      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Corrélation incidents (logs + sécurité)
                        </h4>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {activeBoundsLabel}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40">
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Logs service
                            </p>
                            {focusPersistenceLogsLoading ? (
                              <div className="mt-1 h-7 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            ) : (
                              <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                {focusIncidents?.total ?? 0}
                              </p>
                            )}
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40">
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              ERROR / WARN
                            </p>
                            {focusPersistenceLogsLoading ? (
                              <div className="mt-1 h-7 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            ) : (
                              <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                {focusIncidents?.errorCount ?? 0} /{" "}
                                {focusIncidents?.warnCount ?? 0}
                              </p>
                            )}
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40">
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Signaux sécurité (logs)
                            </p>
                            {focusPersistenceLogsLoading ? (
                              <div className="mt-1 h-7 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            ) : (
                              <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                {focusIncidents?.securitySignals ?? 0}
                              </p>
                            )}
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40">
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Score sécurité moyen
                            </p>
                            {focusSecuritySummaryLoading ? (
                              <div className="mt-1 h-7 w-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            ) : (
                              <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                {fmt1(securityWindowScore)}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                          Signaux sécurité logs = détection par mots-clés
                          (`threat`, `waf`, `xss`, `sql injection`, `blocked
                          ip`, `suspicious`) pour contextualiser un pic perf.
                        </p>
                        <div className="mt-4">
                          <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                            Corrélation fine incidents ↔ points métriques
                          </h5>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <select
                              value={incidentLevelFilter}
                              onChange={(e) =>
                                setIncidentLevelFilter(
                                  e.target.value as
                                    | "all"
                                    | "ERROR"
                                    | "WARN"
                                    | "INFO",
                                )
                              }
                              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                            >
                              <option value="all">Niveau: tous</option>
                              <option value="ERROR">Niveau: ERROR</option>
                              <option value="WARN">Niveau: WARN</option>
                              <option value="INFO">Niveau: INFO</option>
                            </select>
                            <label className="inline-flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                checked={incidentNeedRequestId}
                                onChange={(e) =>
                                  setIncidentNeedRequestId(e.target.checked)
                                }
                              />
                              requestId présent
                            </label>
                            <input
                              type="search"
                              value={incidentSearch}
                              onChange={(e) =>
                                setIncidentSearch(e.target.value)
                              }
                              placeholder="Filtre texte (message/méthode/endpoint/IP/HTTP/requestId)…"
                              className="min-w-[16rem] flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                            />
                          </div>
                          {focusPersistenceLogsLoading ? (
                            <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                              <table className="w-full min-w-[1100px] text-left text-xs">
                                <thead className="bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                  <tr>
                                    <th className="px-2 py-2">Horodatage</th>
                                    <th className="px-2 py-2">Niveau</th>
                                    <th className="px-2 py-2">requestId</th>
                                    <th className="px-2 py-2">Méthode</th>
                                    <th className="px-2 py-2">Endpoint</th>
                                    <th className="px-2 py-2">IP</th>
                                    <th className="px-2 py-2 text-right">
                                      HTTP
                                    </th>
                                    <th className="px-2 py-2">Proto</th>
                                    <th className="px-2 py-2">Port</th>
                                    <th className="px-2 py-2 text-right">
                                      CPU % proche
                                    </th>
                                    <th className="px-2 py-2 text-right">
                                      Memoire % proche
                                    </th>
                                    <th className="px-2 py-2 text-right">
                                      TR ms proche
                                    </th>
                                    <th className="px-2 py-2 text-right">
                                      Ecart (s)
                                    </th>
                                    <th className="px-2 py-2">Message</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {Array.from({ length: 6 }).map((_, idx) => (
                                    <tr
                                      key={`incident-loading-row-${idx}`}
                                      className="animate-pulse"
                                    >
                                      {Array.from({ length: 14 }).map(
                                        (__, c) => (
                                          <td
                                            key={`incident-loading-cell-${idx}-${c}`}
                                            className="px-2 py-2"
                                          >
                                            <div className="h-3 rounded bg-gray-200 dark:bg-gray-700" />
                                          </td>
                                        ),
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="border-t border-gray-200 px-3 py-2 text-[11px] text-gray-500 dark:border-gray-600 dark:text-gray-400">
                                Chargement des logs incidents…
                              </div>
                            </div>
                          ) : filteredSortedIncidentRows.length === 0 ? (
                            <div className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                              <p>
                                Aucun log persisté WARN/ERROR sur cette période
                                pour ce conteneur (ou agrégateur indisponible).
                              </p>
                              <p className="text-[11px] leading-snug">
                                Les logs centralisés ne stockent que
                                WARN/ERROR/FATAL. Vérifiez que{" "}
                                <strong>jobbingtrack-metrics-aggregator</strong>{" "}
                                tourne (
                                <code className="rounded bg-gray-200 px-0.5 dark:bg-gray-700">
                                  make up-full
                                </code>{" "}
                                ou profil monitoring), que{" "}
                                <code className="rounded bg-gray-200 px-0.5 dark:bg-gray-700">
                                  make db-push-all
                                </code>{" "}
                                a créé la table{" "}
                                <code className="rounded bg-gray-200 px-0.5 dark:bg-gray-700">
                                  aggregated_logs
                                </code>
                                , et que{" "}
                                <code className="rounded bg-gray-200 px-0.5 dark:bg-gray-700">
                                  ENABLE_CENTRAL_LOGGING
                                </code>{" "}
                                n’est pas désactivé et que chaque microservice a{" "}
                                <code className="rounded bg-gray-200 px-0.5 dark:bg-gray-700">
                                  METRICS_SERVICE_URL
                                </code>{" "}
                                +{" "}
                                <code className="rounded bg-gray-200 px-0.5 dark:bg-gray-700">
                                  SERVICE_NAME
                                </code>{" "}
                                (ex. jobbingtrack-auth-service) dans Compose.
                              </p>
                            </div>
                          ) : (
                            <div className="mt-2 space-y-2">
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                Cliquez une ligne pour afficher le diagnostic
                                contexte (source technique, raison si vide,
                                correctif suggéré) pour requestId, méthode,
                                endpoint, IP, HTTP, proto et port.
                              </p>
                              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                                <table className="w-full min-w-[1100px] text-left text-xs">
                                  <thead className="bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                    <tr>
                                      <th className="px-2 py-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onToggleIncidentSort("timestamp")
                                          }
                                          className="inline-flex items-center gap-1 hover:underline"
                                        >
                                          Horodatage
                                          <span className="text-[10px] text-gray-500">
                                            {sortGlyph(
                                              incidentSort.key === "timestamp",
                                              incidentSort.direction,
                                            )}
                                          </span>
                                        </button>
                                      </th>
                                      <th className="px-2 py-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onToggleIncidentSort("level")
                                          }
                                          className="inline-flex items-center gap-1 hover:underline"
                                        >
                                          Niveau
                                          <span className="text-[10px] text-gray-500">
                                            {sortGlyph(
                                              incidentSort.key === "level",
                                              incidentSort.direction,
                                            )}
                                          </span>
                                        </button>
                                      </th>
                                      <th className="px-2 py-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onToggleIncidentSort("requestId")
                                          }
                                          className="inline-flex items-center gap-1 hover:underline"
                                        >
                                          requestId
                                          <span className="text-[10px] text-gray-500">
                                            {sortGlyph(
                                              incidentSort.key === "requestId",
                                              incidentSort.direction,
                                            )}
                                          </span>
                                        </button>
                                      </th>
                                      <th className="px-2 py-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onToggleIncidentSort("httpMethod")
                                          }
                                          className="inline-flex items-center gap-1 hover:underline"
                                        >
                                          Méthode
                                          <span className="text-[10px] text-gray-500">
                                            {sortGlyph(
                                              incidentSort.key === "httpMethod",
                                              incidentSort.direction,
                                            )}
                                          </span>
                                        </button>
                                      </th>
                                      <th className="px-2 py-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onToggleIncidentSort("endpoint")
                                          }
                                          className="inline-flex items-center gap-1 hover:underline"
                                        >
                                          Endpoint
                                          <span className="text-[10px] text-gray-500">
                                            {sortGlyph(
                                              incidentSort.key === "endpoint",
                                              incidentSort.direction,
                                            )}
                                          </span>
                                        </button>
                                      </th>
                                      <th className="px-2 py-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onToggleIncidentSort("ip")
                                          }
                                          className="inline-flex items-center gap-1 hover:underline"
                                        >
                                          IP
                                          <span className="text-[10px] text-gray-500">
                                            {sortGlyph(
                                              incidentSort.key === "ip",
                                              incidentSort.direction,
                                            )}
                                          </span>
                                        </button>
                                      </th>
                                      <th className="px-2 py-2 text-right">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onToggleIncidentSort("httpStatus")
                                          }
                                          className="inline-flex items-center gap-1 hover:underline"
                                        >
                                          HTTP
                                          <span className="text-[10px] text-gray-500">
                                            {sortGlyph(
                                              incidentSort.key === "httpStatus",
                                              incidentSort.direction,
                                            )}
                                          </span>
                                        </button>
                                      </th>
                                      <th className="px-2 py-2">Proto</th>
                                      <th className="px-2 py-2">Port</th>
                                      <th className="px-2 py-2 text-right">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onToggleIncidentSort("nearestCpu")
                                          }
                                          className="inline-flex items-center gap-1 hover:underline"
                                        >
                                          CPU % proche
                                          <span className="text-[10px] text-gray-500">
                                            {sortGlyph(
                                              incidentSort.key === "nearestCpu",
                                              incidentSort.direction,
                                            )}
                                          </span>
                                        </button>
                                      </th>
                                      <th className="px-2 py-2 text-right">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onToggleIncidentSort(
                                              "nearestMemory",
                                            )
                                          }
                                          className="inline-flex items-center gap-1 hover:underline"
                                        >
                                          Mémoire % proche
                                          <span className="text-[10px] text-gray-500">
                                            {sortGlyph(
                                              incidentSort.key ===
                                                "nearestMemory",
                                              incidentSort.direction,
                                            )}
                                          </span>
                                        </button>
                                      </th>
                                      <th className="px-2 py-2 text-right">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onToggleIncidentSort("nearestRtMs")
                                          }
                                          className="inline-flex items-center gap-1 hover:underline"
                                        >
                                          TR ms proche
                                          <span className="text-[10px] text-gray-500">
                                            {sortGlyph(
                                              incidentSort.key ===
                                                "nearestRtMs",
                                              incidentSort.direction,
                                            )}
                                          </span>
                                        </button>
                                      </th>
                                      <th className="px-2 py-2 text-right">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onToggleIncidentSort("deltaSec")
                                          }
                                          className="inline-flex items-center gap-1 hover:underline"
                                        >
                                          Écart (s)
                                          <span className="text-[10px] text-gray-500">
                                            {sortGlyph(
                                              incidentSort.key === "deltaSec",
                                              incidentSort.direction,
                                            )}
                                          </span>
                                        </button>
                                      </th>
                                      <th className="px-2 py-2">Message</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredSortedIncidentRows.map((r) => {
                                      const rowKey = stableIncidentRowKey(r);
                                      const selected =
                                        incidentContextDiagKey === rowKey;
                                      return (
                                        <tr
                                          key={rowKey}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() =>
                                            setIncidentContextDiagKey((k) =>
                                              k === rowKey ? null : rowKey,
                                            )
                                          }
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === "Enter" ||
                                              e.key === " "
                                            ) {
                                              e.preventDefault();
                                              setIncidentContextDiagKey((k) =>
                                                k === rowKey ? null : rowKey,
                                              );
                                            }
                                          }}
                                          className={`cursor-pointer transition-colors ${
                                            selected
                                              ? "bg-indigo-50 dark:bg-indigo-950/40"
                                              : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                          }`}
                                        >
                                          <td className="px-2 py-1.5 tabular-nums text-gray-700 dark:text-gray-300">
                                            {new Date(
                                              r.timestamp,
                                            ).toLocaleString("fr-FR")}
                                          </td>
                                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">
                                            {r.level}
                                          </td>
                                          <td className="px-2 py-1.5 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                                            {formatIncidentTableCell(
                                              r.requestId,
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 font-mono text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                                            {formatIncidentTableCell(
                                              r.httpMethod,
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">
                                            {formatIncidentTableCell(
                                              r.endpoint,
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                                            {formatIncidentTableCell(r.ip)}
                                          </td>
                                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                            {formatIncidentTableCell(
                                              r.httpStatus,
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">
                                            {formatIncidentTableCell(
                                              r.protocol,
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">
                                            {formatIncidentTableCell(r.port)}
                                          </td>
                                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                            {!focusMetricsReady ? (
                                              <div className="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                            ) : r.nearestCpu == null ? (
                                              "—"
                                            ) : (
                                              fmt1(r.nearestCpu)
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                            {!focusMetricsReady ? (
                                              <div className="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                            ) : r.nearestMemory == null ? (
                                              "—"
                                            ) : (
                                              fmt1(r.nearestMemory)
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                            {!focusMetricsReady ? (
                                              <div className="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                            ) : r.nearestRtMs == null ? (
                                              "—"
                                            ) : (
                                              fmt0(r.nearestRtMs)
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                            {!focusMetricsReady ? (
                                              <div className="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                                            ) : r.deltaSec == null ? (
                                              "—"
                                            ) : (
                                              r.deltaSec
                                            )}
                                          </td>
                                          <td className="max-w-[24rem] px-2 py-1.5 text-gray-700 dark:text-gray-300">
                                            <div className="truncate">
                                              {r.message || "—"}
                                            </div>
                                            {r.emptyReason ? (
                                              <div className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                                                {r.emptyReason}
                                              </div>
                                            ) : null}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              {incidentContextDiagnostics ? (
                                <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-800 dark:bg-indigo-950/30">
                                  <h6 className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">
                                    Diagnostic contexte (ligne sélectionnée)
                                  </h6>
                                  <p className="mt-1 text-[11px] text-indigo-800/90 dark:text-indigo-200/90">
                                    Sources = fusion{" "}
                                    <code className="rounded bg-white/80 px-0.5 dark:bg-gray-900/80">
                                      metadata
                                    </code>{" "}
                                    (dont{" "}
                                    <code className="rounded bg-white/80 px-0.5 dark:bg-gray-900/80">
                                      metadata.metadata
                                    </code>
                                    ) + objet JSON extrait du message si
                                    présent.
                                  </p>
                                  <div className="mt-2 overflow-x-auto">
                                    <table className="w-full min-w-[720px] text-left text-[11px]">
                                      <thead className="border-b border-indigo-200 text-indigo-900 dark:border-indigo-700 dark:text-indigo-100">
                                        <tr>
                                          <th className="py-1.5 pr-2 font-medium">
                                            Champ
                                          </th>
                                          <th className="py-1.5 pr-2 font-medium">
                                            Valeur
                                          </th>
                                          <th className="py-1.5 pr-2 font-medium">
                                            Source technique
                                          </th>
                                          <th className="py-1.5 pr-2 font-medium">
                                            Si absent
                                          </th>
                                          <th className="py-1.5 font-medium">
                                            Correctif / suite
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-indigo-100 text-gray-800 dark:divide-indigo-900/50 dark:text-gray-200">
                                        {incidentContextDiagnostics.map((d) => (
                                          <tr key={d.field}>
                                            <td className="py-1.5 pr-2 font-medium text-gray-900 dark:text-gray-100">
                                              {d.label}
                                            </td>
                                            <td className="max-w-[10rem] truncate py-1.5 pr-2 font-mono tabular-nums">
                                              {d.value ?? "—"}
                                            </td>
                                            <td className="max-w-[18rem] py-1.5 pr-2 leading-snug text-gray-700 dark:text-gray-300">
                                              {d.sourceTechnical}
                                            </td>
                                            <td className="max-w-[16rem] py-1.5 pr-2 leading-snug text-gray-600 dark:text-gray-400">
                                              {d.emptyDetail ?? "—"}
                                            </td>
                                            <td className="max-w-[20rem] py-1.5 leading-snug text-gray-700 dark:text-gray-300">
                                              {d.fixHint ?? "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

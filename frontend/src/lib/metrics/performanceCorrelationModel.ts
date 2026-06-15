import type { MetricsData } from "@/lib/interfaces";

export type IncidentCorrelationRowShape = {
  requestId: string | null;
  httpMethod: string | null;
  endpoint: string | null;
  ip: string | null;
  protocol: string | null;
  port: string | null;
  httpStatus: string | null;
  nearestCpu: number | null;
  nearestMemory: number | null;
  nearestRtMs: number | null;
  deltaSec: number | null;
};

export type LiveEndpointBar = {
  name: string;
  ms: number;
  status?: string;
};

export function parseLiveResponseTimeMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number.parseFloat(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

export function buildIncidentEmptyReason(
  row: IncidentCorrelationRowShape,
): string | null {
  const hasAnyContext = Boolean(
    row.requestId ||
      row.httpMethod ||
      row.endpoint ||
      row.ip ||
      row.protocol ||
      row.port ||
      row.httpStatus,
  );
  const hasAnyMetric =
    row.nearestCpu != null ||
    row.nearestMemory != null ||
    row.nearestRtMs != null;

  const missingContextCount = [
    row.requestId,
    row.httpMethod,
    row.endpoint,
    row.ip,
    row.protocol,
    row.port,
    row.httpStatus,
  ].filter((v) => !v).length;
  const missingMetricCount = [
    row.nearestCpu,
    row.nearestMemory,
    row.nearestRtMs,
  ].filter((v) => v == null).length;

  if (
    missingContextCount === 0 &&
    missingMetricCount === 0 &&
    row.deltaSec != null
  ) {
    return null;
  }

  const reasons: string[] = [];
  if (!hasAnyContext) {
    reasons.push("source absente");
  } else if (missingContextCount > 0) {
    reasons.push("champ manquant (contexte)");
  }

  if (!hasAnyMetric && row.deltaSec == null) {
    reasons.push("hors fenêtre");
  } else if (missingMetricCount > 0) {
    reasons.push("champ manquant (métriques)");
  }

  return reasons.length > 0 ? reasons.join(" | ") : null;
}

export function formatIncidentTableCell(
  value: string | null | undefined,
): string {
  if (typeof value === "string" && value.trim().length > 0) {
    const trimmed = value.trim();
    if (
      trimmed.includes("source absente") ||
      trimmed.includes("champ manquant") ||
      trimmed.includes("hors fenêtre")
    ) {
      return "—";
    }
    return trimmed;
  }
  return "—";
}

function normalizeServiceKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function serviceLabel(value: unknown): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 48)
    : "service";
}

export function buildLiveEndpointModel(liveMetrics: MetricsData | null): {
  bars: LiveEndpointBar[];
  noMeasure: string[];
  overviewMs: number | null;
} {
  const perService = new Map<
    string,
    { name: string; status?: string; response_time_ms?: unknown }
  >();

  for (const entry of liveMetrics?.responseTime?.per_service ?? []) {
    const key = normalizeServiceKey(entry.name);
    if (key) perService.set(key, entry);
  }

  const seen = new Set<string>();
  const rows: Array<{ name: string; ms: number | null; status?: string }> = [];

  for (const service of liveMetrics?.servicesList ?? []) {
    const possibleKeys = [
      service.rawName,
      service.name,
      service.displayName,
      service.id,
    ]
      .map(normalizeServiceKey)
      .filter((key): key is string => key != null);
    const perServiceEntry = possibleKeys
      .map((key) => perService.get(key))
      .find(Boolean);
    const name = serviceLabel(
      service.displayName || service.name || service.rawName || service.id,
    );
    const ms =
      parseLiveResponseTimeMs(service.responseTimeMs) ??
      parseLiveResponseTimeMs(service.responseTime) ??
      parseLiveResponseTimeMs(service.health?.responseTime) ??
      parseLiveResponseTimeMs(perServiceEntry?.response_time_ms);
    rows.push({
      name,
      ms,
      status:
        service.status ?? service.health?.status ?? perServiceEntry?.status,
    });
    possibleKeys.forEach((key) => seen.add(key));
  }

  for (const entry of liveMetrics?.responseTime?.per_service ?? []) {
    const key = normalizeServiceKey(entry.name);
    if (!key || seen.has(key)) continue;
    rows.push({
      name: serviceLabel(entry.name),
      ms: parseLiveResponseTimeMs(entry.response_time_ms),
      status: entry.status,
    });
    seen.add(key);
  }

  const bars = rows
    .filter((row): row is LiveEndpointBar => row.ms != null)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 20);

  const noMeasure = rows
    .filter((row) => row.ms == null)
    .map((row) => row.name)
    .slice(0, 30);

  const monitoringOverview = parseLiveResponseTimeMs(
    liveMetrics?.monitoringC?.avg_response_time_ms,
  );
  const responseOverview = parseLiveResponseTimeMs(
    liveMetrics?.responseTime?.average_ms,
  );

  return {
    bars,
    noMeasure,
    overviewMs: monitoringOverview ?? responseOverview,
  };
}

/**
 * Normalisation et enrichissement des logs incidents pour la corrélation fine.
 */

export type AggLogForensicsRow = {
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
  protocol?: string | null;
  port?: string | number | null;
  metadata?: Record<string, unknown> | null;
};

export type SecurityLogForensicsSource = {
  id?: string | null;
  sourceIP?: string | null;
  endpoint?: string | null;
  method?: string | null;
  statusCode?: number | string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
};

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-f:]+$/i;

function readLooseString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function isIpLikeString(value: unknown): boolean {
  const s = readLooseString(value);
  if (!s) return false;
  if (IPV4_RE.test(s)) return true;
  if (s.includes(":") && IPV6_RE.test(s)) return true;
  return false;
}

export function readFirstIpFromUnknownList(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    if (typeof item === "string" && isIpLikeString(item)) return item.trim();
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const row = item as Record<string, unknown>;
      const candidate =
        readLooseString(row.ip) ||
        readLooseString(row.sourceIP) ||
        readLooseString(row.sourceIp);
      if (candidate && isIpLikeString(candidate)) return candidate;
    }
  }
  return null;
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

function readLooseNumberOrString(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return readLooseString(value);
}

/** Winston / central logger peuvent imbriquer les champs dans `metadata.metadata`. */
export function mergeAggLogMetadata(
  row: AggLogForensicsRow,
): Record<string, unknown> | null {
  const raw = row.metadata;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = { ...(raw as Record<string, unknown>) };
  const inner = o.metadata;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    Object.assign(o, inner as Record<string, unknown>);
    delete o.metadata;
  }
  const rep = o.representativeForensics;
  if (rep && typeof rep === "object" && !Array.isArray(rep)) {
    Object.assign(o, rep as Record<string, unknown>);
  }
  return o;
}

function pickSecurityLogRequestId(
  row: SecurityLogForensicsSource,
): string | null {
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

function forensicsFromSecurityLog(
  row: SecurityLogForensicsSource,
): Record<string, unknown> {
  const metadata =
    row.metadata &&
    typeof row.metadata === "object" &&
    !Array.isArray(row.metadata)
      ? row.metadata
      : {};
  const requestId = pickSecurityLogRequestId(row);
  const endpoint =
    readLooseString(row.endpoint) ||
    firstMetadataString(metadata, ["endpoint", "originalUrl", "path", "url"]);
  const method =
    readLooseString(row.method) ||
    firstMetadataString(metadata, ["method", "httpMethod", "requestMethod"]);
  const sourceIp =
    readLooseString(row.sourceIP) ||
    firstMetadataString(metadata, ["sourceIP", "sourceIp", "clientIp", "ip"]);
  const statusCode =
    readLooseString(row.statusCode) ||
    firstMetadataString(metadata, ["statusCode", "httpStatus", "status"]);

  return {
    requestId,
    correlationId:
      firstMetadataString(metadata, ["correlationId"]) || requestId,
    method,
    httpMethod: method,
    endpoint,
    originalUrl: endpoint,
    path: firstMetadataString(metadata, ["path"]) || endpoint,
    url: firstMetadataString(metadata, ["url"]) || endpoint,
    sourceIP: sourceIp,
    clientIp:
      firstMetadataString(metadata, ["clientIp", "client_ip"]) || sourceIp,
    ip: firstMetadataString(metadata, ["ip"]) || sourceIp,
    statusCode,
    httpStatus: statusCode,
    protocol: firstMetadataString(metadata, ["protocol", "proto", "scheme"]),
    port: firstMetadataString(metadata, ["port", "localPort", "serverPort"]),
  };
}

/** Index logId → forensics issus de security_logs (corrélation alerte ↔ requête). */
export function buildSecurityLogForensicsIndex(
  securityLogs: SecurityLogForensicsSource[],
): Map<string, Record<string, unknown>> {
  const index = new Map<string, Record<string, unknown>>();
  for (const row of securityLogs) {
    const id = readLooseString(row.id);
    if (!id) continue;
    index.set(id, forensicsFromSecurityLog(row));
  }
  return index;
}

function assignIfEmpty(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (value == null || value === "") return;
  const existing = target[key];
  if (existing != null && String(existing).trim() !== "") return;
  target[key] = value;
}

/** Complète metadata/colonnes dérivées à partir d'un security_log lié ou d'IPs agrégées. */
export function enrichAggLogRow(
  row: AggLogForensicsRow,
  securityIndex: Map<string, Record<string, unknown>>,
): AggLogForensicsRow {
  const metadata = mergeAggLogMetadata(row) || {};
  const mergedMeta: Record<string, unknown> = { ...metadata };

  const linkedId =
    readLooseString(mergedMeta.logId) ||
    readLooseString(mergedMeta.securityLogId);
  if (linkedId) {
    const linked = securityIndex.get(linkedId);
    if (linked) {
      for (const [key, value] of Object.entries(linked)) {
        assignIfEmpty(mergedMeta, key, value);
      }
    }
  }

  const suspiciousIp = readFirstIpFromUnknownList(mergedMeta.suspiciousIPs);
  if (suspiciousIp) {
    assignIfEmpty(mergedMeta, "sourceIP", suspiciousIp);
    assignIfEmpty(mergedMeta, "clientIp", suspiciousIp);
    assignIfEmpty(mergedMeta, "ip", suspiciousIp);
  }

  const source = readLooseString(mergedMeta.source);
  if (source && isIpLikeString(source)) {
    assignIfEmpty(mergedMeta, "sourceIP", source);
    assignIfEmpty(mergedMeta, "clientIp", source);
    assignIfEmpty(mergedMeta, "ip", source);
  }

  const topRequestId =
    readLooseString(row.requestId) ||
    readLooseString(mergedMeta.requestId) ||
    readLooseString(mergedMeta.correlationId);

  return {
    ...row,
    requestId: topRequestId,
    method: readLooseString(row.method) || readLooseString(mergedMeta.method),
    httpMethod:
      readLooseString(row.httpMethod) ||
      readLooseString(mergedMeta.httpMethod) ||
      readLooseString(mergedMeta.method),
    endpoint:
      readLooseString(row.endpoint) ||
      readLooseString(mergedMeta.endpoint) ||
      readLooseString(mergedMeta.originalUrl) ||
      readLooseString(mergedMeta.path),
    sourceIP:
      readLooseString(row.sourceIP) ||
      readLooseString(mergedMeta.sourceIP) ||
      suspiciousIp,
    clientIp:
      readLooseString(row.clientIp) ||
      readLooseString(mergedMeta.clientIp) ||
      suspiciousIp,
    ip:
      readLooseString(row.ip) || readLooseString(mergedMeta.ip) || suspiciousIp,
    statusCode:
      readLooseNumberOrString(row.statusCode) ??
      readLooseNumberOrString(mergedMeta.statusCode) ??
      readLooseNumberOrString(mergedMeta.httpStatus),
    httpStatus:
      readLooseNumberOrString(row.httpStatus) ??
      readLooseNumberOrString(mergedMeta.httpStatus) ??
      readLooseNumberOrString(mergedMeta.statusCode),
    protocol:
      readLooseString(row.protocol) ||
      readLooseString(mergedMeta.protocol) ||
      readLooseString(mergedMeta.proto),
    port:
      readLooseNumberOrString(row.port) ??
      readLooseNumberOrString(mergedMeta.port),
    metadata: mergedMeta,
  };
}

export function enrichAggLogRows(
  rows: AggLogForensicsRow[],
  securityLogs: SecurityLogForensicsSource[],
): AggLogForensicsRow[] {
  const index = buildSecurityLogForensicsIndex(securityLogs);
  return rows.map((row) => enrichAggLogRow(row, index));
}

export type MinimalHttpForensicsShape = {
  requestId: string | null;
  httpMethod: string | null;
  endpoint: string | null;
  ip: string | null;
  protocol: string | null;
  port: string | null;
  httpStatus: string | null;
};

/** Corrélation fine : une ligne HTTP doit avoir tous ces champs (pas de demi-contexte). */
export function hasMinimalHttpForensics(
  ctx: MinimalHttpForensicsShape,
): boolean {
  return Boolean(
    ctx.requestId?.trim() &&
      ctx.httpMethod?.trim() &&
      ctx.endpoint?.trim() &&
      ctx.ip?.trim() &&
      ctx.protocol?.trim() &&
      ctx.port?.trim() &&
      ctx.httpStatus?.trim(),
  );
}

/** Alerte cron analyseur sans requête HTTP — ne doit pas polluer le tableau corrélation. */
export function isAnalyzerAggregateWithoutHttp(
  row: AggLogForensicsRow,
): boolean {
  const meta = mergeAggLogMetadata(row);
  const eventType = String(
    row.eventType || meta?.eventType || "",
  ).toLowerCase();
  const category = String(meta?.category || "").toLowerCase();
  const source = String(meta?.source || "").toLowerCase();
  const msg = String(row.message || "").toLowerCase();
  return (
    eventType === "security_alert_created" &&
    (category === "threat_analysis" ||
      source === "security-analyzer" ||
      msg.includes("activité d'attaque critique détectée"))
  );
}

export function isCorrelationTableEligibleRow(
  row: AggLogForensicsRow,
  ctx: MinimalHttpForensicsShape,
): boolean {
  if (isAnalyzerAggregateWithoutHttp(row)) return false;
  return hasMinimalHttpForensics(ctx);
}

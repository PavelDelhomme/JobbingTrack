import { logHref } from "./incidents";

export type ThreatTimelineSource =
  | "threat"
  | "security_log"
  | "intrusion_attempt"
  | "ddos_attack"
  | "network_connection";

export type ThreatTimelineItem = {
  id: string;
  source: ThreatTimelineSource;
  timestamp: string;
  sortKey: number;
  title: string;
  severity?: string;
  detail?: string;
  endpoint?: string | null;
  method?: string | null;
  isBlocked?: boolean;
  requestId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
  href?: string | null;
};

export type BuildThreatTimelineInput = {
  threat: {
    id: string;
    threatType?: string;
    severity?: string;
    detectedAt?: string;
    blocked?: boolean;
    sourceIp?: string;
  };
  investigation?: {
    application?: {
      recentEvents?: Array<Record<string, unknown>>;
    };
    network?: {
      connectionDetails?: Array<Record<string, unknown>>;
    };
    related?: {
      intrusionAttempts?: Array<Record<string, unknown>>;
      ddosAttacks?: Array<Record<string, unknown>>;
    };
  };
};

function parseTime(value: unknown): number {
  if (!value) return 0;
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickRequestId(meta: Record<string, unknown> | null): string | null {
  if (!meta) return null;
  const keys = ["requestId", "xRequestId", "x-request-id", "correlationId"];
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function formatTimelineSourceLabel(
  source: ThreatTimelineSource,
): string {
  const labels: Record<ThreatTimelineSource, string> = {
    threat: "Menace",
    security_log: "Log sécurité",
    intrusion_attempt: "Intrusion",
    ddos_attack: "DDoS",
    network_connection: "Réseau",
  };
  return labels[source];
}

export function buildThreatInvestigationTimeline(
  input: BuildThreatTimelineInput,
): ThreatTimelineItem[] {
  const items: ThreatTimelineItem[] = [];
  const { threat, investigation } = input;

  if (threat.detectedAt) {
    items.push({
      id: `threat-${threat.id}`,
      source: "threat",
      timestamp: String(threat.detectedAt),
      sortKey: parseTime(threat.detectedAt),
      title: `Menace détectée : ${threat.threatType || "inconnue"}`,
      severity: threat.severity,
      detail: threat.blocked
        ? "Menace marquée bloquée en base"
        : "Première détection enregistrée",
    });
  }

  for (const raw of investigation?.application?.recentEvents || []) {
    const log = raw;
    const ts = log.timestamp;
    const meta = asRecord(log.metadata);
    const eventType = log.eventType ? String(log.eventType) : undefined;
    const logId = log.id ? String(log.id) : null;
    items.push({
      id: logId || `log-${items.length}`,
      source: "security_log",
      timestamp: String(ts || ""),
      sortKey: parseTime(ts),
      title: eventType || String(log.category || "Événement sécurité"),
      severity: log.level ? String(log.level) : undefined,
      detail: log.message ? String(log.message) : undefined,
      endpoint: log.endpoint ? String(log.endpoint) : null,
      method: log.method ? String(log.method) : null,
      isBlocked: Boolean(log.isBlocked),
      requestId: pickRequestId(meta),
      userId: log.userId ? String(log.userId) : null,
      metadata: meta,
      href: logId ? logHref(logId, eventType) : null,
    });
  }

  for (const raw of investigation?.related?.intrusionAttempts || []) {
    const attempt = raw;
    const ts = attempt.timestamp || attempt.createdAt;
    const meta = asRecord(attempt.metadata);
    items.push({
      id: String(attempt.id || `intrusion-${items.length}`),
      source: "intrusion_attempt",
      timestamp: String(ts || ""),
      sortKey: parseTime(ts),
      title: `Tentative d'intrusion : ${attempt.attackType || "inconnue"}`,
      severity:
        attempt.riskScore != null && Number(attempt.riskScore) >= 80
          ? "high"
          : "warning",
      detail: attempt.blockReason
        ? String(attempt.blockReason)
        : attempt.payload
          ? "Payload suspect enregistré"
          : undefined,
      endpoint: attempt.targetEndpoint ? String(attempt.targetEndpoint) : null,
      method: attempt.method ? String(attempt.method) : null,
      isBlocked: Boolean(attempt.isBlocked),
      requestId: pickRequestId(meta),
      metadata: meta,
    });
  }

  for (const raw of investigation?.related?.ddosAttacks || []) {
    const attack = raw;
    const ts = attack.timestamp || attack.createdAt;
    const rps =
      attack.requestsPerSecond != null
        ? Number(attack.requestsPerSecond)
        : null;
    items.push({
      id: String(attack.id || `ddos-${items.length}`),
      source: "ddos_attack",
      timestamp: String(ts || ""),
      sortKey: parseTime(ts),
      title: `Attaque DDoS : ${attack.attackType || "inconnue"}`,
      severity: "critical",
      detail:
        rps != null && Number.isFinite(rps)
          ? `${rps} req/s${
              attack.targetEndpoint
                ? ` vers ${String(attack.targetEndpoint)}`
                : ""
            }`
          : undefined,
      endpoint: attack.targetEndpoint ? String(attack.targetEndpoint) : null,
      isBlocked: Boolean(attack.isMitigated),
    });
  }

  for (const raw of investigation?.network?.connectionDetails || []) {
    const conn = raw;
    const ts = conn.observedAt || conn.createdAt;
    const sortKey = parseTime(ts);
    if (!sortKey) continue;
    const local =
      conn.localIp && conn.localPort
        ? `${conn.localIp}:${conn.localPort}`
        : null;
    const remote =
      conn.remoteIp && conn.remotePort
        ? `${conn.remoteIp}:${conn.remotePort}`
        : threat.sourceIp || null;
    items.push({
      id: `conn-${conn.localPort || ""}-${conn.remotePort || ""}-${sortKey}`,
      source: "network_connection",
      timestamp: String(ts),
      sortKey,
      title: "Connexion réseau observée",
      detail: [conn.protocol, local, remote ? `← ${remote}` : null, conn.state]
        .filter(Boolean)
        .join(" · "),
    });
  }

  return items
    .filter((item) => item.sortKey > 0)
    .sort((a, b) => b.sortKey - a.sortKey);
}

export interface SecurityPersistenceSnapshot {
  avgSecurityScore?: unknown;
  totalFailedLogins?: unknown;
  totalSuspiciousActivities?: unknown;
  totalSecurityAlerts?: unknown;
  totalSqlInjectionAttempts?: unknown;
  totalXssAttempts?: unknown;
  uniqueBlockedIPs?: unknown;
  dataPoints?: unknown;
  source?: unknown;
  period?: unknown;
}

export interface LiveSecurityOverview {
  totalLogs?: unknown;
  criticalEvents?: unknown;
  intrusionAttempts?: unknown;
  ddosAttacks?: unknown;
  vulnerabilities?: unknown;
  securityScore?: unknown;
}

export interface LiveSecuritySummary {
  overview?: LiveSecurityOverview;
  averageRiskScore?: unknown;
}

export type SecurityConsistencyLevel = "ok" | "watch" | "critical";

export interface SecurityCrossPageRow {
  label: string;
  persisted: number | null;
  live: number | null;
  note: string;
}

export function buildSecurityCrossPageRows(
  persisted: SecurityPersistenceSnapshot | null,
  live: SecurityAnalysisLike | null,
): SecurityCrossPageRow[] {
  const p = persisted ?? {};
  const l = live ?? {};

  return [
    {
      label: "Échecs connexion / auth",
      persisted: optionalNumber(p.totalFailedLogins),
      live: optionalNumber(l.totalFailedLogins),
      note: "Persisté = pic snapshot · Live = stats + logs 30 j",
    },
    {
      label: "Activités suspectes",
      persisted: optionalNumber(p.totalSuspiciousActivities),
      live: optionalNumber(l.totalSuspiciousActivities),
      note: "Ne pas sommer les snapshots : pic max sur la fenêtre persistée",
    },
    {
      label: "Tentatives SQLi",
      persisted: optionalNumber(p.totalSqlInjectionAttempts),
      live: optionalNumber(l.totalSqlInjections),
      note: "Live = corrélation logs + menaces",
    },
    {
      label: "Tentatives XSS",
      persisted: optionalNumber(p.totalXssAttempts),
      live: optionalNumber(l.totalXssAttempts),
      note: "Live = corrélation logs + menaces",
    },
    {
      label: "IPs bloquées (uniques)",
      persisted: optionalNumber(p.uniqueBlockedIPs),
      live: optionalNumber(l.uniqueBlockedIPs),
      note: "Live = API firewall consolidée (total paginé)",
    },
    {
      label: "Détections (signaux logs)",
      persisted: null,
      live: optionalNumber(l.detectionLogsCount),
      note: "Indicateur live uniquement (page Analyse)",
    },
  ];
}

export interface SecurityAnalysisLike {
  totalFailedLogins?: unknown;
  totalSuspiciousActivities?: unknown;
  totalSqlInjections?: unknown;
  totalXssAttempts?: unknown;
  uniqueBlockedIPs?: unknown;
  detectionLogsCount?: unknown;
}

export interface SecurityConsistencySummary {
  level: SecurityConsistencyLevel;
  persistedScore: number | null;
  liveScore: number | null;
  persistedDataPoints: number;
  persistedEvents: number;
  liveEvents: number;
  liveLogs: number;
  liveCriticalEvents: number;
  liveIntrusionAttempts: number;
  liveDdosAttacks: number;
  message: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = toNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildSecurityConsistencySummary(
  persisted: SecurityPersistenceSnapshot | null,
  live: LiveSecuritySummary | null,
): SecurityConsistencySummary {
  const overview = live?.overview ?? {};
  const persistedDataPoints = toNumber(persisted?.dataPoints);
  const persistedEvents =
    toNumber(persisted?.totalSuspiciousActivities) +
    toNumber(persisted?.totalSecurityAlerts) +
    toNumber(persisted?.totalSqlInjectionAttempts) +
    toNumber(persisted?.totalXssAttempts);
  const liveCriticalEvents = toNumber(overview.criticalEvents);
  const liveIntrusionAttempts = toNumber(overview.intrusionAttempts);
  const liveDdosAttacks = toNumber(overview.ddosAttacks);
  const liveEvents =
    liveCriticalEvents + liveIntrusionAttempts + liveDdosAttacks;
  const liveLogs = toNumber(overview.totalLogs);
  const persistedScore = optionalNumber(persisted?.avgSecurityScore);
  const liveScore = optionalNumber(overview.securityScore);

  if (!live) {
    return {
      level: persistedDataPoints > 0 ? "watch" : "critical",
      persistedScore,
      liveScore: null,
      persistedDataPoints,
      persistedEvents,
      liveEvents: 0,
      liveLogs: 0,
      liveCriticalEvents: 0,
      liveIntrusionAttempts: 0,
      liveDdosAttacks: 0,
      message:
        "Console Sécurité live indisponible : vérifier la gateway avant validation porteur.",
    };
  }

  if (liveCriticalEvents > 0 || (liveScore !== null && liveScore < 50)) {
    return {
      level: "critical",
      persistedScore,
      liveScore,
      persistedDataPoints,
      persistedEvents,
      liveEvents,
      liveLogs,
      liveCriticalEvents,
      liveIntrusionAttempts,
      liveDdosAttacks,
      message:
        "Incidents live récents détectés : Statistics reste une tendance persistée, pas un feu vert opérationnel.",
    };
  }

  if (liveEvents > 0 || persistedEvents > 0) {
    return {
      level: "watch",
      persistedScore,
      liveScore,
      persistedDataPoints,
      persistedEvents,
      liveEvents,
      liveLogs,
      liveCriticalEvents,
      liveIntrusionAttempts,
      liveDdosAttacks,
      message:
        "Activité sécurité présente : les deux pages sont cohérentes si les fenêtres et sources sont distinguées.",
    };
  }

  return {
    level: "ok",
    persistedScore,
    liveScore,
    persistedDataPoints,
    persistedEvents,
    liveEvents,
    liveLogs,
    liveCriticalEvents,
    liveIntrusionAttempts,
    liveDdosAttacks,
    message:
      "Aucun signal sécurité récent dans la fenêtre live et aucune tendance persistée notable.",
  };
}

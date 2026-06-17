import {
  countDetectionLikeLogs,
  hasToken,
  isSqliThreat,
  isXssThreat,
  isDdosThreat,
} from "./threatSignals";
import axios from "axios";

export const ANALYSIS_LOGS_WINDOW_DAYS = 30;
export const ANALYSIS_LOGS_FETCH_LIMIT = 2000;
export const ANALYSIS_BLOCKED_IPS_PAGE_SIZE = 10;
export const ANALYSIS_REFRESH_MS = 30_000;

export interface BlockedIpItem {
  ip: string;
  reason?: string;
  blockedAt?: string;
  blockOrigin?: string;
  threatId?: string;
}

export interface BlockedIpsMeta {
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  byOrigin?: Record<string, number>;
}

export interface SecurityAnalysisSummary {
  securityScore: number;
  blockedIPs: BlockedIpItem[];
  blockedIpsMeta: BlockedIpsMeta | null;
  uniqueBlockedIPs: number;
  manualBlocks: number;
  manualBlocksStrict: number;
  labBlocks: number;
  autoBlocks: number;
  detectionLogsCount: number;
  openThreatsCount: number;
  totalFailedLogins: number;
  totalSuspiciousActivities: number;
  totalSqlInjections: number;
  totalXssAttempts: number;
  totalOtherInjections: number;
  totalThreatsLive: number;
  totalLogsLive: number;
  statsWindowDays: number;
}

export interface SecurityRecommendation {
  severity: "ok" | "info" | "warning" | "critical";
  title: string;
  message: string;
  href?: string;
}

function countFailedAuthLogs(logs: Record<string, unknown>[]): number {
  return logs.filter((l) => {
    const evt = String(l?.eventType || "").toLowerCase();
    const cat = String(l?.category || "").toLowerCase();
    return (
      evt.includes("failed") ||
      evt.includes("invalid") ||
      cat === "authentication"
    );
  }).length;
}

function countSuspiciousLogs(logs: Record<string, unknown>[]): number {
  return logs.filter((l) => {
    const lvl = String(l?.level || "").toLowerCase();
    return lvl === "warning" || lvl === "error" || lvl === "critical";
  }).length;
}

function countInjectionFromLogs(logs: Record<string, unknown>[]) {
  const sqlEventsLogs = logs.filter(
    (l) =>
      hasToken(l?.eventType, ["sql_injection", "sql injection"]) ||
      hasToken(l?.category, ["injection"]) ||
      hasToken(l?.message, ["sql injection", "sql_injection"]),
  ).length;
  const xssEventsLogs = logs.filter(
    (l) =>
      hasToken(l?.eventType, ["xss"]) ||
      hasToken(l?.category, ["injection"]) ||
      hasToken(l?.message, ["xss", "<script", "onerror="]),
  ).length;
  return { sqlEventsLogs, xssEventsLogs };
}

export function buildSecurityAnalysisSummary(input: {
  stats: Record<string, unknown>;
  blockedRaw: unknown[];
  blockedIpsMeta: BlockedIpsMeta | null;
  logs: Record<string, unknown>[];
  threats: Record<string, unknown>[];
  statsWindowDays?: number;
}): SecurityAnalysisSummary {
  const statsWindowDays = input.statsWindowDays ?? ANALYSIS_LOGS_WINDOW_DAYS;
  const stats = input.stats ?? {};
  const overview =
    stats.overview && typeof stats.overview === "object"
      ? (stats.overview as Record<string, unknown>)
      : {};

  const blockedIPItems: BlockedIpItem[] = (Array.isArray(input.blockedRaw)
    ? input.blockedRaw
    : []
  )
    .map((x) =>
      typeof x === "string"
        ? { ip: x, reason: "Blocage actif" }
        : (x as BlockedIpItem),
    )
    .filter((x) => !!x?.ip);

  const meta = input.blockedIpsMeta;
  const uniqueBlockedIPs =
    typeof meta?.pagination?.total === "number"
      ? meta.pagination.total
      : typeof meta?.count === "number"
        ? meta.count
        : blockedIPItems.length;

  const logs = input.logs;
  const threats = input.threats;

  const { sqlEventsLogs, xssEventsLogs } = countInjectionFromLogs(logs);
  const sqlEventsThreats = threats.filter((t) => isSqliThreat(t)).length;
  const xssEventsThreats = threats.filter((t) => isXssThreat(t)).length;
  const sqlEvents = sqlEventsLogs + sqlEventsThreats;
  const xssEvents = xssEventsLogs + xssEventsThreats;
  const ddosThreats = threats.filter((t) => isDdosThreat(t)).length;

  const failedAuth = countFailedAuthLogs(logs);
  const suspiciousLogs = countSuspiciousLogs(logs);

  const labBlocks = logs.filter(
    (l) =>
      String(l?.eventType || "").toLowerCase() === "ip_blocked_lab_simulation",
  ).length;
  const manualBlocksStrict = logs.filter(
    (l) => String(l?.eventType || "").toLowerCase() === "ip_blocked_manually",
  ).length;
  const manualBlocks = manualBlocksStrict + labBlocks;
  const autoBlocks = logs.filter((l) => {
    const evt = String(l?.eventType || "").toLowerCase();
    return (
      evt === "threat_blocked" ||
      evt === "ip_blocked_automatically" ||
      evt === "payload_auto_block"
    );
  }).length;

  const detectionLogsCount = countDetectionLikeLogs(logs);
  const openThreatsCount = threats.filter((t) => !t?.blocked).length;

  const scoreFromOverview = Number(overview.riskScore ?? overview.securityScore ?? 0);
  const scoreFromLive = Math.max(
    0,
    100 - Math.min(70, threats.length * 2 + suspiciousLogs),
  );
  const securityScore =
    Number.isFinite(scoreFromOverview) && scoreFromOverview > 0
      ? Math.round(scoreFromOverview)
      : Math.round(scoreFromLive);

  const otherInjectionCount = Math.max(
    0,
    threats.length - sqlEventsThreats - xssEventsThreats - ddosThreats,
  );

  return {
    securityScore,
    blockedIPs: blockedIPItems,
    blockedIpsMeta: meta,
    uniqueBlockedIPs,
    manualBlocks,
    manualBlocksStrict,
    labBlocks,
    autoBlocks,
    detectionLogsCount,
    openThreatsCount,
    totalFailedLogins: Number(overview.criticalEvents ?? failedAuth),
    totalSuspiciousActivities: Number(overview.totalEvents ?? suspiciousLogs),
    totalSqlInjections: Number(overview.sqlInjections ?? sqlEvents),
    totalXssAttempts: Number(overview.xssAttempts ?? xssEvents),
    totalOtherInjections: Number(
      overview.otherInjections ?? otherInjectionCount,
    ),
    totalThreatsLive: threats.length,
    totalLogsLive: logs.length,
    statsWindowDays,
  };
}

export function buildSecurityRecommendations(
  summary: SecurityAnalysisSummary,
): SecurityRecommendation[] {
  const items: SecurityRecommendation[] = [];
  const injections = summary.totalSqlInjections + summary.totalXssAttempts;

  if (summary.securityScore >= 80 && summary.openThreatsCount === 0 && injections === 0) {
    items.push({
      severity: "ok",
      title: "Posture globale stable",
      message:
        "Le score live et l’absence de menaces ouvertes indiquent une posture acceptable sur la fenêtre analysée.",
    });
  }

  if (summary.securityScore < 50) {
    items.push({
      severity: "critical",
      title: "Score live critique",
      message:
        "Le score opérationnel est très bas : prioriser l’examen des incidents récents et des menaces non bloquées.",
      href: "/backoffice/security/incidents",
    });
  } else if (summary.securityScore < 80) {
    items.push({
      severity: "warning",
      title: "Surveillance renforcée",
      message:
        "Le score live reste sous le seuil cible (80). Vérifier les logs WARN/ERROR et les règles WAF actives.",
      href: "/backoffice/security/logs",
    });
  }

  if (summary.openThreatsCount > 0) {
    items.push({
      severity: "critical",
      title: `${summary.openThreatsCount} menace(s) ouverte(s)`,
      message:
        "Des menaces ne sont pas marquées bloquées : confirmer le blocage ou clôturer après analyse.",
      href: "/backoffice/security/threats?blocked=false",
    });
  }

  if (injections > 0) {
    items.push({
      severity: "critical",
      title: "Tentatives d’injection détectées",
      message: `SQL ${summary.totalSqlInjections} · XSS ${summary.totalXssAttempts} · autres ${summary.totalOtherInjections}. Vérifier WAF et rejets gateway.`,
      href: "/backoffice/security/threats?threatType=SQL_INJECTION",
    });
  }

  if (summary.uniqueBlockedIPs > 0) {
    items.push({
      severity: "info",
      title: `${summary.uniqueBlockedIPs} IP(s) bloquée(s) actuellement`,
      message:
        "Consolider la liste firewall et retirer les blocs lab obsolètes si besoin.",
      href: "/backoffice/security/firewall#liste-ips-bloquees",
    });
  }

  if (summary.autoBlocks > 0) {
    items.push({
      severity: "info",
      title: `${summary.autoBlocks} blocage(s) automatique(s) récent(s)`,
      message:
        "Le moteur a bloqué des sources automatiquement : vérifier la corrélation incidents ↔ menaces.",
      href: "/backoffice/security/incidents",
    });
  }

  if (summary.detectionLogsCount > 0 && summary.autoBlocks === 0) {
    items.push({
      severity: "warning",
      title: `${summary.detectionLogsCount} signal(aux) de détection sans blocage auto`,
      message:
        "Des événements de détection sont présents sans blocage automatique associé : confirmer les règles et seuils.",
      href: "/backoffice/security/analysis",
    });
  }

  if (items.length === 0) {
    items.push({
      severity: "info",
      title: "Aucune action urgente",
      message:
        "Aucun signal prioritaire sur la fenêtre live. Continuer la surveillance régulière des logs.",
      href: "/backoffice/security/logs",
    });
  }

  return items;
}

export async function fetchSecurityAnalysisSummary(
  apiUrl: string,
  token: string | null,
  options?: { blockedPage?: number; blockedLimit?: number },
): Promise<SecurityAnalysisSummary> {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const statsWindowDays = ANALYSIS_LOGS_WINDOW_DAYS;
  const logSince = encodeURIComponent(
    new Date(
      Date.now() - statsWindowDays * 24 * 60 * 60 * 1000,
    ).toISOString(),
  );
  const blockedPage = options?.blockedPage ?? 1;
  const blockedLimit = options?.blockedLimit ?? ANALYSIS_BLOCKED_IPS_PAGE_SIZE;

  const [statsRes, blockedRes, logsRes, threatsRes] = await Promise.allSettled([
    axios.get(`${apiUrl}/api/v1/security/stats?days=${statsWindowDays}`, {
      headers,
      timeout: 7000,
    }),
    axios.get(`${apiUrl}/api/v1/security/firewall/blocked-ips`, {
      headers,
      timeout: 7000,
      params: { page: blockedPage, limit: blockedLimit },
    }),
    axios.get(
      `${apiUrl}/api/v1/security/logs?limit=${ANALYSIS_LOGS_FETCH_LIMIT}&startDate=${logSince}`,
      { headers, timeout: 7000 },
    ),
    axios.get(`${apiUrl}/api/v1/security/firewall/threats?limit=200`, {
      headers,
      timeout: 7000,
    }),
  ]);

  const statsData =
    statsRes.status === "fulfilled" ? statsRes.value.data : null;
  const blockedData =
    blockedRes.status === "fulfilled" ? blockedRes.value.data : null;
  const logsData = logsRes.status === "fulfilled" ? logsRes.value.data : null;
  const threatsData =
    threatsRes.status === "fulfilled" ? threatsRes.value.data : null;

  return buildSecurityAnalysisSummary({
    stats: statsData?.success ? statsData.data || {} : {},
    blockedRaw:
      blockedData?.success && Array.isArray(blockedData?.data)
        ? blockedData.data
        : [],
    blockedIpsMeta:
      blockedData?.meta && typeof blockedData.meta === "object"
        ? (blockedData.meta as BlockedIpsMeta)
        : null,
    logs: Array.isArray(logsData?.data) ? logsData.data : [],
    threats: Array.isArray(threatsData?.data) ? threatsData.data : [],
    statsWindowDays,
  });
}

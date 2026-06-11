"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { SecuritySubNav } from "./SecuritySubNav";
import { formatLocalDateTime } from "@/lib/utils/date";
import { FRONTEND_URLS } from "@/config/ports.config";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import {
  countDetectionLikeLogs,
  isDdosThreat,
  isSqliThreat,
  isXssThreat,
} from "@/lib/security/threatSignals";
import { isIncidentLog, logHref, threatHref } from "@/lib/security/incidents";

const API_URL = FRONTEND_URLS.api;

/** Extrait le temps de réponse agrégé (agrégateur expose souvent `responseTime` à la racine). */
function pickResponseTimeMs(
  metrics: Record<string, unknown> | null | undefined,
): number | null {
  if (!metrics || typeof metrics !== "object") return null;
  const candidates = [
    (metrics as { responseTime?: { average_ms?: unknown } }).responseTime
      ?.average_ms,
    (metrics as { system?: { responseTime?: { average_ms?: unknown } } }).system
      ?.responseTime?.average_ms,
    (
      metrics as {
        system?: { monitoringC?: { avg_response_time_ms?: unknown } };
      }
    ).system?.monitoringC?.avg_response_time_ms,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c >= 0) return c;
  }
  return null;
}

function formatBlockedIpsOriginsSubtitle(byOrigin: unknown): string {
  if (!byOrigin || typeof byOrigin !== "object")
    return "Règles, menaces et logs fusionnés";
  const o = byOrigin as Record<string, number>;
  const parts: string[] = [];
  if (o.manual_rule) parts.push(`manuel ${o.manual_rule}`);
  if (o.lab_simulation) parts.push(`lab ${o.lab_simulation}`);
  if (o.automatic_threat) parts.push(`auto ${o.automatic_threat}`);
  if (o.iptables) parts.push(`iptables ${o.iptables}`);
  if (o.log_inferred) parts.push(`logs ${o.log_inferred}`);
  return parts.length > 0
    ? parts.join(" · ")
    : "Règles, menaces et logs fusionnés";
}

type SecurityOverview = {
  logsCount: number;
  logsTruncated: boolean;
  logsPeriodDays: number;
  threatsCount: number;
  blockedIpsCount: number;
  blockedIpsSubtitle: string;
  wafEnabled: boolean | null;
  firewallRulesCount: number;
  systemCpuPercent: number | null;
  projectCpuPercent: number | null;
  projectMemoryPercent: number | null;
  systemLoadPerCore: number | null;
  diskUsagePercent: number | null;
  responseTimeMs: number | null;
  healthyServices: number;
  totalServices: number;
  activeContainers: number;
  manualBlocksCount: number;
  automaticBlocksCount: number;
  detectionsCount: number;
  mobileCrashesCount: number;
};

type IncidentItem = {
  id: string;
  kind: "threat" | "log";
  title: string;
  severity: string;
  source: string;
  timestamp: string;
  href: string;
};

type SecurityWeights = {
  threats: number;
  logsNoise: number;
  wafDisabled: number;
};

const LOGS_WINDOW_DAYS = 30;
const SECURITY_LOGS_FETCH_LIMIT = 2000;

const defaultOverview: SecurityOverview = {
  logsCount: 0,
  logsTruncated: false,
  logsPeriodDays: LOGS_WINDOW_DAYS,
  threatsCount: 0,
  blockedIpsCount: 0,
  blockedIpsSubtitle: "Règles, menaces et logs fusionnés",
  wafEnabled: null,
  firewallRulesCount: 0,
  systemCpuPercent: null,
  projectCpuPercent: null,
  projectMemoryPercent: null,
  systemLoadPerCore: null,
  diskUsagePercent: null,
  responseTimeMs: null,
  healthyServices: 0,
  totalServices: 0,
  activeContainers: 0,
  manualBlocksCount: 0,
  automaticBlocksCount: 0,
  detectionsCount: 0,
  mobileCrashesCount: 0,
};

export default function SecurityOverviewPage() {
  useDocumentTitle("Sécurité");

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<SecurityOverview>(defaultOverview);
  const [recentIncidents, setRecentIncidents] = useState<IncidentItem[]>([]);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [newThreatSignal, setNewThreatSignal] = useState(0);
  const previousTopThreatRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef(false);
  const [weights, setWeights] = useState<SecurityWeights>({
    threats: 2,
    logsNoise: 1,
    wafDisabled: 15,
  });
  const [incidentsPage, setIncidentsPage] = useState(1);
  const [testIpBusy, setTestIpBusy] = useState(false);
  const [testIpMessage, setTestIpMessage] = useState<string | null>(null);
  const SAFE_TEST_IP = "203.0.113.77";
  const incidentsPageSize = 6;

  useEffect(() => {
    const raw = localStorage.getItem("securityScoreWeights");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setWeights((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore
    }
  }, []);

  const updateWeight = (key: keyof SecurityWeights, value: number) => {
    setWeights((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("securityScoreWeights", JSON.stringify(next));
      return next;
    });
  };

  const load = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    const mounted = true;
    const token = localStorage.getItem("token");
    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const fetchFailures: string[] = [];
    const fetchJson = async (endpoint: string, label: string) => {
      try {
        const res = await fetch(`${API_URL}${endpoint}`, { headers });
        if (!res.ok) {
          fetchFailures.push(`${label} (${res.status})`);
          return null;
        }
        return res.json().catch(() => null);
      } catch {
        fetchFailures.push(label);
        return null;
      }
    };

    try {
      setServiceError(null);
      const logSince = encodeURIComponent(
        new Date(
          Date.now() - LOGS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString(),
      );
      const [
        logs,
        threats,
        blockedIps,
        wafConfig,
        firewallRules,
        metrics,
        crashes,
      ] = await Promise.all([
        fetchJson(
          `/api/v1/security/logs?limit=${SECURITY_LOGS_FETCH_LIMIT}&startDate=${logSince}`,
          "logs sécurité",
        ),
        fetchJson("/api/v1/security/firewall/threats?limit=200", "menaces"),
        fetchJson("/api/v1/security/firewall/blocked-ips", "IPs bloquées"),
        fetchJson("/api/v1/security/waf/config", "configuration WAF"),
        fetchJson("/api/v1/security/firewall/rules", "règles firewall"),
        fetchJson("/api/v1/metrics", "métriques"),
        fetchJson("/api/v1/crashes?limit=100", "crashes mobile"),
      ]);

      if (!mounted) return;

      if (fetchFailures.length > 0) {
        setServiceError(
          `Données partielles: ${fetchFailures.join(", ")} indisponible(s). Vérifiez la gateway et les services concernés.`,
        );
      }

      const logsArray = logs?.data || logs?.logs || [];
      const threatsArray = threats?.data || threats?.threats || [];
      const logsForStats = Array.isArray(logsArray) ? logsArray : [];
      const manualBlocksCount = logsForStats.filter(
        (l: any) =>
          l?.eventType === "ip_blocked_manually" ||
          l?.eventType === "ip_blocked_lab_simulation",
      ).length;
      const automaticBlocksCount = logsForStats.filter(
        (l: any) =>
          l?.eventType === "threat_blocked" ||
          l?.eventType === "ip_blocked_automatically",
      ).length;
      const logDetectionsNoNetworkRow = countDetectionLikeLogs(
        logsForStats as Record<string, unknown>[],
        {
          excludeEventTypes: ["network_threat_detected"],
        },
      );
      const sqlT = (threatsArray as Record<string, unknown>[]).filter(
        isSqliThreat,
      ).length;
      const xssT = (threatsArray as Record<string, unknown>[]).filter(
        isXssThreat,
      ).length;
      const ddosT = (threatsArray as Record<string, unknown>[]).filter(
        isDdosThreat,
      ).length;
      const otherT = Math.max(
        0,
        (Array.isArray(threatsArray) ? threatsArray.length : 0) -
          sqlT -
          xssT -
          ddosT,
      );
      const detectionsCount =
        logDetectionsNoNetworkRow + sqlT + xssT + otherT + ddosT;

      if (
        fetchFailures.length === 0 &&
        !Array.isArray(logsArray) &&
        !Array.isArray(threatsArray)
      ) {
        setServiceError("Services sécurité indisponibles ou réponse invalide.");
      }

      if (Array.isArray(threatsArray) && threatsArray.length > 0) {
        const topThreatId = String(threatsArray[0]?.id || "");
        if (
          previousTopThreatRef.current &&
          topThreatId &&
          topThreatId !== previousTopThreatRef.current
        ) {
          setNewThreatSignal((v) => v + 1);
        }
        if (topThreatId) previousTopThreatRef.current = topThreatId;
      }

      // Ne pas dupliquer network_threat_detected en « log CRITICAL » : l’événement est déjà une menace structurée (table threats / kind threat).
      const logsForIncidents = Array.isArray(logsArray)
        ? (logsArray as any[]).filter((l) =>
            isIncidentLog(String(l?.eventType || ""), String(l?.level || "")),
          )
        : [];

      const incidents: IncidentItem[] = [
        ...(Array.isArray(threatsArray)
          ? threatsArray.slice(0, 10).map((t: any) => ({
              id: `threat-${t.id}`,
              kind: "threat" as const,
              title: t.threatType || "Menace réseau",
              severity: String(t.severity || "UNKNOWN"),
              source: t.sourceIp || "n/a",
              timestamp: t.detectedAt || new Date().toISOString(),
              href: threatHref(String(t.id)),
            }))
          : []),
        ...logsForIncidents.slice(0, 8).map((l: any) => {
          const meta =
            l.metadata && typeof l.metadata === "object" ? l.metadata : {};
          const tid = meta.threatId ? String(meta.threatId) : null;
          const logId = String(l.id);
          const et = String(l.eventType || "");
          return {
            id: `log-${logId}`,
            kind: "log" as const,
            title: et || l.category || "Événement sécurité",
            severity: String(l.level || "info").toUpperCase(),
            source: l.sourceIP || "n/a",
            timestamp: l.timestamp || l.createdAt || new Date().toISOString(),
            href: tid ? threatHref(tid) : logHref(logId, et),
          };
        }),
      ]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, 12);
      setRecentIncidents(incidents);
      setIncidentsPage(1);

      const ipsArray =
        blockedIps?.data || blockedIps?.ips || blockedIps?.blockedIps || [];
      const rulesArray = firewallRules?.data || firewallRules?.rules || [];
      const servicesObj = metrics?.services || {};
      const servicesEntries =
        typeof servicesObj === "object" && servicesObj !== null
          ? Object.values(servicesObj)
          : [];
      const healthyServices = servicesEntries.filter(
        (s: any) =>
          s?.status === "healthy" ||
          s?.health?.status === "healthy" ||
          s?.status === "running",
      ).length;
      const totalServices = servicesEntries.length;
      const cpuUsage =
        typeof metrics?.system?.cpu?.usage_percent === "number"
          ? metrics.system.cpu.usage_percent
          : typeof metrics?.system?.cpu_percent === "number"
            ? metrics.system.cpu_percent
            : null;
      const cpuProject =
        typeof metrics?.system?.jobbingtrack?.containers?.cpu
          ?.averagePercent === "number"
          ? metrics.system.jobbingtrack.containers.cpu.averagePercent
          : typeof metrics?.system?.containersAggregate?.cpu_percent ===
              "number"
            ? metrics.system.containersAggregate.cpu_percent
            : null;
      const memProject =
        typeof metrics?.system?.jobbingtrack?.containers?.memory
          ?.percent_of_system === "number"
          ? metrics.system.jobbingtrack.containers.memory.percent_of_system
          : typeof metrics?.system?.containersAggregate?.memory_percent ===
              "number"
            ? metrics.system.containersAggregate.memory_percent
            : null;
      const load1 =
        typeof metrics?.system?.cpu?.load_1 === "number"
          ? metrics.system.cpu.load_1
          : null;
      const cores =
        typeof metrics?.system?.cpu?.cores === "number" &&
        metrics.system.cpu.cores > 0
          ? metrics.system.cpu.cores
          : null;
      const loadPerCore = load1 !== null && cores ? load1 / cores : null;
      const diskPct =
        typeof metrics?.system?.disk?.[0]?.usage_percent === "number"
          ? metrics.system.disk[0].usage_percent
          : typeof metrics?.system?.disk?.[0]?.usage === "number"
            ? metrics.system.disk[0].usage
            : null;
      const responseTime = pickResponseTimeMs(
        metrics as Record<string, unknown>,
      );
      const activeContainers =
        typeof metrics?.system?.jobbingtrack?.containers?.count === "number"
          ? metrics.system.jobbingtrack.containers.count
          : 0;

      const crashList = Array.isArray(crashes?.data)
        ? crashes.data
        : Array.isArray((crashes as { crashes?: unknown[] })?.crashes)
          ? (crashes as { crashes: unknown[] }).crashes
          : [];

      const logsLen = Array.isArray(logsArray) ? logsArray.length : 0;
      setOverview({
        logsCount: logsLen,
        logsTruncated: logsLen >= SECURITY_LOGS_FETCH_LIMIT,
        logsPeriodDays: LOGS_WINDOW_DAYS,
        threatsCount: Array.isArray(threatsArray) ? threatsArray.length : 0,
        blockedIpsCount: Array.isArray(ipsArray) ? ipsArray.length : 0,
        blockedIpsSubtitle: formatBlockedIpsOriginsSubtitle(
          blockedIps?.meta?.byOrigin,
        ),
        wafEnabled:
          typeof wafConfig?.enabled === "boolean"
            ? wafConfig.enabled
            : typeof wafConfig?.data?.enabled === "boolean"
              ? wafConfig.data.enabled
              : null,
        firewallRulesCount: Array.isArray(rulesArray) ? rulesArray.length : 0,
        systemCpuPercent: cpuUsage,
        projectCpuPercent: cpuProject,
        projectMemoryPercent: memProject,
        systemLoadPerCore: loadPerCore,
        diskUsagePercent: diskPct,
        responseTimeMs: responseTime,
        healthyServices,
        totalServices,
        activeContainers,
        manualBlocksCount,
        automaticBlocksCount,
        detectionsCount,
        mobileCrashesCount: crashList.length,
      });
    } finally {
      refreshInFlightRef.current = false;
      if (mounted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const securityScore = useMemo(() => {
    const score =
      100 -
      Math.min(40, overview.threatsCount * weights.threats) -
      Math.min(30, Math.max(0, overview.logsCount - 20) * weights.logsNoise) -
      Math.min(20, overview.blockedIpsCount > 0 ? 10 : 0) -
      (overview.wafEnabled === false ? weights.wafDisabled : 0);
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [overview, weights]);

  const scoreColor =
    securityScore > 80
      ? "text-green-600 dark:text-green-400"
      : securityScore > 60
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";
  const incidentsTotalPages = Math.max(
    1,
    Math.ceil(recentIncidents.length / incidentsPageSize),
  );
  const safeIncidentsPage = Math.min(incidentsPage, incidentsTotalPages);
  const paginatedIncidents = recentIncidents.slice(
    (safeIncidentsPage - 1) * incidentsPageSize,
    safeIncidentsPage * incidentsPageSize,
  );

  const cards = [
    {
      title: "Logs sécurité",
      value: overview.logsCount,
      subtitle: overview.logsTruncated
        ? `Tronqué : ≥${SECURITY_LOGS_FETCH_LIMIT} entrées sur ${overview.logsPeriodDays} j. — politique rétention : docs/security/SECURITY_LOGS_RETENTION.md`
        : `${overview.logsCount} entrée(s) sur ${overview.logsPeriodDays} j. (max UI ${SECURITY_LOGS_FETCH_LIMIT})`,
      href: "/b4ck0ff1ce/security/logs",
    },
    {
      title: "Menaces",
      value: overview.threatsCount,
      subtitle: "Détections réseau",
      href: "/b4ck0ff1ce/security/threats",
    },
    {
      title: "IPs bloquées",
      value: overview.blockedIpsCount,
      subtitle: overview.blockedIpsSubtitle,
      href: "/b4ck0ff1ce/security/firewall",
    },
    {
      title: "Règles firewall",
      value: overview.firewallRulesCount,
      subtitle: "Configuration active",
      href: "/b4ck0ff1ce/security/firewall",
    },
    {
      title: "Détections",
      value: overview.detectionsCount,
      subtitle: "Logs (hors doublon network_threat) + menaces (page courante)",
      href: "/b4ck0ff1ce/security/analysis",
    },
    {
      title: "Blocages manuels",
      value: overview.manualBlocksCount,
      subtitle: "Opérateur + tests lab (RFC5737)",
      href: "/b4ck0ff1ce/security/firewall",
    },
    {
      title: "Blocages automatiques",
      value: overview.automaticBlocksCount,
      subtitle: "Réponse moteur",
      href: "/b4ck0ff1ce/security/firewall",
    },
    {
      title: "Crashes mobile",
      value: overview.mobileCrashesCount,
      subtitle: "Rapports API mobile",
      href: "/b4ck0ff1ce/statistics",
    },
  ];

  const runSafeBlockTest = async () => {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
    setTestIpBusy(true);
    setTestIpMessage(null);
    try {
      const blockRes = await fetch(
        `${API_URL}/api/v1/security/firewall/block-ip`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            ip: SAFE_TEST_IP,
            reason: "SAFE_TEST_IP_BLOCK",
            mode: "lab_simulation",
          }),
        },
      );
      const blockJson = await blockRes.json().catch(() => ({}));
      if (!blockRes.ok) {
        setTestIpMessage(
          blockJson?.error || `Blocage test échoué (${blockRes.status})`,
        );
        return;
      }
      const unRes = await fetch(
        `${API_URL}/api/v1/security/firewall/unblock-ip`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ ip: SAFE_TEST_IP }),
        },
      );
      const unJson = await unRes.json().catch(() => ({}));
      if (!unRes.ok) {
        setTestIpMessage(
          unJson?.error ||
            `Déblocage test échoué (${unRes.status}) — vérifiez le firewall.`,
        );
        return;
      }
      setTestIpMessage(
        "Test OK : blocage puis déblocage de l’IP de laboratoire exécutés.",
      );
      await load();
    } catch (e: any) {
      setTestIpMessage(e?.message || "Erreur réseau pendant le test.");
    } finally {
      setTestIpBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <SecuritySubNav />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            🛡️ Vue d’ensemble sécurité
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Pilotage centralisé: logs, menaces, firewall, WAF, analyse et
            politiques.
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Les horodatages à l’écran sont en <strong>heure locale</strong> du
            navigateur. Les compteurs « Logs » et « Détections » utilisent une
            fenêtre de {LOGS_WINDOW_DAYS} jours pour rester cohérents avec la
            page Analyse.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Score de sécurité global
              </div>
              <div className={`text-4xl font-bold ${scoreColor}`}>
                {loading ? "..." : `${securityScore}%`}
              </div>
            </div>
            <div className="text-left text-sm text-gray-600 dark:text-gray-400 sm:text-right">
              <div>
                WAF:{" "}
                {overview.wafEnabled === null
                  ? "N/A"
                  : overview.wafEnabled
                    ? "✅ Activé"
                    : "❌ Désactivé"}
              </div>
              <div>Mise à jour auto: 5s</div>
              {newThreatSignal > 0 && (
                <div className="text-red-600 dark:text-red-400 font-semibold">
                  +{newThreatSignal} nouvelle(s) menace(s)
                </div>
              )}
            </div>
          </div>
          {serviceError && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
              {serviceError}
            </div>
          )}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-600 dark:text-gray-400">
            <div>
              Menaces:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {overview.threatsCount}
              </span>
            </div>
            <div>
              Logs analysés:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {overview.logsCount}
              </span>
            </div>
            <div>
              IPs bloquées:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {overview.blockedIpsCount}
              </span>
            </div>
            <div>
              WAF:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {overview.wafEnabled === null
                  ? "N/A"
                  : overview.wafEnabled
                    ? "Activé"
                    : "Désactivé"}
              </span>
            </div>
            <div>
              Détections:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {overview.detectionsCount}
              </span>
            </div>
            <div>
              Blocages auto:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {overview.automaticBlocksCount}
              </span>
            </div>
            <div>
              Blocages manuels:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {overview.manualBlocksCount}
              </span>
            </div>
            <div>
              Crashes mobile:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {overview.mobileCrashesCount}
              </span>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="font-semibold">Mode test blocage IP sûr</div>
            <div className="mt-1">
              IP de test dédiée RFC5737:{" "}
              <span className="font-mono">{SAFE_TEST_IP}</span> (jamais
              l&apos;IP réelle de l&apos;utilisateur)
            </div>
            <button
              type="button"
              onClick={runSafeBlockTest}
              disabled={testIpBusy}
              className="mt-2 px-3 py-1.5 text-xs rounded border border-amber-400 dark:border-amber-600 disabled:opacity-50"
            >
              {testIpBusy
                ? "Test en cours..."
                : "Tester blocage + déblocage sécurisé"}
            </button>
            {testIpMessage && (
              <p
                className={`mt-2 text-xs ${testIpMessage.startsWith("Test OK") ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
              >
                {testIpMessage}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Pondération du score sécurité
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Le score part de 100 puis retire des points selon les menaces
            détectées, le volume de logs sécurité au-delà du bruit normal, les
            IPs bloquées et l&apos;état du WAF. Les métriques CPU, mémoire,
            disque, services et conteneurs ne sont pas utilisées ici : elles
            relèvent de la performance, pas du risque sécurité.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <label>
              Menaces ({weights.threats})
              <input
                aria-label="Poids des menaces dans le score sécurité"
                type="range"
                min={1}
                max={5}
                value={weights.threats}
                onChange={(e) =>
                  updateWeight("threats", Number(e.target.value))
                }
                className="w-full"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Points retirés par menace, plafonnés à 40.
              </span>
            </label>
            <label>
              Bruit logs ({weights.logsNoise})
              <input
                aria-label="Poids du bruit des logs dans le score sécurité"
                type="range"
                min={1}
                max={3}
                value={weights.logsNoise}
                onChange={(e) =>
                  updateWeight("logsNoise", Number(e.target.value))
                }
                className="w-full"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Points retirés par log au-delà de 20, plafonnés à 30.
              </span>
            </label>
            <label>
              WAF off ({weights.wafDisabled})
              <input
                aria-label="Pénalité WAF désactivé dans le score sécurité"
                type="range"
                min={5}
                max={25}
                value={weights.wafDisabled}
                onChange={(e) =>
                  updateWeight("wafDisabled", Number(e.target.value))
                }
                className="w-full"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Pénalité fixe quand le WAF est désactivé.
              </span>
            </label>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Incidents temps réel (corrélés)
            </h2>
            <Link
              href="/b4ck0ff1ce/security/incidents"
              className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400"
            >
              Voir tous les incidents →
            </Link>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Aperçu des incidents récents (menaces + événements WAF/blocage, sans
            bruit health). Page complète : filtre par type et liens vers fiches.
          </p>
          {recentIncidents.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aucun incident récent.
            </p>
          ) : (
            <div className="space-y-2">
              {paginatedIncidents.map((i) => (
                <Link
                  key={i.id}
                  href={i.href}
                  className="flex flex-col gap-2 text-sm border border-gray-200 dark:border-gray-700 rounded p-2 hover:border-red-400 hover:bg-red-50/30 dark:hover:border-red-600 dark:hover:bg-red-950/20 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${i.kind === "threat" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}
                    >
                      {i.kind}
                    </span>
                    <span className="min-w-0 break-words font-medium text-gray-900 dark:text-gray-100">
                      {i.title}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {i.severity}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {i.source}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatLocalDateTime(i.timestamp)}
                  </span>
                </Link>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Page {safeIncidentsPage}/{incidentsTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIncidentsPage((p) => Math.max(1, p - 1))}
                    disabled={safeIncidentsPage <= 1}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setIncidentsPage((p) =>
                        Math.min(incidentsTotalPages, p + 1),
                      )
                    }
                    disabled={safeIncidentsPage >= incidentsTotalPages}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-900/30 px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            Légende — Lot sécurité :{" "}
          </span>
          <span className="ml-1">
            <strong>Détections</strong> = évènements enregistrés (logs /
            menaces) sans forcément bloquer.
          </span>
          <span className="ml-2">
            <strong>Blocages manuels</strong> = action admin ou test lab (IP{" "}
            {SAFE_TEST_IP}).
          </span>
          <span className="ml-2">
            <strong>Blocages auto</strong> = moteur menaces / politiques
            (threat_blocked, etc.).
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {card.title}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {loading ? "..." : card.value}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {card.subtitle}
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/b4ck0ff1ce/security/analysis"
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Analyse sécurité
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Vérifier la posture globale, tendances et recommandations.
            </p>
          </Link>
          <Link
            href="/b4ck0ff1ce/security/policies"
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Politiques
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Gérer les règles et exigences de conformité.
            </p>
          </Link>
          <Link
            href="/b4ck0ff1ce/security/network"
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Réseau
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Suivre le trafic, les anomalies et les alertes réseau.
            </p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}

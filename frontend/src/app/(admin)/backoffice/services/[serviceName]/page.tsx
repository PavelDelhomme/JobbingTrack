"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { ServicesPageShell } from "../ServicesSubNav";
import {
  FacetAutocompleteField,
  FilterBar,
  FilterSelectField,
} from "@/components/filters";
import { useAppliedFilters } from "@/hooks/useAppliedFilters";
import {
  filterServiceLogLines,
  type ServiceLogsFilters,
} from "@/lib/filters/serviceLogFilters";
import {
  SERVICE_LOG_KIND_OPTIONS,
  SERVICE_LOG_LEVEL_OPTIONS,
} from "@/lib/filters/serviceLogsOptions";
import { mergeFacetSuggestions } from "@/lib/filters/facetUtils";
import type { FilterBadge } from "@/lib/filters/types";
import {
  Server,
  Activity,
  TrendingUp,
  Database,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Terminal,
  Network,
  HardDrive,
} from "lucide-react";
import {
  mergeHistoryChronological,
  type ServiceHistoryPoint,
} from "@/lib/monitoring/serviceDetailHistory";
import { loadServerHistoryPoints } from "@/lib/monitoring/serviceHistorySources";
import { useServiceHistoryChartData } from "@/lib/monitoring/useServiceHistoryChartData";
import { formatLocalDateTime } from "@/lib/utils/date";

/** Lot A1c : chargement client de Recharts pour réduire le JS initial de la route. */
const MonitoringServiceHistoryCharts = dynamic(
  () =>
    import("@/components/monitoring/MonitoringServiceHistoryCharts").then(
      (m) => m.MonitoringServiceHistoryCharts,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 p-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Chargement des graphiques d&apos;historique…
      </div>
    ),
  },
);

function formatCpuPercent(value: number | null | undefined): string {
  const n = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  if (n === 0) return "0,00 %";
  if (n > 0 && n < 0.005) return "< 0,01 %";
  if (n < 1)
    return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} %`;
  if (n < 10)
    return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %`;
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

function formatMegabytes(mb: number | null | undefined): string {
  if (mb == null || Number.isNaN(mb)) return "—";
  const abs = Math.abs(mb);
  if (abs > 0 && abs < 0.01)
    return `${(mb * 1024).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} KB`;
  return `${mb.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} MB`;
}

function cpuBarWidthPercent(cpu: number): string {
  if (cpu <= 0) return "0%";
  const w = Math.min(100, Math.max(cpu < 0.05 ? 1.2 : 0.8, cpu));
  return `${w}%`;
}

/** Lignes très verbeuses (souvent normales sur api-gateway) — masquables à la demande. */
function isFirewallNoiseMessage(message: string): boolean {
  return /firewall|waf|iptables|ip\s*block|blocked\s|unblock|rate.?limit|security.?middleware/i.test(
    message,
  );
}

function serviceLogLineClass(message: string): string {
  const m = message.toLowerCase();
  if (isFirewallNoiseMessage(message)) {
    return "text-purple-300/95 break-words";
  }
  if (/\b(get|post|put|patch|delete)\s+\//i.test(message)) {
    return "text-cyan-300/95 break-words";
  }
  if (
    /\berror\b|\bexception\b|\bfatal\b|\beconnrefused\b|\b5\d\d\b|\bfail(ed)?\b/i.test(
      m,
    )
  ) {
    return "text-red-400 font-semibold break-words";
  }
  if (/\bwarn(ing)?\b/.test(m)) {
    return "text-amber-300/95 break-words";
  }
  if (/\binfo\b|\bhttp\b.*\b200\b/.test(m)) {
    return "text-slate-300/95 break-words";
  }
  if (/\bdebug\b|\btrace\b/.test(m)) {
    return "text-gray-500 break-words";
  }
  return "text-emerald-300/90 break-words";
}

/** Disque principal vu par l’agrégateur (hôte / VM), distinct du Block I/O du conteneur */
type HostDiskContext = {
  usagePercent: number;
  mount?: string;
  usedGb?: number;
  totalGb?: number;
} | null;

export default function ServiceDetailPage() {
  const params = useParams();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const serviceName = params.serviceName as string;
  const fullServiceName = serviceName.startsWith("jobbingtrack-")
    ? serviceName
    : `jobbingtrack-${serviceName}`;

  const [serviceMetrics, setServiceMetrics] = useState<any>(null);
  const [serviceLogs, setServiceLogs] = useState<any>(null);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryPoint[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hideFirewallNoise, setHideFirewallNoise] = useState(false);
  const {
    applied: appliedLogFilters,
    draft: draftLogFilters,
    updateDraft: updateDraftLogFilter,
    apply: applyLogFilters,
    reset: resetLogFilters,
    hasDraftChanges: hasLogDraftChanges,
  } = useAppliedFilters<Pick<ServiceLogsFilters, "level" | "kind" | "query">>({
    level: "all",
    kind: "all",
    query: "",
  });
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [isLogsWidgetVisible, setIsLogsWidgetVisible] = useState(false);
  const [lastMetricsAt, setLastMetricsAt] = useState<Date | null>(null);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(15);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [hostDiskContext, setHostDiskContext] = useState<HostDiskContext>(null);
  const sessionHistoryRef = useRef<ServiceHistoryPoint[]>([]);

  useEffect(() => {
    sessionHistoryRef.current = [];
  }, [serviceName]);

  // Observer pour détecter si le widget des logs est visible
  useEffect(() => {
    if (!logsContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsLogsWidgetVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1 }, // Déclencher quand au moins 10% du widget est visible
    );

    observer.observe(logsContainerRef.current);

    return () => {
      if (logsContainerRef.current) {
        observer.unobserve(logsContainerRef.current);
      }
    };
  }, []);

  const displayLogLines = useMemo(() => {
    const raw = serviceLogs?.lines;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const tail = raw.slice(-220);
    const withoutNoise = hideFirewallNoise
      ? tail.filter((line: string) => {
          const timestampMatch = line.match(
            /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+([\s\S]*)$/,
          );
          const message = timestampMatch ? timestampMatch[2] : line;
          return !isFirewallNoiseMessage(message);
        })
      : tail;
    const filtered = filterServiceLogLines(withoutNoise, appliedLogFilters);
    return filtered.slice(-120);
  }, [serviceLogs?.lines, hideFirewallNoise, appliedLogFilters]);

  const logQuerySuggestions = useMemo(
    () =>
      mergeFacetSuggestions(
        undefined,
        Array.isArray(serviceLogs?.lines) ? serviceLogs.lines : [],
        60,
      ),
    [serviceLogs?.lines],
  );

  const logFilterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];
    if (appliedLogFilters.level !== "all") {
      const label =
        SERVICE_LOG_LEVEL_OPTIONS.find(
          (option) => option.value === appliedLogFilters.level,
        )?.label || appliedLogFilters.level;
      badges.push({ key: "level", label: `Niveau : ${label}` });
    }
    if (appliedLogFilters.kind !== "all") {
      const label =
        SERVICE_LOG_KIND_OPTIONS.find(
          (option) => option.value === appliedLogFilters.kind,
        )?.label || appliedLogFilters.kind;
      badges.push({ key: "kind", label: `Type : ${label}` });
    }
    if (appliedLogFilters.query.trim()) {
      badges.push({
        key: "query",
        label: `Recherche : ${appliedLogFilters.query.trim()}`,
      });
    }
    return badges;
  }, [appliedLogFilters]);

  // Auto-scroll vers le bas des logs UNIQUEMENT si le widget est visible
  useEffect(() => {
    if (autoScroll && logsEndRef.current && isLogsWidgetVisible) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [serviceLogs, displayLogLines, autoScroll, isLogsWidgetVisible]);

  const loadServiceData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);

      const metricsUrl =
        process.env.NEXT_PUBLIC_METRICS_URL || "http://localhost:5004";
      let merged: any = null;

      // Métriques : uniquement via metrics-aggregator (docker service + /api/v1/metrics en fallback)
      for (const nameToTry of [fullServiceName, serviceName]) {
        try {
          const metricsResponse = await fetch(
            `${metricsUrl}/api/v1/docker/service/${encodeURIComponent(nameToTry)}`,
          );
          if (metricsResponse.ok) {
            const data = await metricsResponse.json();
            const s = data.service;
            if (s) {
              if (!merged) {
                merged = {
                  name: s.name || fullServiceName,
                  cpu_percent: s.cpu_percent ?? 0,
                  memory_percent: s.memory_percent ?? 0,
                  memory_usage_mb: s.memory_usage_mb ?? 0,
                  memory_limit_mb: s.memory_limit_mb ?? 0,
                  network_rx_mb: s.network_rx_mb ?? 0,
                  network_tx_mb: s.network_tx_mb ?? 0,
                  block_read_mb: s.block_read_mb ?? 0,
                  block_write_mb: s.block_write_mb ?? 0,
                  response_time_ms: s.response_time_ms ?? null,
                  health_status_http:
                    s.health_status_http ?? s.health ?? "unknown",
                  health_status_docker: s.health_status_docker ?? "none",
                  pids: s.pids ?? null,
                  image: s.image,
                  ports: s.ports,
                  created: s.created,
                };
              } else {
                merged.health_status_docker =
                  s.health_status_docker ?? merged.health_status_docker;
                merged.pids = s.pids ?? merged.pids;
                merged.image = s.image ?? merged.image;
                merged.ports = s.ports ?? merged.ports;
                merged.created = s.created ?? merged.created;
                if (s.cpu_percent != null) merged.cpu_percent = s.cpu_percent;
                if (s.memory_percent != null)
                  merged.memory_percent = s.memory_percent;
                if (s.memory_usage_mb != null)
                  merged.memory_usage_mb = s.memory_usage_mb;
                if (s.block_read_mb != null)
                  merged.block_read_mb = s.block_read_mb;
                if (s.block_write_mb != null)
                  merged.block_write_mb = s.block_write_mb;
                if (s.response_time_ms != null)
                  merged.response_time_ms = s.response_time_ms;
              }
              break;
            }
          }
        } catch {
          // try next name
        }
      }

      // Fallback 2 : liste agrégée des services (souvent disponible même si la route /service/<name> échoue ponctuellement)
      if (!merged) {
        try {
          const allServicesRes = await fetch(
            `${metricsUrl}/api/v1/docker/services/all`,
          );
          if (allServicesRes.ok) {
            const allServicesJson = await allServicesRes.json();
            const services = Array.isArray(allServicesJson?.services)
              ? allServicesJson.services
              : [];
            const found = services.find((s: any) => {
              const n = String(s?.name || "").replace(/^\//, "");
              return n === fullServiceName || n === serviceName;
            });
            if (found) {
              merged = {
                name: found.name || fullServiceName,
                cpu_percent: found.cpu_percent ?? 0,
                memory_percent: found.memory_percent ?? 0,
                memory_usage_mb: found.memory_usage_mb ?? 0,
                memory_limit_mb: found.memory_limit_mb ?? 0,
                network_rx_mb: found.network_rx_mb ?? 0,
                network_tx_mb: found.network_tx_mb ?? 0,
                block_read_mb: found.block_read_mb ?? 0,
                block_write_mb: found.block_write_mb ?? 0,
                response_time_ms: found.response_time_ms ?? null,
                health_status_http:
                  found.health_status_http ?? found.health_status ?? "unknown",
                health_status_docker: found.health_status_docker ?? "none",
                pids: found.pids ?? null,
                image: found.image,
                ports: found.ports,
                created: found.created,
              };
            }
          }
        } catch {
          // ignore
        }
      }

      if (!merged) {
        try {
          const metricsRes = await fetch(`${metricsUrl}/api/v1/metrics`);
          if (metricsRes.ok) {
            const metricsData = await metricsRes.json();
            const containers =
              metricsData.containers &&
              typeof metricsData.containers === "object"
                ? metricsData.containers
                : {};
            const raw = containers[fullServiceName] || containers[serviceName];
            if (raw) {
              const c = raw.cpu || {};
              const m = raw.memory || {};
              merged = {
                name: fullServiceName,
                cpu_percent: c.percentage ?? 0,
                memory_percent: m.percentage ?? 0,
                memory_usage_mb: m.usage ?? 0,
                memory_limit_mb: m.limit ?? 0,
                network_rx_mb: (raw.network?.rx ?? 0) / (1024 * 1024),
                network_tx_mb: (raw.network?.tx ?? 0) / (1024 * 1024),
                block_read_mb: 0,
                block_write_mb: 0,
                response_time_ms: null,
                health_status_http: "unknown",
                health_status_docker: "none",
                pids: raw.pids ?? null,
              };
            }
          }
        } catch {
          // ignore
        }
      }

      // Récupérer les logs : metrics-aggregator (docker service logs) — l'API gateway n'expose pas /api/v1/logs/:service
      try {
        const logsResponse = await fetch(
          `${metricsUrl}/api/v1/docker/service/${fullServiceName}/logs?lines=100`,
        );
        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          const lines = Array.isArray(logsData?.lines) ? logsData.lines : [];
          setServiceLogs({
            lines,
            errorLines: Array.isArray(logsData?.errorLines)
              ? logsData.errorLines
              : lines.filter((l: string) => /error|exception|fatal/i.test(l)),
            total: logsData?.total ?? lines.length,
            errors: logsData?.errors ?? 0,
            warnings: logsData?.warnings ?? 0,
          });
        }
      } catch (logsErr) {
        // Ne pas faire planter la page
      }

      // Contexte disque hôte (GET /api/v1/metrics — même agrégateur ; utile pour corréler charge hôte vs I/O conteneur)
      let hostDiskNext: HostDiskContext = null;
      try {
        const hostRes = await fetch(`${metricsUrl}/api/v1/metrics`);
        if (hostRes.ok) {
          const hostJson = await hostRes.json();
          const d0 = hostJson?.system?.disk?.[0];
          if (d0) {
            const up = Number(d0.usage_percent ?? d0.usage ?? NaN);
            if (!Number.isNaN(up)) {
              hostDiskNext = {
                usagePercent: Math.round(up),
                mount: typeof d0.mount === "string" ? d0.mount : undefined,
                usedGb: typeof d0.used === "number" ? d0.used : undefined,
                totalGb: typeof d0.total === "number" ? d0.total : undefined,
              };
            }
          }
        }
      } catch {
        // ignore
      }
      setHostDiskContext(hostDiskNext);

      // Historique : snapshots disque (/history) + complément chartData agrégateur + courbe « session » (lot A1a → serviceHistorySources)
      const serverHistoryPoints = await loadServerHistoryPoints({
        metricsUrl,
        fullServiceName,
        serviceName,
        historyLimit: 280,
        chartDataMaxPoints: 80,
      });

      if (merged) {
        const ts = new Date().toISOString();
        sessionHistoryRef.current = [
          ...sessionHistoryRef.current,
          {
            timestamp: ts,
            cpu_percent: Number(merged.cpu_percent) || 0,
            memory_percent: Number(merged.memory_percent) || 0,
            memory_usage_mb: Number(merged.memory_usage_mb) || 0,
            network_rx_mb: Number(merged.network_rx_mb) || 0,
            network_tx_mb: Number(merged.network_tx_mb) || 0,
            block_read_mb: Number(merged.block_read_mb) || 0,
            block_write_mb: Number(merged.block_write_mb) || 0,
          },
        ].slice(-260);
        setLastMetricsAt(new Date());
      }

      setServiceHistory(
        mergeHistoryChronological(
          serverHistoryPoints,
          sessionHistoryRef.current,
        ),
      );

      if (merged) {
        setServiceMetrics(merged);
      }
    } catch (error) {
      console.error(
        "[SERVICE DETAIL] Erreur chargement données service:",
        error,
      );
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadServiceData();
    if (!autoRefreshEnabled || refreshIntervalSec <= 0) return undefined;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !document.hidden) {
        loadServiceData();
      }
    }, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [serviceName, autoRefreshEnabled, refreshIntervalSec]);

  const handleRefresh = () => {
    loadServiceData(true);
  };

  const {
    historyChartRows,
    historyChartRowsIo,
    historyCpuMax,
    historyMemMax,
    historyAxisShowDate,
    historyBlockMbMax,
    historyIoRateMax,
  } = useServiceHistoryChartData(serviceHistory);

  if (loading) {
    return (
      <ServicesPageShell
        showSubNav={false}
        backHref="/b4ck0ff1ce/services"
        backLabel="Retour à la liste des services"
        title={serviceName}
        description="Monitoring détaillé du service"
      >
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ServicesPageShell>
    );
  }

  // Détection améliorée du statut : priorité au statut Docker
  const dockerHealth = serviceMetrics?.health_status_docker || "none";
  const httpHealth = serviceMetrics?.health_status_http || "unknown";
  const isHealthy =
    dockerHealth === "healthy" ||
    (dockerHealth === "none" && httpHealth === "healthy");

  const cpuPercent = serviceMetrics?.cpu_percent || 0;
  const memoryPercent = serviceMetrics?.memory_percent || 0;
  const memoryUsageMb = serviceMetrics?.memory_usage_mb || 0;
  const memoryLimitMb = serviceMetrics?.memory_limit_mb || 0;
  const memoryLimitSource = serviceMetrics?.memory_limit_source || null;
  const memoryLimitLabel =
    memoryLimitSource === "jobbingtrack-budget"
      ? "Budget JobbingTrack"
      : memoryLimitSource === "docker-hostconfig"
        ? "Limite Docker"
        : "Limite conteneur";
  const networkRxMb = serviceMetrics?.network_rx_mb || 0;
  const networkTxMb = serviceMetrics?.network_tx_mb || 0;
  const blockReadMb = serviceMetrics?.block_read_mb ?? 0;
  const blockWriteMb = serviceMetrics?.block_write_mb ?? 0;
  const pidsRaw = serviceMetrics?.pids;
  const pidsDisplay =
    pidsRaw != null && pidsRaw !== "" && !Number.isNaN(Number(pidsRaw))
      ? Number(pidsRaw)
      : null;
  const responseTime = serviceMetrics?.response_time_ms;

  // Log uniquement en mode développement et seulement lors du premier rendu
  if (process.env.NODE_ENV === "development" && !serviceMetrics) {
    console.log("[SERVICE DETAIL] Statuts:", {
      dockerHealth,
      httpHealth,
      isHealthy,
      cpuPercent,
      memoryPercent,
      networkRxMb,
      networkTxMb,
    });
  }

  return (
    <ServicesPageShell
      showSubNav={false}
      backHref="/b4ck0ff1ce/services"
      backLabel="Retour à la liste des services"
      title={
        <span className="flex items-center gap-3">
          <Server className="h-7 w-7 text-blue-600" />
          {serviceName}
        </span>
      }
      description="Monitoring détaillé du service"
      actions={
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                className="rounded border-gray-400"
              />
              Auto
            </label>
            <select
              value={refreshIntervalSec}
              onChange={(e) => setRefreshIntervalSec(Number(e.target.value))}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              disabled={!autoRefreshEnabled}
            >
              <option value={10}>10 s</option>
              <option value={15}>15 s</option>
              <option value={30}>30 s</option>
              <option value={60}>60 s</option>
            </select>
            {lastMetricsAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatLocalDateTime(lastMetricsAt.toISOString())}
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-5 w-5 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Actualiser
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status Banner */}
        <div
          className={`p-4 rounded-lg border-2 ${
            isHealthy
              ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
              : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isHealthy ? (
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600 mr-3" />
              )}
              <div>
                <h3
                  className={`text-lg font-bold ${isHealthy ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"}`}
                >
                  {isHealthy
                    ? "Service opérationnel"
                    : "Service non disponible"}
                </h3>
                <p
                  className={`text-sm ${isHealthy ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {isHealthy
                    ? "Tous les systèmes fonctionnent normalement"
                    : "Le service rencontre des problèmes"}
                </p>
                <div className="flex gap-2 mt-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      dockerHealth === "healthy"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : dockerHealth === "unhealthy"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          : dockerHealth === "starting"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    Docker: {dockerHealth}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      httpHealth === "healthy"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : httpHealth === "degraded"
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                          : httpHealth === "unhealthy"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    HTTP: {httpHealth}
                  </span>
                </div>
              </div>
            </div>
            {responseTime && (
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Temps de réponse
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {responseTime} ms
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <span
                className={`text-sm font-medium ${cpuPercent > 70 ? "text-red-600" : "text-blue-600"}`}
              >
                {cpuPercent > 70 ? "Élevé" : "Normal"}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatCpuPercent(cpuPercent)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Utilisation CPU (Docker stats)
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Valeur brute :{" "}
              {typeof serviceMetrics?.cpu_percent === "number"
                ? serviceMetrics.cpu_percent.toFixed(6)
                : "—"}{" "}
              %
            </p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  cpuPercent > 70
                    ? "bg-red-600"
                    : cpuPercent > 40
                      ? "bg-yellow-600"
                      : "bg-green-600"
                }`}
                style={{ width: cpuBarWidthPercent(cpuPercent) }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Database className="h-8 w-8 text-purple-600" />
              <span
                className={`text-sm font-medium ${memoryPercent > 80 ? "text-red-600" : "text-purple-600"}`}
              >
                {memoryPercent > 80 ? "Élevé" : "Normal"}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatMegabytes(memoryUsageMb)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mémoire ·{" "}
              {memoryPercent.toLocaleString("fr-FR", {
                maximumFractionDigits: 2,
              })}{" "}
              % de la limite
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {memoryLimitLabel} : {formatMegabytes(memoryLimitMb)}
            </p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  memoryPercent > 80
                    ? "bg-red-600"
                    : memoryPercent > 50
                      ? "bg-yellow-600"
                      : "bg-blue-600"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(memoryPercent, memoryPercent > 0 ? 0.5 : 0))}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-8 w-8 text-green-600" />
              <span className="text-sm font-medium text-green-600">cgroup</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {pidsDisplay != null ? pidsDisplay : "—"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Processus / tâches (PIDs)
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 leading-relaxed">
              Compteur renvoyé par <strong>docker stats</strong> pour ce
              conteneur (processus visibles dans le cgroup, pas la liste des
              commandes).
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Network className="h-8 w-8 text-orange-600" />
              <span className="text-sm font-medium text-orange-600">Net</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatMegabytes(networkRxMb + networkTxMb)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Trafic cumulé interface (depuis dernier reset conteneur)
            </p>
            <div className="mt-2 flex flex-col gap-0.5 text-xs text-gray-500">
              <span>↓ RX : {formatMegabytes(networkRxMb)}</span>
              <span>↑ TX : {formatMegabytes(networkTxMb)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <HardDrive
                className="h-8 w-8 text-slate-600 dark:text-slate-300 shrink-0"
                aria-hidden
              />
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  Block I/O conteneur (Docker stats)
                </p>
                <p>
                  Lecture cumulée :{" "}
                  <span className="tabular-nums font-medium">
                    {formatMegabytes(blockReadMb)}
                  </span>
                  <span className="mx-2 text-gray-400">·</span>
                  Écriture cumulée :{" "}
                  <span className="tabular-nums font-medium">
                    {formatMegabytes(blockWriteMb)}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Cumuls depuis la création ou le dernier redémarrage du
                  conteneur (équivalent{" "}
                  <code className="text-[11px]">docker stats</code>). Ce n’est{" "}
                  <strong>pas</strong> l’espace disque occupé par les couches
                  d’image : uniquement les octets lus/écrits par le cgroup.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <HardDrive
                className="h-8 w-8 text-amber-600 dark:text-amber-400 shrink-0"
                aria-hidden
              />
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  Disque hôte (contexte)
                </p>
                {hostDiskContext ? (
                  <>
                    <p className="tabular-nums">
                      Utilisation :{" "}
                      <span className="font-medium">
                        {hostDiskContext.usagePercent} %
                      </span>
                      {hostDiskContext.mount ? (
                        <span className="text-gray-500 dark:text-gray-400">
                          {" "}
                          — point de montage {hostDiskContext.mount}
                        </span>
                      ) : null}
                    </p>
                    {hostDiskContext.usedGb != null &&
                    hostDiskContext.totalGb != null ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ≈ {hostDiskContext.usedGb} Go /{" "}
                        {hostDiskContext.totalGb} Go (agrégateur / monitoring-c,
                        pas par conteneur)
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Données issues de{" "}
                        <code className="text-[11px]">GET /api/v1/metrics</code>{" "}
                        sur le nœud observé par l’agrégateur.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Indisponible (agrégateur ou route{" "}
                    <code className="text-[11px]">/api/v1/metrics</code>{" "}
                    injoignable depuis le navigateur).
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold">Réutilisation monitoring</p>
          <p className="mt-1">
            Cette page réutilise les endpoints du metrics-aggregator pour éviter
            des collectes Docker redondantes côté frontend. Le Block I/O vient
            du conteneur, tandis que le disque hôte vient du contexte global
            `/api/v1/metrics`.
          </p>
        </div>

        <MonitoringServiceHistoryCharts
          serviceHistoryLength={serviceHistory.length}
          historyChartRows={historyChartRows}
          historyChartRowsIo={historyChartRowsIo}
          historyCpuMax={historyCpuMax}
          historyMemMax={historyMemMax}
          historyAxisShowDate={historyAxisShowDate}
          historyBlockMbMax={historyBlockMbMax}
          historyIoRateMax={historyIoRateMax}
          exportBaseName={`service-${serviceName}-history-series`}
        />

        {/* Logs en Temps Réel */}
        <div
          ref={logsContainerRef}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Terminal className="h-6 w-6 mr-2" />
              Logs du Service (Temps Réel)
            </h2>
            {serviceLogs?.lines && serviceLogs.lines.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    autoScroll
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {autoScroll ? "✓ Auto-Scroll Actif" : "Auto-Scroll Désactivé"}
                </button>
                <button
                  type="button"
                  onClick={() => setHideFirewallNoise((v) => !v)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    hideFirewallNoise
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                  title="Masque les lignes détectées comme firewall / WAF / rate-limit (souvent très verbeuses sur la gateway)"
                >
                  {hideFirewallNoise
                    ? "Firewall : masqué"
                    : "Firewall : tout afficher"}
                </button>
                <span className="text-sm text-gray-500">
                  {serviceLogs?.total ?? serviceLogs?.lines?.length ?? 0} lignes
                  {hideFirewallNoise
                    ? ` · affichées ${displayLogLines.length}`
                    : ""}
                </span>
                {(serviceLogs?.errors ?? 0) > 0 && (
                  <span className="flex items-center text-sm font-medium text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {serviceLogs?.errors} erreurs
                  </span>
                )}
                {(serviceLogs?.warnings ?? 0) > 0 && (
                  <span className="flex items-center text-sm font-medium text-yellow-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {serviceLogs?.warnings} warnings
                  </span>
                )}
              </div>
            )}
          </div>

          <FilterBar
            hasDraftChanges={hasLogDraftChanges}
            onApply={() => applyLogFilters()}
            onReset={() =>
              resetLogFilters({ level: "all", kind: "all", query: "" })
            }
            badges={logFilterBadges}
          >
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <FilterSelectField
                label="Niveau"
                value={draftLogFilters.level}
                onChange={(value) =>
                  updateDraftLogFilter(
                    "level",
                    value as ServiceLogsFilters["level"],
                  )
                }
                options={[...SERVICE_LOG_LEVEL_OPTIONS]}
                allowEmpty={false}
                placeholder="Niveau"
              />
              <FilterSelectField
                label="Type de ligne"
                value={draftLogFilters.kind}
                onChange={(value) =>
                  updateDraftLogFilter(
                    "kind",
                    value as ServiceLogsFilters["kind"],
                  )
                }
                options={[...SERVICE_LOG_KIND_OPTIONS]}
                allowEmpty={false}
                placeholder="Type"
              />
              <FacetAutocompleteField
                label="Recherche"
                value={draftLogFilters.query}
                onChange={(value) => updateDraftLogFilter("query", value)}
                suggestions={logQuerySuggestions}
                placeholder="Mot-clé dans les logs…"
              />
            </div>
          </FilterBar>

          {/* Error Lines Summary */}
          {serviceLogs?.errorLines && serviceLogs.errorLines.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h3 className="text-sm font-bold text-red-800 dark:text-red-300 mb-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Erreurs Récentes ({serviceLogs.errorLines.length})
              </h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {serviceLogs.errorLines
                  .slice(0, 10)
                  .map((line: string, index: number) => (
                    <div
                      key={index}
                      className="text-xs font-mono text-red-700 dark:text-red-400 break-all"
                    >
                      {line}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* All Logs - Affichage Terminal Style */}
          {serviceLogs?.lines && serviceLogs.lines.length > 0 ? (
            <>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Couleurs : erreurs / avertissements / requêtes HTTP / firewall
                (violet). Le statut{" "}
                <strong className="font-medium text-gray-700 dark:text-gray-300">
                  make status
                </strong>{" "}
                indique que le conteneur tourne, pas qu’une route backoffice
                précise a été appelée récemment.
              </p>
              <div className="relative">
                <div className="max-h-[500px] overflow-y-auto rounded-lg bg-zinc-950 p-3 font-mono text-[11px] leading-snug sm:text-xs sm:p-4">
                  {displayLogLines.map((line: string, index: number) => {
                    // Parser le timestamp Docker (format: 2025-12-02T17:21:30.123456789Z message)
                    const timestampMatch = line.match(
                      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+([\s\S]*)$/,
                    );
                    const timestamp = timestampMatch ? timestampMatch[1] : null;
                    const message = timestampMatch ? timestampMatch[2] : line;

                    // Formater la date pour l'affichage (heure locale utilisateur)
                    let formattedDate = "";
                    if (timestamp) {
                      try {
                        formattedDate = formatLocalDateTime(timestamp);
                      } catch (e) {
                        formattedDate = timestamp;
                      }
                    }

                    return (
                      <div
                        key={`${index}-${line.slice(0, 24)}`}
                        className="grid grid-cols-1 gap-x-2 border-b border-white/[0.06] py-1.5 sm:grid-cols-[minmax(0,10.5rem)_1fr]"
                      >
                        <div className="text-gray-500 shrink-0 tabular-nums">
                          {formattedDate ? formattedDate : "—"}
                        </div>
                        <div
                          className={`min-w-0 ${serviceLogLineClass(message)}`}
                        >
                          {message}
                        </div>
                      </div>
                    );
                  })}
                  {/* Référence pour auto-scroll */}
                  <div ref={logsEndRef} />
                </div>
                {!autoScroll && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <button
                      onClick={() => {
                        logsEndRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                        setAutoScroll(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-lg transition-colors"
                    >
                      ↓ Aller en bas et activer auto-scroll
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {autoRefreshEnabled
                  ? `Rafraîchissement des métriques et des logs aligné sur la cadence ci-dessus (${refreshIntervalSec} s).`
                  : "Auto-rafraîchissement désactivé — utilisez « Actualiser »."}
              </p>
            </>
          ) : (
            <div className="text-center py-12">
              <Terminal className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Aucun log disponible pour ce service.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Les logs apparaîtront ici une fois que le service aura généré
                des sorties.
              </p>
            </div>
          )}
        </div>
      </div>
    </ServicesPageShell>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import { Pagination } from "@/components/ui/Pagination";
import {
  FacetAutocompleteField,
  FilterBar,
  FilterSelectField,
} from "@/components/filters";
import Link from "next/link";
import { SecurityPageShell } from "../SecuritySubNav";
import { useAppliedFilters } from "@/hooks/useAppliedFilters";
import {
  facetOptionsFromValues,
  mergeFacetSuggestions,
} from "@/lib/filters/facetUtils";
import { FRONTEND_URLS } from "@/config/ports.config";
import { formatLocalDateTime } from "@/lib/utils/date";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { TableSkeleton } from "@/lib/ui";
import {
  formatSecuritySeverity,
  formatThreatTypeLabel,
  getThreatSeverityFilterOptions,
  isHighOrCriticalSeverity,
  normalizeSecuritySeverity,
} from "@/lib/security/securityLabels";
import {
  findConsolidatedBlockEntry,
  resolveThreatBlockStatus,
  threatBlockStatusToneClass,
  type BlockedIpConsolidatedEntry,
} from "@/lib/security/threatBlockPresentation";
import { AlertTriangle, Ban, RefreshCw, Eye } from "lucide-react";
import axios from "axios";

const API_GATEWAY_URL = FRONTEND_URLS.api;
const THREATS_PAGE_SIZE = 50;

interface NetworkThreat {
  id: string;
  threatType: string;
  sourceIp: string;
  destIp?: string;
  destPort?: number;
  severity: string;
  detectedAt: string;
  blocked: boolean;
  ignored?: boolean;
  ignoreReason?: string | null;
  metadata?: any;
}

type ThreatFilters = {
  severity: string;
  threatType: string;
  sourceIp: string;
  destIp: string;
  blocked: string;
  ignored: string;
  destPort: string;
  startDate: string;
  endDate: string;
};

const DEFAULT_THREAT_FILTERS: ThreatFilters = {
  severity: "",
  threatType: "",
  sourceIp: "",
  destIp: "",
  blocked: "",
  ignored: "",
  destPort: "",
  startDate: "",
  endDate: "",
};

const IGNORED_FILTER_OPTIONS = [
  { value: "true", label: "Faux positifs seulement" },
  { value: "all", label: "Toutes (incl. ignorées)" },
];

const BLOCKED_FILTER_OPTIONS = [
  { value: "true", label: "Bloqué" },
  { value: "false", label: "Non bloqué" },
];

function buildInitialThreatFilters(
  searchParams: URLSearchParams,
): ThreatFilters {
  return {
    severity: searchParams.get("severity") || "",
    threatType: searchParams.get("threatType") || "",
    sourceIp: searchParams.get("sourceIp") || "",
    destIp: searchParams.get("destIp") || "",
    blocked: searchParams.get("blocked") || "",
    ignored: searchParams.get("ignored") || "",
    destPort: searchParams.get("destPort") || "",
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
  };
}

export default function ThreatsPage() {
  useDocumentTitle("Menaces sécurité");

  const router = useRouter();
  const searchParams = useSearchParams();
  const [threats, setThreats] = useState<NetworkThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const { page, setPage } = useUrlPagination("page", 1);
  const [total, setTotal] = useState(0);
  const initialThreatFilters = useMemo(
    () => buildInitialThreatFilters(searchParams),
    [searchParams],
  );
  const { applied, draft, updateDraft, apply, reset, hasDraftChanges } =
    useAppliedFilters<ThreatFilters>(initialThreatFilters);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(60_000);
  const [refreshing, setRefreshing] = useState(false);
  const [newThreatsCount, setNewThreatsCount] = useState(0);
  const previousTopThreatTsRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef(false);
  const [consolidatedEntries, setConsolidatedEntries] = useState<
    BlockedIpConsolidatedEntry[]
  >([]);

  const loadThreats = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;

      const silent = options.silent === true;
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setServiceError(null);

        const params: any = { page, limit: THREATS_PAGE_SIZE };
        if (applied.severity) params.severity = applied.severity;
        if (applied.threatType) params.threatType = applied.threatType;
        if (applied.sourceIp) params.sourceIp = applied.sourceIp;
        if (applied.destIp) params.destIp = applied.destIp;
        if (applied.blocked) params.blocked = applied.blocked;
        if (applied.ignored) params.ignored = applied.ignored;
        if (applied.destPort) params.destPort = applied.destPort;
        if (applied.startDate) params.startDate = applied.startDate;
        if (applied.endDate) params.endDate = applied.endDate;

        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [threatsOutcome, blockedOutcome] = await Promise.allSettled([
          axios.get(`${API_GATEWAY_URL}/api/v1/security/firewall/threats`, {
            headers,
            params,
            timeout: 5000,
          }),
          axios.get(`${API_GATEWAY_URL}/api/v1/security/firewall/blocked-ips`, {
            headers,
            params: { all: true },
            timeout: 5000,
          }),
        ]);
        if (blockedOutcome.status === "fulfilled") {
          const blockedRes = blockedOutcome.value;
          if (
            blockedRes.data?.success &&
            Array.isArray(blockedRes.data?.data)
          ) {
            const normalized = (
              blockedRes.data.data as (string | BlockedIpConsolidatedEntry)[]
            ).map((item) => (typeof item === "string" ? { ip: item } : item));
            setConsolidatedEntries(normalized);
          }
        } else {
          setConsolidatedEntries([]);
        }
        if (threatsOutcome.status !== "fulfilled") {
          throw threatsOutcome.reason;
        }
        const response = threatsOutcome.value;
        if (response.data.success) {
          const raw = response.data.data || [];
          const totalData = response.data.pagination?.total ?? raw.length;
          const sorted = [...raw].sort((a, b) => {
            const da = new Date(a.detectedAt || 0).getTime();
            const db = new Date(b.detectedAt || 0).getTime();
            return db - da;
          });
          if (sorted.length > 0) {
            const topTs = sorted[0].detectedAt;
            if (
              previousTopThreatTsRef.current &&
              topTs !== previousTopThreatTsRef.current
            ) {
              const previousMs = new Date(
                previousTopThreatTsRef.current,
              ).getTime();
              const currentMs = new Date(topTs).getTime();
              if (currentMs > previousMs) {
                const delta = sorted.filter(
                  (t) => new Date(t.detectedAt).getTime() > previousMs,
                ).length;
                setNewThreatsCount((v) => v + Math.max(1, delta));
              }
            }
            previousTopThreatTsRef.current = topTs;
          }
          setThreats(sorted);
          setTotal(totalData);
        } else {
          setThreats([]);
          setTotal(0);
          setServiceError(
            `Réponse inattendue du service menaces (HTTP ${response.status}).`,
          );
        }
      } catch (err: any) {
        console.error("Erreur chargement menaces:", err);
        setThreats([]);
        setTotal(0);
        setConsolidatedEntries([]);
        setServiceError(
          err.response?.data?.error ||
            err.message ||
            "Service menaces indisponible",
        );
      } finally {
        refreshInFlightRef.current = false;
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [applied, page],
  );

  useEffect(() => {
    loadThreats();
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadThreats({ silent: true });
    }, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [loadThreats, autoRefreshEnabled, refreshIntervalMs]);

  const exportThreatsJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(threats, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-threats-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [threats]);

  const exportThreatsCsv = useCallback(() => {
    const header = [
      "id",
      "type",
      "sévérité",
      "ipSource",
      "ipDestination",
      "portDestination",
      "statutBlocage",
      "détectéLe",
    ];
    const rows = threats.map((t) => [
      t.id,
      formatThreatTypeLabel(t.threatType),
      formatSecuritySeverity(t.severity),
      t.sourceIp || "",
      t.destIp || "",
      t.destPort ?? "",
      t.blocked ? "Bloqué" : "Non bloqué",
      t.detectedAt,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-threats-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [threats]);

  const highOrCriticalCount = useMemo(
    () => threats.filter((t) => isHighOrCriticalSeverity(t.severity)).length,
    [threats],
  );

  const sourceIpSuggestions = useMemo(
    () =>
      mergeFacetSuggestions(
        undefined,
        threats.map((threat) => threat.sourceIp),
      ),
    [threats],
  );
  const destIpSuggestions = useMemo(
    () =>
      mergeFacetSuggestions(
        undefined,
        threats.map((threat) => threat.destIp),
      ),
    [threats],
  );
  const destPortSuggestions = useMemo(
    () =>
      mergeFacetSuggestions(
        undefined,
        threats.map((threat) =>
          threat.destPort != null ? String(threat.destPort) : undefined,
        ),
      ),
    [threats],
  );
  const threatTypeSuggestions = useMemo(
    () =>
      mergeFacetSuggestions(
        facetOptionsFromValues(
          threats.map((threat) => threat.threatType),
          formatThreatTypeLabel,
        ),
        threats.map((threat) => threat.threatType),
      ),
    [threats],
  );

  const activeBadges = [
    applied.severity
      ? {
          key: "severity",
          label: `sévérité ${formatSecuritySeverity(applied.severity)}`,
        }
      : null,
    applied.threatType
      ? {
          key: "threatType",
          label: `type ${formatThreatTypeLabel(applied.threatType)}`,
        }
      : null,
    applied.blocked
      ? {
          key: "blocked",
          label:
            applied.blocked === "true" ? "statut bloqué" : "statut non bloqué",
        }
      : null,
    applied.sourceIp
      ? { key: "sourceIp", label: `IP source ${applied.sourceIp}` }
      : null,
    applied.destIp
      ? { key: "destIp", label: `IP dest ${applied.destIp}` }
      : null,
    applied.destPort
      ? { key: "destPort", label: `port ${applied.destPort}` }
      : null,
    applied.startDate
      ? { key: "startDate", label: `début ${applied.startDate}` }
      : null,
    applied.endDate
      ? { key: "endDate", label: `fin ${applied.endDate}` }
      : null,
  ].filter((badge): badge is { key: string; label: string } => Boolean(badge));

  const handleApplyFilters = () => {
    setPage(1);
    apply();
  };

  const handleResetFilters = () => {
    setPage(1);
    reset(DEFAULT_THREAT_FILTERS);
  };

  const handleBlockThreat = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir bloquer cette menace ?")) return;
    try {
      await axios.post(
        `${API_GATEWAY_URL}/api/v1/security/firewall/threats/${id}/block`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      loadThreats();
    } catch (err: any) {
      console.error("Erreur blocage menace:", err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (normalizeSecuritySeverity(severity)) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  return (
    <SecurityPageShell
      showIncidentsTabs
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-7 w-7" />
          Menaces réseau
        </span>
      }
      description={`${highOrCriticalCount} menace(s) haute(s) ou critique(s) sur la page courante`}
      actions={
        <>
          <button
            onClick={exportThreatsJson}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
          >
            Export JSON
          </button>
          <button
            onClick={exportThreatsCsv}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
          >
            Export CSV
          </button>
          <button
            onClick={() => loadThreats()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Actualiser
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Temps réel:{" "}
            {autoRefreshEnabled
              ? `activé (${Math.round(refreshIntervalMs / 1000)}s)`
              : "désactivé"}
            {refreshing && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                rafraîchissement des données…
              </span>
            )}
            {newThreatsCount > 0 && (
              <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">
                +{newThreatsCount} nouvelle(s) menace(s)
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setNewThreatsCount(0)}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
            >
              Marquer comme vu
            </button>
            <button
              onClick={() => setAutoRefreshEnabled((v) => !v)}
              className={`px-3 py-1 rounded text-sm text-white ${autoRefreshEnabled ? "bg-red-600" : "bg-emerald-600"}`}
            >
              {autoRefreshEnabled
                ? "Arrêter l’auto-refresh"
                : "Démarrer l’auto-refresh"}
            </button>
            <select
              value={String(refreshIntervalMs)}
              onChange={(e) => setRefreshIntervalMs(Number(e.target.value))}
              className="px-2 py-1 border rounded dark:bg-gray-700 dark:text-gray-100 text-sm"
              disabled={!autoRefreshEnabled}
            >
              <option value="15000">15s</option>
              <option value="30000">30s</option>
              <option value="60000">60s</option>
              <option value="10000">10s</option>
              <option value="5000">5s</option>
            </select>
          </div>
        </div>

        <FilterBar
          hasDraftChanges={hasDraftChanges}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          badges={activeBadges}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            <FilterSelectField
              label="Sévérité"
              value={draft.severity}
              onChange={(value) => updateDraft("severity", value)}
              options={getThreatSeverityFilterOptions()}
              placeholder="Toutes"
            />
            <FacetAutocompleteField
              label="Type"
              value={draft.threatType}
              onChange={(value) => updateDraft("threatType", value)}
              suggestions={threatTypeSuggestions}
              placeholder="BRUTE_FORCE, PORT_SCAN..."
              formatSuggestion={formatThreatTypeLabel}
            />
            <FilterSelectField
              label="Statut blocage"
              value={draft.blocked}
              onChange={(value) => updateDraft("blocked", value)}
              options={BLOCKED_FILTER_OPTIONS}
              placeholder="Tous"
            />
            <FilterSelectField
              label="Faux positifs"
              value={draft.ignored}
              onChange={(value) => updateDraft("ignored", value)}
              options={IGNORED_FILTER_OPTIONS}
              placeholder="Actives (défaut)"
            />
            <FacetAutocompleteField
              label="IP source"
              value={draft.sourceIp}
              onChange={(value) => updateDraft("sourceIp", value)}
              suggestions={sourceIpSuggestions}
              placeholder="IP source (ex: 198.51.100.42)"
            />
            <FacetAutocompleteField
              label="IP destination"
              value={draft.destIp}
              onChange={(value) => updateDraft("destIp", value)}
              suggestions={destIpSuggestions}
              placeholder="IP dest (ex: 172.18.0.10)"
            />
            <FacetAutocompleteField
              label="Port destination"
              value={draft.destPort}
              onChange={(value) => updateDraft("destPort", value)}
              suggestions={destPortSuggestions}
              placeholder="Port dest (ex: 3017)"
            />
            <label className="flex flex-col gap-1 text-sm font-medium">
              Début
              <input
                type="datetime-local"
                value={draft.startDate}
                onChange={(e) => updateDraft("startDate", e.target.value)}
                className="w-full rounded-lg border px-4 py-2 dark:bg-gray-700 dark:text-gray-100"
                title="Date de début"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Fin
              <input
                type="datetime-local"
                value={draft.endDate}
                onChange={(e) => updateDraft("endDate", e.target.value)}
                className="w-full rounded-lg border px-4 py-2 dark:bg-gray-700 dark:text-gray-100"
                title="Date de fin"
              />
            </label>
          </div>
        </FilterBar>
        {serviceError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">
              {serviceError}
            </p>
          </div>
        )}

        {/* Liste des menaces */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {loading ? (
            <TableSkeleton rows={10} columns={8} />
          ) : threats.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Aucune menace détectée
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">IP Source</th>
                      <th className="text-left p-3">IP Dest</th>
                      <th className="text-left p-3">Port Dest</th>
                      <th className="text-left p-3">Sévérité</th>
                      <th className="text-left p-3">Détecté le</th>
                      <th className="text-left p-3">Statut</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {threats.map((threat) => (
                      <tr
                        key={threat.id}
                        className="border-b border-gray-200 dark:border-gray-700"
                      >
                        <td className="p-3">
                          <span className="font-semibold">
                            {formatThreatTypeLabel(threat.threatType)}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-sm">
                          {threat.sourceIp}
                        </td>
                        <td className="p-3 font-mono text-sm">
                          {threat.destIp || "—"}
                        </td>
                        <td className="p-3">
                          {threat.destPort ? (
                            <span className="font-mono">{threat.destPort}</span>
                          ) : (
                            <span className="text-gray-400">Tous</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-sm ${getSeverityColor(threat.severity)}`}
                          >
                            {formatSecuritySeverity(threat.severity)}
                          </span>
                        </td>
                        <td className="p-3">
                          {formatLocalDateTime(threat.detectedAt)}
                        </td>
                        <td className="p-3">
                          {(() => {
                            const consolidatedEntry =
                              findConsolidatedBlockEntry(
                                threat,
                                consolidatedEntries,
                              );
                            const blockStatus = resolveThreatBlockStatus(
                              threat,
                              consolidatedEntry,
                            );
                            const inList = Boolean(consolidatedEntry);
                            return (
                              <div className="flex flex-col gap-1 items-start">
                                <span
                                  className={`flex items-center gap-1 font-medium ${threatBlockStatusToneClass(blockStatus.tone)}`}
                                >
                                  {blockStatus.kind.startsWith("blocked") && (
                                    <Ban className="h-4 w-4" />
                                  )}
                                  {blockStatus.label}
                                </span>
                                {blockStatus.detail && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                                    {blockStatus.detail}
                                  </span>
                                )}
                                {inList && (
                                  <Link
                                    href="/backoffice/security/firewall#liste-ips-bloquees"
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    Liste consolidée
                                  </Link>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/backoffice/security/threats/${threat.id}`,
                                )
                              }
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Détails
                            </button>
                            {resolveThreatBlockStatus(
                              threat,
                              findConsolidatedBlockEntry(
                                threat,
                                consolidatedEntries,
                              ),
                            ).showBlockButton && (
                              <button
                                onClick={() => handleBlockThreat(threat.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                              >
                                <Ban className="h-4 w-4" />
                                Bloquer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {total > 0 && (
                <Pagination
                  className="p-4 border-t border-gray-200 dark:border-gray-700"
                  currentPage={page}
                  totalPages={Math.max(1, Math.ceil(total / THREATS_PAGE_SIZE))}
                  totalItems={total}
                  itemsPerPage={THREATS_PAGE_SIZE}
                  startIndex={(page - 1) * THREATS_PAGE_SIZE + 1}
                  endIndex={Math.min(page * THREATS_PAGE_SIZE, total)}
                  onPageChange={setPage}
                  onNext={() => setPage(page + 1)}
                  onPrevious={() => setPage(page - 1)}
                  canGoNext={page * THREATS_PAGE_SIZE < total}
                  canGoPrevious={page > 1}
                />
              )}
            </>
          )}
        </div>
      </div>
    </SecurityPageShell>
  );
}

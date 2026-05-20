"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";
import { AdminLayout } from "@/components/features";
import { SecuritySubNav } from "../SecuritySubNav";
import { FRONTEND_URLS } from "@/config/ports.config";
import { formatLocalDateTime } from "@/lib/utils/date";
import { TableSkeleton } from "@/lib/ui";
import { AlertTriangle, Ban, RefreshCw, Eye } from "lucide-react";
import axios from "axios";

const API_GATEWAY_URL = FRONTEND_URLS.api;
const THREATS_PAGE_SIZE = 50;

function normalizeFirewallListedIp(ip: string) {
  const s = String(ip || "").trim();
  if (s.startsWith("::ffff:")) return s.slice(7);
  return s;
}

interface NetworkThreat {
  id: string;
  threatType: string;
  sourceIp: string;
  destIp?: string;
  destPort?: number;
  severity: string;
  detectedAt: string;
  blocked: boolean;
  metadata?: any;
}

export default function ThreatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [threats, setThreats] = useState<NetworkThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const { page, setPage } = useUrlPagination("page", 1);
  const [total, setTotal] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<string>(
    () => searchParams.get("severity") || "",
  );
  const [typeFilter, setTypeFilter] = useState<string>(
    () => searchParams.get("threatType") || "",
  );
  const [sourceIpFilter, setSourceIpFilter] = useState<string>(
    () => searchParams.get("sourceIp") || "",
  );
  const [destIpFilter, setDestIpFilter] = useState<string>(
    () => searchParams.get("destIp") || "",
  );
  const [blockedFilter, setBlockedFilter] = useState<string>(
    () => searchParams.get("blocked") || "",
  );
  const [destPortFilter, setDestPortFilter] = useState<string>(
    () => searchParams.get("destPort") || "",
  );
  const [startDateFilter, setStartDateFilter] = useState<string>(
    () => searchParams.get("startDate") || "",
  );
  const [endDateFilter, setEndDateFilter] = useState<string>(
    () => searchParams.get("endDate") || "",
  );
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(5000);
  const [refreshing, setRefreshing] = useState(false);
  const [newThreatsCount, setNewThreatsCount] = useState(0);
  const previousTopThreatTsRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef(false);
  const [consolidatedBlocked, setConsolidatedBlocked] = useState<{
    ipKeys: Set<string>;
    threatIds: Set<string>;
  }>({ ipKeys: new Set(), threatIds: new Set() });

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
        if (severityFilter) params.severity = severityFilter;
        if (typeFilter) params.threatType = typeFilter;
        if (sourceIpFilter) params.sourceIp = sourceIpFilter;
        if (destIpFilter) params.destIp = destIpFilter;
        if (blockedFilter) params.blocked = blockedFilter;
        if (destPortFilter) params.destPort = destPortFilter;
        if (startDateFilter) params.startDate = startDateFilter;
        if (endDateFilter) params.endDate = endDateFilter;

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
            const ipKeys = new Set<string>();
            const threatIds = new Set<string>();
            for (const item of blockedRes.data.data as (
              | string
              | { ip?: string; threatId?: string }
            )[]) {
              const row = typeof item === "string" ? { ip: item } : item;
              if (row?.ip) ipKeys.add(normalizeFirewallListedIp(row.ip));
              if (row?.threatId) threatIds.add(String(row.threatId));
            }
            setConsolidatedBlocked({ ipKeys, threatIds });
          }
        } else {
          setConsolidatedBlocked({ ipKeys: new Set(), threatIds: new Set() });
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
        setConsolidatedBlocked({ ipKeys: new Set(), threatIds: new Set() });
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
    [
      page,
      severityFilter,
      typeFilter,
      sourceIpFilter,
      destIpFilter,
      blockedFilter,
      destPortFilter,
      startDateFilter,
      endDateFilter,
    ],
  );

  useEffect(() => {
    loadThreats();
    if (!autoRefreshEnabled) return;
    const interval = setInterval(
      () => loadThreats({ silent: true }),
      refreshIntervalMs,
    );
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
      "threatType",
      "severity",
      "sourceIp",
      "destIp",
      "destPort",
      "blocked",
      "detectedAt",
    ];
    const rows = threats.map((t) => [
      t.id,
      t.threatType,
      t.severity,
      t.sourceIp || "",
      t.destIp || "",
      t.destPort ?? "",
      t.blocked ? "true" : "false",
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
    () =>
      threats.filter((t) => t.severity === "HIGH" || t.severity === "CRITICAL")
        .length,
    [threats],
  );

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
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "LOW":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getThreatTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SYN_FLOOD: "SYN Flood",
      "SYN Flood": "SYN Flood",
      PORT_SCAN: "Port Scanning",
      BRUTE_FORCE: "Brute Force",
      DDoS: "DDoS Attack",
      SUSPICIOUS_REQUEST: "Requête suspecte",
      SQL_INJECTION: "Injection SQL",
      XSS: "XSS",
      PATH_TRAVERSAL: "Path Traversal",
      INTRUSION: "Intrusion",
      WAF_BLOCK: "Blocage WAF",
      FIREWALL_BLOCK: "Blocage Firewall",
    };
    return labels[type] || type;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <SecuritySubNav />
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <AlertTriangle className="h-8 w-8" />
              Menaces
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Toutes les menaces détectées (réseau, WAF, firewall, intrusions) —
              tri par date/heure de détection. La colonne Statut est croisée
              avec la{" "}
              <Link
                href="/b4ck0ff1ce/security/firewall#liste-ips-bloquees"
                className="text-blue-600 hover:underline"
              >
                liste consolidée des IPs bloquées
              </Link>
              .
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {highOrCriticalCount} menace(s) HIGH/CRITICAL sur la page courante
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
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
              {autoRefreshEnabled ? "Stop auto-refresh" : "Start auto-refresh"}
            </button>
            <select
              value={String(refreshIntervalMs)}
              onChange={(e) => setRefreshIntervalMs(Number(e.target.value))}
              className="px-2 py-1 border rounded dark:bg-gray-700 dark:text-gray-100 text-sm"
            >
              <option value="3000">3s</option>
              <option value="5000">5s</option>
              <option value="10000">10s</option>
              <option value="15000">15s</option>
            </select>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Sévérité
              <select
                value={severityFilter}
                onChange={(e) => {
                  setPage(1);
                  setSeverityFilter(e.target.value);
                }}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Toutes</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Type
              <select
                value={typeFilter}
                onChange={(e) => {
                  setPage(1);
                  setTypeFilter(e.target.value);
                }}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Tous</option>
                <option value="SYN_FLOOD">SYN_FLOOD</option>
                <option value="PORT_SCAN">PORT_SCAN</option>
                <option value="BRUTE_FORCE">BRUTE_FORCE</option>
                <option value="SQL_INJECTION">SQL_INJECTION</option>
                <option value="XSS">XSS</option>
                <option value="WAF_BLOCK">WAF_BLOCK</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Statut
              <select
                value={blockedFilter}
                onChange={(e) => {
                  setPage(1);
                  setBlockedFilter(e.target.value);
                }}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Tous</option>
                <option value="true">Bloqué</option>
                <option value="false">Non bloqué</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              IP source
              <input
                value={sourceIpFilter}
                onChange={(e) => {
                  setPage(1);
                  setSourceIpFilter(e.target.value);
                }}
                placeholder="IP source (ex: 10.0.0.)"
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              IP destination
              <input
                value={destIpFilter}
                onChange={(e) => {
                  setPage(1);
                  setDestIpFilter(e.target.value);
                }}
                placeholder="IP dest (ex: 172.18.0.)"
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Port destination
              <input
                value={destPortFilter}
                onChange={(e) => {
                  setPage(1);
                  setDestPortFilter(e.target.value);
                }}
                placeholder="Port dest (ex: 443)"
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Début
              <input
                type="datetime-local"
                value={startDateFilter}
                onChange={(e) => {
                  setPage(1);
                  setStartDateFilter(e.target.value);
                }}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
                title="Date de début"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Fin
              <input
                type="datetime-local"
                value={endDateFilter}
                onChange={(e) => {
                  setPage(1);
                  setEndDateFilter(e.target.value);
                }}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
                title="Date de fin"
              />
            </label>
            <button
              onClick={() => {
                setPage(1);
                setSeverityFilter("");
                setTypeFilter("");
                setSourceIpFilter("");
                setDestIpFilter("");
                setBlockedFilter("");
                setDestPortFilter("");
                setStartDateFilter("");
                setEndDateFilter("");
              }}
              className="w-full self-end px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
            >
              Réinitialiser
            </button>
          </div>
        </div>
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
                            {getThreatTypeLabel(threat.threatType)}
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
                            {threat.severity}
                          </span>
                        </td>
                        <td className="p-3">
                          {formatLocalDateTime(threat.detectedAt)}
                        </td>
                        <td className="p-3">
                          {(() => {
                            const inList =
                              consolidatedBlocked.ipKeys.has(
                                normalizeFirewallListedIp(threat.sourceIp),
                              ) || consolidatedBlocked.threatIds.has(threat.id);
                            return (
                              <div className="flex flex-col gap-1 items-start">
                                {threat.blocked ? (
                                  <span className="flex items-center gap-1 text-red-600">
                                    <Ban className="h-4 w-4" />
                                    Bloqué (BDD)
                                  </span>
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Non bloqué
                                  </span>
                                )}
                                {inList && (
                                  <Link
                                    href="/b4ck0ff1ce/security/firewall#liste-ips-bloquees"
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
                                  `/b4ck0ff1ce/security/threats/${threat.id}`,
                                )
                              }
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Détails
                            </button>
                            {!threat.blocked && (
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
    </AdminLayout>
  );
}

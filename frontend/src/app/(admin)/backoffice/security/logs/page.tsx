"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/features";
import { Pagination } from "@/components/ui/Pagination";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import { FRONTEND_URLS } from "@/config/ports.config";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { formatLocalDateTime } from "@/lib/utils/date";
import {
  formatSecurityEventTypeLabel,
  formatSecuritySeverity,
  normalizeSecuritySeverity,
} from "@/lib/security/securityLabels";
import { SecuritySubNav } from "../SecuritySubNav";
import { RefreshCw, ShieldAlert } from "lucide-react";

const API_URL = FRONTEND_URLS.api;
const PAGE_SIZE = 50;

type SecurityLogRow = {
  id: string;
  timestamp?: string;
  createdAt?: string;
  level?: string;
  category?: string;
  eventType?: string;
  message?: string;
  sourceIP?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  riskScore?: number;
  isBlocked?: boolean;
  metadata?: Record<string, unknown>;
};

type SecurityLogFacetOption = {
  value: string;
  count?: number;
};

type SecurityLogFacets = {
  sampleSize?: number;
  categories?: SecurityLogFacetOption[];
  eventTypes?: SecurityLogFacetOption[];
  sourceIPs?: SecurityLogFacetOption[];
  endpoints?: SecurityLogFacetOption[];
  methods?: SecurityLogFacetOption[];
  messages?: SecurityLogFacetOption[];
};

function levelBadgeClass(level?: string): string {
  const normalized = normalizeSecuritySeverity(level);
  if (normalized === "critical" || normalized === "error") {
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
  }
  if (normalized === "warning" || normalized === "high") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  }
  return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
}

function readMetadataThreatId(
  metadata?: Record<string, unknown>,
): string | null {
  const id = metadata?.threatId;
  return id ? String(id) : null;
}

function uniqueSortedValues(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

function facetValues(options?: SecurityLogFacetOption[]): string[] {
  return (options || [])
    .map((option) => option.value?.trim())
    .filter((value): value is string => Boolean(value));
}

export default function SecurityLogsPage() {
  useDocumentTitle("Logs sécurité");

  const searchParams = useSearchParams();
  const { page, setPage } = useUrlPagination("page", 1);
  const initialLevel = searchParams.get("level") || "";
  const initialCategory = searchParams.get("category") || "";
  const initialEventType = searchParams.get("eventType") || "";
  const initialQuery = searchParams.get("q") || "";
  const initialOrder = searchParams.get("order") === "asc" ? "asc" : "desc";

  const [level, setLevel] = useState(initialLevel);
  const [category, setCategory] = useState(initialCategory);
  const [eventType, setEventType] = useState(initialEventType);
  const [query, setQuery] = useState(initialQuery);
  const [order, setOrder] = useState<"asc" | "desc">(initialOrder);
  const [draftLevel, setDraftLevel] = useState(initialLevel);
  const [draftCategory, setDraftCategory] = useState(initialCategory);
  const [draftEventType, setDraftEventType] = useState(initialEventType);
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [draftOrder, setDraftOrder] = useState<"asc" | "desc">(initialOrder);
  const [days, setDays] = useState(14);
  const [draftDays, setDraftDays] = useState(14);
  const [logs, setLogs] = useState<SecurityLogRow[]>([]);
  const [facets, setFacets] = useState<SecurityLogFacets>({});
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [facetsLoading, setFacetsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const highlightId = searchParams.get("highlight") || "";

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
      startDate: new Date(Date.now() - days * 86400000).toISOString(),
    });
    if (level) params.set("level", level);
    if (category) params.set("category", category);
    if (eventType) params.set("eventType", eventType);
    if (query.trim()) params.set("q", query.trim());
    params.set("order", order);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/v1/security/logs?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          json?.error ||
            `Service logs sécurité indisponible (HTTP ${res.status})`,
        );
      }

      const rows = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.logs)
          ? json.logs
          : [];
      const pagination = json?.pagination || json?.meta?.pagination || {};
      setLogs(rows);
      setTotal(
        typeof pagination.total === "number"
          ? pagination.total
          : typeof json?.meta?.total === "number"
            ? json.meta.total
            : null,
      );
    } catch (e: unknown) {
      setLogs([]);
      setTotal(null);
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [category, days, eventType, level, order, page, query]);

  const loadFacets = useCallback(async () => {
    setFacetsLoading(true);

    const params = new URLSearchParams({
      sampleLimit: "2000",
      startDate: new Date(Date.now() - draftDays * 86400000).toISOString(),
    });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/v1/security/logs/facets?${params}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          json?.error ||
            `Suggestions logs sécurité indisponibles (HTTP ${res.status})`,
        );
      }
      setFacets(json?.data || {});
    } catch {
      setFacets({});
    } finally {
      setFacetsLoading(false);
    }
  }, [draftDays]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    void loadFacets();
  }, [loadFacets]);

  const estimatedTotal =
    total ??
    (page - 1) * PAGE_SIZE +
      logs.length +
      (logs.length === PAGE_SIZE ? PAGE_SIZE : 0);
  const totalPages = Math.max(1, Math.ceil(estimatedTotal / PAGE_SIZE));
  const canGoNext = total ? page < totalPages : logs.length === PAGE_SIZE;
  const startIndex = logs.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIndex = (page - 1) * PAGE_SIZE + logs.length;
  const categorySuggestions = useMemo(
    () =>
      uniqueSortedValues([
        ...facetValues(facets.categories),
        ...logs.map((log) => log.category),
      ]),
    [facets.categories, logs],
  );
  const eventTypeSuggestions = useMemo(
    () =>
      uniqueSortedValues([
        ...facetValues(facets.eventTypes),
        ...logs.map((log) => log.eventType),
      ]),
    [facets.eventTypes, logs],
  );
  const searchSuggestions = useMemo(
    () =>
      uniqueSortedValues(
        [
          ...facetValues(facets.sourceIPs),
          ...facetValues(facets.endpoints),
          ...facetValues(facets.messages),
          ...logs.flatMap((log) => [
            log.sourceIP,
            log.endpoint,
            log.message,
            log.method
              ? `${log.method} ${log.endpoint || ""}`.trim()
              : undefined,
          ]),
        ],
      ).slice(0, 80),
    [facets.endpoints, facets.messages, facets.sourceIPs, logs],
  );
  const hasDraftChanges =
    draftLevel !== level ||
    draftCategory !== category ||
    draftEventType !== eventType ||
    draftQuery !== query ||
    draftOrder !== order ||
    draftDays !== days;
  const activeFilterLabels = [
    level ? `niveau ${formatSecuritySeverity(level)}` : null,
    category ? `catégorie ${category}` : null,
    eventType ? `type ${formatSecurityEventTypeLabel(eventType)}` : null,
    query.trim() ? `recherche "${query.trim()}"` : null,
    `${days} jour${days > 1 ? "s" : ""}`,
  ].filter((label): label is string => Boolean(label));

  const toggleSortOrder = () => {
    setPage(1);
    setOrder((current) => (current === "desc" ? "asc" : "desc"));
    setDraftOrder((current) => (current === "desc" ? "asc" : "desc"));
  };

  const applyFilters = () => {
    setPage(1);
    setLevel(draftLevel);
    setCategory(draftCategory.trim());
    setEventType(draftEventType.trim());
    setQuery(draftQuery.trim());
    setOrder(draftOrder);
    setDays(draftDays);
  };

  const resetFilters = () => {
    setPage(1);
    setDraftLevel("");
    setDraftCategory("");
    setDraftEventType("");
    setDraftQuery("");
    setDraftOrder("desc");
    setDraftDays(14);
    setLevel("");
    setCategory("");
    setEventType("");
    setQuery("");
    setOrder("desc");
    setDays(14);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <SecuritySubNav />

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              <ShieldAlert className="h-8 w-8" />
              Logs sécurité
            </h1>
            <p className="mt-1 max-w-3xl text-gray-600 dark:text-gray-400">
              Événements sécurité persistés par le security-service. Les liens
              depuis Incidents peuvent surligner un log précis via{" "}
              <code className="text-xs">highlight</code>. Tri actuel :{" "}
              {order === "desc"
                ? "plus récent d’abord"
                : "plus ancien d’abord"}
              .
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadLogs()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>

        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Niveau
              <select
                value={draftLevel}
                onChange={(e) => setDraftLevel(e.target.value)}
                className="rounded-lg border px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Tous</option>
                <option value="critical">Critique</option>
                <option value="error">Erreur</option>
                <option value="warning">Avertissement</option>
                <option value="info">Info</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Catégorie
              <input
                list="security-log-category-options"
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                placeholder="auth, firewall, intrusion..."
                className="rounded-lg border px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
              />
              <datalist id="security-log-category-options">
                {categorySuggestions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Type d’événement
              <input
                list="security-log-event-type-options"
                value={draftEventType}
                onChange={(e) => setDraftEventType(e.target.value)}
                placeholder="network_threat_detected"
                className="rounded-lg border px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
              />
              <datalist id="security-log-event-type-options">
                {eventTypeSuggestions.map((option) => (
                  <option
                    key={option}
                    value={option}
                    label={formatSecurityEventTypeLabel(option)}
                  />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Tri
              <select
                value={draftOrder}
                onChange={(e) =>
                  setDraftOrder(e.target.value === "asc" ? "asc" : "desc")
                }
                className="rounded-lg border px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="desc">Plus récent d’abord</option>
                <option value="asc">Plus ancien d’abord</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Fenêtre
              <select
                value={String(draftDays)}
                onChange={(e) => setDraftDays(Number(e.target.value))}
                className="rounded-lg border px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="1">24 h</option>
                <option value="7">7 jours</option>
                <option value="14">14 jours</option>
                <option value="30">30 jours</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Recherche
              <input
                list="security-log-search-options"
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
                placeholder="IP, endpoint, message..."
                className="rounded-lg border px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
              />
              <datalist id="security-log-search-options">
                {searchSuggestions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Appliquer les filtres
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Réinitialiser
            </button>
            {hasDraftChanges && (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Filtres modifiés, pas encore appliqués
              </span>
            )}
            {facetsLoading && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Chargement des suggestions…
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
              Tri Date :{" "}
              {order === "desc" ? "plus récent d’abord" : "plus ancien d’abord"}
            </span>
            {activeFilterLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-700"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          {loading ? (
            <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
              Chargement des logs sécurité…
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Aucun log sécurité pour ces filtres.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="p-3 text-left">Niveau</th>
                    <th className="p-3 text-left">Événement</th>
                    <th className="p-3 text-left">Message</th>
                    <th className="p-3 text-left">Source</th>
                    <th className="p-3 text-left">Endpoint</th>
                    <th className="p-3 text-left">
                      <button
                        type="button"
                        onClick={toggleSortOrder}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-left font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Inverser le tri par date"
                      >
                        Date
                        <span aria-hidden="true">
                          {order === "desc" ? "↓" : "↑"}
                        </span>
                        <span className="sr-only">
                          {order === "desc"
                            ? "plus récent d’abord"
                            : "plus ancien d’abord"}
                        </span>
                      </button>
                    </th>
                    <th className="p-3 text-left">Liens</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const threatId = readMetadataThreatId(log.metadata);
                    const highlighted =
                      highlightId && String(log.id) === highlightId;
                    return (
                      <tr
                        key={log.id}
                        id={`log-${log.id}`}
                        className={`border-b border-gray-100 dark:border-gray-700 ${
                          highlighted
                            ? "bg-amber-50 dark:bg-amber-900/20"
                            : "bg-white dark:bg-gray-800"
                        }`}
                      >
                        <td className="p-3">
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${levelBadgeClass(log.level)}`}
                          >
                            {formatSecuritySeverity(log.level)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {formatSecurityEventTypeLabel(log.eventType)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {log.category || "Catégorie non renseignée"}
                          </div>
                        </td>
                        <td className="max-w-md p-3 text-sm text-gray-700 dark:text-gray-300">
                          {log.message || "Message non renseigné"}
                        </td>
                        <td className="p-3 font-mono text-sm">
                          {log.sourceIP || "Non renseignée"}
                        </td>
                        <td className="p-3 text-sm">
                          {[log.method, log.endpoint]
                            .filter(Boolean)
                            .join(" ") || "Non renseigné"}
                        </td>
                        <td className="p-3 text-sm">
                          {formatLocalDateTime(
                            log.timestamp || log.createdAt || "",
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {threatId ? (
                            <Link
                              href={`/b4ck0ff1ce/security/threats/${encodeURIComponent(threatId)}`}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              Menace liée
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            className="border-t border-gray-200 p-4 dark:border-gray-700"
            currentPage={page}
            totalPages={totalPages}
            totalItems={estimatedTotal}
            itemsPerPage={PAGE_SIZE}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setPage}
            onNext={() => setPage(page + 1)}
            onPrevious={() => setPage(page - 1)}
            canGoNext={canGoNext}
            canGoPrevious={page > 1}
          />
        </div>
      </div>
    </AdminLayout>
  );
}

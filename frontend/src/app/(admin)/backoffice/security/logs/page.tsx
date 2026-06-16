"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SecurityPageShell } from "../SecuritySubNav";
import {
  FacetAutocompleteField,
  FilterBar,
  FilterSelectField,
} from "@/components/filters";
import { Pagination } from "@/components/ui/Pagination";
import { useAppliedFilters } from "@/hooks/useAppliedFilters";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import { FRONTEND_URLS } from "@/config/ports.config";
import { mergeFacetSuggestions } from "@/lib/filters/facetUtils";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import {
  formatSecurityEventTypeLabel,
  formatSecuritySeverity,
  getSecuritySeverityFilterOptions,
  normalizeSecuritySeverity,
} from "@/lib/security/securityLabels";
import {
  fetchSecurityLogFacets,
  type SecurityLogFacets,
} from "@/lib/security/securityLogFacets";
import { resolveSecurityLogLink } from "@/lib/security/securityLogLinks";
import { formatLocalDateTime } from "@/lib/utils/date";
import { RefreshCw, ShieldAlert } from "lucide-react";

const API_URL = FRONTEND_URLS.api;
const PAGE_SIZE = 50;

const WINDOW_OPTIONS = [
  { value: "1", label: "24 h" },
  { value: "7", label: "7 jours" },
  { value: "14", label: "14 jours" },
  { value: "30", label: "30 jours" },
];

const ORDER_OPTIONS = [
  { value: "desc", label: "Plus récent d’abord" },
  { value: "asc", label: "Plus ancien d’abord" },
];

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
  correlatedThreatId?: string | null;
  linkSource?: "metadata" | "correlation" | null;
  linkReason?: string | null;
};

type SecurityLogFilters = {
  level: string;
  category: string;
  eventType: string;
  query: string;
  order: "asc" | "desc";
  days: number;
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

function buildInitialFilters(
  searchParams: URLSearchParams,
): SecurityLogFilters {
  return {
    level: searchParams.get("level") || "",
    category: searchParams.get("category") || "",
    eventType: searchParams.get("eventType") || "",
    query: searchParams.get("q") || "",
    order: searchParams.get("order") === "asc" ? "asc" : "desc",
    days: 14,
  };
}

export default function SecurityLogsPage() {
  useDocumentTitle("Logs sécurité");

  const searchParams = useSearchParams();
  const { page, setPage } = useUrlPagination("page", 1);
  const initialFilters = useMemo(
    () => buildInitialFilters(searchParams),
    [searchParams],
  );
  const {
    applied,
    draft,
    updateDraft,
    apply,
    reset,
    hasDraftChanges,
    setApplied,
    setDraft,
  } = useAppliedFilters<SecurityLogFilters>(initialFilters);

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
      startDate: new Date(Date.now() - applied.days * 86400000).toISOString(),
    });
    if (applied.level) params.set("level", applied.level);
    if (applied.category) params.set("category", applied.category);
    if (applied.eventType) params.set("eventType", applied.eventType);
    if (applied.query.trim()) params.set("q", applied.query.trim());
    params.set("order", applied.order);

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
  }, [applied, page]);

  const loadFacets = useCallback(async () => {
    setFacetsLoading(true);
    try {
      const data = await fetchSecurityLogFacets({ days: draft.days });
      setFacets(data);
    } catch {
      setFacets({});
    } finally {
      setFacetsLoading(false);
    }
  }, [draft.days]);

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
      mergeFacetSuggestions(
        [{ value: "mobile" }],
        mergeFacetSuggestions(facets.categories, logs.map((log) => log.category)),
      ),
    [facets.categories, logs],
  );
  const eventTypeSuggestions = useMemo(
    () =>
      mergeFacetSuggestions(
        facets.eventTypes,
        logs.map((log) => log.eventType),
      ),
    [facets.eventTypes, logs],
  );
  const searchSuggestions = useMemo(
    () =>
      mergeFacetSuggestions(
        [
          ...(facets.sourceIPs || []),
          ...(facets.endpoints || []),
          ...(facets.messages || []),
        ],
        logs.flatMap((log) => [
          log.sourceIP,
          log.endpoint,
          log.message,
          log.method ? `${log.method} ${log.endpoint || ""}`.trim() : undefined,
        ]),
      ),
    [facets.endpoints, facets.messages, facets.sourceIPs, logs],
  );

  const activeBadges = [
    applied.level
      ? {
          key: "level",
          label: `niveau ${formatSecuritySeverity(applied.level)}`,
        }
      : null,
    applied.category
      ? { key: "category", label: `catégorie ${applied.category}` }
      : null,
    applied.eventType
      ? {
          key: "eventType",
          label: `type ${formatSecurityEventTypeLabel(applied.eventType)}`,
        }
      : null,
    applied.query.trim()
      ? { key: "query", label: `recherche "${applied.query.trim()}"` }
      : null,
    {
      key: "days",
      label: `${applied.days} jour${applied.days > 1 ? "s" : ""}`,
    },
  ].filter((badge): badge is { key: string; label: string } => Boolean(badge));

  const toggleSortOrder = () => {
    const nextOrder = applied.order === "desc" ? "asc" : "desc";
    setPage(1);
    setApplied({ ...applied, order: nextOrder });
    setDraft({ ...draft, order: nextOrder });
  };

  const handleApply = () => {
    setPage(1);
    apply();
  };

  const applyMobilePreset = () => {
    setPage(1);
    const next = {
      ...applied,
      category: "mobile",
      eventType: "",
      query: "",
    };
    setApplied(next);
    setDraft(next);
  };

  const handleReset = () => {
    setPage(1);
    reset({
      level: "",
      category: "",
      eventType: "",
      query: "",
      order: "desc",
      days: 14,
    });
  };

  return (
    <SecurityPageShell
      title={
        <span className="flex items-center gap-2">
          <ShieldAlert className="h-7 w-7" />
          Logs sécurité
        </span>
      }
      actions={
        <button
          type="button"
          onClick={() => void loadLogs()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      }
    >
      <div className="space-y-6">
        <FilterBar
          hasDraftChanges={hasDraftChanges}
          facetsLoading={facetsLoading}
          onApply={handleApply}
          onReset={handleReset}
          sortBadge={`Tri Date : ${
            applied.order === "desc"
              ? "plus récent d’abord"
              : "plus ancien d’abord"
          }`}
          badges={activeBadges}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <FilterSelectField
              label="Niveau"
              value={draft.level}
              onChange={(value) => updateDraft("level", value)}
              options={getSecuritySeverityFilterOptions()}
              placeholder="Tous"
            />
            <FacetAutocompleteField
              label="Catégorie"
              value={draft.category}
              onChange={(value) => updateDraft("category", value)}
              suggestions={categorySuggestions}
              loading={facetsLoading}
              placeholder="auth, firewall, intrusion..."
            />
            <FacetAutocompleteField
              label="Type d’événement"
              value={draft.eventType}
              onChange={(value) => updateDraft("eventType", value)}
              suggestions={eventTypeSuggestions}
              loading={facetsLoading}
              placeholder="network_threat_detected"
              formatSuggestion={formatSecurityEventTypeLabel}
            />
            <FilterSelectField
              label="Tri"
              value={draft.order}
              onChange={(value) =>
                updateDraft("order", value === "asc" ? "asc" : "desc")
              }
              options={ORDER_OPTIONS}
              allowEmpty={false}
            />
            <FilterSelectField
              label="Fenêtre"
              value={String(draft.days)}
              onChange={(value) => updateDraft("days", Number(value))}
              options={WINDOW_OPTIONS}
              allowEmpty={false}
            />
            <FacetAutocompleteField
              label="Recherche"
              value={draft.query}
              onChange={(value) => updateDraft("query", value)}
              suggestions={searchSuggestions}
              loading={facetsLoading}
              placeholder="IP, endpoint, message..."
            />
          </div>
        </FilterBar>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyMobilePreset}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              applied.category === "mobile"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            Signaux mobile
          </button>
          {applied.category === "mobile" ? (
            <Link
              href="/backoffice/security/incidents?mobile=1"
              className="rounded-md border border-indigo-200 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-950/40"
            >
              Voir aussi dans Incidents
            </Link>
          ) : null}
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
                          {applied.order === "desc" ? "↓" : "↑"}
                        </span>
                        <span className="sr-only">
                          {applied.order === "desc"
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
                    const link = resolveSecurityLogLink(log);
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
                          {link.href ? (
                            <Link
                              href={link.href}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                              title={link.title}
                            >
                              {link.label}
                            </Link>
                          ) : (
                            <span
                              className="text-xs text-gray-500 dark:text-gray-400"
                              title={link.title}
                            >
                              {link.title}
                            </span>
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
    </SecurityPageShell>
  );
}

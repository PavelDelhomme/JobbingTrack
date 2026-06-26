"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SecurityPageShell } from "../SecuritySubNav";
import {
  FacetAutocompleteField,
  FacetMultiValueField,
  FilterBar,
  FilterMultiSelectField,
} from "@/components/filters";
import { useAppliedFilters } from "@/hooks/useAppliedFilters";
import { facetOptionsFromValues } from "@/lib/filters/facetUtils";
import { parseMultiFilterValues } from "@/lib/filters/multiValueFilter";
import { formatLocalDateTime } from "@/lib/utils/date";
import { FRONTEND_URLS } from "@/config/ports.config";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import {
  type IncidentRow,
  alertHref,
  isIncidentLog,
  isMobileIncidentRow,
  logHref,
  threatHref,
} from "@/lib/security/incidents";
import {
  filterIncidentRows,
  formatIncidentFilterBadges,
} from "@/lib/security/incidentFilters";
import { INCIDENT_KIND_FILTER_OPTIONS } from "@/lib/security/incidentFilterOptions";
import {
  formatSecurityEventTypeLabel,
  formatSecuritySeverity,
  formatThreatTypeLabel,
  getSecuritySeverityFilterOptions,
  normalizeSecuritySeverity,
} from "@/lib/security/securityLabels";
import { SecurityNatureBadge } from "@/components/security/SecurityNatureBadge";
import { TablePanelSkeleton, uiSurfaces, uiText } from "@/lib/ui";
import { AlertTriangle, FlaskConical, RefreshCw } from "lucide-react";
import axios from "axios";

const API_URL = FRONTEND_URLS.api;
const LOGS_WINDOW_DAYS = 14;

type IncidentDetailFilters = {
  kinds: string;
  severity: string;
  eventTypes: string;
  source: string;
  query: string;
};

const DEFAULT_INCIDENT_DETAIL_FILTERS: IncidentDetailFilters = {
  kinds: "",
  severity: "",
  eventTypes: "",
  source: "",
  query: "",
};

function severityClass(severity: string): string {
  const s = normalizeSecuritySeverity(severity);
  if (s === "critical" || s === "error") {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
  }
  if (s === "high" || s === "warning") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  }
  return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
}

function kindLabel(kind: IncidentRow["kind"]): string {
  if (kind === "threat") return "Menace";
  if (kind === "alert") return "Alerte";
  return "Événement";
}

function incidentNatureBadge(item: IncidentRow) {
  if (item.kind === "threat" && item.threatId) {
    return (
      <SecurityNatureBadge
        eventType={item.eventType || "network_threat_detected"}
        blockOrigin={item.blockOrigin}
        showOrigin
      />
    );
  }
  if (item.kind === "event" && item.eventType) {
    return (
      <SecurityNatureBadge
        eventType={item.eventType}
        blockOrigin={item.blockOrigin}
        showOrigin={Boolean(item.blockOrigin)}
      />
    );
  }
  return (
    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {item.kind === "alert" ? "Alerte" : "—"}
    </span>
  );
}

export default function SecurityIncidentsPage() {
  useDocumentTitle("Incidents & menaces");
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [mobileOnly, setMobileOnly] = useState(
    () => searchParams.get("mobile") === "1",
  );
  const { applied, draft, updateDraft, apply, reset, hasDraftChanges } =
    useAppliedFilters<IncidentDetailFilters>(DEFAULT_INCIDENT_DETAIL_FILTERS);
  const [page, setPage] = useState(1);
  const [labBusy, setLabBusy] = useState(false);
  const [labMsg, setLabMsg] = useState<string | null>(null);
  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    const logSince = encodeURIComponent(
      new Date(Date.now() - LOGS_WINDOW_DAYS * 86400000).toISOString(),
    );

    try {
      const [threatsRes, alertsRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/security/firewall/threats?limit=100`, {
          headers,
        }),
        fetch(`${API_URL}/api/v1/security/alerts?limit=80`, { headers }),
        fetch(
          `${API_URL}/api/v1/security/logs?limit=500&startDate=${logSince}`,
          { headers },
        ),
      ]);

      const rows: IncidentRow[] = [];

      if (threatsRes.ok) {
        const json = await threatsRes.json().catch(() => null);
        const threats = json?.data || json?.threats || [];
        if (Array.isArray(threats)) {
          for (const t of threats) {
            const id = String(t.id);
            const meta =
              t.metadata && typeof t.metadata === "object" ? t.metadata : {};
            rows.push({
              id: `threat-${id}`,
              kind: "threat",
              title: formatThreatTypeLabel(t.threatType || "Menace réseau"),
              subtitle:
                String(meta.message || t.description || "") ||
                `Source ${t.sourceIp || "?"}`,
              severity: String(t.severity || "UNKNOWN"),
              source: String(t.sourceIp || "Non renseignée"),
              timestamp: String(
                t.detectedAt || t.createdAt || new Date().toISOString(),
              ),
              href: threatHref(id),
              threatId: id,
              eventType: String(t.threatType || "network_threat_detected"),
              blockOrigin:
                typeof meta.blockOrigin === "string"
                  ? meta.blockOrigin
                  : t.isBlocked || t.blocked
                    ? "automatic_threat"
                    : null,
              blocked: Boolean(t.isBlocked || t.blocked),
            });
          }
        }
      }

      if (alertsRes.ok) {
        const json = await alertsRes.json().catch(() => null);
        const alerts = json?.data || [];
        if (Array.isArray(alerts)) {
          for (const a of alerts) {
            const id = String(a.id);
            rows.push({
              id: `alert-${id}`,
              kind: "alert",
              title: String(a.title || "Alerte sécurité"),
              subtitle: String(a.description || a.category || ""),
              severity: String(a.level || "info").toUpperCase(),
              source: String(a.source || "n/a"),
              timestamp: String(
                a.timestamp || a.createdAt || new Date().toISOString(),
              ),
              href: alertHref(id),
              alertId: id,
            });
          }
        }
      }

      if (logsRes.ok) {
        const json = await logsRes.json().catch(() => null);
        const logs = json?.data || json?.logs || [];
        if (Array.isArray(logs)) {
          const threatIdsFromRows = new Set(
            rows.filter((r) => r.threatId).map((r) => r.threatId as string),
          );
          for (const l of logs) {
            const eventType = String(l.eventType || "");
            const level = String(l.level || "");
            if (!isIncidentLog(eventType, level, String(l.category || "")))
              continue;
            const meta =
              l.metadata && typeof l.metadata === "object" ? l.metadata : {};
            const threatId = meta.threatId ? String(meta.threatId) : null;
            if (
              eventType === "network_threat_detected" &&
              threatId &&
              threatIdsFromRows.has(threatId)
            ) {
              continue;
            }
            const logId = String(l.id);
            rows.push({
              id: `log-${logId}`,
              kind: "event",
              title:
                formatSecurityEventTypeLabel(eventType) ||
                String(l.category || "Événement"),
              subtitle: String(l.message || "").slice(0, 200),
              severity: level.toUpperCase() || "INFO",
              source: String(l.sourceIP || meta.sourceIp || "Non renseignée"),
              timestamp: String(
                l.timestamp || l.createdAt || new Date().toISOString(),
              ),
              href: threatId ? threatHref(threatId) : logHref(logId, eventType),
              threatId: threatId || undefined,
              logId,
              eventType,
              blockOrigin:
                typeof meta.blockOrigin === "string" ? meta.blockOrigin : null,
            });
          }
        }
      }

      rows.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setIncidents(rows);
      setPage(1);
      if (!threatsRes.ok && !alertsRes.ok && !logsRes.ok) {
        setError("Services incidents indisponibles (menaces, alertes, logs).");
      }
    } catch {
      setError("Erreur réseau lors du chargement des incidents.");
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      load();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const createLabThreat = async () => {
    setLabBusy(true);
    setLabMsg(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/api/v1/security/firewall/lab/sample-threat`,
        {
          sourceIp: "198.51.100.42",
          threatType: "BRUTE_FORCE",
          severity: "HIGH",
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const id = res.data?.data?.id;
      setLabMsg(
        id ? `Menace lab créée — ouvrez la fiche menace.` : "Menace lab créée.",
      );
      await load();
    } catch (e: unknown) {
      setLabMsg(
        axios.isAxiosError(e)
          ? e.response?.data?.error || e.message
          : "Échec création menace lab",
      );
    } finally {
      setLabBusy(false);
    }
  };

  const sourceSuggestions = useMemo(
    () => facetOptionsFromValues(incidents.map((row) => row.source)),
    [incidents],
  );

  const filterBadges = useMemo(
    () => formatIncidentFilterBadges(applied),
    [applied],
  );

  const selectedKinds = useMemo(
    () => parseMultiFilterValues(applied.kinds),
    [applied.kinds],
  );

  const filtered = useMemo(() => {
    let rows = filterIncidentRows(incidents, applied);
    if (mobileOnly) {
      rows = rows.filter((row) => isMobileIncidentRow(row));
    }
    return rows;
  }, [incidents, applied, mobileOnly]);

  const applyKindShortcut = (kinds: string) => {
    setPage(1);
    reset({ ...applied, kinds });
  };

  const isKindShortcutActive = (key: "all" | "threat" | "alert" | "event") => {
    if (key === "all") return selectedKinds.length === 0;
    return (
      selectedKinds.length === 1 &&
      selectedKinds[0]?.toLowerCase() === key.toLowerCase()
    );
  };

  const handleApplyFilters = () => {
    setPage(1);
    apply();
  };

  const handleResetFilters = () => {
    setPage(1);
    reset(DEFAULT_INCIDENT_DETAIL_FILTERS);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const counts = useMemo(
    () => ({
      all: incidents.length,
      threat: incidents.filter((i) => i.kind === "threat").length,
      alert: incidents.filter((i) => i.kind === "alert").length,
      event: incidents.filter((i) => i.kind === "event").length,
    }),
    [incidents],
  );

  return (
    <SecurityPageShell
      showIncidentsTabs
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-7 w-7 text-red-600" />
          Incidents & menaces
        </span>
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
          <button
            type="button"
            disabled={labBusy}
            onClick={createLabThreat}
            className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <FlaskConical className="h-4 w-4" />
            Menace lab (test)
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {labMsg && (
          <p className="text-sm rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            {labMsg}
          </p>
        )}
        {error && (
          <p className="text-sm rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", `Tous (${counts.all})`],
              ["threat", `Menaces (${counts.threat})`],
              ["alert", `Alertes (${counts.alert})`],
              ["event", `Événements (${counts.event})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                applyKindShortcut(key === "all" ? "" : key);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                isKindShortcutActive(key)
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <FilterBar
          hasDraftChanges={hasDraftChanges}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          badges={filterBadges}
          toolbarExtra={
            <>
              <button
                type="button"
                onClick={() => {
                  setMobileOnly((prev) => !prev);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  mobileOnly
                    ? "bg-indigo-600 text-white shadow"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                }`}
                aria-pressed={mobileOnly}
              >
                Signaux mobile{mobileOnly ? " · actif" : ""}
              </button>
              {mobileOnly ? (
                <Link
                  href="/backoffice/security/logs?category=mobile"
                  className="rounded-lg border border-indigo-200 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-950/40"
                >
                  Logs mobile
                </Link>
              ) : null}
            </>
          }
        >
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FilterMultiSelectField
              label="Types d'incident"
              value={draft.kinds}
              onChange={(value) => updateDraft("kinds", value)}
              options={[...INCIDENT_KIND_FILTER_OPTIONS]}
              hint="Combiner Menaces, Alertes et Événements."
            />
            <FilterMultiSelectField
              label="Gravité"
              value={draft.severity}
              onChange={(value) => updateDraft("severity", value)}
              options={getSecuritySeverityFilterOptions()}
              hint="Sélection multiple possible."
            />
            <FacetMultiValueField
              label="Nature / type technique"
              value={draft.eventTypes}
              onChange={(value) => updateDraft("eventTypes", value)}
              suggestions={facetOptionsFromValues(
                incidents.flatMap((row) => [
                  row.eventType,
                  row.title,
                ]),
                (value) =>
                  formatThreatTypeLabel(value) ||
                  formatSecurityEventTypeLabel(value) ||
                  value,
              )}
              placeholder="BRUTE_FORCE, sql_injection…"
              formatSuggestion={(value) =>
                formatThreatTypeLabel(value) ||
                formatSecurityEventTypeLabel(value) ||
                value
              }
              hint="Plusieurs types séparés par virgule ou via suggestions."
            />
            <FacetMultiValueField
              label="Source (IP / origine)"
              value={draft.source}
              onChange={(value) => updateDraft("source", value)}
              suggestions={sourceSuggestions}
              placeholder="203.0.113.10, 198.51.100.42…"
              hint="Plusieurs IP ou origines possibles."
            />
            <FacetAutocompleteField
              label="Recherche titre / description"
              value={draft.query}
              onChange={(value) => updateDraft("query", value)}
              suggestions={facetOptionsFromValues(
                incidents.flatMap((row) => [row.title, row.subtitle]),
              )}
              placeholder="Mot-clé dans l'incident…"
            />
          </div>
        </FilterBar>

        {loading ? (
          <TablePanelSkeleton rows={8} columns={6} />
        ) : pageItems.length === 0 ? (
          <div className={uiSurfaces.emptyState}>
            <p>Aucun incident sur les {LOGS_WINDOW_DAYS} derniers jours.</p>
          </div>
        ) : (
          <div className={`${uiSurfaces.tableWrap} overflow-x-auto`}>
            <table className="min-w-[780px] w-full text-sm">
              <thead className={uiSurfaces.tableHead}>
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Nature</th>
                  <th className="p-3">Incident</th>
                  <th className="p-3">Gravité</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Quand</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-red-50/30 dark:hover:bg-red-950/20"
                  >
                    <td className="p-3">
                      <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                        {kindLabel(item.kind)}
                      </span>
                    </td>
                    <td className="p-3">{incidentNatureBadge(item)}</td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {item.title}
                      </div>
                      <p
                        className={`text-xs line-clamp-2 mt-0.5 ${uiText.subtle}`}
                      >
                        {item.subtitle}
                      </p>
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${severityClass(item.severity)}`}
                      >
                        {formatSecuritySeverity(item.severity)}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">{item.source}</td>
                    <td className="p-3 text-xs whitespace-nowrap">
                      {formatLocalDateTime(item.timestamp)}
                    </td>
                    <td className="p-3">
                      <Link
                        href={item.href}
                        className={`${uiText.link} text-xs`}
                      >
                        {item.kind === "threat"
                          ? "Fiche menace"
                          : item.kind === "alert"
                            ? "Détail alerte"
                            : item.threatId
                              ? "Fiche menace"
                              : "Voir événement"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              className={`flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-3 py-2 text-xs ${uiText.subtle}`}
            >
              <span>
                Page {safePage}/{totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-gray-300 px-2 py-1 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-gray-300 px-2 py-1 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SecurityPageShell>
  );
}

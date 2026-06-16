"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SecurityPageShell } from "../SecuritySubNav";
import { FilterBar, FilterSelectField, FacetAutocompleteField } from "@/components/filters";
import { useAppliedFilters } from "@/hooks/useAppliedFilters";
import { formatLocalDateTime } from "@/lib/utils/date";
import { FRONTEND_URLS } from "@/config/ports.config";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
import { TablePanelSkeleton, uiSurfaces, uiText } from "@/lib/ui";
import type { FilterBadge } from "@/lib/filters/types";
import { Download, RefreshCw } from "lucide-react";

const API_URL = FRONTEND_URLS.api;
const WINDOW_DAYS = 7;

type TabId = "audit" | "correlation" | "accounts";

type AuditRow = {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  outcome: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  clientIp?: string | null;
  requestId?: string | null;
};

type ThreatRow = {
  id: string;
  detectedAt: string;
  threatType: string;
  severity: string;
  sourceIp: string;
  destIp?: string | null;
  destPort?: number | null;
  blocked: boolean;
  message?: string | null;
};

type AggregatedRow = {
  id: string;
  timestamp: string;
  level: string;
  serviceName: string;
  message: string;
  requestId?: string | null;
  clientIp?: string | null;
  endpoint?: string | null;
  method?: string | null;
};

type SecurityRow = {
  id: string;
  timestamp: string;
  level: string;
  eventType: string;
  message: string;
  sourceIP?: string | null;
  userId?: string | null;
  endpoint?: string | null;
  requestId?: string | null;
};

type ImpactedAccount = {
  userId?: string | null;
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
  profileSource?: string | null;
  sources: string[];
  clientIps: string[];
  events: number;
  loginFailures: number;
  loginSuccesses: number;
  lastSeenAt?: string | null;
};

type InvestigationFilters = {
  sourceIp: string;
  requestId: string;
  serviceName: string;
  threatType: string;
  action: string;
  outcome: string;
};

const DEFAULT_FILTERS: InvestigationFilters = {
  sourceIp: "",
  requestId: "",
  serviceName: "",
  threatType: "",
  action: "",
  outcome: "",
};

const TABS: { id: TabId; label: string }[] = [
  { id: "audit", label: "Audit B7" },
  { id: "correlation", label: "Menaces & logs" },
  { id: "accounts", label: "Comptes impactés" },
];

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SecurityInvestigationPage() {
  useDocumentTitle("Investigation sécurité");

  const [activeTab, setActiveTab] = useState<TabId>("audit");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportHash, setExportHash] = useState<string | null>(null);
  const [exportAuditRecorded, setExportAuditRecorded] = useState<boolean | null>(
    null,
  );
  const [tableMissing, setTableMissing] = useState({ audit: false, aggregated: false });

  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [threats, setThreats] = useState<ThreatRow[]>([]);
  const [aggregatedLogs, setAggregatedLogs] = useState<AggregatedRow[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityRow[]>([]);
  const [impactedAccounts, setImpactedAccounts] = useState<ImpactedAccount[]>([]);

  const { applied, draft, updateDraft, apply, reset, hasDraftChanges } =
    useAppliedFilters<InvestigationFilters>(DEFAULT_FILTERS);

  const startDate = useMemo(
    () => new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString(),
    [],
  );

  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams({ startDate, limit: "200" });
    if (applied.sourceIp.trim()) params.set("sourceIp", applied.sourceIp.trim());
    if (applied.requestId.trim()) params.set("requestId", applied.requestId.trim());
    if (applied.serviceName.trim()) params.set("serviceName", applied.serviceName.trim());
    if (applied.threatType.trim()) params.set("threatType", applied.threatType.trim());
    return params;
  }, [applied.requestId, applied.serviceName, applied.sourceIp, applied.threatType, startDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildSearchParams();
      const res = await fetch(`${API_URL}/api/v1/security/investigation/search?${params}`, {
        headers: authHeaders(),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || `Investigation indisponible (HTTP ${res.status})`);
      }
      const data = json?.data || {};
      const auditData = Array.isArray(data.auditEvents) ? data.auditEvents : [];
      const filteredAudit =
        applied.action.trim() === "" && applied.outcome.trim() === ""
          ? auditData
          : auditData.filter((row: AuditRow) => {
              if (applied.action && row.action !== applied.action) return false;
              if (
                applied.outcome &&
                String(row.outcome || "").toLowerCase() !== applied.outcome.toLowerCase()
              ) {
                return false;
              }
              return true;
            });

      setAuditRows(filteredAudit);
      setThreats(Array.isArray(data.threats) ? data.threats : []);
      setAggregatedLogs(Array.isArray(data.aggregatedLogs) ? data.aggregatedLogs : []);
      setSecurityLogs(Array.isArray(data.securityLogs) ? data.securityLogs : []);
      setImpactedAccounts(Array.isArray(data.impactedAccounts) ? data.impactedAccounts : []);
      setTableMissing({
        audit: Boolean(data.tableMissing?.audit),
        aggregated: Boolean(data.tableMissing?.aggregated),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement investigation");
      setAuditRows([]);
      setThreats([]);
      setAggregatedLogs([]);
      setSecurityLogs([]);
      setImpactedAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [applied.action, applied.outcome, buildSearchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const postExport = async (sections: string[], format: "json" | "csv") => {
    const body = {
      startDate,
      sourceIp: applied.sourceIp.trim() || undefined,
      requestId: applied.requestId.trim() || undefined,
      serviceName: applied.serviceName.trim() || undefined,
      threatType: applied.threatType.trim() || undefined,
      sections,
      format,
    };
    const res = await fetch(`${API_URL}/api/v1/security/investigation/export`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.message || `Export indisponible (HTTP ${res.status})`);
    }
    if (format === "csv") {
      const csv = await res.text();
      const hash = await sha256Hex(csv);
      setExportHash(hash);
      setExportAuditRecorded(true);
      downloadBlob(csv, `investigation-threats-${Date.now()}.csv`, "text/csv");
      return;
    }
    const json = await res.json();
    setExportAuditRecorded(Boolean(json?.auditRecorded));
    const content = JSON.stringify(json?.data ?? {}, null, 2);
    const hash = await sha256Hex(content);
    setExportHash(hash);
    downloadBlob(content, `investigation-bundle-${Date.now()}.json`, "application/json");
  };

  const handleExportAuditLocal = async () => {
    const bundle = {
      exportedAt: new Date().toISOString(),
      windowDays: WINDOW_DAYS,
      recordCount: auditRows.length,
      records: auditRows,
    };
    const json = JSON.stringify(bundle, null, 2);
    const hash = await sha256Hex(json);
    setExportHash(hash);
    downloadBlob(json, `investigation-audit-${Date.now()}.json`, "application/json");
  };

  const actionOptions = useMemo(() => {
    const values = new Set(auditRows.map((row) => row.action).filter(Boolean));
    return [
      { value: "", label: "Toutes les actions" },
      ...Array.from(values)
        .sort()
        .map((value) => ({ value, label: value })),
    ];
  }, [auditRows]);

  const filterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];
    if (applied.sourceIp.trim()) {
      badges.push({ key: "sourceIp", label: `IP : ${applied.sourceIp.trim()}` });
    }
    if (applied.requestId.trim()) {
      badges.push({ key: "requestId", label: `requestId : ${applied.requestId.trim()}` });
    }
    if (applied.serviceName.trim()) {
      badges.push({ key: "serviceName", label: `Service : ${applied.serviceName.trim()}` });
    }
    if (applied.threatType.trim()) {
      badges.push({ key: "threatType", label: `Type : ${applied.threatType.trim()}` });
    }
    return badges;
  }, [applied.requestId, applied.serviceName, applied.sourceIp, applied.threatType]);

  return (
    <SecurityPageShell
      title="Investigation & audit"
      description="Croisement menaces, logs agrégés, audit B7 et comptes impactés auth (B8). Exports horodatés avec empreinte SHA-256."
    >
      <div className="space-y-6">
        {(tableMissing.audit || tableMissing.aggregated) && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            {tableMissing.audit && "Table `audit_logs` absente — migration Prisma requise. "}
            {tableMissing.aggregated && "Table `aggregated_logs` absente — corrélation gateway limitée."}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </p>
        )}
        {exportHash && (
          <p className={`text-xs ${uiText.subtle}`}>
            Dernier export — SHA-256 :{" "}
            <span className="font-mono break-all">{exportHash}</span>
            {exportAuditRecorded != null && (
              <span className="ml-2">
                · audit `security_export` : {exportAuditRecorded ? "enregistré" : "non enregistré"}
              </span>
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => void handleExportAuditLocal()}
            disabled={auditRows.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600"
          >
            <Download className="h-4 w-4" />
            Export audit local
          </button>
          <button
            type="button"
            onClick={() => void postExport(["threats"], "csv").catch((e) => setError(String(e.message)))}
            disabled={threats.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export menaces CSV (B7)
          </button>
          <button
            type="button"
            onClick={() =>
              void postExport(
                ["audit", "threats", "aggregated", "security", "impactedAccounts"],
                "json",
              ).catch((e) => setError(String(e.message)))
            }
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm text-white"
          >
            <Download className="h-4 w-4" />
            Export bundle complet
          </button>
          <Link
            href="/backoffice/performances/correlation"
            className={`${uiText.link} text-sm self-center`}
          >
            Corrélation technique →
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                activeTab === tab.id
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <FilterBar
          hasDraftChanges={hasDraftChanges}
          onApply={apply}
          onReset={reset}
          badges={filterBadges}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FacetAutocompleteField
              label="IP source"
              value={draft.sourceIp}
              onChange={(value) => updateDraft("sourceIp", value)}
              suggestions={[]}
              placeholder="203.0.113.10"
            />
            <FacetAutocompleteField
              label="RequestId"
              value={draft.requestId}
              onChange={(value) => updateDraft("requestId", value)}
              suggestions={[]}
              placeholder="req-…"
            />
            <FacetAutocompleteField
              label="Service"
              value={draft.serviceName}
              onChange={(value) => updateDraft("serviceName", value)}
              suggestions={[]}
              placeholder="api-gateway"
            />
            <FacetAutocompleteField
              label="Type menace"
              value={draft.threatType}
              onChange={(value) => updateDraft("threatType", value)}
              suggestions={[]}
              placeholder="DDOS, WAF…"
            />
            {activeTab === "audit" && (
              <>
                <FilterSelectField
                  label="Action audit"
                  value={draft.action}
                  onChange={(value) => updateDraft("action", value)}
                  options={actionOptions}
                />
                <FilterSelectField
                  label="Résultat"
                  value={draft.outcome}
                  onChange={(value) => updateDraft("outcome", value)}
                  options={[
                    { value: "", label: "Tous" },
                    { value: "success", label: "Succès" },
                    { value: "failure", label: "Échec" },
                  ]}
                />
              </>
            )}
          </div>
        </FilterBar>

        {loading ? (
          <TablePanelSkeleton rows={8} columns={6} />
        ) : activeTab === "audit" ? (
          auditRows.length === 0 ? (
            <div className={uiSurfaces.emptyState}>
              <p>Aucun événement d’audit sur les {WINDOW_DAYS} derniers jours.</p>
            </div>
          ) : (
            <div className={`${uiSurfaces.tableWrap} overflow-x-auto`}>
              <table className="min-w-[900px] w-full text-sm">
                <thead className={uiSurfaces.tableHead}>
                  <tr>
                    <th className="p-3 text-left">Quand</th>
                    <th className="p-3 text-left">Action</th>
                    <th className="p-3 text-left">Ressource</th>
                    <th className="p-3 text-left">Acteur</th>
                    <th className="p-3 text-left">IP</th>
                    <th className="p-3 text-left">RequestId</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-gray-200 dark:border-gray-700"
                    >
                      <td className="p-3 whitespace-nowrap text-xs">
                        {formatLocalDateTime(row.timestamp)}
                      </td>
                      <td className="p-3 font-mono text-xs">{row.action}</td>
                      <td className="p-3 text-xs">
                        {row.resource}
                        {row.resourceId ? ` / ${row.resourceId}` : ""}
                        <div className="text-xs text-gray-500">{row.outcome}</div>
                      </td>
                      <td className="p-3 text-xs">
                        {row.actorEmail || row.actorRole || "—"}
                      </td>
                      <td className="p-3 font-mono text-xs">{row.clientIp || "—"}</td>
                      <td className="p-3 font-mono text-xs">
                        {row.requestId ? (
                          <Link
                            href={`/backoffice/performances/correlation?requestId=${encodeURIComponent(row.requestId)}`}
                            className={uiText.link}
                          >
                            {row.requestId}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === "correlation" ? (
          <div className="space-y-6">
            <section>
              <h3 className="mb-2 text-sm font-semibold">Menaces ({threats.length})</h3>
              {threats.length === 0 ? (
                <div className={uiSurfaces.emptyState}>
                  <p>Aucune menace sur la fenêtre filtrée.</p>
                </div>
              ) : (
                <div className={`${uiSurfaces.tableWrap} overflow-x-auto`}>
                  <table className="min-w-[800px] w-full text-sm">
                    <thead className={uiSurfaces.tableHead}>
                      <tr>
                        <th className="p-3 text-left">Détectée</th>
                        <th className="p-3 text-left">Type</th>
                        <th className="p-3 text-left">Sévérité</th>
                        <th className="p-3 text-left">IP source</th>
                        <th className="p-3 text-left">Bloquée</th>
                        <th className="p-3 text-left">Fiche</th>
                      </tr>
                    </thead>
                    <tbody>
                      {threats.map((row) => (
                        <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="p-3 text-xs whitespace-nowrap">
                            {formatLocalDateTime(row.detectedAt)}
                          </td>
                          <td className="p-3 font-mono text-xs">{row.threatType}</td>
                          <td className="p-3 text-xs">{row.severity}</td>
                          <td className="p-3 font-mono text-xs">{row.sourceIp}</td>
                          <td className="p-3 text-xs">{row.blocked ? "Oui" : "Non"}</td>
                          <td className="p-3 text-xs">
                            <Link href={`/backoffice/security/threats/${row.id}`} className={uiText.link}>
                              Ouvrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">
                Logs agrégés gateway ({aggregatedLogs.length})
              </h3>
              {aggregatedLogs.length === 0 ? (
                <div className={uiSurfaces.emptyState}>
                  <p>Aucun log agrégé corrélé — vérifier requestId ou IP.</p>
                </div>
              ) : (
                <div className={`${uiSurfaces.tableWrap} overflow-x-auto`}>
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className={uiSurfaces.tableHead}>
                      <tr>
                        <th className="p-3 text-left">Quand</th>
                        <th className="p-3 text-left">Service</th>
                        <th className="p-3 text-left">Niveau</th>
                        <th className="p-3 text-left">RequestId</th>
                        <th className="p-3 text-left">Endpoint</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedLogs.map((row) => (
                        <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="p-3 text-xs whitespace-nowrap">
                            {formatLocalDateTime(row.timestamp)}
                          </td>
                          <td className="p-3 text-xs">{row.serviceName}</td>
                          <td className="p-3 text-xs">{row.level}</td>
                          <td className="p-3 font-mono text-xs">
                            {row.requestId ? (
                              <Link
                                href={`/backoffice/performances/correlation?requestId=${encodeURIComponent(row.requestId)}`}
                                className={uiText.link}
                              >
                                {row.requestId}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 text-xs">
                            {row.method ? `${row.method} ` : ""}
                            {row.endpoint || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">
                Logs sécurité ({securityLogs.length})
              </h3>
              {securityLogs.length === 0 ? (
                <div className={uiSurfaces.emptyState}>
                  <p>Aucun log sécurité corrélé.</p>
                </div>
              ) : (
                <div className={`${uiSurfaces.tableWrap} overflow-x-auto`}>
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className={uiSurfaces.tableHead}>
                      <tr>
                        <th className="p-3 text-left">Quand</th>
                        <th className="p-3 text-left">Type</th>
                        <th className="p-3 text-left">IP</th>
                        <th className="p-3 text-left">UserId</th>
                        <th className="p-3 text-left">RequestId</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityLogs.map((row) => (
                        <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="p-3 text-xs whitespace-nowrap">
                            {formatLocalDateTime(row.timestamp)}
                          </td>
                          <td className="p-3 font-mono text-xs">{row.eventType}</td>
                          <td className="p-3 font-mono text-xs">{row.sourceIP || "—"}</td>
                          <td className="p-3 font-mono text-xs">{row.userId || "—"}</td>
                          <td className="p-3 font-mono text-xs">
                            {row.requestId ? (
                              <Link
                                href={`/backoffice/security/logs?requestId=${encodeURIComponent(row.requestId)}`}
                                className={uiText.link}
                              >
                                {row.requestId}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : impactedAccounts.length === 0 ? (
          <div className={uiSurfaces.emptyState}>
            <p>
              Aucun compte impacté corrélé (audit auth, logs sécurité ou agrégés avec userId).
            </p>
          </div>
        ) : (
          <div className={`${uiSurfaces.tableWrap} overflow-x-auto`}>
            <table className="min-w-[900px] w-full text-sm">
              <thead className={uiSurfaces.tableHead}>
                <tr>
                  <th className="p-3 text-left">Dernière activité</th>
                  <th className="p-3 text-left">Email / compte</th>
                  <th className="p-3 text-left">Rôle</th>
                  <th className="p-3 text-left">Sources</th>
                  <th className="p-3 text-left">IPs</th>
                  <th className="p-3 text-left">Échecs login</th>
                  <th className="p-3 text-left">Succès login</th>
                </tr>
              </thead>
              <tbody>
                {impactedAccounts.map((row, index) => (
                  <tr
                    key={`${row.userId || row.email || index}`}
                    className="border-t border-gray-200 dark:border-gray-700"
                  >
                    <td className="p-3 text-xs whitespace-nowrap">
                      {row.lastSeenAt ? formatLocalDateTime(row.lastSeenAt) : "—"}
                    </td>
                    <td className="p-3 text-xs">
                      {row.displayName || row.email || "—"}
                      {row.email && row.displayName ? (
                        <div className="text-xs text-gray-500">{row.email}</div>
                      ) : null}
                      {row.userId ? (
                        <div className="font-mono text-xs text-gray-500">{row.userId}</div>
                      ) : null}
                    </td>
                    <td className="p-3 text-xs">{row.role || "—"}</td>
                    <td className="p-3 text-xs">{row.sources.join(", ")}</td>
                    <td className="p-3 font-mono text-xs">
                      {row.clientIps.length > 0 ? row.clientIps.join(", ") : "—"}
                    </td>
                    <td className="p-3 text-xs">{row.loginFailures}</td>
                    <td className="p-3 text-xs">{row.loginSuccesses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SecurityPageShell>
  );
}

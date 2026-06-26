"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pagination } from "@/components/ui/Pagination";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { formatLocalDateTime } from "@/lib/utils/date";
import {
  formatConnectionConfidence,
  formatReputationBadges,
  logsLinkForSourceIp,
  resolveConnectionPresentation,
  threatLinkForSourceIp,
  type ConnectionSourcePresentation,
  type IpEnrichmentHints,
} from "@/lib/security/connectionSourcePresentation";

type NetworkConnectionSourceTableProps = {
  connections: ConnectionSourcePresentation[];
  showObservedAt?: boolean;
  enrichmentByIp?: Record<string, IpEnrichmentHints>;
  emptyMessage?: string;
  searchable?: boolean;
  pageSize?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
};

function confidenceClass(confidence?: string): string {
  if (confidence === "high") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
  }
  if (confidence === "medium") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function matchesQuery(row: ConnectionSourcePresentation, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const resolved = resolveConnectionPresentation(row);
  const haystack = [
    resolved.source?.ip,
    resolved.source?.label,
    resolved.destination?.label,
    resolved.serviceLabel,
    resolved.protocol,
    resolved.state,
    String(resolved.localPort ?? ""),
    String(resolved.remotePort ?? ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function NetworkConnectionSourceTable({
  connections,
  showObservedAt = false,
  enrichmentByIp = {},
  emptyMessage = "Aucune connexion à afficher",
  searchable = true,
  pageSize = 15,
  onRefresh,
  refreshing = false,
}: NetworkConnectionSourceTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => connections.filter((row) => matchesQuery(row, query)),
    [connections, query],
  );

  const pagination = useClientPagination(filtered, pageSize);

  if (connections.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {(searchable || onRefresh) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {searchable ? (
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                pagination.resetPage();
              }}
              placeholder="Rechercher IP, port, protocole, destination…"
              className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {connections.length} connexion(s)
            </span>
          )}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              {refreshing ? "Actualisation…" : "Actualiser"}
            </button>
          ) : null}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Aucun résultat pour « {query} ».
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {showObservedAt && <th className="p-3 text-left">Observé</th>}
                  <th className="p-3 text-left">Source</th>
                  <th className="p-3 text-left">Nature</th>
                  <th className="p-3 text-left">Destination</th>
                  <th className="p-3 text-left">Ports</th>
                  <th className="p-3 text-left">Protocole</th>
                  <th className="p-3 text-left">État</th>
                  <th className="p-3 text-left">Confiance</th>
                  <th className="p-3 text-left">Réputation</th>
                  <th className="p-3 text-left">Liens</th>
                </tr>
              </thead>
              <tbody>
                {pagination.slice.map((raw, index) => {
                  const row = resolveConnectionPresentation(raw);
                  const sourceIp = row.source?.ip || row.remoteIp;
                  const enrichment = sourceIp ? enrichmentByIp[sourceIp] : undefined;
                  const reputation = formatReputationBadges(enrichment);
                  const threatHref = threatLinkForSourceIp(sourceIp);
                  const logsHref = logsLinkForSourceIp(sourceIp);

                  return (
                    <tr
                      key={`${sourceIp || "na"}-${row.localPort || 0}-${row.remotePort || 0}-${index}`}
                      className="border-b border-gray-200 dark:border-gray-700"
                    >
                      {showObservedAt && (
                        <td className="p-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                          {row.observedAt
                            ? formatLocalDateTime(row.observedAt)
                            : "—"}
                        </td>
                      )}
                      <td className="p-3 font-mono text-xs">{sourceIp || "—"}</td>
                      <td className="p-3">{row.source?.label || "—"}</td>
                      <td className="p-3">
                        {row.destination?.label || row.serviceLabel || "—"}
                      </td>
                      <td className="p-3 font-mono text-xs">
                        {row.localPort ?? "—"} ← {row.remotePort ?? "—"}
                      </td>
                      <td className="p-3">{row.protocol || "—"}</td>
                      <td className="p-3">
                        {row.state ? (
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700">
                            {row.state}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded px-2 py-1 text-xs ${confidenceClass(row.source?.confidence)}`}
                        >
                          {formatConnectionConfidence(row.source?.confidence)}
                        </span>
                      </td>
                      <td className="p-3">
                        {reputation.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {reputation.map((badge) => (
                              <span
                                key={badge}
                                className="rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-800 dark:bg-violet-900/30 dark:text-violet-200"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        ) : enrichment?.enrichmentSource ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {enrichment.enrichmentSource}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Non sourcé
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          {threatHref ? (
                            <Link
                              href={threatHref}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              Menaces
                            </Link>
                          ) : null}
                          {logsHref ? (
                            <Link
                              href={logsHref}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              Logs
                            </Link>
                          ) : null}
                          {!threatHref && !logsHref ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {sourceIp
                                ? /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|::1)/.test(
                                    sourceIp,
                                  )
                                  ? "IP interne — pas de menace publique"
                                  : "Aucun lien corrélé"
                                : "IP source absente"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.pageSize}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            onPageChange={pagination.goToPage}
            onNext={pagination.goNext}
            onPrevious={pagination.goPrevious}
            canGoNext={pagination.canGoNext}
            canGoPrevious={pagination.canGoPrevious}
          />
        </>
      )}
    </div>
  );
}

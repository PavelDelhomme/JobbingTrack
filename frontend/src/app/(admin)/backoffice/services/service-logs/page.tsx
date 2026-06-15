"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ServicesPageShell } from "../ServicesSubNav";
import {
  FacetAutocompleteField,
  FilterBar,
  FilterSelectField,
} from "@/components/filters";
import { useAppliedFilters } from "@/hooks/useAppliedFilters";
import { mergeFacetSuggestions } from "@/lib/filters/facetUtils";
import type { FilterBadge } from "@/lib/filters/types";
import {
  filterServiceLogLines,
  type ServiceLogsFilters,
} from "@/lib/filters/serviceLogFilters";
import {
  SERVICE_LOG_KIND_OPTIONS,
  SERVICE_LOG_LEVEL_OPTIONS,
  SERVICE_LOGS_LINES_OPTIONS,
  SERVICE_LOGS_SINCE_OPTIONS,
} from "@/lib/filters/serviceLogsOptions";
import { centralMetricsService } from "@/lib/services/centralMetricsService";
import { SectionLoader, uiText } from "@/lib/ui";
import { RefreshCw, Terminal } from "lucide-react";

const METRICS_URL =
  process.env.NEXT_PUBLIC_METRICS_URL || "http://localhost:5004";

function buildInitialFilters(serviceParam: string | null): ServiceLogsFilters {
  return {
    service: serviceParam || "",
    lines: 200,
    since: "",
    level: "all",
    kind: "all",
    query: "",
  };
}

function serviceLogLineClass(message: string): string {
  const m = message.toLowerCase();
  if (/\berror\b|\bexception\b|\bfatal\b/i.test(m)) {
    return "text-red-400 font-semibold break-words";
  }
  if (/\bwarn(ing)?\b/.test(m)) {
    return "text-amber-300/95 break-words";
  }
  return "text-emerald-300/90 break-words";
}

export default function ServiceLogsPage() {
  const searchParams = useSearchParams();
  const initialService = searchParams.get("service");
  const initialFilters = useMemo(
    () => buildInitialFilters(initialService),
    [initialService],
  );
  const { applied, draft, updateDraft, apply, reset, hasDraftChanges } =
    useAppliedFilters<ServiceLogsFilters>(initialFilters);
  const [serviceOptions, setServiceOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ total?: number; errors?: number } | null>(
    null,
  );

  const loadServiceOptions = useCallback(async () => {
    try {
      const res = await fetch(`${METRICS_URL}/api/v1/docker/services/all`);
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data?.services) ? data.services : [];
      const options = list
        .map((service: { name?: string }) => {
          const name = String(service.name || "").replace(/^jobbingtrack-/, "");
          return name ? { value: name, label: name } : null;
        })
        .filter(Boolean) as Array<{ value: string; label: string }>;
      setServiceOptions(options.sort((a, b) => a.label.localeCompare(b.label)));
    } catch {
      setServiceOptions([]);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    if (!applied.service.trim()) {
      setRawLines([]);
      setMeta(null);
      setError("Sélectionnez un service puis appliquez les filtres.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await centralMetricsService.getServiceLogs(applied.service, {
        lines: applied.lines,
        since: applied.since || null,
      });
      const lines = Array.isArray(data?.lines) ? data.lines : [];
      setRawLines(lines);
      setMeta({
        total: data?.total ?? lines.length,
        errors: data?.errors ?? 0,
      });
    } catch {
      setError("Impossible de charger les logs du service.");
      setRawLines([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [applied.lines, applied.service, applied.since]);

  useEffect(() => {
    void loadServiceOptions();
  }, [loadServiceOptions]);

  useEffect(() => {
    if (applied.service.trim()) {
      void loadLogs();
    }
  }, [applied.service, applied.lines, applied.since, loadLogs]);

  const displayLines = useMemo(
    () =>
      filterServiceLogLines(rawLines, {
        level: applied.level,
        kind: applied.kind,
        query: applied.query,
      }),
    [rawLines, applied.level, applied.kind, applied.query],
  );

  const querySuggestions = useMemo(
    () => mergeFacetSuggestions(undefined, rawLines, 80),
    [rawLines],
  );

  const filterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];
    if (applied.service) {
      badges.push({ key: "service", label: `Service : ${applied.service}` });
    }
    if (applied.since) {
      const label =
        SERVICE_LOGS_SINCE_OPTIONS.find((o) => o.value === applied.since)
          ?.label || applied.since;
      badges.push({ key: "since", label: `Fenêtre : ${label}` });
    }
    badges.push({ key: "lines", label: `${applied.lines} lignes` });
    if (applied.level !== "all") {
      const label =
        SERVICE_LOG_LEVEL_OPTIONS.find((o) => o.value === applied.level)
          ?.label || applied.level;
      badges.push({ key: "level", label: `Niveau : ${label}` });
    }
    if (applied.kind !== "all") {
      const label =
        SERVICE_LOG_KIND_OPTIONS.find((o) => o.value === applied.kind)?.label ||
        applied.kind;
      badges.push({ key: "kind", label: `Type : ${label}` });
    }
    if (applied.query.trim()) {
      badges.push({
        key: "query",
        label: `Recherche : ${applied.query.trim()}`,
      });
    }
    return badges;
  }, [applied]);

  return (
    <ServicesPageShell
      title={
        <span className="flex items-center gap-2">
          <Terminal className="h-7 w-7" />
          Logs des services
        </span>
      }
      description={
        <>
          Lecture Docker via metrics-aggregator. Les filtres
          niveau/type/recherche s&apos;appliquent côté client sur
          l&apos;échantillon chargé ; la période et le nombre de lignes
          rechargent l&apos;API à l&apos;application.
        </>
      }
      backHref="/b4ck0ff1ce/services"
      backLabel="Services"
      actions={
        <button
          type="button"
          onClick={() => void loadLogs()}
          disabled={loading || !applied.service}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      }
    >
      <div className="space-y-6">
        <FilterBar
          hasDraftChanges={hasDraftChanges}
          onApply={() => apply()}
          onReset={() => reset(buildInitialFilters(null))}
          badges={filterBadges}
        >
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FilterSelectField
              label="Service"
              value={draft.service}
              onChange={(value) => updateDraft("service", value)}
              options={serviceOptions}
              placeholder="Choisir un service"
            />
            <FilterSelectField
              label="Fenêtre temporelle"
              value={draft.since}
              onChange={(value) => updateDraft("since", value)}
              options={[...SERVICE_LOGS_SINCE_OPTIONS]}
            />
            <FilterSelectField
              label="Nombre de lignes"
              value={String(draft.lines)}
              onChange={(value) => updateDraft("lines", Number(value) || 200)}
              options={SERVICE_LOGS_LINES_OPTIONS.map((lines) => ({
                value: String(lines),
                label: `${lines} lignes`,
              }))}
              allowEmpty={false}
              placeholder="Lignes"
            />
            <FilterSelectField
              label="Niveau"
              value={draft.level}
              onChange={(value) =>
                updateDraft("level", value as ServiceLogsFilters["level"])
              }
              options={[...SERVICE_LOG_LEVEL_OPTIONS]}
              allowEmpty={false}
              placeholder="Niveau"
            />
            <FilterSelectField
              label="Type de ligne"
              value={draft.kind}
              onChange={(value) =>
                updateDraft("kind", value as ServiceLogsFilters["kind"])
              }
              options={[...SERVICE_LOG_KIND_OPTIONS]}
              allowEmpty={false}
              placeholder="Type"
            />
            <FacetAutocompleteField
              label="Recherche dans les lignes"
              value={draft.query}
              onChange={(value) => updateDraft("query", value)}
              suggestions={querySuggestions}
              placeholder="Mot-clé, endpoint, erreur…"
            />
          </div>
        </FilterBar>

        {loading ? (
          <SectionLoader message="Chargement des logs Docker…" />
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : !applied.service ? (
          <p className={`text-sm ${uiText.subtle}`}>
            Choisissez un service et cliquez sur « Appliquer les filtres ».
          </p>
        ) : displayLines.length === 0 ? (
          <p className={`text-sm ${uiText.subtle}`}>
            Aucune ligne pour ces filtres ({rawLines.length} ligne(s) brute(s)
            chargée(s)).
          </p>
        ) : (
          <div className="rounded-lg border border-gray-700 bg-gray-950 p-4 font-mono text-xs">
            <p className="mb-3 text-gray-400">
              {displayLines.length} / {rawLines.length} lignes affichées
              {meta?.total != null ? ` · total API ${meta.total}` : ""}
              {meta?.errors ? ` · ${meta.errors} erreurs détectées` : ""}
            </p>
            <div className="max-h-[32rem] space-y-0.5 overflow-y-auto">
              {displayLines.map((line, index) => (
                <div
                  key={`${index}-${line.slice(0, 24)}`}
                  className={serviceLogLineClass(line)}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ServicesPageShell>
  );
}

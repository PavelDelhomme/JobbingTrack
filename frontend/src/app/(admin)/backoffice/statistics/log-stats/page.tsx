"use client";

/**
 * Route **log-stats** (et non `…/logs`) : le motif `logs/` est dans le `.gitignore` du dépôt.
 * URL canonique : `/backoffice/statistics/log-stats`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FilterBar, FilterMultiSelectField, FacetMultiValueField } from "@/components/filters";
import {
  StatisticsPageShell,
  StatisticsRefreshButton,
} from "../StatisticsSubNav";
import { ChartPeriodCaption } from "@/components/analytics/ChartPeriodCaption";
import { chartXDomainFromDataRange } from "@/lib/charts/chartTimeDomain";
import { formatLocalChartAxisTick, formatLocalDateTime } from "@/lib/utils/date";
import { useAppliedFilters } from "@/hooks/useAppliedFilters";
import { analyticsService } from "@/lib/api/analytics.service";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";
import { STATS_PERIOD_OPTIONS } from "@/lib/filters/periodOptions";
import type { FilterBadge } from "@/lib/filters/types";
import {
  buildLogStatsLevelOptions,
  buildLogStatsServiceOptions,
  filterLogStatsRows,
  resolveLogStatsApiFilters,
} from "@/lib/metrics/logStatsFilters";
import {
  buildLogStatsTimelineRows,
  logStatsSampleRangeLabel,
} from "@/lib/metrics/logStatsTimeSeries";
import { logLevelChipTone } from "@/lib/metrics/logLevelChipTone";
import { parseMultiFilterValues } from "@/lib/filters/multiValueFilter";
import {
  DashboardLayoutRegion,
  SectionLoader,
  uiEmpty,
  uiText,
} from "@/lib/ui";

type AggLog = {
  level?: string | null;
  serviceName?: string | null;
  timestamp?: string | Date;
  message?: string | null;
};

type PersistenceStats = {
  counts?: Record<string, number>;
  dataRange?: {
    oldest?: string | null;
    newest?: string | null;
  };
};

type SourceStatus = "active" | "historical" | "planned";

type LogStatsFilters = {
  periodDays: number;
  level: string;
  service: string;
};

const DEFAULT_LOG_STATS_FILTERS: LogStatsFilters = {
  periodDays: 14,
  level: "",
  service: "",
};

const COUNT_CARDS: Array<{
  key: string;
  label: string;
  hint: string;
  status: SourceStatus;
  emptyLabel?: string;
}> = [
  {
    key: "aggregatedLogs",
    label: "Logs applicatifs",
    hint: "aggregated_logs",
    status: "active",
  },
  {
    key: "logCollectorLogs",
    label: "Logs Docker Rust",
    hint: "log_collector_logs",
    status: "active",
  },
  {
    key: "containerLogs",
    label: "Logs conteneurs historiques",
    hint: "container_logs",
    status: "historical",
  },
  {
    key: "systemMetrics",
    label: "Métriques système",
    hint: "system_metrics + snapshots",
    status: "active",
  },
  {
    key: "containerMetrics",
    label: "Métriques conteneurs",
    hint: "container_metrics + snapshots",
    status: "active",
  },
  {
    key: "serviceAvailability",
    label: "Disponibilité services",
    hint: "service_availability_history",
    status: "active",
  },
  {
    key: "securityMetrics",
    label: "Métriques sécurité",
    hint: "security_metrics",
    status: "active",
  },
  {
    key: "securityLogs",
    label: "Logs sécurité (BDD)",
    hint: "security_logs — rétention : SECURITY_LOGS_RETENTION.md",
    status: "active",
  },
  {
    key: "events",
    label: "Événements système",
    hint: "system_events",
    status: "active",
  },
  {
    key: "serviceNetwork",
    label: "Réseau services",
    hint: "service_network_history",
    status: "active",
  },
];

const numberFormatter = new Intl.NumberFormat("fr-FR");

function sourceStatusLabel(status: SourceStatus, value: number) {
  if (value > 0) return status === "historical" ? "Historique alimenté" : "OK";
  if (status === "planned") return "À brancher";
  if (status === "historical") return "Historique vide";
  return "À investiguer";
}

function sourceStatusClass(status: SourceStatus, value: number) {
  if (value > 0) {
    return status === "historical"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200";
  }
  if (status === "planned") {
    return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200";
  }
  if (status === "historical") {
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200";
}

export default function StatisticsLogStatsPage() {
  const [stats, setStats] = useState<PersistenceStats | null>(null);
  const [logs, setLogs] = useState<AggLog[]>([]);
  const [optionLogs, setOptionLogs] = useState<AggLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { applied, draft, updateDraft, apply, reset, hasDraftChanges } =
    useAppliedFilters<LogStatsFilters>(DEFAULT_LOG_STATS_FILTERS);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date(
        Date.now() - applied.periodDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      const apiFilters = resolveLogStatsApiFilters(applied);
      const [st, rows, optionRows] = await Promise.all([
        analyticsService.getPersistenceStats(),
        analyticsService.getPersistenceLogs({
          limit: 800,
          startDate: since,
          level: apiFilters.level,
          serviceName: apiFilters.serviceName,
          serviceNames: apiFilters.serviceNames,
        }),
        analyticsService.getPersistenceLogs({
          limit: 800,
          startDate: since,
        }),
      ]);
      setStats(st && typeof st === "object" ? st : null);
      setLogs(Array.isArray(rows) ? (rows as AggLog[]) : []);
      setOptionLogs(Array.isArray(optionRows) ? (optionRows as AggLog[]) : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [applied.level, applied.periodDays, applied.service]);

  useEffect(() => {
    void load();
  }, [load]);

  const levelOptions = useMemo(() => {
    return buildLogStatsLevelOptions(optionLogs.length > 0 ? optionLogs : logs);
  }, [logs, optionLogs]);

  const serviceOptions = useMemo(() => {
    return buildLogStatsServiceOptions(
      optionLogs.length > 0 ? optionLogs : logs,
    );
  }, [logs, optionLogs]);

  const filterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];
    const periodLabel =
      STATS_PERIOD_OPTIONS.find((p) => p.value === applied.periodDays)?.label ||
      `${applied.periodDays} jours`;
    badges.push({ key: "period", label: `Période : ${periodLabel}` });
    if (applied.level) {
      const levels = parseMultiFilterValues(applied.level);
      badges.push({
        key: "level",
        label: `Niveau : ${levels.join(", ")}`,
      });
    }
    if (applied.service) {
      const services = parseMultiFilterValues(applied.service);
      badges.push({
        key: "service",
        label: `Service : ${services.join(", ")}`,
      });
    }
    return badges;
  }, [applied]);

  const filteredLogs = useMemo(() => {
    return filterLogStatsRows(logs, applied);
  }, [logs, applied.level, applied.service]);

  const sampleRangeLabel = useMemo(() => {
    return (
      logStatsSampleRangeLabel(filteredLogs, applied.periodDays) ||
      STATS_PERIOD_OPTIONS.find((p) => p.value === applied.periodDays)?.label ||
      `${applied.periodDays} jours`
    );
  }, [applied.periodDays, filteredLogs]);

  const timelineRows = useMemo(() => {
    return buildLogStatsTimelineRows(filteredLogs, applied.periodDays, 80);
  }, [applied.periodDays, filteredLogs]);

  const [chartXMin, chartXMax] = useMemo(() => {
    const now = Date.now();
    const rangeStart = now - applied.periodDays * 24 * 60 * 60 * 1000;
    return chartXDomainFromDataRange(
      rangeStart,
      now,
      timelineRows.map((row) => row.timeMs),
    );
  }, [applied.periodDays, timelineRows]);

  const axisShowDate = chartXMax - chartXMin > 24 * 60 * 60 * 1000;

  const byLevel = useMemo(() => {
    const m: Record<string, number> = {};
    for (const row of filteredLogs) {
      const lv = (row.level || "inconnu").toString();
      m[lv] = (m[lv] || 0) + 1;
    }
    return Object.entries(m)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLogs]);

  const byService = useMemo(() => {
    const m: Record<string, number> = {};
    for (const row of filteredLogs) {
      const s = (row.serviceName || "—").toString();
      m[s] = (m[s] || 0) + 1;
    }
    return Object.entries(m)
      .map(([name, count]) => ({
        name: name.length > 28 ? `${name.slice(0, 28)}…` : name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [filteredLogs]);

  const counts = stats?.counts;
  const cards = COUNT_CARDS.map((card) => ({
    ...card,
    value: counts?.[card.key] ?? 0,
  }));
  const dataRange = stats?.dataRange;

  return (
    <StatisticsPageShell
      title="Statistiques — Logs persistés"
      description={
        <>
          Sources persistées lues via{" "}
          <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">
            /api/v1/persistence/stats
          </code>{" "}
          et{" "}
          <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">
            /api/v1/persistence/logs
          </code>{" "}
          (
          {STATS_PERIOD_OPTIONS.find(
            (period) => period.value === applied.periodDays,
          )?.label ?? `${applied.periodDays} jours`}
          , échantillon). Les compteurs sont globaux par table ; les graphes
          appliquent la période et les niveaux / services sélectionnés (multi
          possible).
        </>
      }
      actions={<StatisticsRefreshButton onClick={() => void load()} />}
    >
      {loading ? (
        <SectionLoader message="Chargement des logs persistés…" />
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <>
          <FilterBar
            hasDraftChanges={hasDraftChanges}
            onApply={() => apply()}
            onReset={() => reset(DEFAULT_LOG_STATS_FILTERS)}
            badges={filterBadges}
          >
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Période d&apos;échantillon
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STATS_PERIOD_OPTIONS.map((period) => {
                    const active = draft.periodDays === period.value;
                    return (
                      <button
                        key={period.value}
                        type="button"
                        onClick={() => updateDraft("periodDays", period.value)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? "border-violet-600 bg-violet-600 text-white shadow-sm dark:border-violet-500 dark:bg-violet-600"
                            : "border-gray-200 bg-white text-gray-700 hover:border-violet-300 hover:text-violet-800 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:border-violet-500"
                        }`}
                      >
                        {period.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Fenêtre glissante sur les logs persistés (max 800 lignes par
                  requête), comme les graphes Performances.
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
                <FilterMultiSelectField
                  label="Niveau"
                  value={draft.level}
                  onChange={(value) => updateDraft("level", value)}
                  options={levelOptions.map((level) => ({
                    value: level,
                    label: level,
                  }))}
                  variant="statistics"
                  toneForValue={logLevelChipTone}
                  hideCheckbox
                  hint="Cliquez pour activer ou retirer un niveau."
                />
                <FacetMultiValueField
                  label="Service"
                  value={draft.service}
                  onChange={(value) => updateDraft("service", value)}
                  suggestions={serviceOptions}
                  placeholder="Filtrer ou choisir un service…"
                  hint="Saisie libre ou suggestion. Plusieurs services possibles."
                />
              </div>
            </div>
          </FilterBar>

          {!counts && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
              Compteurs de persistance indisponibles. Les graphes peuvent être
              vides même si des logs existent ; vérifier metrics-aggregator, la
              clé API et le proxy frontend.
            </div>
          )}

          {counts && (
            <DashboardLayoutRegion variant="dense" className="gap-3">
              {cards.map((card) => (
                <div
                  key={card.key}
                  className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                      {card.label}
                    </p>
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${sourceStatusClass(card.status, card.value)}`}
                    >
                      {sourceStatusLabel(card.status, card.value)}
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {numberFormatter.format(card.value)}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
                    {card.value > 0
                      ? card.hint
                      : `${card.hint} · ${card.emptyLabel || "non alimenté"}`}
                  </p>
                </div>
              ))}
            </DashboardLayoutRegion>
          )}

          {dataRange && (
            <p className={`text-xs ${uiText.subtle}`}>
              Plage persistée connue :{" "}
              {dataRange.oldest
                ? new Date(dataRange.oldest).toLocaleString("fr-FR")
                : "—"}{" "}
              →{" "}
              {dataRange.newest
                ? new Date(dataRange.newest).toLocaleString("fr-FR")
                : "—"}
            </p>
          )}

          {timelineRows.length > 0 ? (
            <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
                Volume de logs dans le temps
              </h2>
              <ChartPeriodCaption label={sampleRangeLabel} />
              <div className="h-56 w-full min-w-0 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timelineRows}
                    margin={{ top: 8, right: 16, left: 0, bottom: axisShowDate ? 48 : 24 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-40"
                    />
                    <XAxis
                      dataKey="timeMs"
                      type="number"
                      domain={[chartXMin, chartXMax]}
                      angle={axisShowDate ? -35 : -25}
                      textAnchor="end"
                      height={axisShowDate ? 56 : 40}
                      tickFormatter={(ms) =>
                        formatLocalChartAxisTick(ms as number, {
                          withDate: axisShowDate,
                        })
                      }
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      width={40}
                    />
                    <Tooltip
                      {...rechartsTooltipProps}
                      labelFormatter={(_, payload: unknown) => {
                        const ts = (
                          payload as Array<{
                            payload?: { timestamp?: string };
                          }>
                        )?.[0]?.payload?.timestamp;
                        return ts != null ? formatLocalDateTime(ts) : "—";
                      }}
                      formatter={(value) => [
                        value != null ? String(value) : "—",
                        "Lignes",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={false}
                      name="Lignes"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {timelineRows.length} point(s) rendu(s) sur l&apos;échantillon
                filtré ({filteredLogs.length} lignes).
              </p>
            </div>
          ) : null}

          {byLevel.length > 0 ? (
            <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
                Répartition par niveau
              </h2>
              <ChartPeriodCaption label={sampleRangeLabel} />
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byLevel}
                    margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-40"
                    />
                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      height={56}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip {...rechartsTooltipProps} />
                    <Bar
                      dataKey="count"
                      fill="#6366f1"
                      name="Lignes"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600 ${uiEmpty.centerPy4}`}
            >
              Aucun log applicatif agrégé sur la période sélectionnée.
            </div>
          )}

          {byService.length > 0 ? (
            <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
                Top services
              </h2>
              <ChartPeriodCaption label={sampleRangeLabel} />
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byService}
                    layout="vertical"
                    margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-40"
                      horizontal={false}
                    />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip {...rechartsTooltipProps} />
                    <Bar
                      dataKey="count"
                      fill="#0d9488"
                      name="Lignes"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          <p className={`text-xs ${uiText.subtle}`}>
            Échantillon : {filteredLogs.length} / {logs.length} lignes sur{" "}
            {applied.periodDays} j (max 800, filtres API + UI). Compteurs
            globaux ci-dessus = tables complètes.
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/backoffice/statistics"
              className="text-sm font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
            >
              ← Vue d’ensemble
            </Link>
            <Link
              href="/backoffice/services/logs"
              className="text-sm font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
            >
              Logs centralisés services →
            </Link>
          </div>
        </>
      )}
    </StatisticsPageShell>
  );
}

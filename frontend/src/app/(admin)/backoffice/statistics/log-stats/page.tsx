"use client";

/**
 * Route **log-stats** (et non `…/logs`) : le motif `logs/` est dans le `.gitignore` du dépôt.
 * URL canonique : `/b4ck0ff1ce/statistics/log-stats`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AdminLayout } from "@/components/features";
import { StatisticsSubNav } from "../StatisticsSubNav";
import { analyticsService } from "@/lib/api/analytics.service";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";
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

type PeriodOption = {
  label: string;
  days: number;
};

type SourceStatus = "active" | "historical" | "planned";

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "24 h", days: 1 },
  { label: "7 jours", days: 7 },
  { label: "14 jours", days: 14 },
  { label: "30 jours", days: 30 },
];

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("");
  const [filterService, setFilterService] = useState("");
  const [periodDays, setPeriodDays] = useState(14);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date(
        Date.now() - periodDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      const [st, rows] = await Promise.all([
        analyticsService.getPersistenceStats(),
        analyticsService.getPersistenceLogs({ limit: 800, startDate: since }),
      ]);
      setStats(st && typeof st === "object" ? st : null);
      setLogs(Array.isArray(rows) ? (rows as AggLog[]) : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const levelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of logs) {
      set.add((row.level || "inconnu").toString());
    }
    return Array.from(set).sort();
  }, [logs]);

  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of logs) {
      const s = (row.serviceName || "").toString().trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((row) => {
      if (filterLevel) {
        const lv = (row.level || "inconnu").toString();
        if (lv !== filterLevel) return false;
      }
      if (filterService) {
        if ((row.serviceName || "").toString() !== filterService) return false;
      }
      return true;
    });
  }, [logs, filterLevel, filterService]);

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
  const activeSources = cards.filter((card) => card.status === "active");
  const activeSourcesOk = activeSources.filter((card) => card.value > 0).length;
  const plannedSources = cards.filter(
    (card) => card.status === "planned" && card.value === 0,
  );
  const dataRange = stats?.dataRange;

  return (
    <AdminLayout>
      <div className="p-6 mx-auto max-w-5xl space-y-6">
        <StatisticsSubNav />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Statistiques — Logs (persistés)
          </h1>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Rafraîchir
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code className="text-xs">GET /api/v1/persistence/stats</code> et{" "}
          <code className="text-xs">GET /api/v1/persistence/logs</code> (
          {PERIOD_OPTIONS.find((period) => period.days === periodDays)?.label ??
            `${periodDays} jours`}
          , échantillon). Les compteurs ci-dessous sont des totaux globaux par
          table ; les graphiques appliquent la période sélectionnée.
        </p>

        {loading ? (
          <SectionLoader message="Chargement des logs persistés…" />
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/40">
              <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
                Période
                <select
                  value={periodDays}
                  onChange={(e) => setPeriodDays(Number(e.target.value))}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  {PERIOD_OPTIONS.map((period) => (
                    <option key={period.days} value={period.days}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
                Niveau
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="">Tous</option>
                  {levelOptions.map((lv) => (
                    <option key={lv} value={lv}>
                      {lv}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
                Service
                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="min-w-[12rem] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="">Tous</option>
                  {serviceOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              {(filterLevel || filterService) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterLevel("");
                    setFilterService("");
                  }}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Réinitialiser filtres
                </button>
              )}
            </div>

            {counts && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      Santé des sources persistées
                    </h2>
                    <p className={`mt-1 ${uiText.subtle}`}>
                      {activeSourcesOk}/{activeSources.length} sources actives
                      alimentées. `container_logs` est conservée comme historique
                      de l’ancien collecteur, pendant que `log_collector_logs`
                      porte le flux Docker Rust actuel. Les sources “à brancher” sont suivies mais ne
                      doivent pas encore être interprétées comme une panne de
                      collecte.
                    </p>
                  </div>
                  {plannedSources.length > 0 && (
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
                      À faire :{" "}
                      {plannedSources.map((source) => source.label).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {counts && (
              <DashboardLayoutRegion variant="dense" className="gap-3">
                {cards.map((card) => (
                  <div
                    key={card.key}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
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
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
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
                {dataRange.oldest ? new Date(dataRange.oldest).toLocaleString("fr-FR") : "—"}{" "}
                →{" "}
                {dataRange.newest ? new Date(dataRange.newest).toLocaleString("fr-FR") : "—"}
              </p>
            )}

            {byLevel.length > 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  Répartition par niveau (échantillon)
                </h2>
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
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  Top services (échantillon)
                </h2>
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
              {filteredLogs.length} / {logs.length} lignes affichées (fenêtre {periodDays}
              jours, max 800).
            </p>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/b4ck0ff1ce/statistics"
                className="text-sm font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
              >
                ← Vue d’ensemble
              </Link>
              <Link
                href="/b4ck0ff1ce/services/logs"
                className="text-sm font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
              >
                Logs centralisés services →
              </Link>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

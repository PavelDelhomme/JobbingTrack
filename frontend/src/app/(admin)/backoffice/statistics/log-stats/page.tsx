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

export default function StatisticsLogStatsPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<AggLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("");
  const [filterService, setFilterService] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000,
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
  }, []);

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

  const counts = stats?.counts as Record<string, number> | undefined;

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
          <code className="text-xs">GET /api/v1/persistence/logs</code> (14
          derniers jours, échantillon). Pour la lecture ligne à ligne, utiliser
          les vues Logs services / sécurité.
        </p>

        {loading ? (
          <SectionLoader message="Chargement des logs persistés…" />
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/40">
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
              <DashboardLayoutRegion variant="dense" className="gap-3">
                {Object.entries(counts).map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40"
                  >
                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                      {k}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {String(v)}
                    </p>
                  </div>
                ))}
              </DashboardLayoutRegion>
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
            ) : null}

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
              {filteredLogs.length} / {logs.length} lignes affichées (fenêtre 14
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

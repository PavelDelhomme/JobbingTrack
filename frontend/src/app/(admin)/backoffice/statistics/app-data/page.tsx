"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AdminLayout } from "@/components/features";
import { StatisticsSubNav } from "../StatisticsSubNav";
import {
  statisticsService,
  type ApplicationStatistics,
  type StatisticsTimelineEntry,
} from "@/lib/services/statisticsService";
import { metricTimestampToMs } from "@/lib/utils/date";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";

export default function StatisticsAppDataPage() {
  const [stats, setStats] = useState<ApplicationStatistics | null>(null);
  const [timeline, setTimeline] = useState<StatisticsTimelineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, tl] = await Promise.all([
        statisticsService.getCurrentStatistics(),
        statisticsService.getStatisticsTimeline("7d", 500),
      ]);
      setStats(s);
      setTimeline(Array.isArray(tl) ? tl : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chartRows = timeline
    .map((row) => {
      const ms = metricTimestampToMs(row.timestamp);
      return {
        timeMs: ms ?? NaN,
        label: row.timestamp,
        applications: row.total_applications,
        users: row.total_users,
        companies: row.total_companies,
      };
    })
    .filter((r) => Number.isFinite(r.timeMs))
    .sort((a, b) => a.timeMs - b.timeMs);

  return (
    <AdminLayout>
      <div className="p-6 mx-auto max-w-5xl space-y-6">
        <StatisticsSubNav />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Statistiques — App data
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
          Données issues de{" "}
          <code className="text-xs">GET /api/v1/statistics</code> et{" "}
          <code className="text-xs">/api/v1/statistics/timeline</code>{" "}
          (gateway). Complète la vue d’ensemble sans la dupliquer.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : !stats ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Aucune statistique renvoyée par l’API.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Candidatures"
                value={stats.applications?.total}
              />
              <StatCard label="Utilisateurs" value={stats.users?.total} />
              <StatCard label="Entreprises" value={stats.companies?.total} />
              <StatCard label="Contacts" value={stats.contacts?.total} />
            </div>

            {chartRows.length > 1 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  Timeline (7 j.) — volumes agrégés
                </h2>
                <div className="h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartRows}
                      margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-40"
                      />
                      <XAxis
                        dataKey="timeMs"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        tickFormatter={(ms) =>
                          new Date(ms).toLocaleDateString()
                        }
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        {...rechartsTooltipProps}
                        labelFormatter={(_, p) => {
                          const ts = (
                            p as { payload?: { label?: string } }[]
                          )?.[0]?.payload?.label;
                          return ts ?? "—";
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="applications"
                        name="Candidatures"
                        stroke="#7c3aed"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="users"
                        name="Utilisateurs"
                        stroke="#2563eb"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="companies"
                        name="Entreprises"
                        stroke="#059669"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pas assez de points timeline pour tracer un graphique (collecte
                ou rôle API).
              </p>
            )}

            <Link
              href="/b4ck0ff1ce/statistics"
              className="inline-flex text-sm font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
            >
              ← Vue d’ensemble Statistiques
            </Link>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900/50">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {value != null ? value.toLocaleString("fr-FR") : "—"}
      </p>
    </div>
  );
}

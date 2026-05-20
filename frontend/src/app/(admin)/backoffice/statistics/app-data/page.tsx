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
import {
  StatisticsPageShell,
  StatisticsRefreshButton,
} from "../StatisticsSubNav";
import {
  statisticsService,
  type ApplicationStatistics,
  type StatisticsTimelineEntry,
} from "@/lib/services/statisticsService";
import { metricTimestampToMs } from "@/lib/utils/date";
import { rechartsTooltipProps } from "@/lib/charts/rechartsTooltipTheme";
import { DashboardLayoutRegion, SectionLoader, uiEmpty } from "@/lib/ui";

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
      <StatisticsPageShell
        title="Statistiques — App data"
        description={
          <>
            Données métier issues de{" "}
            <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">
              GET /api/v1/statistics
            </code>{" "}
            et{" "}
            <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">
              /api/v1/statistics/timeline
            </code>
            . Cette page doit compléter la vue d’ensemble avec les séries
            applicatives, pas rester une coquille vide.
          </>
        }
        actions={<StatisticsRefreshButton onClick={() => void load()} />}
      >
        {loading ? (
          <SectionLoader message="Chargement des données applicatives…" />
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : !stats ? (
          <div
            className={`rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 ${uiEmpty.centerPy4}`}
          >
            Aucune statistique renvoyée par l’API. À traiter : brancher les
            séries métier utiles (candidatures, utilisateurs actifs,
            entreprises, contacts) et afficher un état vide explicite.
          </div>
        ) : (
          <>
            <DashboardLayoutRegion variant="dense" className="gap-4">
              <StatCard
                label="Candidatures"
                value={stats.applications?.total}
              />
              <StatCard label="Utilisateurs" value={stats.users?.total} />
              <StatCard label="Entreprises" value={stats.companies?.total} />
              <StatCard label="Contacts" value={stats.contacts?.total} />
            </DashboardLayoutRegion>

            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              <strong className="font-semibold">À améliorer :</strong> cette
              page expose seulement les totaux et une timeline globale. Le lot
              suivant doit détailler actifs vs total, nouveaux sur la période,
              candidatures par statut, entreprises/contacts et états vides par
              source.
            </div>

            {chartRows.length > 1 ? (
              <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
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
              <div
                className={`rounded-xl border border-dashed border-gray-300 p-5 dark:border-gray-700 ${uiEmpty.centerPy4}`}
              >
                Pas assez de points timeline pour tracer un graphique (collecte
                ou rôle API).
              </div>
            )}

            <Link
              href="/b4ck0ff1ce/statistics"
              className="inline-flex text-sm font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
            >
              ← Vue d’ensemble Statistiques
            </Link>
          </>
        )}
      </StatisticsPageShell>
    </AdminLayout>
  );
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {value != null ? value.toLocaleString("fr-FR") : "—"}
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  APPLIED: "Candidature envoyée",
  INTERVIEW: "Entretien",
  OFFER: "Offre",
  REJECTED: "Refusée",
  ACCEPTED: "Acceptée",
  SCHEDULED: "Planifié",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  PLANNED: "Planifiée",
  OVERDUE: "En retard",
  undefined: "Non renseigné",
  null: "Non renseigné",
  "": "Non renseigné",
  "Statut non renseigné": "Statut non renseigné",
  "Type non renseigné": "Type non renseigné",
  "Secteur non renseigné": "Secteur non renseigné",
  "Taille non renseignée": "Taille non renseignée",
  "Rôle non renseigné": "Rôle non renseigné",
};

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

  const chartRows = useMemo(
    () =>
      timeline
        .map((row) => {
          const ms = metricTimestampToMs(row.timestamp);
          return {
            timeMs: ms ?? NaN,
            label: row.timestamp,
            applications: row.total_applications,
            users: row.total_users,
            companies: row.total_companies,
            contacts: row.total_contacts,
            interviews: row.total_interviews,
            calls: row.total_calls ?? 0,
            followups: row.total_followups ?? 0,
            events: row.total_events ?? 0,
          };
        })
        .filter((r) => Number.isFinite(r.timeMs))
        .sort((a, b) => a.timeMs - b.timeMs),
    [timeline],
  );

  const sourceStates = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: "Candidatures",
        value: stats.applications?.total ?? 0,
        source: "application-service",
      },
      {
        label: "Utilisateurs",
        value: stats.users?.total ?? 0,
        source: "auth-service",
      },
      {
        label: "Entreprises",
        value: stats.companies?.total ?? 0,
        source: "company-service",
      },
      {
        label: "Contacts",
        value: stats.contacts?.total ?? 0,
        source: "contact-service",
      },
      {
        label: "Entretiens",
        value: stats.interviews?.total ?? 0,
        source: "interview-service",
      },
      {
        label: "Appels",
        value: stats.calls?.total ?? 0,
        source: "call-service",
      },
      {
        label: "Relances",
        value: stats.followups?.total ?? 0,
        source: "followup-service",
      },
      {
        label: "Événements",
        value: stats.events?.total ?? 0,
        source: "event-service",
      },
    ];
  }, [stats]);

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
                subtitle={`${stats.applications?.this_week ?? 0} nouvelles sur 7 j. · ${stats.applications?.this_month ?? 0} ce mois`}
              />
              <StatCard
                label="Utilisateurs"
                value={stats.users?.total}
                subtitle={`${stats.users?.active ?? 0} actifs · ${stats.users?.new_this_week ?? 0} nouveaux sur 7 j.`}
              />
              <StatCard
                label="Entreprises"
                value={stats.companies?.total}
                subtitle={`${stats.companies?.this_week ?? 0} nouvelles sur 7 j.`}
              />
              <StatCard
                label="Contacts"
                value={stats.contacts?.total}
                subtitle={`${stats.contacts?.this_week ?? 0} nouveaux sur 7 j.`}
              />
              <StatCard
                label="Entretiens"
                value={stats.interviews?.total}
                subtitle={`${stats.interviews?.upcoming ?? stats.interviews?.scheduled ?? 0} à venir · ${stats.interviews?.completed ?? 0} terminés`}
              />
              <StatCard
                label="Appels"
                value={stats.calls?.total}
                subtitle={`${stats.calls?.upcoming ?? 0} à venir · ${stats.calls?.completed ?? 0} terminés`}
              />
              <StatCard
                label="Relances"
                value={stats.followups?.total}
                subtitle={`${stats.followups?.pending ?? 0} en attente · ${stats.followups?.overdue ?? 0} en retard`}
              />
              <StatCard
                label="Événements"
                value={stats.events?.total}
                subtitle={`${stats.events?.this_week ?? 0} créés sur 7 j. · ${stats.events?.upcoming ?? 0} à venir`}
              />
            </DashboardLayoutRegion>

            <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                État des sources métier
              </h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {sourceStates.map((source) => (
                  <div
                    key={source.label}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {source.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          source.value > 0
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                        }`}
                      >
                        {source.value > 0 ? "alimenté" : "vide"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {source.source} · {source.value.toLocaleString("fr-FR")}{" "}
                      ligne(s) exposée(s)
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <DashboardLayoutRegion variant="section">
              <DistributionPanel
                title="Candidatures par statut"
                rows={stats.applications?.by_status}
                fallbackTotal={stats.applications?.total}
                empty="Aucun statut candidature exposé par application-service."
              />
              <DistributionPanel
                title="Candidatures par type"
                rows={stats.applications?.by_type}
                fallbackTotal={stats.applications?.total}
                empty="Aucun type de candidature exposé par application-service."
              />
              <DistributionPanel
                title="Utilisateurs par rôle"
                rows={stats.users?.by_role}
                fallbackTotal={stats.users?.total}
                empty="Aucun rôle utilisateur exposé par auth-service."
              />
              <DistributionPanel
                title="Entreprises par secteur"
                rows={stats.companies?.by_industry}
                fallbackTotal={stats.companies?.total}
                empty="Aucun secteur entreprise exposé par company-service."
              />
              <DistributionPanel
                title="Entretiens par statut"
                rows={stats.interviews?.by_status}
                fallbackTotal={stats.interviews?.total}
                empty="Aucun statut entretien exposé par interview-service."
              />
              <DistributionPanel
                title="Appels par statut"
                rows={stats.calls?.by_status}
                fallbackTotal={stats.calls?.total}
                empty="Aucun statut appel exposé par call-service."
              />
              <DistributionPanel
                title="Relances par statut"
                rows={stats.followups?.by_status}
                fallbackTotal={stats.followups?.total}
                empty="Aucun statut relance exposé par followup-service."
              />
            </DashboardLayoutRegion>

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
                      <Line
                        type="monotone"
                        dataKey="contacts"
                        name="Contacts"
                        stroke="#ea580c"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="interviews"
                        name="Entretiens"
                        stroke="#dc2626"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="calls"
                        name="Appels"
                        stroke="#0891b2"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="followups"
                        name="Relances"
                        stroke="#ca8a04"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="events"
                        name="Événements"
                        stroke="#be123c"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : chartRows.length === 1 ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
                <h2 className="text-base font-semibold">
                  Snapshot applicatif courant
                </h2>
                <p className="mt-1">
                  L’API timeline renvoie actuellement un seul point de synthèse.
                  Les totaux ci-dessus sont donc affichés comme état courant ;
                  le graphe temporel apparaîtra dès que plusieurs snapshots
                  historiques seront disponibles.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <SnapshotMetric label="Candidatures" value={chartRows[0].applications} />
                  <SnapshotMetric label="Utilisateurs" value={chartRows[0].users} />
                  <SnapshotMetric label="Entreprises" value={chartRows[0].companies} />
                  <SnapshotMetric label="Contacts" value={chartRows[0].contacts} />
                  <SnapshotMetric label="Entretiens" value={chartRows[0].interviews} />
                  <SnapshotMetric label="Appels" value={chartRows[0].calls} />
                  <SnapshotMetric label="Relances" value={chartRows[0].followups} />
                  <SnapshotMetric label="Événements" value={chartRows[0].events} />
                </div>
                <p className="mt-2 text-xs text-blue-900/80 dark:text-blue-100/80">
                  Point : {chartRows[0].label}
                </p>
              </div>
            ) : (
              <div
                className={`rounded-xl border border-dashed border-gray-300 p-5 dark:border-gray-700 ${uiEmpty.centerPy4}`}
              >
                Aucune donnée timeline renvoyée par l’API. Les cartes restent la
                source principale tant que l’historique applicatif dédié n’est
                pas alimenté.
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

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value?: number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {value != null ? value.toLocaleString("fr-FR") : "—"}
      </p>
      {subtitle ? (
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function SnapshotMetric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-white/70 p-3 dark:border-blue-900/60 dark:bg-blue-950/40">
      <p className="text-xs font-medium text-blue-900/80 dark:text-blue-100/80">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {value != null ? value.toLocaleString("fr-FR") : "—"}
      </p>
    </div>
  );
}

function DistributionPanel({
  title,
  rows,
  fallbackTotal,
  empty,
}: {
  title: string;
  rows?: Record<string, number>;
  fallbackTotal?: number;
  empty: string;
}) {
  const entries = Object.entries(rows || {})
    .map(
      ([key, value]) =>
        [
          key && key !== "undefined" && key !== "null" ? key : "Non renseigné",
          value,
        ] as const,
    )
    .filter(([, value]) => value > 0);
  const displayEntries =
    entries.length === 0 && fallbackTotal && fallbackTotal > 0
      ? ([["Non renseigné", fallbackTotal]] as const)
      : entries;
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      {displayEntries.length > 0 ? (
        <div className="mt-3 space-y-2">
          {displayEntries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {statusLabels[key] || key}
              </span>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                {value.toLocaleString("fr-FR")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{empty}</p>
      )}
    </div>
  );
}

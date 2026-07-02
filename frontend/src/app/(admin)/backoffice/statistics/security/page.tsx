"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  StatisticsPageShell,
  StatisticsRefreshButton,
} from "../StatisticsSubNav";
import { analyticsService } from "@/lib/api/analytics.service";
import { buildSecurityConsistencySummary, buildSecurityCrossPageRows } from "@/lib/metrics/securityStatisticsComparison";
import {
  fetchSecurityAnalysisSummary,
  type SecurityAnalysisSummary,
} from "@/lib/security/securityAnalysisSummary";
import { FRONTEND_URLS } from "@/config/ports.config";
import { DashboardLayoutRegion, SectionLoader, uiEmpty } from "@/lib/ui";

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function rowDateKey(row: Record<string, unknown>): string | null {
  const t = row.timestamp ?? row.createdAt;
  if (t instanceof Date) return t.toISOString().slice(0, 10);
  if (typeof t === "string" || typeof t === "number") {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return null;
}

type DayBucket = {
  day: string;
  failedLogins: number;
  sqlInjections: number;
  xssAttempts: number;
  suspicious: number;
  alerts: number;
  intrusions: number;
  ddos: number;
  rateLimit: number;
  invalidToken: number;
  snapshots: number;
  scoreSum: number;
  scoreCount: number;
};

export default function StatisticsSecurityPage() {

  const [metrics, setMetrics] = useState<Record<string, unknown>[]>([]);
  const [pSummary, setPSummary] = useState<Record<string, unknown> | null>(
    null,
  );
  const [liveSummary, setLiveSummary] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [persistedLogsTotal, setPersistedLogsTotal] = useState<number | null>(
    null,
  );
  const [liveAnalysis, setLiveAnalysis] = useState<SecurityAnalysisSummary | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hoursWindow = 7 * 24;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("token")
          : null;
      const [m, s, pStats, live, analysis] = await Promise.all([
        analyticsService.getSecurityMetrics(hoursWindow),
        analyticsService.getSecurityPersistenceSummary(hoursWindow),
        analyticsService.getPersistenceStats(),
        analyticsService.getSecuritySummary(30 * 24),
        fetchSecurityAnalysisSummary(FRONTEND_URLS.api, token).catch(() => null),
      ]);
      setMetrics(Array.isArray(m) ? m : []);
      setPSummary(s && typeof s === "object" ? s : null);
      setLiveSummary(live && typeof live === "object" ? live : null);
      setLiveAnalysis(analysis);
      const counts = pStats?.counts as Record<string, unknown> | undefined;
      const logsTotal =
        counts && typeof counts.securityLogs === "number"
          ? counts.securityLogs
          : null;
      setPersistedLogsTotal(logsTotal);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [hoursWindow]);

  useEffect(() => {
    void load();
  }, [load]);

  const fromMetrics = useMemo(() => {
    if (!metrics.length) {
      return {
        byDay: [] as DayBucket[],
        recentScores: [] as { t: string; score: number }[],
        blockedIpTouches: 0,
      };
    }

    const dayMap = new Map<string, DayBucket>();
    let blockedTouches = 0;
    const scoreSeries: { t: string; score: number; ms: number }[] = [];

    for (const row of metrics) {
      const day = rowDateKey(row);
      if (day) {
        const b =
          dayMap.get(day) ||
          ({
            day,
            failedLogins: 0,
            sqlInjections: 0,
            xssAttempts: 0,
            suspicious: 0,
            alerts: 0,
            intrusions: 0,
            ddos: 0,
            rateLimit: 0,
            invalidToken: 0,
            snapshots: 0,
            scoreSum: 0,
            scoreCount: 0,
          } satisfies DayBucket);
        b.failedLogins = Math.max(b.failedLogins, num(row.failedLoginAttempts));
        b.sqlInjections = Math.max(
          b.sqlInjections,
          num(row.potentialSqlInjections),
        );
        b.xssAttempts = Math.max(b.xssAttempts, num(row.potentialXssAttempts));
        b.suspicious = Math.max(b.suspicious, num(row.suspiciousActivities));
        b.alerts = Math.max(b.alerts, num(row.activeSecurityAlerts));
        b.intrusions = Math.max(b.intrusions, num(row.intrusionAttempts));
        b.ddos = Math.max(b.ddos, num(row.ddosAttacks));
        b.rateLimit = Math.max(b.rateLimit, num(row.rateLimitExceeded));
        b.invalidToken = Math.max(b.invalidToken, num(row.invalidTokenAttempts));
        b.snapshots += 1;
        if (row.securityScore !== undefined && row.securityScore !== null) {
          b.scoreSum += num(row.securityScore);
          b.scoreCount += 1;
        }
        dayMap.set(day, b);
      }

      const ips = row.blockedIPs;
      if (Array.isArray(ips)) blockedTouches += ips.length;

      const ts = row.timestamp ?? row.createdAt;
      const sc = num(row.securityScore);
      if (
        typeof ts === "string" ||
        typeof ts === "number" ||
        ts instanceof Date
      ) {
        const ms = new Date(ts as string | number | Date).getTime();
        if (!Number.isNaN(ms)) {
          scoreSeries.push({ t: String(ts), score: sc, ms });
        }
      }
    }

    const byDay = Array.from(dayMap.values()).sort((a, b) =>
      a.day.localeCompare(b.day),
    );
    scoreSeries.sort((a, b) => a.ms - b.ms);
    const recentScores = scoreSeries
      .slice(-36)
      .map(({ t, score }) => ({ t, score }));

    return { byDay, recentScores, blockedIpTouches: blockedTouches };
  }, [metrics]);

  const avgScoreFromDays = useMemo(() => {
    const rows = fromMetrics.byDay.filter((d) => d.scoreCount > 0);
    if (rows.length === 0) return null;
    const sum = rows.reduce((a, d) => a + d.scoreSum, 0);
    const n = rows.reduce((a, d) => a + d.scoreCount, 0);
    return n > 0 ? sum / n : null;
  }, [fromMetrics.byDay]);

  const summaryDataPoints = pSummary ? num(pSummary.dataPoints) : 0;
  const summarySource = String(pSummary?.source ?? "security_metrics");
  const hasPersistedSecuritySeries =
    metrics.length > 0 || summaryDataPoints > 0;
  const summaryIsEmpty =
    pSummary != null &&
    (summaryDataPoints === 0 || summarySource.toLowerCase() === "empty");
  const consistency = useMemo(
    () => buildSecurityConsistencySummary(pSummary, liveSummary),
    [pSummary, liveSummary],
  );
  const crossPageRows = useMemo(
    () => buildSecurityCrossPageRows(pSummary, liveAnalysis),
    [pSummary, liveAnalysis],
  );
  const consistencyTone =
    consistency.level === "critical"
      ? "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100"
      : consistency.level === "watch"
        ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
        : "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100";

  return (
    <StatisticsPageShell
      title="Statistiques — Sécurité persistée"
      description={
        <>
          Tendances et agrégats issus de la{" "}
          <strong className="font-semibold">base persistée</strong> du
          metrics-aggregator (fenêtre {hoursWindow} h). Les compteurs live,
          menaces récentes et pilotage restent sous{" "}
          <Link
            href="/backoffice/security"
            className="font-medium text-violet-700 underline hover:no-underline dark:text-violet-300"
          >
            Sécurité
          </Link>
          . Sources :{" "}
          <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">
            persistence/security/metrics
          </code>{" "}
          +{" "}
          <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">
            summary
          </code>
          .
        </>
      }
      actions={<StatisticsRefreshButton onClick={() => void load()} />}
    >
      {loading ? (
        <SectionLoader message="Chargement des métriques sécurité…" />
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <>
          {persistedLogsTotal != null && persistedLogsTotal > 0 && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="font-medium text-amber-950 dark:text-amber-100">
                Volume logs sécurité (table{" "}
                <code className="text-xs">security_logs</code>)
              </p>
              <p className="mt-1 tabular-nums text-lg font-bold text-amber-950 dark:text-amber-50">
                {persistedLogsTotal.toLocaleString("fr-FR")} lignes en base
              </p>
              <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/80">
                Total brut agrégateur, toutes périodes confondues. À ne pas
                comparer directement au compteur live de{" "}
                <Link
                  href="/backoffice/security"
                  className="font-medium underline hover:no-underline"
                >
                  Sécurité
                </Link>{" "}
                qui affiche une fenêtre 30 j limitée à 2000 lignes.
              </p>
              <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/80">
                Dry-run et export archive sans purge :{" "}
                <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/40">
                  scripts/security/security-logs-retention-dry-run.cjs
                </code>
                ,{" "}
                <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/40">
                  security-logs-archive-export.cjs
                </code>
                . Politique :{" "}
                <span className="font-medium">
                  docs/security/SECURITY_LOGS_RETENTION.md
                </span>
              </p>
            </div>
          )}

          <div className={`rounded-xl border p-4 text-sm ${consistencyTone}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold">
                  Cohérence avec la console Sécurité live
                </p>
                <p className="mt-1">{consistency.message}</p>
                <p className="mt-1 text-xs opacity-90">
                  Fenêtres : Statistics persistance {hoursWindow} h (pic max par
                  snapshot) · Analyse live {liveAnalysis?.statsWindowDays ?? 30}{" "}
                  j (logs + menaces + firewall).
                </p>
              </div>
              <Link
                href="/backoffice/security/analysis"
                className="shrink-0 font-medium underline hover:no-underline"
              >
                Ouvrir Analyse →
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <p className="text-xs opacity-80">Score persisté</p>
                <p className="text-xl font-bold tabular-nums">
                  {consistency.persistedScore == null
                    ? "—"
                    : consistency.persistedScore.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-xs opacity-80">Score live</p>
                <p className="text-xl font-bold tabular-nums">
                  {consistency.liveScore == null
                    ? "—"
                    : consistency.liveScore.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-xs opacity-80">Évènements live</p>
                <p className="text-xl font-bold tabular-nums">
                  {consistency.liveEvents.toLocaleString("fr-FR")}
                </p>
                <p className="text-xs opacity-80">
                  Critical {consistency.liveCriticalEvents} · DDoS{" "}
                  {consistency.liveDdosAttacks}
                </p>
              </div>
              <div>
                <p className="text-xs opacity-80">Points persistés</p>
                <p className="text-xl font-bold tabular-nums">
                  {consistency.persistedDataPoints.toLocaleString("fr-FR")}
                </p>
                <p className="text-xs opacity-80">
                  Logs live {consistency.liveLogs.toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          </div>

          {liveAnalysis && (
            <div className="rounded-xl border border-gray-300 bg-white p-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Comparatif Statistics persisté vs Analyse live
                  </h2>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Même logique que la page{" "}
                    <Link
                      href="/backoffice/security/analysis"
                      className="font-medium text-violet-700 underline hover:no-underline dark:text-violet-300"
                    >
                      Analyse de Sécurité
                    </Link>
                    . Les écarts viennent des sources et fenêtres, pas d’un
                    bug d’affichage isolé.
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Score Analyse live :{" "}
                  <span className="font-bold tabular-nums">
                    {liveAnalysis.securityScore}
                  </span>
                  /100
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/80">
                      <th className="px-2 py-2 font-medium">Indicateur</th>
                      <th className="px-2 py-2 font-medium tabular-nums">
                        Persisté ({hoursWindow} h)
                      </th>
                      <th className="px-2 py-2 font-medium tabular-nums">
                        Live Analyse ({liveAnalysis.statsWindowDays} j)
                      </th>
                      <th className="px-2 py-2 font-medium">Lecture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crossPageRows.map((row) => (
                      <tr
                        key={row.label}
                        className="border-b border-gray-100 dark:border-gray-700/80"
                      >
                        <td className="px-2 py-2 font-medium">{row.label}</td>
                        <td className="px-2 py-2 tabular-nums">
                          {row.persisted == null ? "—" : row.persisted}
                        </td>
                        <td className="px-2 py-2 tabular-nums">
                          {row.live == null ? "—" : row.live}
                        </td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400">
                          {row.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Résumé agrégateur (BDD) */}
          <div>
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
              Synthèse sur la période (agrégateur)
            </h2>
            {summaryIsEmpty && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                Aucune série sécurité persistée exploitable sur les{" "}
                {hoursWindow} h. La console{" "}
                <Link
                  href="/backoffice/security"
                  className="font-medium underline hover:no-underline"
                >
                  Sécurité
                </Link>{" "}
                peut quand même afficher de l’activité live : ce bloc ne doit
                pas être interprété comme un score 100 ou une absence
                d’incident.
              </div>
            )}
            {pSummary && !summaryIsEmpty ? (
              <DashboardLayoutRegion variant="dense" className="gap-4">
                <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    Échecs connexion (pic snapshot)
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {num(pSummary.totalFailedLogins)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    Tentatives SQLi / XSS (pic snapshot)
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    {num(pSummary.totalSqlInjectionAttempts)} /{" "}
                    {num(pSummary.totalXssAttempts)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    Activités suspectes / alertes (pic snapshot)
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    {num(pSummary.totalSuspiciousActivities)} /{" "}
                    {num(pSummary.totalSecurityAlerts)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    IP uniques bloquées (période)
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {num(pSummary.uniqueBlockedIPs)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    Score sécurité moyen (snapshots)
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {num(pSummary.avgSecurityScore).toFixed(1)}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Persisté {hoursWindow} h · différent du score live pondéré
                    dans Sécurité.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    Points de série / période
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {num(pSummary.dataPoints)}{" "}
                    <span className="text-sm font-normal">
                      · {String(pSummary.period ?? "")}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Source : {String(pSummary.source ?? "security_metrics")}
                  </p>
                </div>
              </DashboardLayoutRegion>
            ) : (
              <div
                className={`rounded-xl border border-dashed border-gray-300 p-5 dark:border-gray-700 ${uiEmpty.centerPy4}`}
              >
                {summaryIsEmpty
                  ? "Résumé persisté vide sur la fenêtre demandée : aucun score synthétique n’est affiché pour éviter un faux “tout va bien”."
                  : "Résumé persisté indisponible (table vide ou erreur agrégateur)."}
              </div>
            )}
          </div>

          {/* Tendance : score récent */}
          {fromMetrics.recentScores.length > 0 && (
            <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                Score sécurité — derniers snapshots
              </h2>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Chaque barre = un enregistrement persisté (0–100). Utile pour
                voir la dérive après déploiement ou incident.
              </p>
              <div className="flex h-10 items-end gap-0.5 overflow-x-auto">
                {fromMetrics.recentScores.map((p, i) => (
                  <div
                    key={i}
                    title={`${p.t} — ${p.score}`}
                    className="min-w-[6px] flex-1 rounded-t bg-violet-500/80 dark:bg-violet-400/70"
                    style={{
                      height: `${Math.max(8, (p.score / 100) * 100)}%`,
                    }}
                  />
                ))}
              </div>
              {avgScoreFromDays != null && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  Moyenne sur jours avec données :{" "}
                  <span className="font-semibold tabular-nums">
                    {avgScoreFromDays.toFixed(1)}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Agrégation par jour */}
          {fromMetrics.byDay.length > 0 && (
            <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                Agrégation par jour (séries persistées)
              </h2>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Somme des pics journaliers (max par jour civil), pas une somme
                brute de tous les snapshots.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/80">
                      <th className="px-2 py-2 font-medium">Jour</th>
                      <th className="px-2 py-2 font-medium tabular-nums">
                        Échecs login
                      </th>
                      <th className="px-2 py-2 font-medium tabular-nums">
                        SQLi
                      </th>
                      <th className="px-2 py-2 font-medium tabular-nums">
                        XSS
                      </th>
                      <th className="px-2 py-2 font-medium tabular-nums">
                        Suspect
                      </th>
                      <th className="px-2 py-2 font-medium tabular-nums">
                        Alertes
                      </th>
                      <th className="px-2 py-2 font-medium tabular-nums">
                        Intrusion
                      </th>
                      <th className="px-2 py-2 font-medium tabular-nums">
                        DDoS
                      </th>
                      <th className="px-2 py-2 font-medium tabular-nums">
                        429 / token
                      </th>
                      <th className="px-2 py-2 font-medium tabular-nums">
                        Score Ø
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fromMetrics.byDay.map((d) => (
                      <tr
                        key={d.day}
                        className="border-b border-gray-100 dark:border-gray-700/80"
                      >
                        <td className="px-2 py-1.5 font-mono">{d.day}</td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.failedLogins}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.sqlInjections}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.xssAttempts}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.suspicious}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">{d.alerts}</td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.intrusions}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">{d.ddos}</td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.rateLimit} / {d.invalidToken}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {d.scoreCount > 0
                            ? (d.scoreSum / d.scoreCount).toFixed(1)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit compact */}
          <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
              Derniers enregistrements (extrait)
            </h2>
            {metrics.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {hasPersistedSecuritySeries
                  ? "Résumé disponible, mais aucun extrait brut affichable sur cette fenêtre."
                  : "Aucune série sur la période."}{" "}
                La table brute <code className="text-xs">security_metrics</code>{" "}
                est utilisée en fallback si la table agrégée est vide ; attendre
                le collecteur sécurité ou relancer la stack doit alimenter ce
                bloc sans inventer de faux incidents.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-auto font-mono text-[10px] text-gray-700 dark:text-gray-300">
                {metrics.slice(0, 20).map((row, i) => (
                  <li key={i}>
                    {String(row.timestamp ?? "—")} · score{" "}
                    {num(row.securityScore)} · ko login{" "}
                    {num(row.failedLoginAttempts)} · sql{" "}
                    {num(row.potentialSqlInjections)} · xss{" "}
                    {num(row.potentialXssAttempts)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/backoffice/statistics"
              className="font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
            >
              ← Statistiques
            </Link>
            <Link
              href="/backoffice/security"
              className="font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
            >
              Sécurité (opérationnel) →
            </Link>
            <Link
              href="/backoffice/security/analysis"
              className="font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
            >
              Analyse →
            </Link>
          </div>
        </>
      )}
    </StatisticsPageShell>
  );
}

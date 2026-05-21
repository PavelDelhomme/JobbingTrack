"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/features";
import {
  StatisticsPageShell,
  StatisticsRefreshButton,
} from "../StatisticsSubNav";
import { analyticsService } from "@/lib/api/analytics.service";
import { useDocumentTitle } from "@/lib/hooks/useDocumentTitle";
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
  useDocumentTitle("Statistiques sécurité");

  const [metrics, setMetrics] = useState<Record<string, unknown>[]>([]);
  const [pSummary, setPSummary] = useState<Record<string, unknown> | null>(
    null,
  );
  const [persistedLogsTotal, setPersistedLogsTotal] = useState<number | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hoursWindow = 7 * 24;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, s, pStats] = await Promise.all([
        analyticsService.getSecurityMetrics(hoursWindow),
        analyticsService.getSecurityPersistenceSummary(hoursWindow),
        analyticsService.getPersistenceStats(),
      ]);
      setMetrics(Array.isArray(m) ? m : []);
      setPSummary(s && typeof s === "object" ? s : null);
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
        b.failedLogins += num(row.failedLoginAttempts);
        b.sqlInjections += num(row.potentialSqlInjections);
        b.xssAttempts += num(row.potentialXssAttempts);
        b.suspicious += num(row.suspiciousActivities);
        b.alerts += num(row.activeSecurityAlerts);
        b.intrusions += num(row.intrusionAttempts);
        b.ddos += num(row.ddosAttacks);
        b.rateLimit += num(row.rateLimitExceeded);
        b.invalidToken += num(row.invalidTokenAttempts);
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

  return (
    <AdminLayout>
      <StatisticsPageShell
        title="Statistiques — Sécurité persistée"
        description={
          <>
            Tendances et agrégats issus de la{" "}
            <strong className="font-semibold">base persistée</strong> du
            metrics-aggregator (fenêtre {hoursWindow} h). Les compteurs live,
            menaces récentes et pilotage restent sous{" "}
            <Link
              href="/b4ck0ff1ce/security"
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

            {/* Résumé agrégateur (BDD) */}
            <div>
              <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
                Synthèse sur la période (agrégateur)
              </h2>
              {pSummary ? (
                <DashboardLayoutRegion variant="dense" className="gap-4">
                  <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                      Échecs connexion (cumul)
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">
                      {num(pSummary.totalFailedLogins)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                      Tentatives SQLi / XSS (cumul)
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {num(pSummary.totalSqlInjectionAttempts)} /{" "}
                      {num(pSummary.totalXssAttempts)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                      Activités suspectes / alertes
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
                  Résumé persisté indisponible (table vide ou erreur
                  agrégateur).
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
                  Somme des compteurs par jour civil (UTC) sur les snapshots de
                  la fenêtre. Blocages IP : {fromMetrics.blockedIpTouches}{" "}
                  entrées listées dans les lignes (non dédupliquées jour par
                  jour).
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
                          <td className="px-2 py-1.5 tabular-nums">
                            {d.alerts}
                          </td>
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
                  Aucune série sur la période. La table brute{" "}
                  <code className="text-xs">security_metrics</code> est utilisée
                  en fallback si la table agrégée est vide ; attendre le
                  collecteur sécurité ou relancer la stack doit alimenter ce
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
                href="/b4ck0ff1ce/statistics"
                className="font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
              >
                ← Statistiques
              </Link>
              <Link
                href="/b4ck0ff1ce/security"
                className="font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
              >
                Sécurité (opérationnel) →
              </Link>
              <Link
                href="/b4ck0ff1ce/security/analysis"
                className="font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400"
              >
                Analyse →
              </Link>
            </div>
          </>
        )}
      </StatisticsPageShell>
    </AdminLayout>
  );
}

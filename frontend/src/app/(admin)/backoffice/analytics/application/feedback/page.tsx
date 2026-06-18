"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TimeRangeSelector, ChartPeriodCaption } from "@/components/analytics";
import { AnalyticsRecordDetailDialog } from "@/components/analytics/AnalyticsRecordDetailDialog";
import { useRegisterBackofficeRefresh } from "@/hooks/useRegisterBackofficeRefresh";
import { AnalyticsPageShell } from "../ApplicationSubNav";
import { useApplicationTimeRange } from "../useApplicationTimeRange";
import {
  fetchApplicationErrors,
  fetchCrashReports,
  resolveApplicationError,
  type ApplicationAnalyticsError,
  type CrashReportSummary,
} from "@/lib/services/applicationAnalyticsService";
import {
  crashReportDetailRecord,
  feedbackCategoryFromCrash,
  isUserFeedbackCrash,
} from "@/lib/analytics/mobileFeedback";

function formatTs(value: string) {
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return value;
  }
}

function stripFeedbackPrefix(message: string) {
  return message.replace(/^\[(bug|suggestion|signalement)\]\s/i, "").trim();
}

type ErrorStatusFilter = "all" | "open" | "resolved";
type ErrorSort = "newest" | "oldest" | "severity";

export default function ApplicationFeedbackPage() {
  const range = useApplicationTimeRange();
  const {
    rangeQuery,
    consumeSilentFetch,
    softTick,
    bumpSoftRefresh,
    timeRange,
    setTimeRange,
    useCustomRange,
    setUseCustomRange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    rangeLabel,
    goPrev,
    goNext,
    canGoNext,
    handlePeriodNow,
    handleClearCustomRange,
    rangeStart,
    rangeEnd,
  } = range;

  const [loading, setLoading] = useState(true);
  const [crashes, setCrashes] = useState<CrashReportSummary[]>([]);
  const [appErrors, setAppErrors] = useState<ApplicationAnalyticsError[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [errorStatusFilter, setErrorStatusFilter] =
    useState<ErrorStatusFilter>("all");
  const [errorSort, setErrorSort] = useState<ErrorSort>("newest");
  const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(
    null,
  );
  const [detailTitle, setDetailTitle] = useState("");

  const loadData = useCallback(async () => {
    const silent = consumeSilentFetch();
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Session admin requise pour consulter les retours mobile.");
        setCrashes([]);
        setAppErrors([]);
        return;
      }
      const startMs = rangeStart.getTime();
      const endMs = rangeEnd.getTime();
      const inRange = (ts: string) => {
        const t = new Date(ts).getTime();
        return t >= startMs && t <= endMs;
      };

      const [crashesRes, errorsRes] = await Promise.all([
        fetchCrashReports(token, 300),
        fetchApplicationErrors(token, rangeQuery, {
          limit: 200,
          excludeFeedback: true,
        }),
      ]);

      setCrashes(
        crashesRes.filter((c) => inRange(c.timestamp)).filter(isUserFeedbackCrash),
      );
      setAppErrors(errorsRes.data);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les retours mobile.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [rangeQuery, rangeStart, rangeEnd, consumeSilentFetch]);

  useRegisterBackofficeRefresh(
    useCallback(() => {
      bumpSoftRefresh();
    }, [bumpSoftRefresh]),
  );

  useEffect(() => {
    void loadData();
  }, [loadData, softTick]);

  const stats = useMemo(() => {
    const bugs = crashes.filter((c) => feedbackCategoryFromCrash(c) === "bug").length;
    const suggestions = crashes.filter(
      (c) => feedbackCategoryFromCrash(c) === "suggestion",
    ).length;
    const signalements = crashes.filter(
      (c) => feedbackCategoryFromCrash(c) === "signalement",
    ).length;
    const retoursUtilisateur = crashes.length;
    const erreursAuto = appErrors.length;
    const erreursOuvertes = appErrors.filter((e) => !e.resolved).length;

    return {
      retoursUtilisateur,
      bugs,
      suggestions,
      signalements,
      erreursAuto,
      erreursOuvertes,
    };
  }, [crashes, appErrors]);

  const rows = useMemo(() => {
    return crashes
      .map((c) => ({
        crash: c,
        id: c.id,
        timestamp: c.timestamp,
        category: feedbackCategoryFromCrash(c),
        message: stripFeedbackPrefix(c.message),
        source: "rapport mobile",
      }))
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  }, [crashes]);

  const filteredErrors = useMemo(() => {
    let list = [...appErrors];
    if (errorStatusFilter === "open") {
      list = list.filter((e) => !e.resolved);
    } else if (errorStatusFilter === "resolved") {
      list = list.filter((e) => e.resolved);
    }
    list.sort((a, b) => {
      if (errorSort === "oldest") {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      if (errorSort === "severity") {
        const rank = (s: string) =>
          s === "critical" ? 0 : s === "error" ? 1 : 2;
        const diff = rank(a.severity) - rank(b.severity);
        if (diff !== 0) return diff;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    return list;
  }, [appErrors, errorStatusFilter, errorSort]);

  const openFeedbackDetail = (crash: CrashReportSummary) => {
    setDetailTitle(`Retour — ${feedbackCategoryFromCrash(crash)}`);
    setDetailRecord(crashReportDetailRecord(crash));
  };

  const openErrorDetail = (err: ApplicationAnalyticsError) => {
    setDetailTitle(`Erreur — ${err.errorName || err.errorType}`);
    setDetailRecord({ ...err });
  };

  const toggleErrorResolved = async (err: ApplicationAnalyticsError) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setResolvingId(err.id);
    try {
      await resolveApplicationError(token, err.id, !err.resolved);
      setAppErrors((prev) =>
        prev.map((e) =>
          e.id === err.id ? { ...e, resolved: !e.resolved } : e,
        ),
      );
    } catch (e) {
      console.error(e);
      setError("Impossible de mettre à jour le statut de l'erreur.");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <AnalyticsPageShell
      title="Application — retours & signalements"
      description={
        <p>
          Retours explicites depuis Paramètres → Aide &amp; retours, plus erreurs
          applicatives auto-remontées (réseau, crash). Un envoi = une ligne
          (rapport mobile). Les emails partent vers{" "}
          <code className="text-xs">CRASH_REPORT_EMAIL</code> (.env) — visibles
          dans Email Monitor (filtre Crash / retour mobile).
        </p>
      }
      actions={
        <TimeRangeSelector
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            useCustomRange={useCustomRange}
            setUseCustomRange={setUseCustomRange}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
            rangeLabel={rangeLabel}
            goPrev={goPrev}
            goNext={goNext}
            canGoNext={canGoNext}
            onPeriodNow={handlePeriodNow}
          onClearCustomRange={handleClearCustomRange}
        />
      }
      backHref="/backoffice/analytics"
      showApplicationSubNav
    >
      <ChartPeriodCaption label={rangeLabel} />

      {loading && rows.length === 0 && appErrors.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center text-gray-500 dark:text-gray-400 sm:h-64">
          Chargement…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Retours utilisateur" value={stats.retoursUtilisateur} />
            <StatCard label="Bugs signalés" value={stats.bugs} />
            <StatCard label="Suggestions" value={stats.suggestions} />
            <StatCard label="Signalements" value={stats.signalements} />
            <StatCard label="Erreurs auto (période)" value={stats.erreursAuto} />
            <StatCard label="Erreurs ouvertes" value={stats.erreursOuvertes} />
          </div>

          {error ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              {error}
            </div>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Retours utilisateur sur la période
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cliquez une ligne pour le diagnostic complet (perf, écrans, logs
              Android anonymisés).
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Horodatage</th>
                    <th className="px-3 py-2 text-left font-medium">Catégorie</th>
                    <th className="px-3 py-2 text-left font-medium">Message</th>
                    <th className="px-3 py-2 text-left font-medium">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        Aucun retour utilisateur sur la période.
                      </td>
                    </tr>
                  ) : (
                    rows.slice(0, 100).map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30"
                        onClick={() => openFeedbackDetail(row.crash)}
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300">
                          {formatTs(row.timestamp)}
                        </td>
                        <td className="px-3 py-2 capitalize">{row.category}</td>
                        <td className="max-w-xl truncate px-3 py-2" title={row.message}>
                          {row.message}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{row.source}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Erreurs applicatives (auto-remontées)
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Erreurs réseau, API et crash remontées automatiquement par
                  l&apos;app. Cliquez une ligne pour le détail.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1.5 text-sm">
                  <span className="text-gray-500">Statut</span>
                  <select
                    value={errorStatusFilter}
                    onChange={(e) =>
                      setErrorStatusFilter(e.target.value as ErrorStatusFilter)
                    }
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                  >
                    <option value="all">Toutes</option>
                    <option value="open">Ouvertes</option>
                    <option value="resolved">Traitées</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <span className="text-gray-500">Tri</span>
                  <select
                    value={errorSort}
                    onChange={(e) => setErrorSort(e.target.value as ErrorSort)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                  >
                    <option value="newest">Plus récentes</option>
                    <option value="oldest">Plus anciennes</option>
                    <option value="severity">Gravité</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Horodatage</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Message</th>
                    <th className="px-3 py-2 text-left font-medium">Gravité</th>
                    <th className="px-3 py-2 text-left font-medium">Statut</th>
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredErrors.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        Aucune erreur auto sur la période.
                      </td>
                    </tr>
                  ) : (
                    filteredErrors.slice(0, 100).map((err) => (
                      <tr
                        key={err.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30"
                        onClick={() => openErrorDetail(err)}
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300">
                          {formatTs(err.timestamp)}
                        </td>
                        <td className="px-3 py-2">{err.errorName || err.errorType}</td>
                        <td className="max-w-md truncate px-3 py-2" title={err.errorMessage}>
                          {err.errorMessage}
                        </td>
                        <td className="px-3 py-2">{err.severity}</td>
                        <td className="px-3 py-2">
                          {err.resolved ? (
                            <span className="text-green-600 dark:text-green-400">Traité</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">Ouvert</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            disabled={resolvingId === err.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleErrorResolved(err);
                            }}
                            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-900"
                          >
                            {err.resolved ? "Rouvrir" : "Marquer traité"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <AnalyticsRecordDetailDialog
        open={detailRecord != null}
        title={detailTitle}
        record={detailRecord}
        onClose={() => {
          setDetailRecord(null);
          setDetailTitle("");
        }}
      />
    </AnalyticsPageShell>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

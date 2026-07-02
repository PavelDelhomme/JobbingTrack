"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TimeRangeSelector, ChartPeriodCaption } from "@/components/analytics";
import { AnalyticsRecordDetailDialog } from "@/components/analytics/AnalyticsRecordDetailDialog";
import { useRegisterBackofficeRefresh } from "@/hooks/useRegisterBackofficeRefresh";
import { useApplicationTimeRange } from "@/app/(admin)/backoffice/analytics/application/useApplicationTimeRange";
import {
  fetchApplicationErrors,
  fetchCrashReports,
  purgeCrashReports,
  purgeMobileMonitoringData,
  resolveApplicationError,
  type ApplicationAnalyticsError,
  type CrashReportSummary,
} from "@/lib/services/applicationAnalyticsService";
import {
  crashReportDetailRecord,
  enrichCrashDetailRecord,
  feedbackCategoryFromCrash,
  isMonitoringTestOrSmokeCrash,
  isMonitoringTestOrSmokeError,
  isUserFeedbackCrash,
} from "@/lib/analytics/mobileFeedback";
import {
  crashScreenLabel,
  crashUserLabel,
  matchesSearch,
  paginateSlice,
} from "@/lib/analytics/mobileMonitoringTableUtils";
import {
  PaginationBar,
  TableSearchFilter,
} from "@/components/analytics/MobileMonitoringTableControls";

function formatTs(value: string | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errorTimestamp(err: ApplicationAnalyticsError): string {
  return err.timestamp || (err as { createdAt?: string }).createdAt || "";
}

function stripFeedbackPrefix(message: string) {
  return message.replace(/^\[(bug|suggestion|signalement)\]\s/i, "").trim();
}

function TestDataBadge() {
  return (
    <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
      test
    </span>
  );
}

type ErrorStatusFilter = "all" | "open" | "resolved";
type ErrorSort = "newest" | "oldest" | "severity";
type FeedbackCategoryFilter = "all" | "bug" | "suggestion" | "signalement";

type MobileApplicationMonitoringPanelProps = {
  liveRefreshMs?: number;
  showDevPurgeButton?: boolean;
  /** Aligné sur le compteur vue d'ensemble (7 j par défaut). */
  defaultTimeRange?: import("@/components/analytics").TimeRangeOption;
  /** Filtre initial erreurs (ex. lien depuis carte « Erreurs ouvertes »). */
  initialErrorStatusFilter?: ErrorStatusFilter;
};

export function MobileApplicationMonitoringPanel({
  liveRefreshMs = 20000,
  showDevPurgeButton = false,
  defaultTimeRange = "7d",
  initialErrorStatusFilter = "open",
}: MobileApplicationMonitoringPanelProps) {
  const range = useApplicationTimeRange({
    liveRefreshMs,
    initialTimeRange: defaultTimeRange,
  });
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
  const [allCrashes, setAllCrashes] = useState<CrashReportSummary[]>([]);
  const [appErrors, setAppErrors] = useState<ApplicationAnalyticsError[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [errorStatusFilter, setErrorStatusFilter] =
    useState<ErrorStatusFilter>(initialErrorStatusFilter);
  const [errorsTotal, setErrorsTotal] = useState(0);
  const [errorSort, setErrorSort] = useState<ErrorSort>("newest");
  const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(
    null,
  );
  const [detailTitle, setDetailTitle] = useState("");
  const [lastRefreshAt, setLastRefreshAt] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] =
    useState<FeedbackCategoryFilter>("all");
  const [autoCrashTypeFilter, setAutoCrashTypeFilter] = useState("all");
  const [pageFeedback, setPageFeedback] = useState(1);
  const [pageAuto, setPageAuto] = useState(1);
  const [pageErrors, setPageErrors] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [purging, setPurging] = useState(false);
  const [hideTestData, setHideTestData] = useState(true);
  const [resolvingAll, setResolvingAll] = useState(false);

  const loadData = useCallback(async () => {
    const silent = consumeSilentFetch();
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Session admin requise pour consulter les retours mobile.");
        setCrashes([]);
        setAllCrashes([]);
        setAppErrors([]);
        return;
      }
      const startMs = rangeStart.getTime();
      const endMs = rangeEnd.getTime();
      const inRange = (ts: string) => {
        const t = new Date(ts).getTime();
        if (Number.isNaN(t)) return true;
        return t >= startMs && t <= endMs;
      };

      const [crashesRes, errorsRes] = await Promise.all([
        fetchCrashReports(token, 500),
        fetchApplicationErrors(token, rangeQuery, {
          limit: 500,
          excludeFeedback: true,
          excludeTest: hideTestData,
        }),
      ]);

      setCrashes(
        crashesRes.filter((c) => inRange(c.timestamp)).filter(isUserFeedbackCrash),
      );
      setAllCrashes(
        crashesRes
          .filter((c) => inRange(c.timestamp))
          .filter((c) => !isUserFeedbackCrash(c)),
      );
      // Plage déjà appliquée côté API — pas de second filtre client (évite perte timezone).
      setAppErrors(errorsRes.data);
      setErrorsTotal(errorsRes.pagination?.total ?? errorsRes.data.length);
      setLastRefreshAt(new Date());
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les retours mobile.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [rangeQuery, rangeStart, rangeEnd, consumeSilentFetch, hideTestData]);

  useRegisterBackofficeRefresh(
    useCallback(() => {
      bumpSoftRefresh();
    }, [bumpSoftRefresh]),
  );

  useEffect(() => {
    void loadData();
  }, [loadData, softTick]);

  const testDataCounts = useMemo(() => {
    const feedbackTest = crashes.filter(isMonitoringTestOrSmokeCrash).length;
    const autoCrashTest = allCrashes.filter(isMonitoringTestOrSmokeCrash).length;
    const errorTest = appErrors.filter(isMonitoringTestOrSmokeError).length;
    return {
      feedback: feedbackTest,
      autoCrash: autoCrashTest,
      errors: errorTest,
      total: feedbackTest + autoCrashTest + errorTest,
    };
  }, [crashes, allCrashes, appErrors]);

  const visibleFeedbackCrashes = useMemo(
    () =>
      hideTestData
        ? crashes.filter((c) => !isMonitoringTestOrSmokeCrash(c))
        : crashes,
    [crashes, hideTestData],
  );

  const visibleAutoCrashes = useMemo(
    () =>
      hideTestData
        ? allCrashes.filter((c) => !isMonitoringTestOrSmokeCrash(c))
        : allCrashes,
    [allCrashes, hideTestData],
  );

  const visibleAppErrors = useMemo(
    () =>
      hideTestData
        ? appErrors.filter((e) => !isMonitoringTestOrSmokeError(e))
        : appErrors,
    [appErrors, hideTestData],
  );

  const stats = useMemo(() => {
    const bugs = visibleFeedbackCrashes.filter(
      (c) => feedbackCategoryFromCrash(c) === "bug",
    ).length;
    const suggestions = visibleFeedbackCrashes.filter(
      (c) => feedbackCategoryFromCrash(c) === "suggestion",
    ).length;
    const signalements = visibleFeedbackCrashes.filter(
      (c) => feedbackCategoryFromCrash(c) === "signalement",
    ).length;
    const retoursUtilisateur = visibleFeedbackCrashes.length;
    const erreursAuto = visibleAppErrors.length;
    const erreursOuvertes = visibleAppErrors.filter((e) => !e.resolved).length;

    return {
      retoursUtilisateur,
      bugs,
      suggestions,
      signalements,
      erreursAuto,
      erreursOuvertes,
    };
  }, [visibleFeedbackCrashes, visibleAppErrors]);

  const rows = useMemo(() => {
    return visibleFeedbackCrashes
      .map((c) => ({
        crash: c,
        id: c.id,
        timestamp: c.timestamp,
        category: feedbackCategoryFromCrash(c),
        message: stripFeedbackPrefix(c.message),
        screen: crashScreenLabel(c),
        user: crashUserLabel(c),
        source: "rapport mobile",
      }))
      .filter((row) => {
        if (
          feedbackCategoryFilter !== "all" &&
          row.category !== feedbackCategoryFilter
        ) {
          return false;
        }
        const blob = `${row.message} ${row.screen} ${row.user} ${row.category}`;
        return matchesSearch(blob, searchQuery);
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  }, [visibleFeedbackCrashes, searchQuery, feedbackCategoryFilter]);

  const autoCrashRows = useMemo(() => {
    return visibleAutoCrashes
      .filter((c) => {
        if (autoCrashTypeFilter !== "all" && c.crashType !== autoCrashTypeFilter) {
          return false;
        }
        const blob = `${c.message} ${c.crashType} ${crashScreenLabel(c)} ${crashUserLabel(c)}`;
        return matchesSearch(blob, searchQuery);
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  }, [visibleAutoCrashes, searchQuery, autoCrashTypeFilter]);

  const autoCrashTypes = useMemo(() => {
    return [...new Set(visibleAutoCrashes.map((c) => c.crashType))].sort();
  }, [visibleAutoCrashes]);

  const filteredErrors = useMemo(() => {
    let list = [...visibleAppErrors];
    if (errorStatusFilter === "open") {
      list = list.filter((e) => !e.resolved);
    } else if (errorStatusFilter === "resolved") {
      list = list.filter((e) => e.resolved);
    }
    list = list.filter((e) => {
      const blob = `${e.errorMessage} ${e.errorName} ${e.errorType} ${e.page ?? ""} ${e.severity}`;
      return matchesSearch(blob, searchQuery);
    });
    list.sort((a, b) => {
      const ta = errorTimestamp(a);
      const tb = errorTimestamp(b);
      if (errorSort === "oldest") {
        return new Date(ta).getTime() - new Date(tb).getTime();
      }
      if (errorSort === "severity") {
        const rank = (s: string) =>
          s === "critical" ? 0 : s === "error" ? 1 : 2;
        const diff = rank(a.severity) - rank(b.severity);
        if (diff !== 0) return diff;
      }
      return new Date(tb).getTime() - new Date(ta).getTime();
    });
    return list;
  }, [visibleAppErrors, errorStatusFilter, errorSort, searchQuery]);

  const pagedFeedback = paginateSlice(rows, pageFeedback, pageSize);
  const pagedAuto = paginateSlice(autoCrashRows, pageAuto, pageSize);
  const pagedErrors = paginateSlice(filteredErrors, pageErrors, pageSize);

  useEffect(() => {
    setPageFeedback(1);
    setPageAuto(1);
    setPageErrors(1);
  }, [searchQuery, feedbackCategoryFilter, autoCrashTypeFilter, rangeQuery, hideTestData]);

  const openFeedbackDetail = async (crash: CrashReportSummary) => {
    setDetailTitle(`Retour — ${feedbackCategoryFromCrash(crash)}`);
    const base = crashReportDetailRecord(crash);
    setDetailRecord(await enrichCrashDetailRecord(base));
  };

  const openErrorDetail = (err: ApplicationAnalyticsError) => {
    setDetailTitle(`Erreur — ${err.errorName || err.errorType}`);
    setDetailRecord({ ...err });
  };

  const purgeAllMobileMonitoring = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const ok = window.confirm(
      "Supprimer TOUTES les données mobile (retours, crashs fichiers, erreurs/events/perf DB) ? Action irréversible.",
    );
    if (!ok) return;
    setPurging(true);
    try {
      const [db, files] = await Promise.all([
        purgeMobileMonitoringData(token),
        purgeCrashReports(token),
      ]);
      alert(
        `Purge OK — DB: ${db.deletedErrors} erreurs, ${db.deletedEvents} events, ${db.deletedPerformance} perf · fichiers crash: ${files.deletedFiles}`,
      );
      await loadData();
    } catch (e) {
      console.error(e);
      alert("Échec purge — vérifiez que la stack est UP et que vous êtes admin.");
    } finally {
      setPurging(false);
    }
  };

  const resolveAllVisibleOpenErrors = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const open = filteredErrors.filter((e) => !e.resolved);
    if (open.length === 0) return;
    const ok = window.confirm(
      `Marquer ${open.length} erreur(s) visible(s) comme traitées ?`,
    );
    if (!ok) return;
    setResolvingAll(true);
    try {
      for (const err of open) {
        await resolveApplicationError(token, err.id, true);
      }
      await loadData();
    } catch (e) {
      console.error(e);
      alert("Échec lors du marquage groupé.");
    } finally {
      setResolvingAll(false);
    }
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
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <div className="flex flex-wrap items-center gap-2">
          {showDevPurgeButton ? (
            <button
              type="button"
              disabled={purging}
              onClick={() => void purgeAllMobileMonitoring()}
              className="shrink-0 rounded border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
            >
              {purging ? "Purge…" : "Purger tout (dev)"}
            </button>
          ) : null}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Actualisation live ~{Math.round(liveRefreshMs / 1000)} s · dernière mise à jour{" "}
            {formatTs(lastRefreshAt.toISOString())}
          </p>
        </div>
      </div>

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
          {errorsTotal > appErrors.length ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {errorsTotal} erreurs sur la période — affichage limité aux{" "}
              {appErrors.length} plus récentes. Réduisez la plage ou augmentez la
              limite serveur si besoin.
            </p>
          ) : errorsTotal > 0 && appErrors.length === 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {errorsTotal} erreur(s) en base sur la période mais aucune dans la
              page courante — vérifiez le filtre « Statut » (ouvrez « Toutes »).
            </p>
          ) : null}

          {hideTestData && testDataCounts.total > 0 ? (
            <p className="text-sm text-violet-800 dark:text-violet-200">
              {testDataCounts.total} entrée(s) test/smoke masquée(s) (scripts{" "}
              <code className="text-xs">seed-and-verify-mobile-monitoring-live</code>
              , smokes). Décochez « Masquer tests » pour les afficher.
            </p>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-end gap-3">
            <TableSearchFilter
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher message, écran, utilisateur…"
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={hideTestData}
                onChange={(e) => setHideTestData(e.target.checked)}
                className="rounded border-gray-300"
              />
              Masquer données test/smoke
            </label>
          </div>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Retours utilisateur sur la période
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Bug / suggestion / signalement — clic = détail (diagnostic, capture, routes).
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-sm">
                <span className="text-gray-500">Catégorie</span>
                <select
                  value={feedbackCategoryFilter}
                  onChange={(e) =>
                    setFeedbackCategoryFilter(e.target.value as FeedbackCategoryFilter)
                  }
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                >
                  <option value="all">Toutes</option>
                  <option value="bug">Bug</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="signalement">Signalement</option>
                </select>
              </label>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Horodatage</th>
                    <th className="px-3 py-2 text-left font-medium">Catégorie</th>
                    <th className="px-3 py-2 text-left font-medium">Écran</th>
                    <th className="px-3 py-2 text-left font-medium">Utilisateur</th>
                    <th className="px-3 py-2 text-left font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pagedFeedback.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        Aucun retour sur la période (ou filtre actif).
                      </td>
                    </tr>
                  ) : (
                    pagedFeedback.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30"
                        onClick={() => void openFeedbackDetail(row.crash)}
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300">
                          {formatTs(row.timestamp)}
                        </td>
                        <td className="px-3 py-2 capitalize">{row.category}</td>
                        <td className="max-w-[8rem] truncate px-3 py-2" title={row.screen}>
                          {row.screen}
                        </td>
                        <td className="max-w-[10rem] truncate px-3 py-2" title={row.user}>
                          {row.user}
                        </td>
                        <td className="max-w-xl truncate px-3 py-2" title={row.message}>
                          {row.message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <PaginationBar
                page={pageFeedback}
                pageSize={pageSize}
                totalItems={rows.length}
                onPageChange={setPageFeedback}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPageFeedback(1);
                }}
              />
            </div>
          </section>

          <section className="mt-8 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Crashs auto (fichiers gateway)
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  FlutterError, UncaughtError, etc.
                </p>
              </div>
              {autoCrashTypes.length > 0 ? (
                <label className="flex items-center gap-1.5 text-sm">
                  <span className="text-gray-500">Type</span>
                  <select
                    value={autoCrashTypeFilter}
                    onChange={(e) => setAutoCrashTypeFilter(e.target.value)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                  >
                    <option value="all">Tous</option>
                    {autoCrashTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Horodatage</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Écran</th>
                    <th className="px-3 py-2 text-left font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pagedAuto.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        Aucun crash auto sur la période.
                      </td>
                    </tr>
                  ) : (
                    pagedAuto.map((c) => (
                      <tr
                        key={c.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30"
                        onClick={() => void openFeedbackDetail(c)}
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300">
                          {formatTs(c.timestamp)}
                        </td>
                        <td className="px-3 py-2">{c.crashType}</td>
                        <td className="max-w-[8rem] truncate px-3 py-2">
                          {crashScreenLabel(c)}
                        </td>
                        <td className="max-w-xl truncate px-3 py-2" title={c.message}>
                          {c.message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <PaginationBar
                page={pageAuto}
                pageSize={pageSize}
                totalItems={autoCrashRows.length}
                onPageChange={setPageAuto}
              />
            </div>
          </section>

          <section className="mt-8 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Erreurs applicatives (auto-remontées)
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Crash, API et réseau remontés automatiquement par l&apos;app connectée.
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
                {filteredErrors.some((e) => !e.resolved) ? (
                  <button
                    type="button"
                    disabled={resolvingAll}
                    onClick={() => void resolveAllVisibleOpenErrors()}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900"
                  >
                    {resolvingAll ? "Traitement…" : "Tout marquer traité"}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Horodatage</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Page</th>
                    <th className="px-3 py-2 text-left font-medium">Message</th>
                    <th className="px-3 py-2 text-left font-medium">Gravité</th>
                    <th className="px-3 py-2 text-left font-medium">Statut</th>
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pagedErrors.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        Aucune erreur auto sur la période.
                      </td>
                    </tr>
                  ) : (
                    pagedErrors.map((err) => (
                      <tr
                        key={err.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30"
                        onClick={() => openErrorDetail(err)}
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300">
                          {formatTs(errorTimestamp(err))}
                        </td>
                        <td className="px-3 py-2">{err.errorName || err.errorType}</td>
                        <td className="max-w-[8rem] truncate px-3 py-2" title={err.page ?? ""}>
                          {err.page ?? "—"}
                        </td>
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
              <PaginationBar
                page={pageErrors}
                pageSize={pageSize}
                totalItems={filteredErrors.length}
                onPageChange={setPageErrors}
              />
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
    </>
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

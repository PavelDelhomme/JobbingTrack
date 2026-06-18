"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TimeRangeSelector, ChartPeriodCaption } from "@/components/analytics";
import { AnalyticsPageShell } from "../ApplicationSubNav";
import { useApplicationTimeRange } from "../useApplicationTimeRange";
import {
  fetchApplicationEvents,
  fetchCrashReports,
  type ApplicationAnalyticsEvent,
  type CrashReportSummary,
} from "@/lib/services/applicationAnalyticsService";

function formatTs(value: string) {
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return value;
  }
}

function feedbackCategoryFromCrash(crash: CrashReportSummary): string {
  const meta = crash.metadata ?? {};
  const cat = meta.category as string | undefined;
  if (cat) return cat;
  const msg = crash.message || "";
  const m = msg.match(/^\[([^\]]+)\]/);
  return m?.[1] ?? crash.crashType ?? "retour";
}

export default function ApplicationFeedbackPage() {
  const range = useApplicationTimeRange();
  const {
    rangeQuery,
    consumeSilentFetch,
    softTick,
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
    rangeStart,
    rangeEnd,
  } = range;
  const [loading, setLoading] = useState(true);
  const [feedbackEvents, setFeedbackEvents] = useState<ApplicationAnalyticsEvent[]>(
    [],
  );
  const [crashes, setCrashes] = useState<CrashReportSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const silent = consumeSilentFetch();
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Session admin requise pour consulter les retours mobile.");
        setFeedbackEvents([]);
        setCrashes([]);
        return;
      }
      const [eventsRes, crashesRes] = await Promise.all([
        fetchApplicationEvents(token, rangeQuery, {
          eventType: "feedback",
        }),
        fetchCrashReports(token, 200),
      ]);
      const startMs = rangeStart.getTime();
      const endMs = rangeEnd.getTime();
      const inRange = (ts: string) => {
        const t = new Date(ts).getTime();
        return t >= startMs && t <= endMs;
      };
      setFeedbackEvents(eventsRes.data.filter((e) => inRange(e.timestamp)));
      setCrashes(
        crashesRes
          .filter((c) => inRange(c.timestamp))
          .filter((c) => {
            const meta = c.metadata ?? {};
            return meta.feedback === true || String(c.message || "").includes("[");
          }),
      );
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les retours mobile.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [rangeQuery, rangeStart, rangeEnd, consumeSilentFetch]);

  useEffect(() => {
    void loadData();
  }, [loadData, softTick]);

  const stats = useMemo(() => {
    const bugs = crashes.filter((c) =>
      feedbackCategoryFromCrash(c).toLowerCase().includes("bug"),
    ).length;
    const suggestions = crashes.filter((c) =>
      feedbackCategoryFromCrash(c).toLowerCase().includes("suggestion"),
    ).length;
    const signalements = crashes.filter((c) =>
      feedbackCategoryFromCrash(c).toLowerCase().includes("signalement"),
    ).length;
    return {
      total: crashes.length + feedbackEvents.length,
      bugs,
      suggestions,
      signalements,
      analyticsOnly: feedbackEvents.length,
    };
  }, [crashes, feedbackEvents]);

  const rows = useMemo(() => {
    const fromCrashes = crashes.map((c) => ({
      id: c.id,
      timestamp: c.timestamp,
      category: feedbackCategoryFromCrash(c),
      message: c.message,
      source: c.source || "crash-report",
    }));
    const fromEvents = feedbackEvents.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      category: e.eventName,
      message: `Événement analytics (${e.eventName})`,
      source: "analytics",
    }));
    return [...fromCrashes, ...fromEvents].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [crashes, feedbackEvents]);

  return (
    <AnalyticsPageShell
      title="Application — retours & signalements"
      description={
        <p>
          Bugs, suggestions et signalements envoyés depuis l&apos;app mobile
          (formulaire Paramètres) — agrégés avec les événements analytics
          associés.
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
        />
      }
      backHref="/backoffice/analytics"
      showApplicationSubNav
    >
      <ChartPeriodCaption label={rangeLabel} />

      {loading && rows.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center text-gray-500 dark:text-gray-400 sm:h-64">
          Chargement…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
            <StatCard label="Total retours" value={stats.total} />
            <StatCard label="Bugs" value={stats.bugs} />
            <StatCard label="Suggestions" value={stats.suggestions} />
            <StatCard label="Signalements" value={stats.signalements} />
            <StatCard label="Événements analytics" value={stats.analyticsOnly} />
          </div>

          {error ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              {error}
            </div>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Retours sur la période
            </h2>
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
                        Aucun retour sur la période — utilisez Paramètres → Aide
                        &amp; retours dans l&apos;app mobile.
                      </td>
                    </tr>
                  ) : (
                    rows.slice(0, 100).map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
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
        </>
      )}
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

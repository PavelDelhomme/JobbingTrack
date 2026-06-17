"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TimeRangeSelector, ChartPeriodCaption } from "@/components/analytics";
import { AnalyticsPageShell } from "../ApplicationSubNav";
import { useApplicationTimeRange } from "../useApplicationTimeRange";
import {
  fetchApplicationEvents,
  fetchApplicationPerformance,
  type ApplicationAnalyticsEvent,
  type ApplicationPerformanceMetric,
} from "@/lib/services/applicationAnalyticsService";

function formatTs(value: string) {
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return value;
  }
}

export default function ApplicationActivityPage() {
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
  const [events, setEvents] = useState<ApplicationAnalyticsEvent[]>([]);
  const [performances, setPerformances] = useState<ApplicationPerformanceMetric[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const silent = consumeSilentFetch();
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Session admin requise pour consulter les traces mobile.");
        setEvents([]);
        setPerformances([]);
        return;
      }
      const [navRes, traceRes, perfRes] = await Promise.all([
        fetchApplicationEvents(token, rangeQuery, {
          eventType: "navigation",
        }),
        fetchApplicationEvents(token, rangeQuery, { eventType: "trace" }),
        fetchApplicationPerformance(token, rangeQuery),
      ]);
      setEvents([...navRes, ...traceRes].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ));
      setPerformances(perfRes);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les traces mobile (API analytics).");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [rangeQuery, consumeSilentFetch]);

  useEffect(() => {
    void loadData();
  }, [loadData, softTick]);

  const stats = useMemo(() => {
    const screens = new Set(
      events
        .filter((e) => e.eventName === "screen_view" && e.page)
        .map((e) => e.page as string),
    );
    const devices = new Set(
      events.map((e) => e.deviceId).filter(Boolean) as string[],
    );
    const traceBatches = events.filter((e) => e.eventType === "trace").length;
    const avgLatency =
      performances
        .filter((p) => p.metricType === "api_latency" && p.duration != null)
        .reduce((sum, p, _, arr) => sum + (p.duration || 0) / arr.length, 0) ||
      null;
    return {
      screenViews: events.filter(
        (e) => e.eventType === "navigation" && e.eventName === "screen_view",
      ).length,
      uniqueScreens: screens.size,
      traceBatches,
      devices: devices.size,
      perfSamples: performances.length,
      avgLatency,
    };
  }, [events, performances]);

  return (
    <AnalyticsPageShell
      title="Application — activité & traces"
      description={
        <p>
          Navigation mobile anonyme, lots de traces d&apos;activité et
          échantillons de performance remontés par l&apos;app Flutter (consentement
          utilisateur requis côté mobile).
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

      {loading && events.length === 0 && performances.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center text-gray-500 dark:text-gray-400 sm:h-64">
          Chargement…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Vues d'écran" value={stats.screenViews} />
            <StatCard label="Écrans uniques" value={stats.uniqueScreens} />
            <StatCard label="Lots de traces" value={stats.traceBatches} />
            <StatCard label="Appareils" value={stats.devices} />
            <StatCard label="Métriques perf." value={stats.perfSamples} />
            <StatCard
              label="Latence API moy."
              value={
                stats.avgLatency != null
                  ? `${Math.round(stats.avgLatency)} ms`
                  : "—"
              }
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              {error}
            </div>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Événements récents (mobile)
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Horodatage</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Nom</th>
                    <th className="px-3 py-2 text-left font-medium">Page</th>
                    <th className="px-3 py-2 text-left font-medium">Appareil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {events.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        Aucune trace sur la période — activez la télémétrie dans
                        l&apos;app mobile puis naviguez quelques écrans.
                      </td>
                    </tr>
                  ) : (
                    events.slice(0, 100).map((ev) => (
                      <tr key={ev.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300">
                          {formatTs(ev.timestamp)}
                        </td>
                        <td className="px-3 py-2">{ev.eventType}</td>
                        <td className="px-3 py-2">{ev.eventName}</td>
                        <td className="max-w-[12rem] truncate px-3 py-2" title={ev.page ?? ""}>
                          {ev.page || "—"}
                        </td>
                        <td className="max-w-[8rem] truncate px-3 py-2 font-mono text-xs" title={ev.deviceId ?? ""}>
                          {ev.deviceId ? ev.deviceId.slice(-8) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Performances mobile (échantillons)
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Horodatage</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Métrique</th>
                    <th className="px-3 py-2 text-left font-medium">Valeur</th>
                    <th className="px-3 py-2 text-left font-medium">Page</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {performances.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        Aucune métrique de performance sur la période.
                      </td>
                    </tr>
                  ) : (
                    performances.slice(0, 50).map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300">
                          {formatTs(p.timestamp)}
                        </td>
                        <td className="px-3 py-2">{p.metricType}</td>
                        <td className="px-3 py-2">{p.metricName}</td>
                        <td className="px-3 py-2">
                          {p.duration != null
                            ? `${p.duration} ms`
                            : p.memoryUsage != null
                              ? `${Math.round(p.memoryUsage)}`
                              : p.value != null
                                ? String(p.value)
                                : "—"}
                        </td>
                        <td className="max-w-[12rem] truncate px-3 py-2">{p.page || "—"}</td>
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

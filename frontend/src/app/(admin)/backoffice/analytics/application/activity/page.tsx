"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TimeRangeSelector, ChartPeriodCaption } from "@/components/analytics";
import { AnalyticsRecordDetailDialog } from "@/components/analytics/AnalyticsRecordDetailDialog";
import { Pagination } from "@/components/ui/Pagination";
import { useRegisterBackofficeRefresh } from "@/hooks/useRegisterBackofficeRefresh";
import { AnalyticsPageShell } from "../ApplicationSubNav";
import { useApplicationTimeRange } from "../useApplicationTimeRange";
import {
  fetchApplicationEvents,
  fetchApplicationPerformance,
  type ApplicationAnalyticsEvent,
  type ApplicationPerformanceMetric,
} from "@/lib/services/applicationAnalyticsService";
import { formatPerfMetricValue } from "@/lib/analytics/mobileFeedback";

const PAGE_SIZE = 15;

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
  } = range;

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ApplicationAnalyticsEvent[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [performances, setPerformances] = useState<ApplicationPerformanceMetric[]>([]);
  const [perfTotal, setPerfTotal] = useState(0);
  const [perfPage, setPerfPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [eventNameFilter, setEventNameFilter] = useState("all");

  const eventsPages = Math.max(1, Math.ceil(eventsTotal / PAGE_SIZE));
  const perfPages = Math.max(1, Math.ceil(perfTotal / PAGE_SIZE));

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
        setEventsTotal(0);
        setPerfTotal(0);
        return;
      }

      const eventsOffset = (eventsPage - 1) * PAGE_SIZE;
      const perfOffset = (perfPage - 1) * PAGE_SIZE;

      const [eventsRes, perfRes] = await Promise.all([
        fetchApplicationEvents(token, rangeQuery, {
          limit: PAGE_SIZE,
          offset: eventsOffset,
          eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
          eventName: eventNameFilter !== "all" ? eventNameFilter : undefined,
        }),
        fetchApplicationPerformance(token, rangeQuery, {
          limit: PAGE_SIZE,
          offset: perfOffset,
        }),
      ]);

      setEvents(eventsRes.data);
      setEventsTotal(eventsRes.pagination.total);
      setPerformances(perfRes.data);
      setPerfTotal(perfRes.pagination.total);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les traces mobile (API analytics).");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [rangeQuery, consumeSilentFetch, eventsPage, perfPage, eventTypeFilter, eventNameFilter]);

  useRegisterBackofficeRefresh(
    useCallback(() => {
      bumpSoftRefresh();
    }, [bumpSoftRefresh]),
  );

  useEffect(() => {
    void loadData();
  }, [loadData, softTick]);

  useEffect(() => {
    setEventsPage(1);
    setPerfPage(1);
  }, [rangeQuery, eventTypeFilter, eventNameFilter]);

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
      perfSamples: perfTotal,
      avgLatency,
    };
  }, [events, performances, perfTotal]);

  const openDetail = (title: string, record: Record<string, unknown>) => {
    setDetailTitle(title);
    setDetailRecord(record);
  };

  const eventsStart = eventsTotal === 0 ? 0 : (eventsPage - 1) * PAGE_SIZE + 1;
  const eventsEnd = Math.min(eventsPage * PAGE_SIZE, eventsTotal);
  const perfStart = perfTotal === 0 ? 0 : (perfPage - 1) * PAGE_SIZE + 1;
  const perfEnd = Math.min(perfPage * PAGE_SIZE, perfTotal);

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
          onClearCustomRange={handleClearCustomRange}
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
            <StatCard label="Vues d'écran (page)" value={stats.screenViews} />
            <StatCard label="Écrans uniques (page)" value={stats.uniqueScreens} />
            <StatCard label="Lots de traces (page)" value={stats.traceBatches} />
            <StatCard label="Appareils (page)" value={stats.devices} />
            <StatCard label="Métriques perf. (total)" value={stats.perfSamples} />
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Événements
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Traces mobile (navigation, lots d&apos;activité, retours). Cliquez sur une ligne pour le détail.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="all">Tous types</option>
                  <option value="navigation">navigation</option>
                  <option value="trace">trace</option>
                  <option value="feedback">feedback</option>
                  <option value="api">api</option>
                  <option value="interaction">interaction</option>
                </select>
                <select
                  value={eventNameFilter}
                  onChange={(e) => setEventNameFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="all">Tous noms</option>
                  <option value="screen_view">screen_view</option>
                  <option value="activity_batch">activity_batch</option>
                  <option value="button_click">button_click</option>
                  <option value="api_error">api_error</option>
                </select>
              </div>
            </div>
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
                        l&apos;app mobile puis naviguez quelques écrans (connecté).
                      </td>
                    </tr>
                  ) : (
                    events.map((ev) => (
                      <tr
                        key={ev.id}
                        className="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/20"
                        onClick={() =>
                          openDetail(`Événement · ${ev.eventName}`, ev as unknown as Record<string, unknown>)
                        }
                      >
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
            <Pagination
              currentPage={eventsPage}
              totalPages={eventsPages}
              totalItems={eventsTotal}
              itemsPerPage={PAGE_SIZE}
              startIndex={eventsStart}
              endIndex={eventsEnd}
              onPageChange={setEventsPage}
              onNext={() => setEventsPage((p) => Math.min(p + 1, eventsPages))}
              onPrevious={() => setEventsPage((p) => Math.max(p - 1, 1))}
              canGoNext={eventsPage < eventsPages}
              canGoPrevious={eventsPage > 1}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Performances mobile (échantillons)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Échantillons paginés — clic sur une ligne pour mémoire, latence, CPU, session, etc.
            </p>
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
                    performances.map((p) => (
                      <tr
                        key={p.id}
                        className="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/20"
                        onClick={() =>
                          openDetail(`Performance · ${p.metricName}`, p as unknown as Record<string, unknown>)
                        }
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300">
                          {formatTs(p.timestamp)}
                        </td>
                        <td className="px-3 py-2">{p.metricType}</td>
                        <td className="px-3 py-2">{p.metricName}</td>
                        <td className="px-3 py-2">{formatPerfMetricValue(p)}</td>
                        <td className="max-w-[12rem] truncate px-3 py-2">{p.page || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={perfPage}
              totalPages={perfPages}
              totalItems={perfTotal}
              itemsPerPage={PAGE_SIZE}
              startIndex={perfStart}
              endIndex={perfEnd}
              onPageChange={setPerfPage}
              onNext={() => setPerfPage((p) => Math.min(p + 1, perfPages))}
              onPrevious={() => setPerfPage((p) => Math.max(p - 1, 1))}
              canGoNext={perfPage < perfPages}
              canGoPrevious={perfPage > 1}
            />
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

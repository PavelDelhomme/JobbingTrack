"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TimeRangeSelector, ChartPeriodCaption } from "@/components/analytics";
import { AnalyticsPageShell } from "../ApplicationSubNav";
import { useApplicationTimeRange } from "../useApplicationTimeRange";
import { useRegisterBackofficeRefresh } from "@/hooks/useRegisterBackofficeRefresh";
import {
  fetchApplicationErrors,
  fetchApplicationPerformance,
  type ApplicationPerformanceMetric,
} from "@/lib/services/applicationAnalyticsService";
import {
  formatMemoryBytes,
  formatPerfMetricValue,
} from "@/lib/analytics/mobileFeedback";

function formatTs(value: string) {
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return value;
  }
}

function latestSnapshot(
  rows: ApplicationPerformanceMetric[],
): ApplicationPerformanceMetric | undefined {
  return rows.find((p) => p.metricType === "mobile_snapshot");
}

export default function ApplicationPerformancePage() {
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
  const [metrics, setMetrics] = useState<ApplicationPerformanceMetric[]>([]);
  const [metricsTotal, setMetricsTotal] = useState(0);
  const [openErrors, setOpenErrors] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const silent = consumeSilentFetch();
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Session admin requise.");
        setMetrics([]);
        setMetricsTotal(0);
        setOpenErrors(0);
        return;
      }
      const [perfRes, errRes] = await Promise.all([
        fetchApplicationPerformance(token, rangeQuery, { limit: 500 }),
        fetchApplicationErrors(token, rangeQuery, {
          limit: 200,
          resolved: false,
          excludeFeedback: true,
        }),
      ]);
      setMetrics(perfRes.data);
      setMetricsTotal(perfRes.pagination.total);
      setOpenErrors(errRes.pagination.total);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les métriques mobile.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [rangeQuery, consumeSilentFetch]);

  useRegisterBackofficeRefresh(
    useCallback(() => {
      bumpSoftRefresh();
    }, [bumpSoftRefresh]),
  );

  useEffect(() => {
    void loadData();
  }, [loadData, softTick]);

  const kpis = useMemo(() => {
    const snapshots = metrics.filter((p) => p.metricType === "mobile_snapshot");
    const latest = latestSnapshot(metrics);
    const latencies = metrics.filter(
      (p) => p.metricType === "api_latency" && p.duration != null,
    );
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((s, p) => s + (p.duration || 0), 0) /
          latencies.length
        : null;
    const devices = new Set(
      snapshots.map((p) => p.deviceId).filter(Boolean),
    ).size;

    return {
      memory: formatMemoryBytes(
        latest?.memoryUsage ?? latest?.value ?? null,
      ),
      sessionMin: latest?.duration
        ? `${Math.round(latest.duration / 60000)} min`
        : "—",
      avgLatency:
        avgLatency != null ? `${Math.round(avgLatency)} ms` : "—",
      snapshots: snapshots.length,
      devices,
    };
  }, [metrics]);

  return (
    <AnalyticsPageShell
      title="Application — performances live"
      description={
        <p>
          Métriques remontées par l&apos;app mobile (mémoire RSS, durée de
          session, latence API, compteurs) — consentement télémétrie requis.
          RSS ~400–500 Mo est normal sur Android (heap Dart + moteur). Les
          indicateurs infra Docker sont sur{" "}
          <span className="font-medium">Performances (infra)</span>.
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

      {loading && metrics.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center text-gray-500 dark:text-gray-400 sm:h-64">
          Chargement…
        </div>
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Mémoire RSS (dernier snapshot)" value={kpis.memory} />
            <StatCard label="Session (durée)" value={kpis.sessionMin} />
            <StatCard label="Latence API moy." value={kpis.avgLatency} />
            <StatCard label="Snapshots session" value={kpis.snapshots} />
            <StatCard label="Appareils (snapshots)" value={kpis.devices} />
            <StatCard label="Erreurs ouvertes" value={openErrors} />
          </div>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {metricsTotal} échantillon(s) sur la période — flush mobile toutes les
            5 min si télémétrie performances active. Utilisez Actions → Actualiser
            ou l&apos;icône à côté de la recherche.
          </p>

          <section className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Derniers échantillons
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
                    <th className="px-3 py-2 text-left font-medium">Appareil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {metrics.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        Aucune métrique mobile — connectez-vous sur l&apos;app avec
                        télémétrie performances activée.
                      </td>
                    </tr>
                  ) : (
                    metrics.slice(0, 50).map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-300">
                          {formatTs(p.timestamp)}
                        </td>
                        <td className="px-3 py-2">{p.metricType}</td>
                        <td className="px-3 py-2">{p.metricName}</td>
                        <td className="px-3 py-2">{formatPerfMetricValue(p)}</td>
                        <td className="max-w-[10rem] truncate px-3 py-2">
                          {p.page || "—"}
                        </td>
                        <td
                          className="max-w-[8rem] truncate px-3 py-2 font-mono text-xs"
                          title={p.deviceId ?? ""}
                        >
                          {p.deviceId ? p.deviceId.slice(0, 8) : "—"}
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

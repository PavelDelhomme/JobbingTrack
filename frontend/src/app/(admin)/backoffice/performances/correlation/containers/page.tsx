"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AdminLayout } from "@/components/features";
import { PerformancesSubNav } from "../../PerformancesSubNav";
import { CorrelationSubNav } from "@/components/performances/correlation/CorrelationSubNav";
import { analyticsService } from "@/lib/api/analytics.service";
import {
  metricRowToTimeMs,
  normalizeMetricTimestampToIso,
} from "@/lib/utils/date";
import {
  mergeSystemNearestOntoContainer,
  parseContainerHistoryRow,
  pickInitialFocusService,
  pushLoadedOrder,
  readNumericField,
  shortContainerName,
  type ContainerPoint,
  type MergedServicePoint,
  type SystemPoint,
} from "@/lib/monitoring/correlationContainerMetrics";
import {
  computeQueryBounds,
  hoursBetween,
  limitsForCorrelationMode,
  scaledFetchLimits,
  toDatetimeLocalValue,
  type CorrelationPerfMode,
  type CorrelationWindowMode,
} from "@/lib/monitoring/correlationTimeRange";

const ServiceSignalsChart = dynamic(
  () =>
    import("@/components/performances/correlation/ServiceSignalsChart").then(
      (m) => m.ServiceSignalsChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-400">
        Chargement des courbes…
      </div>
    ),
  },
);

const ContainerMetricsComparison = dynamic(
  () =>
    import("@/components/performances/correlation/ContainerMetricsComparison").then(
      (m) => m.ContainerMetricsComparison,
    ),
  { ssr: false },
);

const PeaksSummaryTable = dynamic(
  () =>
    import("@/components/performances/correlation/ServiceSignalsChart").then(
      (m) => m.PeaksSummaryTable,
    ),
  { ssr: false },
);

const PERF_MODE_STORAGE_KEY = "jobbingtrack-perf-correlation-mode";
const FETCH_CONCURRENCY = 3;
const MERGE_SYSTEM_MAX_DELTA_MS = 180_000;

async function promisePool<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    out.push(...(await Promise.all(chunk.map(mapper))));
  }
  return out;
}

async function settleMetricCall<T>(
  promise: Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

function readStoredPerfMode(): CorrelationPerfMode {
  if (typeof window === "undefined") return "light";
  try {
    const v = window.sessionStorage.getItem(PERF_MODE_STORAGE_KEY);
    return v === "full" ? "full" : "light";
  } catch {
    return "light";
  }
}

export default function CorrelationContainersPage() {
  const [perfMode, setPerfMode] = useState<CorrelationPerfMode>("light");
  const limits = useMemo(() => limitsForCorrelationMode(perfMode), [perfMode]);
  const bootstrappedRef = useRef(false);
  const loadAbortRef = useRef<AbortController | null>(null);
  const historiesAbortRef = useRef<AbortController | null>(null);
  const containerRowsRef = useRef<Record<string, ContainerPoint[]>>({});
  const historyRangeKeyRef = useRef<string | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [historiesLoading, setHistoriesLoading] = useState(false);
  const [containers, setContainers] = useState<string[]>([]);
  const [focusName, setFocusName] = useState<string | null>(null);
  const [loadedOrder, setLoadedOrder] = useState<string[]>([]);
  const [listFilter, setListFilter] = useState("");
  const [bulkHint, setBulkHint] = useState<string | null>(null);
  const [systemRows, setSystemRows] = useState<SystemPoint[]>([]);
  const [containerRows, setContainerRows] = useState<
    Record<string, ContainerPoint[]>
  >({});

  const [windowMode, setWindowMode] = useState<CorrelationWindowMode>("preset");
  const [presetHours, setPresetHours] = useState(24);
  const [appliedCustom, setAppliedCustom] = useState<{
    startIso: string;
    endIso: string;
  } | null>(null);
  const [customStartInput, setCustomStartInput] = useState("");
  const [customEndInput, setCustomEndInput] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    setPerfMode(readStoredPerfMode());
  }, []);

  useEffect(() => {
    containerRowsRef.current = containerRows;
  }, [containerRows]);

  const persistPerfMode = (mode: CorrelationPerfMode) => {
    setPerfMode(mode);
    try {
      window.sessionStorage.setItem(PERF_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const activeBounds = computeQueryBounds({
    windowMode,
    presetHours,
    appliedCustom,
  });
  const activeBoundsLabel = `${activeBounds.start.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  })} → ${activeBounds.end.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`;

  const load = useCallback(async () => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    setInitialLoading(true);
    try {
      const bounds = computeQueryBounds({
        windowMode,
        presetHours,
        appliedCustom,
      });
      const hours = hoursBetween(bounds.start, bounds.end);
      const fetchLimits = scaledFetchLimits(hours, limits);
      const [systemHistory, rawContainers] = await Promise.all([
        analyticsService.getSystemMetricsHistory({
          startDate: bounds.start.toISOString(),
          endDate: bounds.end.toISOString(),
          limit: fetchLimits.systemHistoryLimit,
          offset: 0,
          signal: controller.signal,
        }),
        analyticsService.getContainersList({
          timeoutMs: 45_000,
          signal: controller.signal,
        }),
      ]);
      if (controller.signal.aborted) return;

      const names = (rawContainers || [])
        .map((c) => c.name)
        .filter(
          (n): n is string =>
            typeof n === "string" && n.startsWith("jobbingtrack-"),
        );
      setContainers(names);

      if (!bootstrappedRef.current && names.length > 0) {
        bootstrappedRef.current = true;
        const first = pickInitialFocusService(names);
        setFocusName(first);
        setLoadedOrder(first ? [first] : []);
      } else {
        setFocusName((prev) => {
          if (prev && names.includes(prev)) return prev;
          return names[0] ?? null;
        });
        setLoadedOrder((prev) => {
          const kept = prev
            .filter((n) => names.includes(n))
            .slice(-limits.maxHistoriesLoaded);
          if (kept.length > 0) return kept;
          return names[0] ? [names[0]] : [];
        });
      }

      const normalizedSystem: SystemPoint[] = (systemHistory || [])
        .map((r) => {
          const ts = normalizeMetricTimestampToIso(String(r.timestamp ?? ""));
          const timeMs = metricRowToTimeMs(r, ts);
          if (!ts || timeMs == null) return null;
          return {
            timeMs,
            timestamp: ts,
            system_cpu: readNumericField(r, [
              "cpuUsagePercent",
              "cpu_usage_percent",
              "cpu",
            ]),
            system_memory: readNumericField(r, [
              "memoryUsagePercent",
              "memory_usage_percent",
              "memory_percent",
            ]),
          };
        })
        .filter((x): x is SystemPoint => x != null)
        .sort((a, b) => a.timeMs - b.timeMs);

      setSystemRows(normalizedSystem);
    } finally {
      if (!controller.signal.aborted) setInitialLoading(false);
    }
  }, [appliedCustom, limits, presetHours, windowMode]);

  useEffect(() => {
    void load();
    return () => loadAbortRef.current?.abort();
  }, [load]);

  useEffect(() => {
    if (loadedOrder.length === 0) return;
    historiesAbortRef.current?.abort();
    const controller = new AbortController();
    historiesAbortRef.current = controller;
    setHistoriesLoading(true);

    (async () => {
      try {
        const bounds = computeQueryBounds({
          windowMode,
          presetHours,
          appliedCustom,
        });
        const hours = hoursBetween(bounds.start, bounds.end);
        const fetchLimits = scaledFetchLimits(hours, limits);
        const opts = {
          startDate: bounds.start.toISOString(),
          endDate: bounds.end.toISOString(),
          limit: fetchLimits.historyLimit,
          offset: 0,
        };
        const rangeKey = [opts.startDate, opts.endDate, fetchLimits.historyLimit].join(
          "|",
        );
        const refreshAll = historyRangeKeyRef.current !== rangeKey;
        historyRangeKeyRef.current = rangeKey;
        const namesToFetch = refreshAll
          ? loadedOrder
          : loadedOrder.filter(
              (name) => (containerRowsRef.current[name]?.length ?? 0) === 0,
            );

        if (namesToFetch.length === 0) {
          setHistoriesLoading(false);
          return;
        }

        const results = await promisePool(
          namesToFetch,
          FETCH_CONCURRENCY,
          async (name) => {
            const rows = await settleMetricCall(
              analyticsService.getContainerMetricsHistory(name, {
                ...opts,
                signal: controller.signal,
              }),
              [] as Record<string, unknown>[],
            );
            const parsed = (rows || [])
              .map((r) => parseContainerHistoryRow(r))
              .filter((x): x is ContainerPoint => x != null);
            return { name, parsed };
          },
        );

        if (controller.signal.aborted) return;
        setContainerRows((prev) => {
          const next = refreshAll ? { ...prev } : { ...prev };
          for (const { name, parsed } of results) {
            next[name] = parsed;
          }
          return next;
        });
      } finally {
        if (!controller.signal.aborted) setHistoriesLoading(false);
      }
    })();

    return () => controller.abort();
  }, [appliedCustom, limits, loadedOrder, presetHours, windowMode]);

  const mergedByContainer = useMemo(() => {
    const map: Record<string, MergedServicePoint[]> = {};
    for (const name of loadedOrder) {
      const rows = containerRows[name] ?? [];
      if (rows.length === 0) continue;
      const withSystem = mergeSystemNearestOntoContainer(
        rows,
        systemRows,
        MERGE_SYSTEM_MAX_DELTA_MS,
      );
      map[name] = withSystem.map((r) => ({ ...r, responseTimeMs: null }));
    }
    return map;
  }, [containerRows, loadedOrder, systemRows]);

  const filteredList = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    if (!q) return containers;
    return containers.filter((name) =>
      shortContainerName(name).toLowerCase().includes(q),
    );
  }, [containers, listFilter]);

  const onSelectService = useCallback(
    (name: string) => {
      setFocusName(name);
      setLoadedOrder((prev) =>
        pushLoadedOrder(prev, name, limits.maxHistoriesLoaded),
      );
    },
    [limits.maxHistoriesLoaded],
  );

  const loadAllFiltered = useCallback(() => {
    const all = filteredList;
    const cap = limits.maxHistoriesLoaded;
    if (all.length === 0) return;
    setBulkHint(null);
    setLoadedOrder(all.slice(0, cap));
    if (all.length > cap) {
      setBulkHint(
        `${all.length} correspondances, ${cap} chargés (plafond ${cap}). Réduisez le filtre pour en couvrir d'autres.`,
      );
    }
  }, [filteredList, limits.maxHistoriesLoaded]);

  const clearAllLoaded = useCallback(() => {
    setLoadedOrder([]);
    setBulkHint(null);
  }, []);

  const enterCustomRangeDefaults = () => {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 3600 * 1000);
    setWindowMode("custom");
    setCustomStartInput(toDatetimeLocalValue(start));
    setCustomEndInput(toDatetimeLocalValue(end));
    setRangeError(null);
  };

  const applyCustomRangeFromInputs = () => {
    const start = new Date(customStartInput);
    const end = new Date(customEndInput);
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      start >= end
    ) {
      setRangeError("Plage invalide : vérifiez début < fin.");
      return;
    }
    setRangeError(null);
    setAppliedCustom({
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    });
    setWindowMode("custom");
  };

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
        <Link
          href="/backoffice/performances/correlation"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <span aria-hidden>←</span>
          Retour à Corrélation incidents
        </Link>

        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
            Corrélation — signaux conteneurs
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Visualisez les pics CPU, mémoire, réseau et Block I/O par conteneur
            sur la période choisie. Chargez plusieurs services pour comparer
            qui pic à quel moment (problème réseau, disque, saturation mémoire…)
            sans modifier la page incidents & logs.
          </p>
        </div>

        <PerformancesSubNav />
        <CorrelationSubNav />

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Mode :
            </span>
            <button
              type="button"
              onClick={() => persistPerfMode("light")}
              className={`rounded border px-2 py-1 text-xs ${
                perfMode === "light"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-200"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Léger (8 max)
            </button>
            <button
              type="button"
              onClick={() => persistPerfMode("full")}
              className={`rounded border px-2 py-1 text-xs ${
                perfMode === "full"
                  ? "border-amber-600 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-200"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Complet (24 max)
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Rafraîchir liste
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {loadedOrder.length}/{limits.maxHistoriesLoaded} en mémoire
              {historiesLoading ? " · chargement courbes…" : ""}
            </span>
          </div>

          <div className="mb-4 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-600 dark:bg-gray-900/40">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Période :
              </span>
              <select
                aria-label="Fenêtre temporelle"
                value={windowMode === "custom" ? "custom" : String(presetHours)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "custom") enterCustomRangeDefaults();
                  else {
                    setWindowMode("preset");
                    setAppliedCustom(null);
                    setRangeError(null);
                    setPresetHours(Number(v));
                  }
                }}
                className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="24">24 h</option>
                <option value="168">7 j</option>
                <option value="720">30 j</option>
                <option value="custom">Plage fixe</option>
              </select>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-medium">Actif :</span> {activeBoundsLabel}
            </p>
            {windowMode === "custom" && (
              <div className="flex flex-wrap items-end gap-3 border-t border-gray-200 pt-3 dark:border-gray-600">
                <div className="flex min-w-[10rem] flex-col gap-0.5">
                  <label
                    htmlFor="corr-containers-start"
                    className="text-[11px] font-medium text-gray-600 dark:text-gray-400"
                  >
                    Début (local)
                  </label>
                  <input
                    id="corr-containers-start"
                    type="datetime-local"
                    value={customStartInput}
                    onChange={(e) => setCustomStartInput(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex min-w-[10rem] flex-col gap-0.5">
                  <label
                    htmlFor="corr-containers-end"
                    className="text-[11px] font-medium text-gray-600 dark:text-gray-400"
                  >
                    Fin (local)
                  </label>
                  <input
                    id="corr-containers-end"
                    type="datetime-local"
                    value={customEndInput}
                    onChange={(e) => setCustomEndInput(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyCustomRangeFromInputs}
                  className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  Appliquer la plage
                </button>
                {rangeError ? (
                  <p className="w-full text-sm text-red-600 dark:text-red-400" role="alert">
                    {rangeError}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {initialLoading && containers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
          ) : (
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
              <aside className="order-2 w-full shrink-0 space-y-2 xl:order-1 xl:sticky xl:top-4 xl:w-[min(100%,20rem)] xl:min-w-[17rem]">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Conteneurs
                </label>
                <input
                  type="search"
                  value={listFilter}
                  onChange={(e) => {
                    setListFilter(e.target.value);
                    setBulkHint(null);
                  }}
                  placeholder="Filtrer…"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={loadAllFiltered}
                    className="min-w-[8rem] flex-1 rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    Tout charger (filtre)
                  </button>
                  <button
                    type="button"
                    onClick={clearAllLoaded}
                    className="rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Vider mémoire
                  </button>
                </div>
                {bulkHint ? (
                  <p className="text-[11px] text-amber-800 dark:text-amber-200/90" role="status">
                    {bulkHint}
                  </p>
                ) : null}
                <ul className="max-h-[min(420px,50vh)] overflow-y-auto overscroll-y-contain rounded-md border border-gray-200 bg-white [scrollbar-gutter:stable] dark:border-gray-600 dark:bg-gray-900/40">
                  {filteredList.map((name) => {
                    const loaded = loadedOrder.includes(name);
                    const focus = focusName === name;
                    return (
                      <li key={name}>
                        <button
                          type="button"
                          onClick={() => onSelectService(name)}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                            focus
                              ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100"
                              : "text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                          }`}
                        >
                          <span>{shortContainerName(name)}</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {loaded ? "chargé" : "—"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </aside>

              <div className="order-1 min-w-0 flex-1 space-y-6 xl:order-2">
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Synthèse des pics (conteneurs en mémoire)
                  </h2>
                  <PeaksSummaryTable
                    loadedOrder={loadedOrder}
                    mergedByContainer={mergedByContainer}
                  />
                </section>

                <section>
                  <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Comparaison superposée
                  </h2>
                  <ContainerMetricsComparison
                    mergedByContainer={mergedByContainer}
                    loadedOrder={loadedOrder}
                  />
                </section>

                <section>
                  <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Détail conteneur actif
                    {focusName ? ` — ${shortContainerName(focusName)}` : ""}
                  </h2>
                  {!focusName ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Choisissez un conteneur dans la liste.
                    </p>
                  ) : historiesLoading &&
                    (mergedByContainer[focusName]?.length ?? 0) === 0 ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Chargement des courbes…
                      </p>
                    </div>
                  ) : (
                    <ServiceSignalsChart
                      fullName={focusName}
                      mergedRows={mergedByContainer[focusName] || []}
                      subChartHeight={limits.subChartHeight}
                      maxPointsPerChart={limits.pointsPerSubchart}
                    />
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { analyticsService } from "@/lib/api/analytics.service";
import type { LiveContainerRow } from "@/lib/metrics/liveContainerStats";

type Options = {
  /** Appelé une seule fois après le premier chargement réussi. */
  onFirstList?: (list: LiveContainerRow[]) => void;
};

/**
 * Liste conteneurs pour pages Performances : chargement initial + refresh aligné
 * sur `softTick` (useAnalyticsAutoRefresh, ~45 s) avec bypass cache client.
 */
export function usePerformancesContainersList(
  softTick: number,
  options: Options = {},
) {
  const [containers, setContainers] = useState<LiveContainerRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const firstListHandled = useRef(false);
  const onFirstListRef = useRef(options.onFirstList);
  onFirstListRef.current = options.onFirstList;

  const loadContainers = useCallback(
    async (opts: { silent?: boolean; fresh?: boolean } = {}) => {
      if (!opts.silent) {
        setLoadingList(true);
        setListError(null);
      }
      try {
        const list = await analyticsService.getContainersList({
          light: true,
          skipClientCache: opts.fresh === true,
        });
        setContainers(list);
        if (!firstListHandled.current) {
          firstListHandled.current = true;
          onFirstListRef.current?.(list);
        }
      } catch (e) {
        setContainers([]);
        const status = isAxiosError(e) ? e.response?.status : undefined;
        if (!opts.silent) {
          setListError(
            `Impossible de charger les conteneurs${status ? ` (HTTP ${status})` : ""}. Vérifiez metrics-aggregator, Docker et le proxy HTTPS dev si vous êtes sur :5443.`,
          );
        }
      } finally {
        if (!opts.silent) setLoadingList(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadContainers();
  }, [loadContainers]);

  useEffect(() => {
    if (softTick < 1) return;
    void loadContainers({ silent: true, fresh: true });
  }, [softTick, loadContainers]);

  return {
    containers,
    setContainers,
    loadingList,
    listError,
    reloadContainers: () => loadContainers({ fresh: true }),
  };
}

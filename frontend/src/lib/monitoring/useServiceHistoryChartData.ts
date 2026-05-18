"use client";

import { useMemo } from "react";
import type { ServiceHistoryPoint } from "@/lib/monitoring/serviceDetailHistory";
import {
  buildHistoryChartRows,
  buildHistoryChartRowsIo,
  historyAxisShowDateForSpan,
  historyBlockMbMaxY,
  historyCpuMaxY,
  historyIoRateMaxY,
  historyMemMaxY,
  type ServiceHistoryChartRow,
  type ServiceHistoryIoRow,
} from "@/lib/monitoring/serviceHistoryChartModel";

export type UseServiceHistoryChartDataResult = {
  historyChartRows: ServiceHistoryChartRow[];
  historyChartRowsIo: ServiceHistoryIoRow[];
  historyCpuMax: number;
  historyMemMax: number;
  historyAxisShowDate: boolean;
  historyBlockMbMax: number;
  historyIoRateMax: number;
};

/**
 * Données dérivées pour les Recharts « historique service » (CPU, mémoire, réseau, Block I/O).
 * À brancher ensuite sur d’autres écrans monitoring qui partagent le même schéma de points.
 */
export function useServiceHistoryChartData(
  serviceHistory: ServiceHistoryPoint[],
): UseServiceHistoryChartDataResult {
  const historyChartRows = useMemo(
    () => buildHistoryChartRows(serviceHistory),
    [serviceHistory],
  );

  const historyChartRowsIo = useMemo(
    () => buildHistoryChartRowsIo(historyChartRows),
    [historyChartRows],
  );

  const historyCpuMax = useMemo(
    () => historyCpuMaxY(serviceHistory),
    [serviceHistory],
  );

  const historyMemMax = useMemo(
    () => historyMemMaxY(serviceHistory),
    [serviceHistory],
  );

  const historyAxisShowDate = useMemo(
    () => historyAxisShowDateForSpan(historyChartRows),
    [historyChartRows],
  );

  const historyBlockMbMax = useMemo(
    () => historyBlockMbMaxY(historyChartRows),
    [historyChartRows],
  );

  const historyIoRateMax = useMemo(
    () => historyIoRateMaxY(historyChartRowsIo),
    [historyChartRowsIo],
  );

  return {
    historyChartRows,
    historyChartRowsIo,
    historyCpuMax,
    historyMemMax,
    historyAxisShowDate,
    historyBlockMbMax,
    historyIoRateMax,
  };
}

/**
 * Chargement des points d’historique serveur pour la page détail service (lot A1a).
 * — Route **`/api/v1/docker/service/:name/history`** (snapshots fichiers + BDD côté agrégateur).
 * — Fallback **`chartData`** + **`servicesList`** via **`centralMetricsService.getAggregatorMetrics()`** si l’historique fichier est vide.
 */
import { centralMetricsService } from "@/lib/services/centralMetricsService";
import {
  normalizeServerHistoryRows,
  type ServiceHistoryPoint,
} from "@/lib/monitoring/serviceDetailHistory";
import { metricTimestampToMs } from "@/lib/utils/date";

export type LoadServerHistoryParams = {
  metricsUrl: string;
  fullServiceName: string;
  /** Nom court URL (sans préfixe jobbingtrack-) */
  serviceName: string;
  /** Max lignes `/history` */
  historyLimit?: number;
  /** Max points issus du fallback chartData */
  chartDataMaxPoints?: number;
};

/**
 * Construit des **`ServiceHistoryPoint`** à partir du fallback agrégateur (`chartData` + entrée service).
 * Extrait pour tests unitaires et pour garder **`loadServerHistoryPoints`** lisible.
 */
export function historyPointsFromAggregatorChartData(
  metrics:
    | { chartData?: unknown[]; servicesList?: unknown[] }
    | null
    | undefined,
  fullServiceName: string,
  serviceName: string,
  chartDataMaxPoints = 80,
): ServiceHistoryPoint[] {
  const chartData = metrics?.chartData;
  const servicesList = metrics?.servicesList;
  if (
    !metrics ||
    !Array.isArray(chartData) ||
    chartData.length === 0 ||
    !Array.isArray(servicesList)
  ) {
    return [];
  }
  const service = (servicesList as any[]).find(
    (s: any) =>
      s?.rawName === fullServiceName ||
      s?.name === fullServiceName ||
      s?.name === serviceName ||
      s?.rawName === serviceName,
  );
  if (!service) return [];
  const serviceKey = service.rawName ?? service.name ?? "";
  return chartData
    .map((point: any) => ({
      timestamp: point.time || point.timestamp,
      cpu_percent:
        Number(
          point.services?.[serviceKey]?.cpu ??
            service.metrics?.cpu?.percentage ??
            0,
        ) || 0,
      memory_percent:
        Number(
          point.services?.[serviceKey]?.memory ??
            service.metrics?.memory?.percentage ??
            0,
        ) || 0,
      memory_usage_mb:
        Number(
          point.services?.[serviceKey]?.memory_mb ??
            service.metrics?.memory?.usageMb ??
            0,
        ) || 0,
      network_rx_mb:
        Number(
          point.services?.[serviceKey]?.network_rx ??
            service.metrics?.network?.rx_mb ??
            0,
        ) || 0,
      network_tx_mb:
        Number(
          point.services?.[serviceKey]?.network_tx ??
            service.metrics?.network?.tx_mb ??
            0,
        ) || 0,
      block_read_mb:
        Number(
          point.services?.[serviceKey]?.block_read_mb ??
            point.services?.[serviceKey]?.block_read ??
            0,
        ) || 0,
      block_write_mb:
        Number(
          point.services?.[serviceKey]?.block_write_mb ??
            point.services?.[serviceKey]?.block_write ??
            0,
        ) || 0,
    }))
    .filter((h: { timestamp?: string }) => Boolean(h.timestamp))
    .slice(-chartDataMaxPoints);
}

/**
 * Charge et normalise l’historique **serveur** (sans fusion session — voir **`mergeHistoryChronological`** côté page).
 */
export async function loadServerHistoryPoints(
  params: LoadServerHistoryParams,
): Promise<ServiceHistoryPoint[]> {
  const {
    metricsUrl,
    fullServiceName,
    serviceName,
    historyLimit = 280,
    chartDataMaxPoints = 80,
  } = params;

  let serverHistoryPoints: ServiceHistoryPoint[] = [];
  try {
    const historyResponse = await fetch(
      `${metricsUrl}/api/v1/docker/service/${encodeURIComponent(fullServiceName)}/history?limit=${historyLimit}`,
    );
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      const raw = Array.isArray(historyData.data) ? historyData.data : [];
      serverHistoryPoints = normalizeServerHistoryRows(raw).sort(
        (a, b) =>
          (metricTimestampToMs(a.timestamp) ?? 0) -
          (metricTimestampToMs(b.timestamp) ?? 0),
      );
    }
  } catch {
    // réseau / CORS / agrégateur down
  }

  if (serverHistoryPoints.length === 0) {
    try {
      const metrics = await centralMetricsService.getAggregatorMetrics();
      serverHistoryPoints = historyPointsFromAggregatorChartData(
        metrics as { chartData?: unknown[]; servicesList?: unknown[] },
        fullServiceName,
        serviceName,
        chartDataMaxPoints,
      );
    } catch {
      // ignore
    }
  }

  return serverHistoryPoints;
}

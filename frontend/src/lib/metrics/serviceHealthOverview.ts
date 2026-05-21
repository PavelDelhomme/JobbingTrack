/**
 * Comptage santé services pour Statistics / vue d’ensemble.
 * Source alignée sur `/backoffice/services` : `GET /api/v1/docker/services/all`,
 * uniquement les conteneurs en cours — pas les entrées KNOWN_SERVICES hors ligne.
 */

import { formatServiceName } from "@/lib/utils/metricsUtils";

export type ServiceHealthBucket = "healthy" | "degraded" | "offline";

export interface DockerServiceRow {
  name?: string;
  status?: string;
  is_running?: boolean;
  is_healthy?: boolean;
  health_status?: string;
  health?: {
    status?: string;
    health_status_docker?: string;
    health_status_http?: string;
    responseTime?: number | null;
  };
  metrics?: {
    cpu_percent?: number;
    memory_percent?: number;
    memory_usage_mb?: number;
  } | null;
}

export interface ServiceHealthCounts {
  healthy: number;
  degraded: number;
  offline: number;
  totalRunning: number;
}

export function normalizeDockerServiceKey(name: string): string {
  return (name || "")
    .replace(/^jobbingtrack-/, "")
    .trim()
    .toLowerCase();
}

/** Déduplique par nom court ; en cas de doublon, garde l’entrée « running ». */
export function dedupeDockerServices(
  services: DockerServiceRow[],
): DockerServiceRow[] {
  const byKey = new Map<string, DockerServiceRow>();
  for (const s of services) {
    const key = normalizeDockerServiceKey(s.name || "");
    if (!key) continue;
    const existing = byKey.get(key);
    const running = isServiceRunning(s);
    const existingRunning = existing ? isServiceRunning(existing) : false;
    if (!existing || (running && !existingRunning)) {
      byKey.set(key, s);
    }
  }
  return Array.from(byKey.values());
}

export function isServiceRunning(service: DockerServiceRow): boolean {
  if (service.is_running === false) return false;
  if (service.is_running === true) return true;
  const st = (service.status || "").toLowerCase();
  return st === "running" || st === "restarting";
}

/**
 * Classifie un conteneur **en cours d’exécution**.
 * `unknown` sur un conteneur actif → dégradé (pas hors ligne).
 */
export function classifyRunningServiceHealth(
  service: DockerServiceRow,
): ServiceHealthBucket {
  const dockerHealth =
    service.health_status || service.health?.health_status_docker || "";
  const httpHealth =
    service.health?.status || service.health?.health_status_http;

  if (service.is_healthy) return "healthy";
  if (
    dockerHealth === "healthy" ||
    dockerHealth === "none" ||
    dockerHealth === "starting"
  ) {
    return "healthy";
  }
  if (httpHealth === "ok" || httpHealth === "healthy") return "healthy";
  if (dockerHealth === "unhealthy" || httpHealth === "unhealthy") {
    return "degraded";
  }
  if (httpHealth === "degraded") return "degraded";
  return "degraded";
}

export function getRunningServicesForStats(
  services: DockerServiceRow[],
): DockerServiceRow[] {
  return dedupeDockerServices(services).filter(isServiceRunning);
}

/** Conteneurs connus mais non démarrés (exited, created, etc.). */
export function countStoppedDockerServices(
  services: DockerServiceRow[],
): number {
  return dedupeDockerServices(services).filter((s) => !isServiceRunning(s))
    .length;
}

export interface ServiceHealthSummary extends ServiceHealthCounts {
  stopped: number;
}

export function summarizeDockerServiceHealth(
  services: DockerServiceRow[],
): ServiceHealthSummary {
  const buckets = countServiceHealthBuckets(services);
  return {
    ...buckets,
    stopped: countStoppedDockerServices(services),
  };
}

export function countServiceHealthBuckets(
  services: DockerServiceRow[],
): ServiceHealthCounts {
  const running = getRunningServicesForStats(services);
  const counts: ServiceHealthCounts = {
    healthy: 0,
    degraded: 0,
    offline: 0,
    totalRunning: running.length,
  };
  for (const s of running) {
    const bucket = classifyRunningServiceHealth(s);
    counts[bucket] += 1;
  }
  return counts;
}

export interface StatisticsServiceEntry {
  name: string;
  displayName: string;
  status: ServiceHealthBucket | "stopped";
  cpu: number;
  memory: number;
  responseTime: number;
  errorRate: number;
  requests: number;
  availability: number;
}

type MetricsServiceLike = {
  rawName?: string;
  name?: string;
  metrics?: {
    cpu?: { percentage?: unknown };
    memory?: { percentage?: unknown };
  };
  responseTimeMs?: number;
  errorRatePerMin?: unknown;
  status?: string;
};

function findMetricsService(
  dockerName: string,
  metricsList?: MetricsServiceLike[],
): MetricsServiceLike | undefined {
  if (!metricsList?.length) return undefined;
  const key = normalizeDockerServiceKey(dockerName);
  return metricsList.find((m) => {
    const n = m.rawName || m.name || "";
    return normalizeDockerServiceKey(n) === key;
  });
}

/** Exclut les services « découverts » hors ligne (metrics-aggregator KNOWN_SERVICES). */
export function filterMetricsListToActive(
  list: MetricsServiceLike[],
): MetricsServiceLike[] {
  return list.filter((s) => {
    const st = (s.status || "").toLowerCase();
    return st === "healthy" || st === "degraded" || st === "unhealthy";
  });
}

export function mapDockerServiceToStatisticsEntry(
  service: DockerServiceRow,
  metricsList?: MetricsServiceLike[],
): StatisticsServiceEntry {
  const rawName = (service.name || "unknown").startsWith("jobbingtrack-")
    ? service.name!
    : `jobbingtrack-${service.name}`;
  const metricsSvc = findMetricsService(rawName, metricsList);
  const bucket = isServiceRunning(service)
    ? classifyRunningServiceHealth(service)
    : "stopped";

  const cpu = Number(
    service.metrics?.cpu_percent ?? metricsSvc?.metrics?.cpu?.percentage ?? 0,
  );
  const memory = Number(
    service.metrics?.memory_percent ??
      metricsSvc?.metrics?.memory?.percentage ??
      0,
  );
  const responseTime =
    typeof service.health?.responseTime === "number"
      ? service.health.responseTime
      : typeof metricsSvc?.responseTimeMs === "number"
        ? metricsSvc.responseTimeMs
        : 0;

  const statusForUi: StatisticsServiceEntry["status"] =
    bucket === "stopped" ? "stopped" : bucket;

  return {
    name: rawName,
    displayName: formatServiceName(rawName),
    status: statusForUi,
    cpu: Number.isFinite(cpu) ? cpu : 0,
    memory: Number.isFinite(memory) ? memory : 0,
    responseTime,
    errorRate: parseFloat(String(metricsSvc?.errorRatePerMin ?? "0")) || 0,
    requests: 0,
    availability: bucket === "healthy" ? 100 : bucket === "degraded" ? 50 : 0,
  };
}

export function buildStatisticsServicesFromDocker(
  dockerServices: DockerServiceRow[],
  metricsList?: MetricsServiceLike[],
): StatisticsServiceEntry[] {
  return getRunningServicesForStats(dockerServices).map((s) =>
    mapDockerServiceToStatisticsEntry(s, metricsList),
  );
}

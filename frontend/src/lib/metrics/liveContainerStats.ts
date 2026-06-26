/** Ligne conteneur (docker/services/all ou cache client Performances). */
export type LiveContainerRow = {
  name: string;
  status?: string;
  is_running?: boolean;
  health_status?: string;
  cpu_percent?: number;
  memory_percent?: number;
  cpuPercent?: number;
  memoryPercent?: number;
  [key: string]: unknown;
};

function numberFromKeys(
  source: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value.replace("%", "").trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

export function containerCpu(container: LiveContainerRow): number | undefined {
  const metrics =
    container.metrics && typeof container.metrics === "object"
      ? (container.metrics as Record<string, unknown>)
      : null;
  return (
    numberFromKeys(container, [
      "cpu_percent",
      "cpuPercent",
      "cpu_usage_percent",
      "cpuUsagePercent",
      "cpu",
    ]) ??
    (metrics ? numberFromKeys(metrics, ["cpu_percent", "cpuPercent"]) : undefined)
  );
}

export function containerMemory(
  container: LiveContainerRow,
): number | undefined {
  const metrics =
    container.metrics && typeof container.metrics === "object"
      ? (container.metrics as Record<string, unknown>)
      : null;
  return (
    numberFromKeys(container, [
      "memory_percent",
      "memoryPercent",
      "memory_usage_percent",
      "memoryUsagePercent",
      "memory",
    ]) ??
    (metrics
      ? numberFromKeys(metrics, ["memory_percent", "memoryPercent"])
      : undefined)
  );
}

function average(values: Array<number | undefined>): number | null {
  const nums = values.filter(
    (n): n is number => typeof n === "number" && Number.isFinite(n),
  );
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

export function formatLivePercent(value: number | null): string {
  return value == null ? "—" : `${value.toFixed(1)} %`;
}

/** Conteneur considéré en cours d'exécution (champ API ou statut Docker ps). */
export function isContainerRunning(container: LiveContainerRow): boolean {
  if (container.is_running === true) return true;
  const status = String(container.status ?? "").toLowerCase();
  if (status === "running") return true;
  if (status === "exited" || status === "dead" || status === "not_deployed") {
    return false;
  }
  return false;
}

function parseLivePercent(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Dernier point `system_metrics` (même source que les graphiques Performances). */
export function extractLatestSystemLivePercents(
  metrics: Array<{
    cpuUsagePercent?: number | null;
    memoryUsagePercent?: number | null;
    timestamp?: string;
  }>,
): {
  liveCpu: number | null;
  liveMemory: number | null;
  recordedAt: string | null;
} {
  if (!metrics.length) {
    return { liveCpu: null, liveMemory: null, recordedAt: null };
  }

  let liveCpu: number | null = null;
  let liveMemory: number | null = null;
  let recordedAt: string | null = null;

  for (let i = metrics.length - 1; i >= 0; i--) {
    const row = metrics[i];
    const cpu = parseLivePercent(row.cpuUsagePercent);
    const memory = parseLivePercent(row.memoryUsagePercent);

    if (recordedAt == null && (cpu != null || memory != null) && row.timestamp) {
      recordedAt = row.timestamp;
    }
    if (liveCpu == null && cpu != null) liveCpu = cpu;
    if (liveMemory == null && memory != null) liveMemory = memory;
    if (liveCpu != null && liveMemory != null) break;
  }

  return { liveCpu, liveMemory, recordedAt };
}

/** Moyennes CPU / mémoire sur les conteneurs Docker en cours d'exécution. */
export function computeLiveContainerSummary(containers: LiveContainerRow[]) {
  const running = containers.filter(isContainerRunning);
  return {
    liveCpuAvg: average(running.map(containerCpu)),
    liveMemoryAvg: average(running.map(containerMemory)),
    runningCount: running.length,
    totalCount: containers.length,
  };
}

/** CPU / mémoire live : priorité dernier point système, repli moyenne conteneurs Docker. */
export function resolvePerformancesLiveCards(
  systemMetrics: Array<{
    cpuUsagePercent?: number | null;
    memoryUsagePercent?: number | null;
    timestamp?: string;
  }>,
  containers: LiveContainerRow[],
) {
  const system = extractLatestSystemLivePercents(systemMetrics);
  const docker = computeLiveContainerSummary(containers);
  return {
    liveCpu:
      system.liveCpu != null ? system.liveCpu : docker.liveCpuAvg,
    liveMemory:
      system.liveMemory != null ? system.liveMemory : docker.liveMemoryAvg,
    recordedAt: system.recordedAt,
    source: system.liveCpu != null || system.liveMemory != null ? "system" : "docker",
    runningCount: docker.runningCount,
    totalCount: docker.totalCount,
  };
}

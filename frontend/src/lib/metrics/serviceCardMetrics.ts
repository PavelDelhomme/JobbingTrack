/**
 * Normalise les métriques affichées sur les cartes / popup « État des services ».
 * Les sources Docker / agrégateur mélangent plusieurs formes (plat vs imbriqué, Mo vs octets).
 */

export type NormalizedServiceCardMetrics = {
  cpuPercent: number | null;
  memoryPercent: number | null;
  memoryUsageMb: number | null;
  networkRxMb: number | null;
  networkTxMb: number | null;
  networkTotalMb: number | null;
  pids: number | null;
};

function parseMetricNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/%/g, "").replace(",", ".").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function firstFinite(...values: unknown[]): number | null {
  for (const v of values) {
    const n = parseMetricNumber(v);
    if (n != null) return n;
  }
  return null;
}

/** Si la valeur est très grande, on suppose des octets → Mo. */
function asMegabytes(value: number | null): number | null {
  if (value == null) return null;
  if (value > 10_000) return value / (1024 * 1024);
  return value;
}

type ContainerFallback = {
  cpu?: { percentage?: unknown; usage?: unknown };
  memory?: { percentage?: unknown; usageMb?: unknown; usage?: unknown };
  network?: { rx?: unknown; tx?: unknown; rx_mb?: unknown; tx_mb?: unknown };
  pids?: unknown;
} | null;

/**
 * @param metrics — `service.metrics` (forme libre agrégateur / mapping UI)
 * @param containerFallback — entrée `fetchMetrics().containers['jobbingtrack-…']`
 */
export function normalizeServiceCardMetrics(
  metrics: unknown,
  containerFallback?: ContainerFallback,
): NormalizedServiceCardMetrics {
  const m =
    metrics && typeof metrics === "object"
      ? (metrics as Record<string, unknown>)
      : null;
  const cpuObj =
    m?.cpu && typeof m.cpu === "object"
      ? (m.cpu as Record<string, unknown>)
      : null;
  const memObj =
    m?.memory && typeof m.memory === "object"
      ? (m.memory as Record<string, unknown>)
      : null;
  const netObj =
    m?.network && typeof m.network === "object"
      ? (m.network as Record<string, unknown>)
      : null;
  const fb = containerFallback ?? null;

  const cpuPercent = firstFinite(
    m?.cpu_percent,
    m?.cpuPercent,
    typeof m?.cpu === "number" || typeof m?.cpu === "string" ? m.cpu : null,
    cpuObj?.percentage,
    cpuObj?.usage,
    cpuObj?.percent,
    fb?.cpu?.percentage,
    fb?.cpu?.usage,
  );

  const memoryPercent = firstFinite(
    m?.memory_percent,
    m?.memoryPercent,
    memObj?.percentage,
    memObj?.percent,
    fb?.memory?.percentage,
  );

  const memoryUsageMb = asMegabytes(
    firstFinite(
      m?.memory_usage_mb,
      m?.memoryUsageMb,
      memObj?.usageMb,
      memObj?.usage,
      fb?.memory?.usageMb,
      fb?.memory?.usage,
    ),
  );

  const networkRxMb = asMegabytes(
    firstFinite(
      netObj?.rx_mb,
      m?.network_rx_mb,
      netObj?.rx,
      fb?.network?.rx_mb,
      fb?.network?.rx,
    ),
  );
  const networkTxMb = asMegabytes(
    firstFinite(
      netObj?.tx_mb,
      m?.network_tx_mb,
      netObj?.tx,
      fb?.network?.tx_mb,
      fb?.network?.tx,
    ),
  );
  const networkTotalMb =
    networkRxMb != null || networkTxMb != null
      ? (networkRxMb ?? 0) + (networkTxMb ?? 0)
      : null;

  const pids = firstFinite(m?.pids, fb?.pids);

  return {
    cpuPercent,
    memoryPercent,
    memoryUsageMb,
    networkRxMb,
    networkTxMb,
    networkTotalMb,
    pids,
  };
}

/** Formate un % pour l’UI (1 décimale). */
export function formatMetricPercent(value: number | null): string | null {
  if (value == null) return null;
  return `${value.toFixed(1)}%`;
}

/** Formate une quantité Mo. */
export function formatMetricMb(value: number | null, digits = 0): string | null {
  if (value == null) return null;
  return `${value.toFixed(digits)} MB`;
}

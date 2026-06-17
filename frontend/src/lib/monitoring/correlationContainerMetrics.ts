import {
  metricRowToTimeMs,
  normalizeMetricTimestampToIso,
} from "@/lib/utils/date";

export type ContainerPoint = {
  timeMs: number;
  timestamp: string;
  cpu: number | null;
  memory: number | null;
  networkRxMb: number | null;
  networkTxMb: number | null;
  ioReadMb: number | null;
  ioWriteMb: number | null;
};

export type SystemPoint = {
  timeMs: number;
  timestamp: string;
  system_cpu: number | null;
  system_memory: number | null;
};

export type MergedServicePoint = ContainerPoint & {
  system_cpu: number | null;
  system_memory: number | null;
  responseTimeMs: number | null;
};

export type RowSummary = {
  points: number;
  cpuMax: number | null;
  memMax: number | null;
  netDeltaMb: number | null;
  ioDeltaMb: number | null;
  cpuPeakTimeMs: number | null;
  memPeakTimeMs: number | null;
};

export type ComparisonMetricKey =
  | "cpu"
  | "memory"
  | "networkRxMb"
  | "networkTxMb"
  | "ioReadMb"
  | "ioWriteMb";

export const DEFAULT_FOCUS_SERVICE_HINTS = [
  "jobbingtrack-security-service",
  "jobbingtrack-auth-service",
  "jobbingtrack-contact-service",
  "jobbingtrack-api-gateway",
  "jobbingtrack-metrics-aggregator",
];

export const COMPARISON_CHART_COLORS = [
  "#2563EB",
  "#059669",
  "#D97706",
  "#7C3AED",
  "#DC2626",
  "#0891B2",
  "#CA8A04",
  "#BE185D",
  "#4F46E5",
  "#0D9488",
  "#EA580C",
  "#9333EA",
];

export function shortContainerName(full: string) {
  return full.replace(/^jobbingtrack-/, "");
}

export function pickInitialFocusService(names: string[]): string | null {
  for (const preferred of DEFAULT_FOCUS_SERVICE_HINTS) {
    const found = names.find((name) => name === preferred);
    if (found) return found;
  }
  return names[0] ?? null;
}

export function pushLoadedOrder(
  prev: string[],
  name: string,
  cap: number,
): string[] {
  const dedup = prev.filter((n) => n !== name);
  const next = [...dedup, name];
  while (next.length > cap) next.shift();
  return next;
}

export function readNumericField(
  row: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const raw = row[key];
    if (raw == null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function readMetricValueAsMb(
  row: Record<string, unknown>,
  byteKeys: string[],
  mbKeys: string[],
): number | null {
  const asBytes = readNumericField(row, byteKeys);
  if (asBytes != null) return asBytes / (1024 * 1024);
  const asMb = readNumericField(row, mbKeys);
  if (asMb != null) return asMb;
  return null;
}

export function parseContainerHistoryRow(
  r: Record<string, unknown>,
): ContainerPoint | null {
  const ts = normalizeMetricTimestampToIso(String(r.timestamp ?? ""));
  const timeMs = metricRowToTimeMs(r, ts);
  if (!ts || timeMs == null) return null;

  const memoryPct = readNumericField(r, [
    "memoryUsagePercent",
    "memory_usage_percent",
    "memory_percent",
  ]);
  const memoryUsedBytes = readNumericField(r, [
    "memoryUsageBytes",
    "memory_usage_bytes",
    "memory_used_bytes",
  ]);
  const memoryLimitBytes = readNumericField(r, [
    "memoryLimitBytes",
    "memory_limit_bytes",
    "memory_total_bytes",
  ]);
  const memory =
    memoryPct != null
      ? memoryPct
      : memoryUsedBytes != null &&
          memoryLimitBytes != null &&
          memoryLimitBytes > 0
        ? (memoryUsedBytes / memoryLimitBytes) * 100
        : null;

  return {
    timeMs,
    timestamp: ts,
    cpu: readNumericField(r, [
      "cpuUsagePercent",
      "cpu_usage_percent",
      "cpu_percent",
    ]),
    memory,
    networkRxMb: readMetricValueAsMb(
      r,
      [
        "networkRxBytes",
        "network_rx_bytes",
        "total_network_rx_bytes",
        "totalNetworkRxBytes",
      ],
      ["network_rx_mb", "networkRxMb", "total_network_rx_mb"],
    ),
    networkTxMb: readMetricValueAsMb(
      r,
      [
        "networkTxBytes",
        "network_tx_bytes",
        "total_network_tx_bytes",
        "totalNetworkTxBytes",
      ],
      ["network_tx_mb", "networkTxMb", "total_network_tx_mb"],
    ),
    ioReadMb: readMetricValueAsMb(
      r,
      [
        "blockIoReadBytes",
        "block_io_read_bytes",
        "blockReadBytes",
        "block_read_bytes",
        "blkioReadBytes",
        "ioReadBytes",
      ],
      ["block_io_read_mb", "blockReadMb", "io_read_mb"],
    ),
    ioWriteMb: readMetricValueAsMb(
      r,
      [
        "blockIoWriteBytes",
        "block_io_write_bytes",
        "blockWriteBytes",
        "block_write_bytes",
        "blkioWriteBytes",
        "ioWriteBytes",
      ],
      ["block_io_write_mb", "blockWriteMb", "io_write_mb"],
    ),
  };
}

export function downsampleByStep<T>(rows: T[], max: number): T[] {
  if (rows.length <= max) return rows;
  const step = Math.ceil(rows.length / max);
  return rows.filter((_, i) => i % step === 0);
}

export function mergeSystemNearestOntoContainer(
  containerRows: ContainerPoint[],
  systemRows: SystemPoint[],
  maxDeltaMs: number,
): Array<ContainerPoint & { system_cpu: number | null; system_memory: number | null }> {
  if (containerRows.length === 0) return [];
  const sys = [...systemRows].sort((a, b) => a.timeMs - b.timeMs);
  const cr = [...containerRows].sort((a, b) => a.timeMs - b.timeMs);
  let j = 0;
  const out: Array<
    ContainerPoint & { system_cpu: number | null; system_memory: number | null }
  > = [];
  for (const c of cr) {
    const t = c.timeMs;
    while (j < sys.length - 1 && sys[j + 1].timeMs <= t) j += 1;
    let bestIdx = -1;
    let bestD = Infinity;
    for (const idx of [j - 1, j, j + 1]) {
      if (idx < 0 || idx >= sys.length) continue;
      const d = Math.abs(sys[idx].timeMs - t);
      if (d < bestD) {
        bestD = d;
        bestIdx = idx;
      }
    }
    const ok = bestIdx >= 0 && bestD <= maxDeltaMs;
    const s = ok ? sys[bestIdx] : null;
    out.push({
      ...c,
      system_cpu: s?.system_cpu ?? null,
      system_memory: s?.system_memory ?? null,
    });
  }
  return out;
}

function finiteNums(xs: (number | null | undefined)[]): number[] {
  return xs.filter((x): x is number => x != null && Number.isFinite(x));
}

function cumulativePositiveIncrements(
  values: (number | null | undefined)[],
): number | null {
  let prev: number | null = null;
  let total = 0;
  let hasSegment = false;
  for (const v of values) {
    if (v == null || !Number.isFinite(v)) continue;
    if (prev != null) {
      const d = v - prev;
      if (d >= 0) {
        total += d;
        hasSegment = true;
      }
    }
    prev = v;
  }
  return hasSegment ? total : null;
}

function numericRangeDelta(values: (number | null | undefined)[]): number | null {
  const nums = finiteNums(values);
  if (nums.length < 2) return null;
  const delta = nums[nums.length - 1] - nums[0];
  return delta >= 0 ? delta : null;
}

function findPeakTime(
  rows: ContainerPoint[],
  key: "cpu" | "memory",
): number | null {
  let best: number | null = null;
  let bestTime: number | null = null;
  for (const row of rows) {
    const v = row[key];
    if (v == null || !Number.isFinite(v)) continue;
    if (best == null || v > best) {
      best = v;
      bestTime = row.timeMs;
    }
  }
  return bestTime;
}

export function summarizeContainerWindow(rows: ContainerPoint[]): RowSummary | null {
  if (rows.length === 0) return null;
  const cpu = finiteNums(rows.map((r) => r.cpu));
  const mem = finiteNums(rows.map((r) => r.memory));
  const rx = rows.map((r) => r.networkRxMb);
  const tx = rows.map((r) => r.networkTxMb);
  const ir = rows.map((r) => r.ioReadMb);
  const iw = rows.map((r) => r.ioWriteMb);

  let netDeltaMb: number | null = null;
  const drx = cumulativePositiveIncrements(rx);
  const dtx = cumulativePositiveIncrements(tx);
  if (drx != null || dtx != null) netDeltaMb = (drx ?? 0) + (dtx ?? 0);
  if (netDeltaMb == null || netDeltaMb <= 0) {
    const rrx = numericRangeDelta(rx);
    const rtx = numericRangeDelta(tx);
    if (rrx != null || rtx != null) netDeltaMb = (rrx ?? 0) + (rtx ?? 0);
  }

  let ioDeltaMb: number | null = null;
  const dir = cumulativePositiveIncrements(ir);
  const diw = cumulativePositiveIncrements(iw);
  if (dir != null || diw != null) ioDeltaMb = (dir ?? 0) + (diw ?? 0);
  if (ioDeltaMb == null || ioDeltaMb <= 0) {
    const rir = numericRangeDelta(ir);
    const riw = numericRangeDelta(iw);
    if (rir != null || riw != null) ioDeltaMb = (rir ?? 0) + (riw ?? 0);
  }

  return {
    points: rows.length,
    cpuMax: cpu.length ? Math.max(...cpu) : null,
    memMax: mem.length ? Math.max(...mem) : null,
    netDeltaMb,
    ioDeltaMb,
    cpuPeakTimeMs: findPeakTime(rows, "cpu"),
    memPeakTimeMs: findPeakTime(rows, "memory"),
  };
}

function nearestMetricValue(
  rows: MergedServicePoint[],
  timeMs: number,
  key: ComparisonMetricKey,
  maxDeltaMs: number,
): number | null {
  if (rows.length === 0) return null;
  let bestD = Infinity;
  let best: number | null = null;
  for (const row of rows) {
    const d = Math.abs(row.timeMs - timeMs);
    if (d > maxDeltaMs) continue;
    const v = row[key];
    if (v == null || !Number.isFinite(v)) continue;
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

/** Série large pour superposer plusieurs conteneurs sur un même graphe (repérer quel service pic à quel moment). */
export function buildComparisonChartData(
  mergedByContainer: Record<string, MergedServicePoint[]>,
  metricKey: ComparisonMetricKey,
  maxPoints = 120,
  maxDeltaMs = 120_000,
): {
  rows: Array<{ timeMs: number } & Record<string, number | null>>;
  seriesKeys: string[];
} {
  const entries = Object.entries(mergedByContainer).filter(
    ([, rows]) => rows.length > 0,
  );
  if (entries.length === 0) return { rows: [], seriesKeys: [] };

  const seriesKeys = entries.map(([name]) => shortContainerName(name));
  const allTimes = new Set<number>();
  for (const [, rows] of entries) {
    for (const row of downsampleByStep(rows, maxPoints * 2)) {
      allTimes.add(row.timeMs);
    }
  }
  const timeline = downsampleByStep(
    [...allTimes].sort((a, b) => a - b),
    maxPoints,
  );

  const rows = timeline.map((timeMs) => {
    const point: { timeMs: number } & Record<string, number | null> = {
      timeMs,
    };
    entries.forEach(([fullName, series], index) => {
      point[seriesKeys[index]] = nearestMetricValue(
        series,
        timeMs,
        metricKey,
        maxDeltaMs,
      );
    });
    return point;
  });

  return { rows, seriesKeys };
}

export function fmtMetric1(v: number | null, suffix = "") {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(1)}${suffix}`;
}

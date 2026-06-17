import {
  metricRowToTimeMs,
  normalizeMetricTimestampToIso,
} from "@/lib/utils/date";

export interface DiskMetricRow {
  timestamp: string;
  timeMs: number;
  usage: number | null;
  used: number | null;
  total: number | null;
}

function coerceFiniteNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "object" && value !== null && "toString" in value) {
    const n = Number(String(value));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function bytesToGb(value: unknown): number | null {
  const n = coerceFiniteNumber(value);
  if (n == null || n <= 0) return null;
  return n / 1024 ** 3;
}

/** Lit un volume disque en Go depuis octets, Go ou champs libres dérivés. */
export function pickDiskGb(
  row: Record<string, unknown>,
  gbKeys: string[],
  byteKeys: string[],
): number | null {
  for (const key of byteKeys) {
    const value = bytesToGb(row[key]);
    if (value != null) return value;
  }
  for (const key of gbKeys) {
    const value = coerceFiniteNumber(row[key]);
    if (value != null && value > 0) return value;
  }
  return null;
}

function deriveDiskVolumes(
  row: Record<string, unknown>,
  usage: number | null,
): { used: number | null; total: number | null } {
  let used = pickDiskGb(row, ["diskUsedGb", "disk_used_gb"], [
    "diskUsedBytes",
    "disk_used_bytes",
  ]);
  let total = pickDiskGb(row, ["diskTotalGb", "disk_total_gb"], [
    "diskTotalBytes",
    "disk_total_bytes",
  ]);
  const free = pickDiskGb(row, ["diskFreeGb", "disk_free_gb"], [
    "diskFreeBytes",
    "disk_free_bytes",
  ]);

  if (total == null && used != null && free != null) {
    total = used + free;
  }
  if (used == null && total != null && free != null) {
    used = Math.max(0, total - free);
  }
  if (
    used == null &&
    total != null &&
    usage != null &&
    usage > 0 &&
    usage <= 100
  ) {
    used = (total * usage) / 100;
  }
  if (
    total == null &&
    used != null &&
    usage != null &&
    usage > 0 &&
    usage <= 100
  ) {
    total = (used * 100) / usage;
  }

  return { used, total };
}

export function normalizeDiskSystemRows(
  data: Record<string, unknown>[],
): DiskMetricRow[] {
  return data
    .map((raw) => {
      const tsIso =
        normalizeMetricTimestampToIso(raw.timestamp) ||
        String(raw.timestamp ?? "");
      const timeMs = metricRowToTimeMs(raw, tsIso);
      const usage = coerceFiniteNumber(
        raw.diskUsagePercent ?? raw.disk_usage_percent,
      );
      const { used, total } = deriveDiskVolumes(raw, usage);
      return {
        timestamp: tsIso,
        timeMs: timeMs ?? NaN,
        usage,
        used,
        total,
      };
    })
    .filter((row) => Number.isFinite(row.timeMs))
    .sort((a, b) => a.timeMs - b.timeMs);
}

export function diskVolumeAxisMaxGb(rows: DiskMetricRow[]): number {
  const values = rows.flatMap((row) =>
    [row.used, row.total].filter(
      (value): value is number =>
        value != null && Number.isFinite(value) && value > 0,
    ),
  );
  if (values.length === 0) return 1;
  return Math.max(...values) * 1.08;
}

export function latestRowInBrushSlice<T>(rows: T[], start: number, end: number) {
  if (rows.length === 0) return null;
  const from = Math.max(0, Math.min(start, rows.length - 1));
  const to = Math.max(from, Math.min(end, rows.length - 1));
  const slice = rows.slice(from, to + 1);
  return slice.length ? slice[slice.length - 1] : rows[rows.length - 1];
}

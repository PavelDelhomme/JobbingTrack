/** Block I/O conteneur — cumuls alignés `docker stats BlockIO` (via cgroups / agent). */

export function bytesToMb(bytes: number | null | undefined): number | null {
  if (bytes == null || !Number.isFinite(Number(bytes))) return null;
  const n = Number(bytes);
  if (n < 0) return null;
  return n / (1024 * 1024);
}

export function blockIoFromMetricRow(row: Record<string, unknown>): {
  readBytes: number | null;
  writeBytes: number | null;
  readMb: number | null;
  writeMb: number | null;
} {
  const readBytes = firstNumber(row, [
    "blockReadBytes",
    "block_read_bytes",
    "block_read",
  ]);
  const writeBytes = firstNumber(row, [
    "blockWriteBytes",
    "block_write_bytes",
    "block_write",
  ]);
  const readMb =
    bytesToMb(readBytes) ??
    firstNumber(row, ["blockReadMb", "block_read_mb", "block_read_mb"]);
  const writeMb =
    bytesToMb(writeBytes) ??
    firstNumber(row, ["blockWriteMb", "block_write_mb", "block_write_mb"]);
  return { readBytes, writeBytes, readMb, writeMb };
}

export function blockIoFromContainerLive(
  container: Record<string, unknown>,
): { readMb: number | null; writeMb: number | null } {
  const bag =
    container.metrics && typeof container.metrics === "object"
      ? (container.metrics as Record<string, unknown>)
      : {};
  const merged = { ...bag, ...container };
  const fromBytes = blockIoFromMetricRow(merged);
  if (fromBytes.readMb != null || fromBytes.writeMb != null) {
    return { readMb: fromBytes.readMb, writeMb: fromBytes.writeMb };
  }
  return {
    readMb: firstNumber(merged, ["block_read_mb", "blockReadMb"]),
    writeMb: firstNumber(merged, ["block_write_mb", "blockWriteMb"]),
  };
}

export type BlockIoChartPoint = {
  timeMs: number;
  readMb: number | null;
  writeMb: number | null;
  readMbPerMin: number | null;
  writeMbPerMin: number | null;
};

/** Dérive Mo/min depuis cumuls (comme page Performances → Disque). */
export function appendBlockIoRates<T extends BlockIoChartPoint>(
  rows: T[],
  maxGapMs = 15 * 60 * 1000,
): T[] {
  return rows.map((row, index) => {
    if (index === 0) {
      return { ...row, readMbPerMin: null, writeMbPerMin: null };
    }
    const prev = rows[index - 1];
    const dtMs = row.timeMs - prev.timeMs;
    if (dtMs < 4000 || dtMs > maxGapMs) {
      return { ...row, readMbPerMin: null, writeMbPerMin: null };
    }
    const dtMin = dtMs / 60000;
    const readDelta =
      row.readMb != null && prev.readMb != null
        ? Math.max(0, row.readMb - prev.readMb)
        : null;
    const writeDelta =
      row.writeMb != null && prev.writeMb != null
        ? Math.max(0, row.writeMb - prev.writeMb)
        : null;
    return {
      ...row,
      readMbPerMin: readDelta != null ? readDelta / dtMin : null,
      writeMbPerMin: writeDelta != null ? writeDelta / dtMin : null,
    };
  });
}

export function hasBlockIoSeries(rows: BlockIoChartPoint[]): boolean {
  return rows.some(
    (row) =>
      (row.readMb != null && row.readMb > 0) ||
      (row.writeMb != null && row.writeMb > 0),
  );
}

function firstNumber(
  source: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = source[key];
    if (value == null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

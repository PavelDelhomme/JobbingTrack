export type ServiceCpuSparklinePoint = {
  timestamp: string;
  cpuPercent: number;
};

function toFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeServiceCpuHistoryRows(
  rows: unknown[],
  maxPoints = 18,
): ServiceCpuSparklinePoint[] {
  const normalized = rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const record = row as Record<string, unknown>;
      const timestamp = record.timestamp;
      const cpu =
        toFiniteNumber(record.cpu_percent) ??
        toFiniteNumber(record.cpuUsagePercent) ??
        toFiniteNumber(record.cpu_usage_percent);
      if (typeof timestamp !== "string" || cpu == null) return null;
      return {
        timestamp,
        cpuPercent: cpu,
      };
    })
    .filter(Boolean) as ServiceCpuSparklinePoint[];

  if (normalized.length <= maxPoints) return normalized;
  const step = normalized.length / maxPoints;
  return Array.from({ length: maxPoints }, (_, index) => {
    const slice = normalized.slice(
      Math.floor(index * step),
      Math.max(Math.floor((index + 1) * step), Math.floor(index * step) + 1),
    );
    const middle = slice[Math.floor(slice.length / 2)];
    const avg =
      slice.reduce((sum, point) => sum + point.cpuPercent, 0) / slice.length;
    return {
      timestamp: middle.timestamp,
      cpuPercent: avg,
    };
  });
}

export function buildCpuSparklinePolyline(
  points: ServiceCpuSparklinePoint[],
  width: number,
  height: number,
): string {
  if (points.length < 2) return "";
  const maxCpu = Math.max(1, ...points.map((point) => point.cpuPercent));
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const visualCpu = Math.min(Math.max(point.cpuPercent, 0), maxCpu);
      const y = height - (visualCpu / maxCpu) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

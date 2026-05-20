export const BACKOFFICE_SERIES_COLORS = [
  "#2563EB",
  "#16A34A",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#DB2777",
  "#0891B2",
  "#65A30D",
  "#4F46E5",
  "#EA580C",
  "#0D9488",
  "#9333EA",
  "#BE123C",
  "#0284C7",
  "#CA8A04",
  "#059669",
  "#C026D3",
  "#B45309",
  "#1D4ED8",
  "#15803D",
  "#A21CAF",
  "#B91C1C",
  "#0F766E",
  "#A16207",
] as const;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function overflowColor(key: string, attempt: number): string {
  const hue = (hashString(key) + attempt * 137) % 360;
  return `hsl(${hue} 72% 45%)`;
}

export function buildStableSeriesColorMap(
  seriesKeys: readonly string[],
): Record<string, string> {
  const uniqueKeys = Array.from(
    new Set(seriesKeys.map((key) => key.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const used = new Set<string>();
  const colors: Record<string, string> = {};

  uniqueKeys.forEach((key) => {
    const start = hashString(key) % BACKOFFICE_SERIES_COLORS.length;
    let color: string | undefined;

    for (let offset = 0; offset < BACKOFFICE_SERIES_COLORS.length; offset += 1) {
      const candidate =
        BACKOFFICE_SERIES_COLORS[
          (start + offset) % BACKOFFICE_SERIES_COLORS.length
        ];
      if (!used.has(candidate)) {
        color = candidate;
        break;
      }
    }

    let attempt = 0;
    while (!color || used.has(color)) {
      color = overflowColor(key, attempt);
      attempt += 1;
    }

    used.add(color);
    colors[key] = color;
  });

  return colors;
}


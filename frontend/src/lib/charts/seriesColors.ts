export const BACKOFFICE_SERIES_COLORS = [
  "#0057FF",
  "#FF6B00",
  "#7A00FF",
  "#00A6A6",
  "#E00022",
  "#F5C400",
  "#D000A7",
  "#146C2E",
  "#8A5A00",
  "#00B8D9",
  "#B00020",
  "#7CB900",
  "#3344DD",
  "#FF2D75",
  "#00796B",
  "#FF9F1C",
  "#5C2D91",
  "#009B4D",
  "#E65100",
  "#00D084",
  "#8B1E3F",
  "#0082C8",
  "#A16207",
  "#C026D3",
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

  uniqueKeys.forEach((key, index) => {
    const start = index % BACKOFFICE_SERIES_COLORS.length;
    let color: string | undefined;

    for (
      let offset = 0;
      offset < BACKOFFICE_SERIES_COLORS.length;
      offset += 1
    ) {
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

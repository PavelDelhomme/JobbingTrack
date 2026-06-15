export type LogStatsRow = {
  level?: string | null;
  serviceName?: string | null;
};

export type LogStatsFilterState = {
  level?: string;
  service?: string;
};

export function buildLogStatsLevelOptions(rows: LogStatsRow[]): string[] {
  const levels = new Set<string>();
  for (const row of rows) {
    levels.add((row.level || "inconnu").toString());
  }
  return Array.from(levels).sort();
}

export function buildLogStatsServiceOptions(rows: LogStatsRow[]): string[] {
  const services = new Set<string>();
  for (const row of rows) {
    const service = (row.serviceName || "").toString().trim();
    if (service) services.add(service);
  }
  return Array.from(services).sort();
}

export function filterLogStatsRows<T extends LogStatsRow>(
  rows: T[],
  filters: LogStatsFilterState,
): T[] {
  return rows.filter((row) => {
    if (filters.level) {
      const level = (row.level || "inconnu").toString();
      if (level !== filters.level) return false;
    }
    if (filters.service) {
      if ((row.serviceName || "").toString() !== filters.service) return false;
    }
    return true;
  });
}

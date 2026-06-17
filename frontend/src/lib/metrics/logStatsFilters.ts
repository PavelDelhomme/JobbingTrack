import {
  matchesAnyNormalizedValue,
  matchesAnyToken,
  parseMultiFilterValues,
} from "@/lib/filters/multiValueFilter";

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
  const levels = parseMultiFilterValues(filters.level);
  const services = parseMultiFilterValues(filters.service);

  return rows.filter((row) => {
    if (levels.length) {
      const level = (row.level || "inconnu").toString();
      if (
        !matchesAnyNormalizedValue(level, levels, (value) =>
          value.trim().toUpperCase(),
        )
      ) {
        return false;
      }
    }
    if (services.length) {
      const service = (row.serviceName || "").toString();
      if (!matchesAnyToken(service, services, "equals")) {
        return false;
      }
    }
    return true;
  });
}

export function resolveLogStatsApiFilters(filters: LogStatsFilterState): {
  level?: string;
  serviceName?: string;
  serviceNames?: string[];
} {
  const levels = parseMultiFilterValues(filters.level);
  const services = parseMultiFilterValues(filters.service);

  return {
    level: levels.length === 1 ? levels[0] : undefined,
    serviceName: services.length === 1 ? services[0] : undefined,
    serviceNames: services.length > 1 ? services : undefined,
  };
}

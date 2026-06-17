import type { IncidentRow } from "./incidents";
import {
  matchesAnyNormalizedValue,
  matchesAnyToken,
  parseMultiFilterValues,
} from "@/lib/filters/multiValueFilter";
import {
  formatSecuritySeverity,
  normalizeSecuritySeverity,
} from "./securityLabels";

export type IncidentAppliedFilters = {
  kinds: string;
  severity: string;
  eventTypes: string;
  source: string;
  query: string;
};

export type IncidentKindFilter = "all" | "threat" | "alert" | "event";

export function filterIncidentRows(
  rows: IncidentRow[],
  filters: IncidentAppliedFilters,
): IncidentRow[] {
  let result = rows;

  const kinds = parseMultiFilterValues(filters.kinds);
  if (kinds.length) {
    result = result.filter((row) =>
      matchesAnyNormalizedValue(row.kind, kinds, (value) => value.toLowerCase()),
    );
  }

  const severities = parseMultiFilterValues(filters.severity);
  if (severities.length) {
    result = result.filter((row) =>
      matchesAnyNormalizedValue(row.severity, severities, (value) =>
        normalizeSecuritySeverity(value),
      ),
    );
  }

  const eventTypes = parseMultiFilterValues(filters.eventTypes);
  if (eventTypes.length) {
    result = result.filter((row) => {
      const candidates = [row.eventType, row.title, row.subtitle].filter(
        Boolean,
      ) as string[];
      return candidates.some((candidate) =>
        matchesAnyToken(candidate, eventTypes, "includes"),
      );
    });
  }

  const sources = parseMultiFilterValues(filters.source);
  if (sources.length) {
    result = result.filter((row) =>
      matchesAnyToken(row.source, sources, "includes"),
    );
  }

  const query = filters.query.trim().toLowerCase();
  if (query) {
    result = result.filter(
      (row) =>
        row.title.toLowerCase().includes(query) ||
        row.subtitle.toLowerCase().includes(query) ||
        row.source.toLowerCase().includes(query),
    );
  }

  return result;
}

export function formatIncidentFilterBadges(
  filters: IncidentAppliedFilters,
): { key: string; label: string }[] {
  const badges: { key: string; label: string }[] = [];

  const kinds = parseMultiFilterValues(filters.kinds);
  if (kinds.length) {
    badges.push({
      key: "kinds",
      label: `Types : ${kinds.join(", ")}`,
    });
  }

  const severities = parseMultiFilterValues(filters.severity);
  if (severities.length) {
    badges.push({
      key: "severity",
      label: `Gravité : ${severities.map((value) => formatSecuritySeverity(value)).join(", ")}`,
    });
  }

  const eventTypes = parseMultiFilterValues(filters.eventTypes);
  if (eventTypes.length) {
    badges.push({
      key: "eventTypes",
      label: `Nature : ${eventTypes.join(", ")}`,
    });
  }

  const sources = parseMultiFilterValues(filters.source);
  if (sources.length) {
    badges.push({
      key: "source",
      label: `Source : ${sources.join(", ")}`,
    });
  }

  if (filters.query.trim()) {
    badges.push({
      key: "query",
      label: `Recherche : ${filters.query.trim()}`,
    });
  }

  return badges;
}

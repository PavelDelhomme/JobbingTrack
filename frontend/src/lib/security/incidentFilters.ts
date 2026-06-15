import type { IncidentRow } from "./incidents";
import { normalizeSecuritySeverity } from "./securityLabels";

export type IncidentAppliedFilters = {
  severity: string;
  source: string;
  query: string;
};

export type IncidentKindFilter = "all" | "threat" | "alert" | "event";

export function filterIncidentRows(
  rows: IncidentRow[],
  kind: IncidentKindFilter,
  filters: IncidentAppliedFilters,
): IncidentRow[] {
  let result = rows;

  if (kind !== "all") {
    result = result.filter((row) => row.kind === kind);
  }

  const severity = filters.severity.trim().toLowerCase();
  if (severity) {
    result = result.filter(
      (row) => normalizeSecuritySeverity(row.severity) === severity,
    );
  }

  const source = filters.source.trim().toLowerCase();
  if (source) {
    result = result.filter((row) => row.source.toLowerCase().includes(source));
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

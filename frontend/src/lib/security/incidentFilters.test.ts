import {
  filterIncidentRows,
  type IncidentAppliedFilters,
} from "./incidentFilters";
import type { IncidentRow } from "./incidents";

const baseRow = (
  overrides: Partial<IncidentRow> & Pick<IncidentRow, "id" | "kind">,
): IncidentRow => ({
  title: "Titre",
  subtitle: "Description",
  severity: "HIGH",
  source: "10.0.0.1",
  timestamp: "2026-06-12T10:00:00.000Z",
  href: "/test",
  ...overrides,
});

const emptyFilters: IncidentAppliedFilters = {
  severity: "",
  source: "",
  query: "",
};

describe("filterIncidentRows", () => {
  const rows: IncidentRow[] = [
    baseRow({ id: "t1", kind: "threat", title: "Brute force" }),
    baseRow({
      id: "a1",
      kind: "alert",
      severity: "critical",
      source: "198.51.100.42",
      title: "CVE critique",
    }),
    baseRow({
      id: "e1",
      kind: "event",
      severity: "info",
      source: "waf",
      subtitle: "Blocage SQLi",
    }),
  ];

  it("filtre par kind", () => {
    expect(filterIncidentRows(rows, "alert", emptyFilters)).toHaveLength(1);
    expect(filterIncidentRows(rows, "all", emptyFilters)).toHaveLength(3);
  });

  it("filtre par gravité normalisée", () => {
    const filtered = filterIncidentRows(rows, "all", {
      ...emptyFilters,
      severity: "critical",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("a1");
  });

  it("filtre par source et recherche texte", () => {
    expect(
      filterIncidentRows(rows, "all", { ...emptyFilters, source: "198.51" }),
    ).toHaveLength(1);
    expect(
      filterIncidentRows(rows, "all", { ...emptyFilters, query: "sql" }),
    ).toHaveLength(1);
  });
});

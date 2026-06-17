import {
  filterIncidentRows,
  formatIncidentFilterBadges,
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
  kinds: "",
  severity: "",
  eventTypes: "",
  source: "",
  query: "",
};

describe("filterIncidentRows", () => {
  const rows: IncidentRow[] = [
    baseRow({
      id: "t1",
      kind: "threat",
      title: "Brute force",
      eventType: "BRUTE_FORCE",
      source: "203.0.113.10",
    }),
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
      eventType: "sql_injection_detected",
    }),
  ];

  it("filtre par plusieurs kinds", () => {
    expect(
      filterIncidentRows(rows, { ...emptyFilters, kinds: "threat, alert" }),
    ).toHaveLength(2);
    expect(filterIncidentRows(rows, emptyFilters)).toHaveLength(3);
  });

  it("filtre par plusieurs gravités normalisées", () => {
    const filtered = filterIncidentRows(rows, {
      ...emptyFilters,
      severity: "critical, high",
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.map((row) => row.id)).toEqual(
      expect.arrayContaining(["t1", "a1"]),
    );
  });

  it("filtre par plusieurs sources et natures", () => {
    expect(
      filterIncidentRows(rows, {
        ...emptyFilters,
        source: "198.51, waf",
      }),
    ).toHaveLength(2);
    expect(
      filterIncidentRows(rows, {
        ...emptyFilters,
        eventTypes: "BRUTE_FORCE, sql",
      }),
    ).toHaveLength(2);
  });

  it("filtre par recherche texte", () => {
    expect(
      filterIncidentRows(rows, { ...emptyFilters, query: "sql" }),
    ).toHaveLength(1);
  });
});

describe("formatIncidentFilterBadges", () => {
  it("formate les badges multi-valeurs", () => {
    const badges = formatIncidentFilterBadges({
      kinds: "threat, alert",
      severity: "critical",
      eventTypes: "BRUTE_FORCE",
      source: "10.0.0.1",
      query: "lab",
    });
    expect(badges).toHaveLength(5);
    expect(badges[0]?.label).toContain("Types");
    expect(badges[1]?.label).toContain("Critique");
  });
});

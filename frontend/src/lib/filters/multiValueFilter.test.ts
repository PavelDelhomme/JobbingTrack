import {
  matchesAnyNormalizedValue,
  matchesAnyToken,
  parseMultiFilterValues,
  serializeMultiFilterValues,
} from "./multiValueFilter";

describe("multiValueFilter", () => {
  it("parse et déduplique les valeurs", () => {
    expect(parseMultiFilterValues("HIGH, critical;HIGH|low")).toEqual([
      "HIGH",
      "critical",
      "low",
    ]);
    expect(parseMultiFilterValues("")).toEqual([]);
  });

  it("sérialise une liste", () => {
    expect(serializeMultiFilterValues(["a", "b"])).toBe("a, b");
  });

  it("matchesAnyToken en mode includes ou equals", () => {
    expect(matchesAnyToken("10.0.0.5", ["10.0"], "includes")).toBe(true);
    expect(matchesAnyToken("10.0.0.5", ["10.0.0.5"], "equals")).toBe(true);
    expect(matchesAnyToken("10.0.0.5", ["192.168"], "includes")).toBe(false);
  });

  it("matchesAnyNormalizedValue applique un normaliseur", () => {
    const norm = (v: string) => v.trim().toUpperCase();
    expect(matchesAnyNormalizedValue("high", ["HIGH"], norm)).toBe(true);
    expect(matchesAnyNormalizedValue("low", ["HIGH", "CRITICAL"], norm)).toBe(
      false,
    );
  });
});

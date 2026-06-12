import {
  facetOptionsFromValues,
  facetValues,
  mergeFacetSuggestions,
  uniqueSortedValues,
} from "./facetUtils";

describe("facetUtils", () => {
  it("déduplique et trie les valeurs", () => {
    expect(uniqueSortedValues(["network", "auth", "network", ""])).toEqual([
      "auth",
      "network",
    ]);
  });

  it("extrait les valeurs de facettes", () => {
    expect(
      facetValues([
        { value: "auth", count: 2 },
        { value: "waf", count: 1 },
      ]),
    ).toEqual(["auth", "waf"]);
  });

  it("fusionne facettes API et valeurs dynamiques", () => {
    expect(
      mergeFacetSuggestions(
        [{ value: "auth" }, { value: "waf" }],
        ["network", "auth"],
        10,
      ),
    ).toEqual(["auth", "network", "waf"]);
  });

  it("produit des options de facettes avec libellé", () => {
    expect(
      facetOptionsFromValues(["BRUTE_FORCE"], (value) =>
        value === "BRUTE_FORCE" ? "Force brute" : value,
      ),
    ).toEqual([{ value: "BRUTE_FORCE", label: "Force brute" }]);
  });
});

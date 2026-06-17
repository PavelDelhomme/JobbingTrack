import { filterActiveThreats, isThreatIgnored } from "./threatIgnore";

describe("threatIgnore", () => {
  it("détecte ignored via champ API ou metadata", () => {
    expect(isThreatIgnored({ ignored: true })).toBe(true);
    expect(isThreatIgnored({ metadata: { ignored: true } })).toBe(true);
    expect(isThreatIgnored({ metadata: {} })).toBe(false);
  });

  it("filtre les menaces actives", () => {
    const list = [
      { id: "1", metadata: {} },
      { id: "2", ignored: true },
      { id: "3", metadata: { ignored: true } },
    ];
    expect(filterActiveThreats(list)).toHaveLength(1);
    expect(filterActiveThreats(list)[0].id).toBe("1");
  });
});

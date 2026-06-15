import { chartXDomainFromDataRange } from "../chartTimeDomain";

describe("chartXDomainFromDataRange", () => {
  it("conserve la fenêtre demandée même si les données ne couvrent que la fin de période", () => {
    const start = Date.parse("2026-05-16T00:00:00.000Z");
    const end = Date.parse("2026-06-15T00:00:00.000Z");
    const latestOnly = [
      Date.parse("2026-06-14T23:00:00.000Z"),
      Date.parse("2026-06-14T23:30:00.000Z"),
    ];

    expect(chartXDomainFromDataRange(start, end, latestOnly)).toEqual([
      start,
      end,
    ]);
  });
});

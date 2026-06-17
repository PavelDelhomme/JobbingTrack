import {
  buildLogStatsLevelOptions,
  buildLogStatsServiceOptions,
  filterLogStatsRows,
  resolveLogStatsApiFilters,
} from "../logStatsFilters";

describe("logStatsFilters", () => {
  const rows = [
    {
      level: "WARN",
      serviceName: "jobbingtrack-api-gateway",
      message: "rate limit",
    },
    {
      level: "ERROR",
      serviceName: "jobbingtrack-auth-service",
      message: "auth failed",
    },
    {
      level: null,
      serviceName: "jobbingtrack-api-gateway",
      message: "unknown",
    },
  ];

  it("construit des options niveau stables avec inconnu explicite", () => {
    expect(buildLogStatsLevelOptions(rows)).toEqual([
      "ERROR",
      "WARN",
      "inconnu",
    ]);
  });

  it("construit des options service dédupliquées", () => {
    expect(buildLogStatsServiceOptions(rows)).toEqual([
      "jobbingtrack-api-gateway",
      "jobbingtrack-auth-service",
    ]);
  });

  it("filtre par niveau et service sans modifier les lignes source", () => {
    const filtered = filterLogStatsRows(rows, {
      level: "WARN",
      service: "jobbingtrack-api-gateway",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].message).toBe("rate limit");
    expect(rows).toHaveLength(3);
  });

  it("filtre par plusieurs niveaux et services", () => {
    const filtered = filterLogStatsRows(rows, {
      level: "WARN, ERROR",
      service: "jobbingtrack-api-gateway, jobbingtrack-auth-service",
    });

    expect(filtered).toHaveLength(2);
  });

  it("résout les filtres API mono vs multi", () => {
    expect(
      resolveLogStatsApiFilters({
        level: "WARN",
        service: "jobbingtrack-api-gateway",
      }),
    ).toEqual({
      level: "WARN",
      serviceName: "jobbingtrack-api-gateway",
      serviceNames: undefined,
    });
    expect(
      resolveLogStatsApiFilters({
        level: "WARN, ERROR",
        service: "a, b",
      }),
    ).toEqual({
      level: undefined,
      serviceName: undefined,
      serviceNames: ["a", "b"],
    });
  });
});

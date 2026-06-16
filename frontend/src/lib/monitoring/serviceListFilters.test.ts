import {
  buildServiceListFiltersFromSearchParams,
  DEFAULT_SERVICE_LIST_FILTERS,
  matchesServiceListFilters,
  serviceListFiltersToSearchParams,
} from "./serviceListFilters";

describe("serviceListFilters", () => {
  const baseService = {
    is_running: true,
    is_healthy: true,
    metrics: { cpu_percent: 50, memory_percent: 55 },
  };

  it("matches all when filters are empty", () => {
    expect(
      matchesServiceListFilters(baseService, DEFAULT_SERVICE_LIST_FILTERS),
    ).toBe(true);
  });

  it("filters high CPU", () => {
    expect(
      matchesServiceListFilters(baseService, {
        ...DEFAULT_SERVICE_LIST_FILTERS,
        cpu: "high",
      }),
    ).toBe(false);
    expect(
      matchesServiceListFilters(
        { ...baseService, metrics: { cpu_percent: 90, memory_percent: 10 } },
        { ...DEFAULT_SERVICE_LIST_FILTERS, cpu: "high" },
      ),
    ).toBe(true);
  });

  it("round-trips URL search params", () => {
    const params = serviceListFiltersToSearchParams({
      status: "running",
      cpu: "high",
      memory: "",
    });
    expect(params.toString()).toBe("status=running&cpu=high");
    expect(buildServiceListFiltersFromSearchParams(params)).toEqual({
      status: "running",
      cpu: "high",
      memory: "",
    });
  });
});

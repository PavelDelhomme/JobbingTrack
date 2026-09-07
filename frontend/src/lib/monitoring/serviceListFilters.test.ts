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
    status: "running",
    health_status: "healthy",
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

  it("filters healthy / degraded / not_deployed", () => {
    expect(
      matchesServiceListFilters(baseService, {
        ...DEFAULT_SERVICE_LIST_FILTERS,
        status: "healthy",
      }),
    ).toBe(true);

    expect(
      matchesServiceListFilters(
        {
          ...baseService,
          is_healthy: false,
          health_status: "unknown",
        },
        { ...DEFAULT_SERVICE_LIST_FILTERS, status: "degraded" },
      ),
    ).toBe(true);

    expect(
      matchesServiceListFilters(
        {
          is_running: false,
          is_healthy: false,
          status: "not_deployed",
          deployment_state: "not_created",
          metrics: null,
        },
        { ...DEFAULT_SERVICE_LIST_FILTERS, status: "not_deployed" },
      ),
    ).toBe(true);

    expect(
      matchesServiceListFilters(
        {
          is_running: false,
          is_healthy: false,
          status: "exited",
          metrics: null,
        },
        { ...DEFAULT_SERVICE_LIST_FILTERS, status: "stopped" },
      ),
    ).toBe(true);

    expect(
      matchesServiceListFilters(
        {
          is_running: false,
          is_healthy: false,
          status: "not_deployed",
          deployment_state: "not_created",
          metrics: null,
        },
        { ...DEFAULT_SERVICE_LIST_FILTERS, status: "stopped" },
      ),
    ).toBe(false);
  });

  it("round-trips URL search params", () => {
    const params = serviceListFiltersToSearchParams({
      status: "healthy",
      cpu: "high",
      memory: "",
    });
    expect(params.toString()).toBe("status=healthy&cpu=high");
    expect(buildServiceListFiltersFromSearchParams(params)).toEqual({
      status: "healthy",
      cpu: "high",
      memory: "",
    });
  });
});

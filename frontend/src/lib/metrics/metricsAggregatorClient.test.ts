import {
  buildMetricsAggregatorUrl,
  getMetricsAggregatorClientBase,
} from "./metricsAggregatorClient";

describe("metricsAggregatorClient", () => {
  const previousEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...previousEnv };
    delete process.env.NEXT_PUBLIC_METRICS_VIA_FRONTEND;
    delete process.env.NEXT_PUBLIC_METRICS_AGGREGATOR_URL;
    delete process.env.NEXT_PUBLIC_METRICS_URL;
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  it("utilise des chemins proxy sans « metrics » côté navigateur (anti uBlock)", () => {
    const g = globalThis as typeof globalThis & { window?: Window };
    g.window = {} as Window;
    expect(getMetricsAggregatorClientBase()).toBe("/api/mon");
    expect(buildMetricsAggregatorUrl("docker/services/all")).toBe(
      "/api/mon/docker/services/all",
    );
    expect(buildMetricsAggregatorUrl("persistence/system/metrics")).toBe(
      "/api/persist/system/metrics",
    );
    delete g.window;
  });

  it("autorise le mode direct explicite", () => {
    process.env.NEXT_PUBLIC_METRICS_VIA_FRONTEND = "false";
    process.env.NEXT_PUBLIC_METRICS_AGGREGATOR_URL = "http://localhost:5004/";

    expect(getMetricsAggregatorClientBase()).toBe(
      "http://localhost:5004/api/v1",
    );
    expect(buildMetricsAggregatorUrl("metrics")).toBe(
      "http://localhost:5004/api/v1/metrics",
    );
  });
});

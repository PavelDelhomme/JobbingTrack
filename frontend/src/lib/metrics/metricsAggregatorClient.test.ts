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

  it("utilise le proxy Next côté navigateur par défaut", () => {
    expect(getMetricsAggregatorClientBase()).toBe("/api/metrics-aggregator");
    expect(buildMetricsAggregatorUrl("docker/services/all")).toBe(
      "/api/metrics-aggregator/docker/services/all",
    );
    expect(buildMetricsAggregatorUrl("persistence/system/metrics")).toBe(
      "/api/metrics-aggregator/persistence/system/metrics",
    );
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

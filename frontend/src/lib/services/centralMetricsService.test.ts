import { getCentralMetricsAggregatorBase } from "./centralMetricsService";

describe("getCentralMetricsAggregatorBase (alias client metrics)", () => {
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

  it("utilise le proxy frontend par défaut dans le navigateur", () => {
    expect(getCentralMetricsAggregatorBase()).toBe("/api/metrics-aggregator");
  });

  it("autorise explicitement le mode direct si demandé", () => {
    process.env.NEXT_PUBLIC_METRICS_VIA_FRONTEND = "false";
    process.env.NEXT_PUBLIC_METRICS_AGGREGATOR_URL = "http://localhost:5004/";

    expect(getCentralMetricsAggregatorBase()).toBe(
      "http://localhost:5004/api/v1",
    );
  });
});

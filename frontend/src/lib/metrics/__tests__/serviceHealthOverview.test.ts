import {
  classifyRunningServiceHealth,
  countServiceHealthBuckets,
  dedupeDockerServices,
  getRunningServicesForStats,
} from "../serviceHealthOverview";

describe("serviceHealthOverview", () => {
  it("déduplique et préfère le conteneur running", () => {
    const list = dedupeDockerServices([
      { name: "jobbingtrack-api-gateway", is_running: false, status: "exited" },
      { name: "api-gateway", is_running: true, status: "running", is_healthy: true },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].is_running).toBe(true);
  });

  it("ne compte que les services en cours", () => {
    const services = [
      { name: "jobbingtrack-frontend", is_running: true, is_healthy: true },
      { name: "jobbingtrack-old", is_running: false, status: "exited" },
      {
        name: "jobbingtrack-api-gateway",
        is_running: true,
        health_status: "unhealthy",
      },
    ];
    expect(getRunningServicesForStats(services)).toHaveLength(2);
    const counts = countServiceHealthBuckets(services);
    expect(counts.totalRunning).toBe(2);
    expect(counts.healthy).toBe(1);
    expect(counts.degraded).toBe(1);
    expect(counts.offline).toBe(0);
  });

  it("traite unknown sur conteneur actif comme dégradé", () => {
    expect(
      classifyRunningServiceHealth({
        name: "jobbingtrack-redis",
        is_running: true,
        health_status: "unknown",
      }),
    ).toBe("degraded");
  });
});

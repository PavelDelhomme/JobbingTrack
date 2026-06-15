import {
  buildStatisticsServicesFromDocker,
  classifyRunningServiceHealth,
  countServiceHealthBuckets,
  dedupeDockerServices,
  filterMetricsListToActive,
  getRunningServicesForStats,
  summarizeDockerServiceHealth,
} from "../serviceHealthOverview";
import {
  formatServiceResponseTime,
  isNonHttpDependency,
  isPriorityResponseService,
} from "../responseTimePresentation";

describe("serviceHealthOverview", () => {
  it("déduplique et préfère le conteneur running", () => {
    const list = dedupeDockerServices([
      { name: "jobbingtrack-api-gateway", is_running: false, status: "exited" },
      {
        name: "api-gateway",
        is_running: true,
        status: "running",
        is_healthy: true,
      },
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

  it("classe starting/none comme actif sain et unhealthy/degraded comme dégradé", () => {
    expect(
      classifyRunningServiceHealth({
        name: "jobbingtrack-worker",
        is_running: true,
        health_status: "starting",
      }),
    ).toBe("healthy");
    expect(
      classifyRunningServiceHealth({
        name: "jobbingtrack-redis",
        is_running: true,
        health_status: "none",
      }),
    ).toBe("healthy");
    expect(
      classifyRunningServiceHealth({
        name: "jobbingtrack-api-gateway",
        is_running: true,
        health: { status: "degraded" },
      }),
    ).toBe("degraded");
  });

  it("résume sains, dégradés et arrêtés", () => {
    const summary = summarizeDockerServiceHealth([
      { name: "jobbingtrack-frontend", is_running: true, is_healthy: true },
      {
        name: "jobbingtrack-api-gateway",
        is_running: true,
        health_status: "unhealthy",
      },
      { name: "jobbingtrack-old-worker", is_running: false, status: "exited" },
    ]);
    expect(summary.healthy).toBe(1);
    expect(summary.degraded).toBe(1);
    expect(summary.stopped).toBe(1);
    expect(summary.totalRunning).toBe(2);
  });

  it("ne transforme pas un stopped en offline dans les entrées Statistics", () => {
    const entries = buildStatisticsServicesFromDocker([
      { name: "jobbingtrack-frontend", is_running: true, is_healthy: true },
      { name: "jobbingtrack-old-worker", is_running: false, status: "exited" },
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: "jobbingtrack-frontend",
      status: "healthy",
      availability: 100,
    });
  });

  it("enrichit les entrées Statistics avec les métriques rawName correspondantes", () => {
    const entries = buildStatisticsServicesFromDocker(
      [
        {
          name: "jobbingtrack-api-gateway",
          is_running: true,
          health_status: "unknown",
          metrics: { cpu_percent: 12, memory_percent: 34 },
        },
      ],
      [
        {
          rawName: "jobbingtrack-api-gateway",
          status: "degraded",
          metrics: { cpu: { percentage: 98 }, memory: { percentage: 87 } },
          responseTimeMs: 123,
          errorRatePerMin: "0.4",
        },
      ],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      status: "degraded",
      cpu: 12,
      memory: 34,
      responseTime: 123,
      responseTimeLabel: "123ms",
      nonHttpDependency: false,
      errorRate: 0.4,
      availability: 50,
    });
  });

  it("présente Postgres comme dépendance santé Docker et non endpoint HTTP", () => {
    const entries = buildStatisticsServicesFromDocker([
      {
        name: "jobbingtrack-postgres",
        is_running: true,
        health_status: "healthy",
        health: { responseTime: null },
      },
    ]);

    expect(entries[0]).toMatchObject({
      name: "jobbingtrack-postgres",
      responseTime: 0,
      responseTimeLabel: "Santé Docker",
      nonHttpDependency: true,
      status: "healthy",
    });
  });

  it("filtre les services metrics découverts hors ligne", () => {
    const active = filterMetricsListToActive([
      { name: "api-gateway", status: "healthy" },
      { name: "auth", status: "degraded" },
      { name: "old-worker", status: "offline" },
      { name: "legacy", status: "unknown" },
    ]);
    expect(active.map((s) => s.name)).toEqual(["api-gateway", "auth"]);
  });

  it("identifie les services prioritaires P1B et formate les temps de réponse", () => {
    expect(isPriorityResponseService("jobbingtrack-auth-service")).toBe(true);
    expect(isPriorityResponseService("jobbingtrack-postgres")).toBe(false);
    expect(isPriorityResponseService("jobbingtrack-company-service")).toBe(
      false,
    );
    expect(isNonHttpDependency("jobbingtrack-postgres")).toBe(true);
    expect(formatServiceResponseTime(7.4, "notification-service")).toBe("7ms");
    expect(formatServiceResponseTime(0, "auth-service")).toBe("N/A");
    expect(formatServiceResponseTime(0, "postgres")).toBe("Santé Docker");
  });
});

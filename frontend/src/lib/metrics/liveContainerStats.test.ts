import {
  computeLiveContainerSummary,
  extractLatestSystemLivePercents,
  isContainerRunning,
  resolvePerformancesLiveCards,
} from "./liveContainerStats";

describe("liveContainerStats", () => {
  it("moyenne CPU/RAM uniquement sur conteneurs running", () => {
    const summary = computeLiveContainerSummary([
      {
        name: "jobbingtrack-a",
        status: "running",
        is_running: true,
        cpu_percent: 4,
        memory_percent: 20,
      },
      {
        name: "jobbingtrack-b",
        status: "running",
        is_running: true,
        cpu_percent: 2,
        memory_percent: 18,
      },
      {
        name: "jobbingtrack-stopped",
        status: "exited",
        is_running: false,
        cpu_percent: 99,
        memory_percent: 99,
      },
    ]);

    expect(summary.runningCount).toBe(2);
    expect(summary.totalCount).toBe(3);
    expect(summary.liveCpuAvg).toBe(3);
    expect(summary.liveMemoryAvg).toBe(19);
  });

  it("isContainerRunning utilise is_running ou status", () => {
    expect(isContainerRunning({ name: "x", is_running: true })).toBe(true);
    expect(isContainerRunning({ name: "x", status: "running" })).toBe(true);
    expect(isContainerRunning({ name: "x", status: "exited" })).toBe(false);
  });

  it("extractLatestSystemLivePercents prend le dernier point non nul", () => {
    const result = extractLatestSystemLivePercents([
      {
        timestamp: "2026-06-17T14:00:00.000Z",
        cpuUsagePercent: 2,
        memoryUsagePercent: 19,
      },
      {
        timestamp: "2026-06-17T16:39:00.000Z",
        cpuUsagePercent: null,
        memoryUsagePercent: null,
      },
      {
        timestamp: "2026-06-17T16:38:00.000Z",
        cpuUsagePercent: 23.9,
        memoryUsagePercent: 55.45,
      },
    ]);

    expect(result.liveCpu).toBe(23.9);
    expect(result.liveMemory).toBe(55.45);
    expect(result.recordedAt).toBe("2026-06-17T16:38:00.000Z");
  });

  it("resolvePerformancesLiveCards priorise le système sur la moyenne Docker", () => {
    const cards = resolvePerformancesLiveCards(
      [
        {
          timestamp: "2026-06-17T16:39:00.000Z",
          cpuUsagePercent: 23.9,
          memoryUsagePercent: 55.45,
        },
      ],
      [
        {
          name: "jobbingtrack-a",
          status: "running",
          is_running: true,
          cpu_percent: 2,
          memory_percent: 19,
        },
      ],
    );

    expect(cards.source).toBe("system");
    expect(cards.liveCpu).toBe(23.9);
    expect(cards.liveMemory).toBe(55.45);
    expect(cards.runningCount).toBe(1);
  });

  it("resolvePerformancesLiveCards retombe sur Docker si pas de système", () => {
    const cards = resolvePerformancesLiveCards([], [
      {
        name: "jobbingtrack-a",
        status: "running",
        is_running: true,
        cpu_percent: 4,
        memory_percent: 20,
      },
      {
        name: "jobbingtrack-b",
        status: "running",
        is_running: true,
        cpu_percent: 2,
        memory_percent: 18,
      },
    ]);

    expect(cards.source).toBe("docker");
    expect(cards.liveCpu).toBe(3);
    expect(cards.liveMemory).toBe(19);
  });
});

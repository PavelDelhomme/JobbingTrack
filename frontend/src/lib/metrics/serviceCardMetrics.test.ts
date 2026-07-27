import {
  formatMetricMb,
  formatMetricPercent,
  normalizeServiceCardMetrics,
} from "./serviceCardMetrics";

describe("normalizeServiceCardMetrics", () => {
  it("lit la forme plate docker (cpu_percent / memory_usage_mb)", () => {
    const n = normalizeServiceCardMetrics({
      cpu_percent: 3.456,
      memory_percent: 12.1,
      memory_usage_mb: 180.5,
      network: { rx: 2 * 1024 * 1024, tx: 1024 * 1024 },
      pids: 42,
    });
    expect(n.cpuPercent).toBeCloseTo(3.456);
    expect(n.memoryPercent).toBeCloseTo(12.1);
    expect(n.memoryUsageMb).toBeCloseTo(180.5);
    expect(n.networkTotalMb).toBeCloseTo(3);
    expect(n.pids).toBe(42);
  });

  it("lit la forme UI incorrecte cpu=number + memory.usage déjà en Mo", () => {
    const n = normalizeServiceCardMetrics({
      cpu: 1.25,
      memory: { percent: 8.5, usage: 220 },
    });
    expect(n.cpuPercent).toBeCloseTo(1.25);
    expect(n.memoryPercent).toBeCloseTo(8.5);
    expect(n.memoryUsageMb).toBeCloseTo(220);
  });

  it("lit la forme imbriquée cpu.percentage + fallback conteneur", () => {
    const n = normalizeServiceCardMetrics(
      { cpu: { percentage: "0.4%" }, memory: { percentage: 2 } },
      {
        cpu: { percentage: 9.9 },
        memory: { usageMb: 64 },
      },
    );
    expect(n.cpuPercent).toBeCloseTo(0.4);
    expect(n.memoryPercent).toBeCloseTo(2);
    expect(n.memoryUsageMb).toBeCloseTo(64);
  });

  it("utilise le fallback conteneur si metrics absentes", () => {
    const n = normalizeServiceCardMetrics(null, {
      cpu: { percentage: 5.5 },
      memory: { percentage: 10, usage: 128 },
    });
    expect(n.cpuPercent).toBeCloseTo(5.5);
    expect(n.memoryPercent).toBeCloseTo(10);
    expect(n.memoryUsageMb).toBeCloseTo(128);
  });
});

describe("format helpers", () => {
  it("formate pourcent et Mo", () => {
    expect(formatMetricPercent(1.234)).toBe("1.2%");
    expect(formatMetricMb(180.4)).toBe("180 MB");
    expect(formatMetricPercent(null)).toBeNull();
  });
});

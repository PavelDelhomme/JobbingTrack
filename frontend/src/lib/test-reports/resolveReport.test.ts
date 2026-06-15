import { mkdtemp, rm, mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

describe("resolveReport", () => {
  const originalTestsResultsDir = process.env.TESTS_RESULTS_DIR;
  let tempDir: string;

  beforeEach(async () => {
    jest.resetModules();
    tempDir = await mkdtemp(join(tmpdir(), "jt-test-reports-"));
    process.env.TESTS_RESULTS_DIR = tempDir;
  });

  afterEach(async () => {
    process.env.TESTS_RESULTS_DIR = originalTestsResultsDir;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("résout un rapport CVE summary.json seul en lignes comparables", async () => {
    const reportDir = join(tempDir, "security", "cve-20260609-101112");
    await mkdir(reportDir, { recursive: true });
    await writeFile(
      join(reportDir, "summary.json"),
      JSON.stringify({
        meta: { scan_type: "Scan CVE dépendances" },
        results: [
          {
            kind: "node",
            name: "frontend",
            status: "ok",
            counts: { critical: 0, high: 1, medium: 0, low: 0, info: 0 },
          },
          {
            kind: "flutter",
            name: "mobile",
            status: "ok",
            counts: { critical: 0, high: 0, medium: 1, low: 0, info: 2 },
          },
          {
            kind: "docker",
            name: "postgres",
            status: "skipped",
            counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
          },
        ],
      }),
      "utf-8",
    );

    const { loadCompareReport } = await import("./resolveReport");
    const report = await loadCompareReport(
      "security-results-cve-20260609-101112",
    );

    expect(report).not.toBeNull();
    expect(report?.category).toBe("Sécurité");
    expect(report?.summary).toMatchObject({
      total: 3,
      passed: 1,
      failed: 1,
      skipped: 1,
      high: 1,
      medium: 1,
      info: 2,
    });
    expect(report?.tests).toHaveLength(3);
    expect(report?.tests[0]).toMatchObject({
      name: "node — frontend",
      status: "fail",
      response: "vulnerable",
    });
    expect(report?.tests[1]).toMatchObject({
      name: "flutter — mobile",
      status: "pass",
      response: "warning",
    });
    expect(report?.tests[2]).toMatchObject({
      name: "docker — postgres",
      status: "skip",
      response: "skipped",
    });
  });
});

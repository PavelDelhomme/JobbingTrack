import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const PROJECT_ROOT =
  process.env.PROJECT_ROOT ||
  (process.cwd().includes("frontend")
    ? join(process.cwd(), "..")
    : process.cwd());
const TESTS_RESULTS_DIR =
  process.env.TESTS_RESULTS_DIR || join(PROJECT_ROOT, "tests", "results");

interface TestRow {
  num: number;
  name: string;
  status: "pass" | "fail";
  expected: string;
  actual: string;
  response?: string;
}

interface ReportData {
  id: string;
  name: string;
  date: string;
  time: string;
  category: string;
  summary: { total: number; passed: number; failed: number; skipped: number };
  tests: TestRow[];
}

function parseTestResultsTxt(content: string): TestRow[] {
  const rows: TestRow[] = [];
  const lines = content.trim().split("\n");
  for (const line of lines) {
    const parts = line.split("|");
    if (parts[0] !== "TEST" || parts.length < 5) continue;
    const [, num, name, status, expected, actual, response] = parts;
    rows.push({
      num: parseInt(num || "0", 10),
      name: (name || "").trim(),
      status:
        (status || "fail").trim().toLowerCase() === "pass" ? "pass" : "fail",
      expected: (expected || "").trim(),
      actual: (actual || "").trim(),
      response: (response || "").trim(),
    });
  }
  return rows;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    if (!idsParam) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paramètre ids requis (ex: ids=20260219-223913,20260219-120000)",
        },
        { status: 400 },
      );
    }
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Au moins 2 rapports sont requis pour comparer",
        },
        { status: 400 },
      );
    }

    const reportsData: ReportData[] = [];
    let category: string | null = null;

    for (const id of ids) {
      const dirPath = join(TESTS_RESULTS_DIR, id);
      if (!existsSync(dirPath)) {
        return NextResponse.json(
          { success: false, error: `Rapport non trouvé: ${id}` },
          { status: 404 },
        );
      }

      const summaryPath = join(dirPath, "summary.json");
      let summary: {
        totalTests?: number;
        totalPassed?: number;
        totalFailed?: number;
        totalSkipped?: number;
        category?: string;
        testName?: string;
      } = {};
      if (existsSync(summaryPath)) {
        try {
          const raw = await readFile(summaryPath, "utf-8");
          const parsed = JSON.parse(raw);
          summary = {
            ...(parsed.summary || {}),
            category: parsed.category,
            testName: parsed.testName,
          };
          if (parsed.category && !category) category = parsed.category;
        } catch {
          // ignore
        }
      }

      const total = summary.totalTests ?? 0;
      const passed = summary.totalPassed ?? 0;
      const failed = summary.totalFailed ?? 0;
      const skipped = summary.totalSkipped ?? 0;

      let tests: TestRow[] = [];
      const testResultsPath = join(dirPath, "test-results.txt");
      if (existsSync(testResultsPath)) {
        try {
          const txt = await readFile(testResultsPath, "utf-8");
          tests = parseTestResultsTxt(txt);
        } catch {
          // ignore
        }
      }

      const [datePart, timePart] = id.split("-");
      const date =
        datePart && datePart.length >= 8
          ? `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`
          : id;
      const time =
        timePart && timePart.length >= 6
          ? `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}:${timePart.slice(4, 6)}`
          : "";

      reportsData.push({
        id,
        name: summary.testName
          ? `${summary.testName} - ${date} ${time}`
          : `Rapport ${date} ${time}`,
        date,
        time,
        category: summary.category || "Tests",
        summary: { total, passed, failed, skipped },
        tests,
      });
    }

    // Vérifier même catégorie si on a au moins 2 rapports avec une catégorie
    const categories = reportsData.map((r) => r.category).filter(Boolean);
    const uniqueCategories = Array.from(new Set(categories));
    if (uniqueCategories.length > 1) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Comparaison possible uniquement entre rapports de la même catégorie (ex: tous "Tests API")',
        },
        { status: 400 },
      );
    }

    // Construire la comparaison par test (si on a des tests détaillés)
    const byTest: Array<{
      testName: string;
      results: Record<string, "pass" | "fail" | "skip">;
      details?: Record<
        string,
        { expected?: string; actual?: string; response?: string }
      >;
      diff?: string;
    }> = [];
    const allTestNames = new Set<string>();
    for (const r of reportsData) {
      for (const t of r.tests) allTestNames.add(t.name);
    }
    if (allTestNames.size > 0) {
      for (const testName of Array.from(allTestNames).sort()) {
        const results: Record<string, "pass" | "fail" | "skip"> = {};
        const details: Record<
          string,
          { expected?: string; actual?: string; response?: string }
        > = {};
        for (let i = 0; i < reportsData.length; i++) {
          const report = reportsData[i];
          const row = report.tests.find((t) => t.name === testName);
          results[report.id] = row ? row.status : "skip";
          if (row) {
            details[report.id] = {
              expected: row.expected || undefined,
              actual: row.actual || undefined,
              response: row.response || undefined,
            };
          }
        }
        const statuses = Object.values(results);
        const allPass = statuses.every((s) => s === "pass");
        const allFail = statuses.every((s) => s === "fail");
        const mixed =
          !allPass && !allFail && statuses.some((s) => s !== "skip");
        let diff: string | undefined;
        if (mixed) {
          const ids = reportsData.map((r) => r.id);
          const parts = ids.map((id) => {
            const d = details[id];
            const st = results[id];
            if (d?.expected !== undefined || d?.actual !== undefined) {
              return `${st}: attendu ${d.expected ?? "?"}, reçu ${d.actual ?? "?"}`;
            }
            return st;
          });
          diff = parts.join(" → ");
        } else if (allPass) diff = "Réussi partout";
        else if (allFail) diff = "Échoué partout";
        byTest.push({
          testName,
          results,
          details: Object.keys(details).length ? details : undefined,
          diff,
        });
      }
    }

    return NextResponse.json({
      success: true,
      reports: reportsData,
      comparison: {
        byTest,
        sameCategory: uniqueCategories[0] || null,
      },
    });
  } catch (error: any) {
    console.error("Erreur comparaison rapports:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur lors de la comparaison",
      },
      { status: 500 },
    );
  }
}

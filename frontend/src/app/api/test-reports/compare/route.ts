import { NextRequest, NextResponse } from "next/server";
import { loadCompareReport } from "@/lib/test-reports/resolveReport";

function secureJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    if (!idsParam) {
      return secureJson(
        {
          success: false,
          error:
            "Paramètre ids requis (ex: ids=security-results-cve-20260521-201336,20260219-120000)",
        },
        { status: 400 },
      );
    }
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length < 2) {
      return secureJson(
        {
          success: false,
          error: "Au moins 2 rapports sont requis pour comparer",
        },
        { status: 400 },
      );
    }
    if (ids.length > 5) {
      return secureJson(
        {
          success: false,
          error: "Comparaison limitée à 5 rapports pour éviter d'exposer trop de données sensibles d'un coup",
        },
        { status: 400 },
      );
    }

    const invalidId = ids.find((id) => !/^[a-zA-Z0-9._-]+$/.test(id));
    if (invalidId) {
      return secureJson(
        { success: false, error: `Identifiant de rapport invalide: ${invalidId}` },
        { status: 400 },
      );
    }

    const reportsData = [];
    for (const id of ids) {
      const report = await loadCompareReport(id);
      if (!report) {
        return secureJson(
          { success: false, error: `Rapport non trouvé: ${id}` },
          { status: 404 },
        );
      }
      reportsData.push(report);
    }

    const categories = reportsData.map((r) => r.category).filter(Boolean);
    const uniqueCategories = Array.from(new Set(categories));
    if (uniqueCategories.length > 1) {
      return secureJson(
        {
          success: false,
          error:
            'Comparaison possible uniquement entre rapports de la même catégorie (ex: tous "Sécurité" ou tous "Tests API")',
        },
        { status: 400 },
      );
    }

    const byTest: Array<{
      testName: string;
      results: Record<string, "pass" | "fail" | "skip">;
      details?: Record<
        string,
        {
          expected?: string;
          actual?: string;
          response?: string;
          security?: {
            kind: string;
            surface: string;
            status: string;
            critical: number;
            high: number;
            medium: number;
            low: number;
            info: number;
          };
        }
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
          {
            expected?: string;
            actual?: string;
            response?: string;
            security?: {
              kind: string;
              surface: string;
              status: string;
              critical: number;
              high: number;
              medium: number;
              low: number;
              info: number;
            };
          }
        > = {};
        for (const report of reportsData) {
          const row = report.tests.find((t) => t.name === testName);
          results[report.id] = row ? row.status : "skip";
          if (row) {
            details[report.id] = {
              expected: row.expected || undefined,
              actual: row.actual || undefined,
              response: row.response || undefined,
              security: row.security,
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
          const parts = reportsData.map((r) => {
            const d = details[r.id];
            const st = results[r.id];
            if (d?.security) {
              const s = d.security;
              return `${st}: C${s.critical}/H${s.high}/M${s.medium}/L${s.low}`;
            }
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

    const isSecurityComparison = uniqueCategories[0] === "Sécurité";
    const securitySummary = isSecurityComparison
      ? {
          totalCritical: reportsData.reduce(
            (total, report) => total + (report.summary.critical ?? 0),
            0,
          ),
          totalHigh: reportsData.reduce(
            (total, report) => total + (report.summary.high ?? 0),
            0,
          ),
          rowsCompared: byTest.length,
          sensitiveDataPolicy:
            "La comparaison affiche uniquement les surfaces, statuts et compteurs de sévérité. Les notes brutes/payloads ne sont pas renvoyés par cette API.",
        }
      : null;

    return secureJson({
      success: true,
      reports: reportsData,
      comparison: {
        byTest,
        sameCategory: uniqueCategories[0] || null,
        securitySummary,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erreur lors de la comparaison";
    console.error("Erreur comparaison rapports:", error);
    return secureJson(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

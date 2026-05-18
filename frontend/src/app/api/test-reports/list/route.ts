import { NextRequest, NextResponse } from "next/server";
import { readdir, stat, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Chemin vers les résultats de tests (depuis la racine du projet)
const PROJECT_ROOT = process.cwd().includes("frontend")
  ? join(process.cwd(), "..")
  : process.cwd();
const TESTS_RESULTS_DIR =
  process.env.TESTS_RESULTS_DIR || join(PROJECT_ROOT, "tests", "results");

export async function GET(request: NextRequest) {
  try {
    // Vérifier que le répertoire existe
    try {
      await stat(TESTS_RESULTS_DIR);
    } catch {
      return NextResponse.json({
        success: true,
        reports: [],
      });
    }

    // Lister tous les répertoires de résultats (format: YYYYMMDD-HHMMSS)
    const entries = await readdir(TESTS_RESULTS_DIR, { withFileTypes: true });
    const reportDirs = entries
      .filter(
        (entry) => entry.isDirectory() && /^\d{8}-\d{6}$/.test(entry.name),
      )
      .sort()
      .reverse(); // Plus récents en premier

    const reports = [];

    for (const dir of reportDirs) {
      const dirPath = join(TESTS_RESULTS_DIR, dir.name);
      const htmlPath = join(dirPath, "report.html");
      const summaryPath = join(dirPath, "summary.json");

      // Vérifier que le rapport HTML existe
      try {
        await stat(htmlPath);
      } catch {
        continue; // Ignorer si pas de rapport HTML
      }

      // Lire le résumé JSON si disponible
      let summary = null;
      try {
        const summaryContent = await readFile(summaryPath, "utf-8");
        summary = JSON.parse(summaryContent);
      } catch {
        // Pas de résumé, ce n'est pas grave
      }

      // Parser la date depuis le nom du répertoire
      const [datePart, timePart] = dir.name.split("-");
      const year = datePart.substring(0, 4);
      const month = datePart.substring(4, 6);
      const day = datePart.substring(6, 8);
      const hour = timePart.substring(0, 2);
      const minute = timePart.substring(2, 4);
      const second = timePart.substring(4, 6);

      const date = `${year}-${month}-${day}`;
      const time = `${hour}:${minute}:${second}`;

      // Déterminer le statut
      let status: "success" | "failed" | "partial" = "partial";
      if (summary) {
        if (summary.totalFailed === 0 && summary.totalPassed > 0) {
          status = "success";
        } else if (summary.totalPassed === 0 && summary.totalFailed > 0) {
          status = "failed";
        } else if (summary.totalFailed > 0) {
          status = "partial";
        }
      }

      // Utiliser un chemin relatif pour l'API (juste le nom du répertoire + report.html)
      const relativeHtmlPath = `${dir.name}/report.html`;

      reports.push({
        id: dir.name,
        timestamp: dir.name,
        date,
        time,
        path: dirPath,
        summaryPath,
        htmlPath: relativeHtmlPath, // Chemin relatif pour l'API
        totalTests: summary?.totalTests || 0,
        passed: summary?.totalPassed || 0,
        failed: summary?.totalFailed || 0,
        skipped: summary?.totalSkipped || 0,
        status,
      });
    }

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error: any) {
    console.error("Erreur liste rapports:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur lors de la lecture des rapports",
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { readdir, stat, readFile } from "fs/promises";
import { join, resolve } from "path";
import { existsSync } from "fs";
import {
  getProjectRoot,
  getSecurityReportsDir,
  getSecurityResultsDir,
  getTestsResultsDir,
  IS_DOCKER,
} from "@/lib/test-reports/paths";

const PROJECT_ROOT = getProjectRoot();

// Dossiers de rapports (en Docker : TESTS_RESULTS_DIR = /tmp/tests/results, volume writable)
const REPORT_DIRS = {
  "performance-backend": join(PROJECT_ROOT, "reports/performance/backend"),
  "performance-frontend": join(PROJECT_ROOT, "frontend", "performance-reports"),
  playwright: join(PROJECT_ROOT, "frontend", "playwright-report"),
  "tests-results": getTestsResultsDir(),
  "tests-results-tmp":
    process.env.TESTS_RESULTS_DIR &&
    process.env.TESTS_RESULTS_DIR !== join(PROJECT_ROOT, "tests", "results")
      ? process.env.TESTS_RESULTS_DIR
      : "",
  "tests-reports": join(PROJECT_ROOT, "tests", "reports"),
  coverage: join(PROJECT_ROOT, "tests", "coverage"),
  "coverage-frontend": join(PROJECT_ROOT, "frontend", "coverage"),
  "user-journey":
    process.env.USER_JOURNEY_REPORTS_DIR ||
    join(PROJECT_ROOT, "tests", "user-journey-reports"),
  "user-journey-fallback": IS_DOCKER ? "/tmp/journey-reports" : "",
  analytics: join(PROJECT_ROOT, "tests", "analytics-reports"),
  "security-reports": getSecurityReportsDir(),
  "security-results": getSecurityResultsDir(),
};

async function getDirectorySize(dir: string): Promise<number> {
  let total = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        total += await getDirectorySize(entryPath);
      } else if (entry.isFile()) {
        const entryStats = await stat(entryPath);
        total += entryStats.size;
      }
    }
  } catch {
    // Taille informative seulement : ne pas masquer un rapport si un fichier disparaît.
  }
  return total;
}

interface TestReport {
  id: string;
  category: string;
  name: string;
  timestamp: string;
  date: string;
  time: string;
  /** ISO UTC (ex. 2026-02-20T15:54:52Z) pour affichage en heure locale dans le frontend */
  generatedAtISO?: string;
  path: string;
  htmlPath?: string;
  /** Chemin relatif summary.json si présent */
  summaryPath?: string;
  pdfPath?: string;
  jsonPath?: string;
  summary?: any;
  totalTests?: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  status?: "success" | "failed" | "partial" | "unknown";
  size?: number;
  type:
    | "performance-backend"
    | "performance-frontend"
    | "playwright"
    | "unitaire"
    | "e2e"
    | "coverage"
    | "security"
    | "other";
}

/**
 * Scanner un dossier de rapports de performance backend
 */
async function scanPerformanceBackend(dir: string): Promise<TestReport[]> {
  const reports: TestReport[] = [];

  if (!existsSync(dir)) return reports;

  try {
    const files = await readdir(dir);
    const jsonFiles = files.filter(
      (f) => f.endsWith(".json") && f.includes("performance"),
    );

    for (const file of jsonFiles) {
      const filePath = join(dir, file);
      const stats = await stat(filePath);

      // Extraire le timestamp du nom de fichier (format: backend_performance_YYYYMMDD_HHMMSS.json)
      const match = file.match(/(\d{8})_(\d{6})/);
      let date = "N/A";
      let time = "N/A";
      let timestamp = file.replace(".json", "");

      if (match) {
        const [, datePart, timePart] = match;
        date = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
        time = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;
        timestamp = `${datePart}_${timePart}`;
      }

      // Lire le contenu JSON pour extraire les métriques
      let summary = null;
      try {
        const content = await readFile(filePath, "utf-8");
        summary = JSON.parse(content);
      } catch {
        // Ignorer les erreurs de parsing
      }

      reports.push({
        id: `perf-backend-${timestamp}`,
        category: "Performance",
        name: `Performance Backend - ${date} ${time}`,
        timestamp,
        date,
        time,
        path: filePath,
        jsonPath: file,
        summary,
        type: "performance-backend",
        status: "unknown",
        size: stats.size,
      });
    }
  } catch (error) {
    console.error("Erreur scan performance backend:", error);
  }

  return reports;
}

/**
 * Scanner un dossier de rapports de performance frontend
 */
async function scanPerformanceFrontend(dir: string): Promise<TestReport[]> {
  const reports: TestReport[] = [];

  if (!existsSync(dir)) return reports;

  try {
    const files = await readdir(dir);
    const jsonFiles = files.filter(
      (f) => f.endsWith(".json") && f.includes("performance"),
    );

    for (const file of jsonFiles) {
      const filePath = join(dir, file);
      const stats = await stat(filePath);

      // Extraire le timestamp (format: performance_YYYYMMDD_HHMMSS.json)
      const match = file.match(/(\d{8})_(\d{6})/);
      let date = "N/A";
      let time = "N/A";
      let timestamp = file.replace(".json", "");

      if (match) {
        const [, datePart, timePart] = match;
        date = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
        time = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;
        timestamp = `${datePart}_${timePart}`;
      }

      let summary = null;
      try {
        const content = await readFile(filePath, "utf-8");
        summary = JSON.parse(content);
      } catch {
        // Ignorer
      }

      reports.push({
        id: `perf-frontend-${timestamp}`,
        category: "Performance",
        name: `Performance Frontend - ${date} ${time}`,
        timestamp,
        date,
        time,
        path: filePath,
        jsonPath: file,
        summary,
        type: "performance-frontend",
        status: "unknown",
        size: stats.size,
      });
    }
  } catch (error) {
    console.error("Erreur scan performance frontend:", error);
  }

  return reports;
}

/**
 * Scanner les résultats de tests (format: YYYYMMDD-HHMMSS)
 */
async function scanTestsResults(dir: string): Promise<TestReport[]> {
  const reports: TestReport[] = [];

  if (!existsSync(dir)) return reports;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const reportDirs = entries
      .filter(
        (entry) => entry.isDirectory() && /^\d{8}-\d{6}$/.test(entry.name),
      )
      .sort()
      .reverse();

    for (const dirEntry of reportDirs) {
      const dirPath = join(dir, dirEntry.name);
      const htmlPath = join(dirPath, "report.html");
      const summaryPath = join(dirPath, "summary.json");

      // ✅ Vérifier que le répertoire existe vraiment et contient des fichiers
      let dirExists = false;
      try {
        const dirStat = await stat(dirPath);
        if (!dirStat.isDirectory()) continue;
        dirExists = true;
      } catch {
        // Le répertoire n'existe plus, l'ignorer
        continue;
      }

      // Vérifier que le rapport HTML existe
      let hasHtml = false;
      try {
        await stat(htmlPath);
        hasHtml = true;
      } catch {
        // Pas de HTML, vérifier s'il y a d'autres fichiers JSON
        try {
          const files = await readdir(dirPath);
          const hasJsonFiles = files.some((f) => f.endsWith(".json"));
          if (!hasJsonFiles) {
            // Pas de fichiers, ignorer ce répertoire
            continue;
          }
        } catch {
          // Erreur de lecture, ignorer
          continue;
        }
      }

      // Lire le résumé JSON
      let summary = null;
      try {
        const summaryContent = await readFile(summaryPath, "utf-8");
        summary = JSON.parse(summaryContent);
      } catch {
        // Pas de résumé, essayer de lire les fichiers JSON individuels
        try {
          const files = await readdir(dirPath);
          const jsonFiles = files.filter(
            (f) => f.endsWith(".json") && f !== "summary.json",
          );

          // Lire tous les JSON et agréger les statistiques
          let totalTests = 0;
          let totalPassed = 0;
          let totalFailed = 0;
          let totalSkipped = 0;

          for (const jsonFile of jsonFiles) {
            try {
              const jsonPath = join(dirPath, jsonFile);
              const jsonContent = await readFile(jsonPath, "utf-8");
              const jsonData = JSON.parse(jsonContent);

              // Extraire les statistiques selon le format
              if (jsonData.statistics) {
                totalTests += jsonData.statistics.total || 0;
                totalPassed += jsonData.statistics.passed || 0;
                totalFailed += jsonData.statistics.failed || 0;
              } else if (jsonData.summary) {
                totalTests += jsonData.summary.totalTests || 0;
                totalPassed += jsonData.summary.totalPassed || 0;
                totalFailed += jsonData.summary.totalFailed || 0;
                totalSkipped += jsonData.summary.totalSkipped || 0;
              }
            } catch {
              // Ignorer les erreurs de parsing
            }
          }

          // Créer un résumé agrégé
          if (totalTests > 0 || totalPassed > 0 || totalFailed > 0) {
            summary = {
              totalTests,
              totalPassed,
              totalFailed,
              totalSkipped,
              passed: totalPassed,
              failed: totalFailed,
              skipped: totalSkipped,
            };
          }
        } catch {
          // Pas de fichiers JSON non plus
        }
      }

      // Parser la date
      const [datePart, timePart] = dirEntry.name.split("-");
      const year = datePart.substring(0, 4);
      const month = datePart.substring(4, 6);
      const day = datePart.substring(6, 8);
      const hour = timePart.substring(0, 2);
      const minute = timePart.substring(2, 4);
      const second = timePart.substring(4, 6);

      const date = `${year}-${month}-${day}`;
      const time = `${hour}:${minute}:${second}`;
      // Si le rapport a une date générée en UTC (generatedAtISO), on l’utilise pour l’affichage en heure locale
      const generatedAtISO = summary?.generatedAtISO as string | undefined;

      // ✅ Extraire les statistiques du résumé (support de plusieurs formats)
      let totalTests = summary?.totalTests || summary?.summary?.totalTests || 0;
      let totalPassed =
        summary?.totalPassed ||
        summary?.summary?.totalPassed ||
        summary?.passed ||
        0;
      let totalFailed =
        summary?.totalFailed ||
        summary?.summary?.totalFailed ||
        summary?.failed ||
        0;
      const totalSkipped =
        summary?.totalSkipped ||
        summary?.summary?.totalSkipped ||
        summary?.skipped ||
        0;
      // Tests Sécurité : si summary.security existe, rendre total/passed/failed cohérents (total = sécurisées + vulnérabilités)
      const sec = summary?.summary?.security as
        | {
            critical?: number;
            high?: number;
            medium?: number;
            low?: number;
            secure?: number;
          }
        | undefined;
      if (
        sec &&
        (typeof sec.secure === "number" || typeof sec.critical === "number")
      ) {
        const secure = sec.secure ?? 0;
        const vulns =
          (sec.critical ?? 0) +
          (sec.high ?? 0) +
          (sec.medium ?? 0) +
          (sec.low ?? 0);
        const totalSec = secure + vulns;
        if (totalSec > 0) {
          totalTests = totalSec;
          totalPassed = secure;
          totalFailed = vulns;
        }
      }
      // Cohérence globale : si totalTests est 0 ou absent, utiliser passed+failed+skipped ; sinon garder totalTests du rapport (ex. 776 = 774+2)
      const sum = totalPassed + totalFailed;
      const sumWithSkipped = sum + totalSkipped;
      if (totalTests === 0 && sumWithSkipped > 0) totalTests = sumWithSkipped;
      if (totalTests === 0 && sum > 0) totalTests = sum;

      // Déterminer le statut (éviter "unknown" : utiliser testResults[0].status si totalTests === 0)
      let status: "success" | "failed" | "partial" | "unknown" = "partial";
      if (totalTests > 0) {
        if (totalFailed === 0 && totalPassed > 0) {
          status = "success";
        } else if (totalPassed === 0 && totalFailed > 0) {
          status = "failed";
        } else if (totalFailed > 0) {
          status = "partial";
        }
      } else {
        const firstResultStatus = summary?.testResults?.[0]?.status;
        status =
          firstResultStatus === "success"
            ? "success"
            : firstResultStatus === "failed"
              ? "failed"
              : "partial";
      }

      // Catégorie et type depuis summary.json (généré par generate-test-report.sh)
      let type: "unitaire" | "e2e" | "other" = "other";
      let category = "Suite CLI";
      if (
        summary &&
        typeof summary.category === "string" &&
        summary.category.trim()
      ) {
        category = summary.category;
      } else if (summary?.testResults?.length) {
        category = "Suite CLI";
      }
      const testNameFromSummary =
        summary && typeof summary.testName === "string"
          ? summary.testName
          : "Suite complète (ligne de commande)";

      if (summary) {
        if (summary.testType === "e2e" || summary.testType === "playwright") {
          type = "e2e";
          if (!summary.category) category = "E2E / Playwright";
        } else if (
          summary.testType === "unit" ||
          summary.testType === "unitaire"
        ) {
          type = "unitaire";
          if (!summary.category) category = "Tests Unitaires";
        }
      }

      const reportName = testNameFromSummary
        ? `${testNameFromSummary} - ${date} ${time}`
        : `${category} - ${date} ${time}`;
      const reportSize = await getDirectorySize(dirPath);

      reports.push({
        id: dirEntry.name,
        category,
        name: reportName,
        timestamp: dirEntry.name,
        date,
        time,
        ...(generatedAtISO && { generatedAtISO }),
        path: dirPath,
        htmlPath: `${dirEntry.name}/report.html`,
        summaryPath,
        summary,
        totalTests,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        status,
        type,
        size: reportSize,
      });
    }
  } catch (error) {
    console.error("Erreur scan tests results:", error);
  }

  return reports;
}

async function scanEmailTriageResults(
  resultsRoot: string,
): Promise<TestReport[]> {
  const reports: TestReport[] = [];
  const dir = join(resultsRoot, "email-triage");

  if (!existsSync(dir)) return reports;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const reportDirs = entries
      .filter(
        (entry) => entry.isDirectory() && /^\d{8}-\d{6}$/.test(entry.name),
      )
      .sort()
      .reverse();

    for (const dirEntry of reportDirs) {
      const dirPath = join(dir, dirEntry.name);
      const summaryPath = join(dirPath, "summary.json");
      const [datePart, timePart] = dirEntry.name.split("-");
      const date = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
      const time = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;

      let summary: any = null;
      try {
        summary = JSON.parse(await readFile(summaryPath, "utf-8"));
      } catch {
        continue;
      }

      const totalTests = summary?.totals?.tests ?? 0;
      const passed = summary?.totals?.passed ?? 0;
      const failed = summary?.totals?.failed ?? 0;
      const skipped = summary?.totals?.skipped ?? 0;

      reports.push({
        id: `email-triage-${dirEntry.name}`,
        category: "Agent email / triage",
        name: `Agent email / triage - ${date} ${time}`,
        timestamp: dirEntry.name,
        date,
        time,
        generatedAtISO: summary?.timestamp,
        path: dirPath,
        summaryPath,
        summary,
        totalTests,
        passed,
        failed,
        skipped,
        status:
          failed === 0 && passed > 0
            ? "success"
            : failed > 0 && passed > 0
              ? "partial"
              : failed > 0
                ? "failed"
                : "unknown",
        type: "unitaire",
        size: await getDirectorySize(dirPath),
      });
    }
  } catch (error) {
    console.error("Erreur scan email-triage:", error);
  }

  return reports;
}

async function scanControlledOffensiveResults(
  resultsRoot: string,
): Promise<TestReport[]> {
  const reports: TestReport[] = [];
  const dir = join(resultsRoot, "controlled-offensive");

  if (!existsSync(dir)) return reports;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const reportDirs = entries
      .filter(
        (entry) => entry.isDirectory() && /^\d{8}-\d{6}$/.test(entry.name),
      )
      .sort()
      .reverse();

    for (const dirEntry of reportDirs) {
      const dirPath = join(dir, dirEntry.name);
      const summaryPath = join(dirPath, "summary.json");
      const [datePart, timePart] = dirEntry.name.split("-");
      const date = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
      const time = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;

      let summary: any = null;
      try {
        summary = JSON.parse(await readFile(summaryPath, "utf-8"));
      } catch {
        continue;
      }

      const totalTests = summary?.totals?.tests ?? 0;
      const passed = summary?.totals?.passed ?? 0;
      const failed = summary?.totals?.failed ?? 0;
      const skipped = summary?.totals?.skipped ?? 0;

      reports.push({
        id: `controlled-offensive-${dirEntry.name}`,
        category: "Tests offensifs contrôlés",
        name: `Tests offensifs contrôlés - ${date} ${time}`,
        timestamp: dirEntry.name,
        date,
        time,
        generatedAtISO: summary?.timestamp,
        path: dirPath,
        summaryPath,
        summary,
        totalTests,
        passed,
        failed,
        skipped,
        status:
          failed === 0 && passed > 0
            ? "success"
            : failed > 0 && passed > 0
              ? "partial"
              : failed > 0
                ? "failed"
                : "unknown",
        type: "security",
        size: await getDirectorySize(dirPath),
      });
    }
  } catch (error) {
    console.error("Erreur scan controlled-offensive:", error);
  }

  return reports;
}

async function scanPerformanceCorrelationResults(
  resultsRoot: string,
): Promise<TestReport[]> {
  const reports: TestReport[] = [];
  const dir = join(resultsRoot, "performance-correlation");

  if (!existsSync(dir)) return reports;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const reportDirs = entries
      .filter(
        (entry) => entry.isDirectory() && /^\d{8}-\d{6}$/.test(entry.name),
      )
      .sort()
      .reverse();

    for (const dirEntry of reportDirs) {
      const dirPath = join(dir, dirEntry.name);
      const summaryPath = join(dirPath, "summary.json");
      const [datePart, timePart] = dirEntry.name.split("-");
      const date = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
      const time = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;

      let summary: any = null;
      try {
        summary = JSON.parse(await readFile(summaryPath, "utf-8"));
      } catch {
        continue;
      }

      const totalTests = summary?.totals?.steps ?? 0;
      const passed = summary?.totals?.passed ?? 0;
      const failed = summary?.totals?.failed ?? 0;

      reports.push({
        id: `performance-correlation-${dirEntry.name}`,
        category: "Corrélation performances",
        name: `Corrélation performances - ${date} ${time}`,
        timestamp: dirEntry.name,
        date,
        time,
        generatedAtISO: summary?.timestamp,
        path: dirPath,
        summaryPath,
        summary,
        totalTests,
        passed,
        failed,
        skipped: 0,
        status:
          failed === 0 && passed > 0
            ? "success"
            : failed > 0 && passed > 0
              ? "partial"
              : failed > 0
                ? "failed"
                : "unknown",
        type: "performance-frontend",
        size: await getDirectorySize(dirPath),
      });
    }
  } catch (error) {
    console.error("Erreur scan performance-correlation:", error);
  }

  return reports;
}

async function scanStatisticsLogStatsResults(
  resultsRoot: string,
): Promise<TestReport[]> {
  const reports: TestReport[] = [];
  const dir = join(resultsRoot, "statistics-log-stats");

  if (!existsSync(dir)) return reports;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const reportDirs = entries
      .filter(
        (entry) => entry.isDirectory() && /^\d{8}-\d{6}$/.test(entry.name),
      )
      .sort()
      .reverse();

    for (const dirEntry of reportDirs) {
      const dirPath = join(dir, dirEntry.name);
      const summaryPath = join(dirPath, "summary.json");
      const [datePart, timePart] = dirEntry.name.split("-");
      const date = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
      const time = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;

      let summary: any = null;
      try {
        summary = JSON.parse(await readFile(summaryPath, "utf-8"));
      } catch {
        continue;
      }

      const totalTests = summary?.totals?.steps ?? 0;
      const passed = summary?.totals?.passed ?? 0;
      const failed = summary?.totals?.failed ?? 0;

      reports.push({
        id: `statistics-log-stats-${dirEntry.name}`,
        category: "Statistics log-stats",
        name: `Statistics log-stats - ${date} ${time}`,
        timestamp: dirEntry.name,
        date,
        time,
        generatedAtISO: summary?.timestamp,
        path: dirPath,
        summaryPath,
        summary,
        totalTests,
        passed,
        failed,
        skipped: 0,
        status:
          failed === 0 && passed > 0
            ? "success"
            : failed > 0 && passed > 0
              ? "partial"
              : failed > 0
                ? "failed"
                : "unknown",
        type: "performance-frontend",
        size: await getDirectorySize(dirPath),
      });
    }
  } catch (error) {
    console.error("Erreur scan statistics-log-stats:", error);
  }

  return reports;
}

async function scanStatisticsAppDataResults(
  resultsRoot: string,
): Promise<TestReport[]> {
  const reports: TestReport[] = [];
  const dir = join(resultsRoot, "statistics-app-data");

  if (!existsSync(dir)) return reports;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const reportDirs = entries
      .filter(
        (entry) => entry.isDirectory() && /^\d{8}-\d{6}$/.test(entry.name),
      )
      .sort()
      .reverse();

    for (const dirEntry of reportDirs) {
      const dirPath = join(dir, dirEntry.name);
      const summaryPath = join(dirPath, "summary.json");
      const [datePart, timePart] = dirEntry.name.split("-");
      const date = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
      const time = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;

      let summary: any = null;
      try {
        summary = JSON.parse(await readFile(summaryPath, "utf-8"));
      } catch {
        continue;
      }

      const totalTests = summary?.totals?.steps ?? 0;
      const passed = summary?.totals?.passed ?? 0;
      const failed = summary?.totals?.failed ?? 0;

      reports.push({
        id: `statistics-app-data-${dirEntry.name}`,
        category: "Statistics app-data",
        name: `Statistics app-data - ${date} ${time}`,
        timestamp: dirEntry.name,
        date,
        time,
        generatedAtISO: summary?.timestamp,
        path: dirPath,
        summaryPath,
        summary,
        totalTests,
        passed,
        failed,
        skipped: 0,
        status:
          failed === 0 && passed > 0
            ? "success"
            : failed > 0 && passed > 0
              ? "partial"
              : failed > 0
                ? "failed"
                : "unknown",
        type: "performance-frontend",
        size: await getDirectorySize(dirPath),
      });
    }
  } catch (error) {
    console.error("Erreur scan statistics-app-data:", error);
  }

  return reports;
}

async function scanStatisticsOverviewResults(
  resultsRoot: string,
): Promise<TestReport[]> {
  const reports: TestReport[] = [];
  const dir = join(resultsRoot, "statistics-overview");

  if (!existsSync(dir)) return reports;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const reportDirs = entries
      .filter(
        (entry) => entry.isDirectory() && /^\d{8}-\d{6}$/.test(entry.name),
      )
      .sort()
      .reverse();

    for (const dirEntry of reportDirs) {
      const dirPath = join(dir, dirEntry.name);
      const summaryPath = join(dirPath, "summary.json");
      const [datePart, timePart] = dirEntry.name.split("-");
      const date = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
      const time = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;

      let summary: any = null;
      try {
        summary = JSON.parse(await readFile(summaryPath, "utf-8"));
      } catch {
        continue;
      }

      const totalTests = summary?.totals?.steps ?? 0;
      const passed = summary?.totals?.passed ?? 0;
      const failed = summary?.totals?.failed ?? 0;

      reports.push({
        id: `statistics-overview-${dirEntry.name}`,
        category: "Statistics vue d’ensemble",
        name: `Statistics vue d’ensemble - ${date} ${time}`,
        timestamp: dirEntry.name,
        date,
        time,
        generatedAtISO: summary?.timestamp,
        path: dirPath,
        summaryPath,
        summary,
        totalTests,
        passed,
        failed,
        skipped: 0,
        status:
          failed === 0 && passed > 0
            ? "success"
            : failed > 0 && passed > 0
              ? "partial"
              : failed > 0
                ? "failed"
                : "unknown",
        type: "performance-frontend",
        size: await getDirectorySize(dirPath),
      });
    }
  } catch (error) {
    console.error("Erreur scan statistics-overview:", error);
  }

  return reports;
}

async function scanStatisticsEndpointLatencyResults(
  resultsRoot: string,
): Promise<TestReport[]> {
  const reports: TestReport[] = [];
  const dir = join(resultsRoot, "statistics-endpoint-latency");

  if (!existsSync(dir)) return reports;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const reportDirs = entries
      .filter(
        (entry) => entry.isDirectory() && /^\d{8}-\d{6}$/.test(entry.name),
      )
      .sort()
      .reverse();

    for (const dirEntry of reportDirs) {
      const dirPath = join(dir, dirEntry.name);
      const summaryPath = join(dirPath, "summary.json");
      const [datePart, timePart] = dirEntry.name.split("-");
      const date = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
      const time = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;

      let summary: any = null;
      try {
        summary = JSON.parse(await readFile(summaryPath, "utf-8"));
      } catch {
        continue;
      }

      const totalTests = summary?.totals?.steps ?? 0;
      const passed = summary?.totals?.passed ?? 0;
      const failed = summary?.totals?.failed ?? 0;

      reports.push({
        id: `statistics-endpoint-latency-${dirEntry.name}`,
        category: "Statistics temps de réponse",
        name: `Statistics temps de réponse - ${date} ${time}`,
        timestamp: dirEntry.name,
        date,
        time,
        generatedAtISO: summary?.timestamp,
        path: dirPath,
        summaryPath,
        summary,
        totalTests,
        passed,
        failed,
        skipped: 0,
        status:
          failed === 0 && passed > 0
            ? "success"
            : failed > 0 && passed > 0
              ? "partial"
              : failed > 0
                ? "failed"
                : "unknown",
        type: "performance-frontend",
        size: await getDirectorySize(dirPath),
      });
    }
  } catch (error) {
    console.error("Erreur scan statistics-endpoint-latency:", error);
  }

  return reports;
}

async function scanP1cUxThemeSettingsResults(
  resultsRoot: string,
): Promise<TestReport[]> {
  const reports: TestReport[] = [];
  const dir = join(resultsRoot, "p1c-ux-theme-settings");

  if (!existsSync(dir)) return reports;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const reportDirs = entries
      .filter(
        (entry) => entry.isDirectory() && /^\d{8}-\d{6}$/.test(entry.name),
      )
      .sort()
      .reverse();

    for (const dirEntry of reportDirs) {
      const dirPath = join(dir, dirEntry.name);
      const summaryPath = join(dirPath, "summary.json");
      const [datePart, timePart] = dirEntry.name.split("-");
      const date = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
      const time = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}`;

      let summary: any = null;
      try {
        summary = JSON.parse(await readFile(summaryPath, "utf-8"));
      } catch {
        continue;
      }

      const totalTests = summary?.totals?.steps ?? 0;
      const passed = summary?.totals?.passed ?? 0;
      const failed = summary?.totals?.failed ?? 0;

      reports.push({
        id: `p1c-ux-theme-settings-${dirEntry.name}`,
        category: "P1C UX thème et paramètres",
        name: `P1C UX thème et paramètres - ${date} ${time}`,
        timestamp: dirEntry.name,
        date,
        time,
        generatedAtISO: summary?.timestamp,
        path: dirPath,
        summaryPath,
        summary,
        totalTests,
        passed,
        failed,
        skipped: 0,
        status:
          failed === 0 && passed > 0
            ? "success"
            : failed > 0 && passed > 0
              ? "partial"
              : failed > 0
                ? "failed"
                : "unknown",
        type: "performance-frontend",
        size: await getDirectorySize(dirPath),
      });
    }
  } catch (error) {
    console.error("Erreur scan p1c-ux-theme-settings:", error);
  }

  return reports;
}

/**
 * Scanner les rapports User Journey
 */
async function scanUserJourneyReports(dir: string): Promise<TestReport[]> {
  const reports: TestReport[] = [];

  if (!existsSync(dir)) return reports;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const jsonFiles = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".json") &&
          entry.name.includes("user-journey"),
      )
      .sort()
      .reverse();

    for (const file of jsonFiles) {
      const filePath = join(dir, file.name);
      const stats = await stat(filePath);

      let summary = null;
      let totalTests = 0,
        passed = 0,
        failed = 0,
        skipped = 0;
      let status: TestReport["status"] = "unknown";

      try {
        const content = await readFile(filePath, "utf-8");
        summary = JSON.parse(content);

        if (summary.summary) {
          totalTests = summary.summary.totalSteps || 0;
          passed = summary.summary.successCount || 0;
          failed = summary.summary.errorCount || 0;
          skipped = summary.summary.skippedCount || 0;
        }

        if (passed > 0 && failed === 0) status = "success";
        else if (failed > 0) status = "failed";
        else if (totalTests > 0) status = "partial";
      } catch {
        // Ignorer les erreurs de parsing
      }

      const timestamp = file.name
        .replace(".json", "")
        .replace("user-journey-", "");
      const dateObj = new Date(stats.mtime);
      const date = dateObj.toISOString().split("T")[0];
      const time = dateObj.toTimeString().split(" ")[0];

      reports.push({
        id: `user-journey-${timestamp}`,
        category: "Parcours Utilisateur",
        name: `User Journey - ${summary?.journeyName || "Custom"} - ${date} ${time}`,
        timestamp,
        date,
        time,
        path: filePath,
        jsonPath: file.name,
        summary,
        totalTests,
        passed,
        failed,
        skipped,
        status,
        type: "e2e",
        size: stats.size,
      });
    }
  } catch (error) {
    console.error("Erreur scan user journey:", error);
  }

  return reports;
}

/**
 * Scanner les rapports Analytics
 */
async function scanAnalyticsReports(dir: string): Promise<TestReport[]> {
  const reports: TestReport[] = [];

  if (!existsSync(dir)) return reports;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const jsonFiles = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".json") &&
          entry.name.includes("analytics"),
      )
      .sort()
      .reverse();

    for (const file of jsonFiles) {
      const filePath = join(dir, file.name);
      const stats = await stat(filePath);

      let summary = null;
      let totalTests = 0,
        passed = 0;
      const failed = 0;
      let status: TestReport["status"] = "unknown";

      try {
        const content = await readFile(filePath, "utf-8");
        summary = JSON.parse(content);

        // Les rapports analytics peuvent avoir différentes structures
        if (summary.summary) {
          totalTests =
            summary.summary.totalSessions || summary.summary.totalEvents || 0;
          passed =
            summary.summary.successfulSessions ||
            summary.summary.processedEvents ||
            0;
        } else if (summary.sessions) {
          totalTests = summary.sessions.length || 0;
          passed =
            summary.sessions.filter((s: any) => s.isActive === false).length ||
            0;
        }

        if (passed > 0 && failed === 0) status = "success";
        else if (failed > 0) status = "failed";
        else if (totalTests > 0) status = "partial";
      } catch {
        // Ignorer les erreurs de parsing
      }

      const timestamp = file.name
        .replace(".json", "")
        .replace("rapport-analytics-", "")
        .replace("analytics-", "");
      const dateObj = new Date(stats.mtime);
      const date = dateObj.toISOString().split("T")[0];
      const time = dateObj.toTimeString().split(" ")[0];

      reports.push({
        id: `analytics-${timestamp}`,
        category: "Analytics",
        name: `Rapport Analytics - ${date} ${time}`,
        timestamp,
        date,
        time,
        path: filePath,
        jsonPath: file.name,
        summary,
        totalTests,
        passed,
        failed,
        skipped: 0,
        status,
        type: "other",
        size: stats.size,
      });
    }
  } catch (error) {
    console.error("Erreur scan analytics:", error);
  }

  return reports;
}

/**
 * Scanner les rapports Playwright
 */
async function scanPlaywrightReports(dir: string): Promise<TestReport[]> {
  const reports: TestReport[] = [];

  if (!existsSync(dir)) return reports;

  try {
    // Playwright génère un index.html dans le dossier
    const indexPath = join(dir, "index.html");
    try {
      const stats = await stat(indexPath);
      const mtime = stats.mtime;

      const date = mtime.toISOString().split("T")[0];
      const time = mtime.toTimeString().split(" ")[0];
      const timestamp = `${date.replace(/-/g, "")}-${time.replace(/:/g, "")}`;

      reports.push({
        id: `playwright-${timestamp}`,
        category: "E2E / Playwright",
        name: `Rapport Playwright - ${date} ${time}`,
        timestamp,
        date,
        time,
        path: dir,
        htmlPath: "index.html",
        type: "e2e",
        status: "unknown",
        size: stats.size,
      });
    } catch {
      // Pas de rapport Playwright
    }
  } catch (error) {
    console.error("Erreur scan playwright:", error);
  }

  return reports;
}

async function scanSecurityReports(
  dir: string,
  source: "reports" | "tests",
): Promise<TestReport[]> {
  const reports: TestReport[] = [];

  if (!existsSync(dir)) return reports;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const reportDirs = entries
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))
      .reverse();

    for (const dirEntry of reportDirs) {
      const dirPath = join(dir, dirEntry.name);
      const candidates = ["summary.md", "summary.json", "report.html"];
      let reportFile = "";

      for (const candidate of candidates) {
        const candidatePath = join(dirPath, candidate);
        try {
          await stat(candidatePath);
          reportFile = candidate;
          break;
        } catch {
          // Essayer le candidat suivant
        }
      }

      if (!reportFile) continue;

      const filePath = join(dirPath, reportFile);
      const stats = await stat(filePath);
      const timestampMatch = dirEntry.name.match(/(\d{8})[-_]?(\d{6})/);
      const dateObj = stats.mtime;
      const date = timestampMatch
        ? `${timestampMatch[1].substring(0, 4)}-${timestampMatch[1].substring(4, 6)}-${timestampMatch[1].substring(6, 8)}`
        : dateObj.toISOString().split("T")[0];
      const time = timestampMatch
        ? `${timestampMatch[2].substring(0, 2)}:${timestampMatch[2].substring(2, 4)}:${timestampMatch[2].substring(4, 6)}`
        : dateObj.toTimeString().split(" ")[0];
      const idPrefix =
        source === "reports" ? "security-reports" : "security-results";
      const reportSize = await getDirectorySize(dirPath);

      reports.push({
        id: `${idPrefix}-${dirEntry.name}`,
        category: "Sécurité",
        name: `Rapport sécurité - ${dirEntry.name}`,
        timestamp: dirEntry.name,
        date,
        time,
        path: filePath,
        summaryPath: filePath,
        jsonPath: reportFile.endsWith(".json") ? reportFile : undefined,
        type: "security",
        status: "partial",
        size: reportSize || stats.size,
      });
    }
  } catch (error) {
    console.error("Erreur scan rapports sécurité:", error);
  }

  return reports;
}

export async function GET(request: NextRequest) {
  try {
    const allReports: TestReport[] = [];

    // Scanner tous les types de rapports
    const [
      perfBackend,
      perfFrontend,
      testsResults,
      testsResultsTmp,
      emailTriageResults,
      controlledOffensiveResults,
      performanceCorrelationResults,
      statisticsLogStatsResults,
      statisticsAppDataResults,
      statisticsOverviewResults,
      statisticsEndpointLatencyResults,
      p1cUxThemeSettingsResults,
      playwright,
      userJourney,
      analytics,
      securityReports,
      securityResults,
    ] = await Promise.all([
      scanPerformanceBackend(REPORT_DIRS["performance-backend"]),
      scanPerformanceFrontend(REPORT_DIRS["performance-frontend"]),
      scanTestsResults(REPORT_DIRS["tests-results"]),
      REPORT_DIRS["tests-results-tmp"]
        ? scanTestsResults(REPORT_DIRS["tests-results-tmp"])
        : Promise.resolve([]),
      scanEmailTriageResults(REPORT_DIRS["tests-results"]),
      scanControlledOffensiveResults(REPORT_DIRS["tests-results"]),
      scanPerformanceCorrelationResults(REPORT_DIRS["tests-results"]),
      scanStatisticsLogStatsResults(REPORT_DIRS["tests-results"]),
      scanStatisticsAppDataResults(REPORT_DIRS["tests-results"]),
      scanStatisticsOverviewResults(REPORT_DIRS["tests-results"]),
      scanStatisticsEndpointLatencyResults(REPORT_DIRS["tests-results"]),
      scanP1cUxThemeSettingsResults(REPORT_DIRS["tests-results"]),
      scanPlaywrightReports(REPORT_DIRS["playwright"]),
      scanUserJourneyReports(REPORT_DIRS["user-journey"]),
      scanAnalyticsReports(REPORT_DIRS["analytics"]),
      scanSecurityReports(REPORT_DIRS["security-reports"], "reports"),
      scanSecurityReports(REPORT_DIRS["security-results"], "tests"),
    ]);

    // Combiner tous les rapports
    allReports.push(
      ...perfBackend,
      ...perfFrontend,
      ...testsResults,
      ...testsResultsTmp,
      ...emailTriageResults,
      ...controlledOffensiveResults,
      ...performanceCorrelationResults,
      ...statisticsLogStatsResults,
      ...statisticsAppDataResults,
      ...statisticsOverviewResults,
      ...statisticsEndpointLatencyResults,
      ...p1cUxThemeSettingsResults,
      ...playwright,
      ...userJourney,
      ...analytics,
      ...securityReports,
      ...securityResults,
    );

    // Dédupliquer les rapports par ID (si les deux dossiers contiennent les mêmes)
    const seen = new Set<string>();
    const deduped: TestReport[] = [];
    for (const r of allReports) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        deduped.push(r);
      }
    }
    allReports.length = 0;
    allReports.push(...deduped);

    // Trier par date (plus récents en premier)
    allReports.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`).getTime();
      const dateB = new Date(`${b.date}T${b.time}`).getTime();
      return dateB - dateA;
    });

    // Grouper par catégorie
    const reportsByCategory: Record<string, TestReport[]> = {};
    for (const report of allReports) {
      if (!reportsByCategory[report.category]) {
        reportsByCategory[report.category] = [];
      }
      reportsByCategory[report.category].push(report);
    }

    return NextResponse.json({
      success: true,
      reports: allReports,
      categories: Object.keys(reportsByCategory),
      reportsByCategory,
    });
  } catch (error: any) {
    console.error("Erreur liste tous les rapports:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur lors de la lecture des rapports",
      },
      { status: 500 },
    );
  }
}

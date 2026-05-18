import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Chemin vers les rapports analytics
const PROJECT_ROOT = process.cwd().includes("frontend")
  ? join(process.cwd(), "..")
  : process.cwd();
const IS_DOCKER = process.cwd() === "/app" || process.env.DOCKER === "true";
const REPORTS_DIR = IS_DOCKER
  ? "/app/tests/analytics-reports"
  : join(PROJECT_ROOT, "tests", "analytics-reports");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportData } = body;

    if (!reportData) {
      return NextResponse.json(
        { success: false, error: "Données du rapport manquantes" },
        { status: 400 },
      );
    }

    // Créer le répertoire s'il n'existe pas
    if (!existsSync(REPORTS_DIR)) {
      await mkdir(REPORTS_DIR, { recursive: true });
    }

    // Générer le nom du fichier avec timestamp
    const timestamp =
      new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] +
      "_" +
      new Date().toTimeString().split(" ")[0].replace(/:/g, "");
    const fileName = `rapport-analytics-${timestamp}.json`;
    const filePath = join(REPORTS_DIR, fileName);

    // Sauvegarder le rapport
    await writeFile(filePath, JSON.stringify(reportData, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: "Rapport analytics sauvegardé",
      filePath: fileName,
    });
  } catch (error: any) {
    console.error("Erreur sauvegarde rapport analytics:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

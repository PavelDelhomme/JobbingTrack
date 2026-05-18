import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Chemin vers les schedules de tests
const PROJECT_ROOT = process.cwd().includes("frontend")
  ? join(process.cwd(), "..")
  : process.cwd();
const IS_DOCKER = process.cwd() === "/app" || process.env.DOCKER === "true";
// Utiliser /tmp pour éviter les problèmes de permissions dans Docker
// /tmp est toujours accessible en écriture
const SCHEDULES_DIR = IS_DOCKER
  ? "/tmp/jobbingtrack-schedules"
  : join(PROJECT_ROOT, "tests", "schedules");
const SCHEDULES_FILE = join(SCHEDULES_DIR, "schedules.json");

interface TestSchedule {
  id: string;
  name: string;
  type:
    | "performance-backend"
    | "performance-frontend"
    | "both"
    | "performance-infrastructure"
    | "api"
    | "backend"
    | "frontend"
    | "backoffice"
    | "security"
    | "playwright"
    | "emails";
  interval: "hourly" | "daily" | "weekly" | "custom";
  customCron?: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
  config?: any;
}

// Initialiser le fichier de schedules
async function initSchedules() {
  try {
    if (!existsSync(SCHEDULES_DIR)) {
      await mkdir(SCHEDULES_DIR, { recursive: true, mode: 0o755 });
    }
    if (!existsSync(SCHEDULES_FILE)) {
      await writeFile(SCHEDULES_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (error: any) {
    // Si erreur de permission, utiliser /tmp qui est toujours accessible
    if (IS_DOCKER && error.code === "EACCES") {
      const tmpDir = "/tmp/jobbingtrack-schedules";
      try {
        await mkdir(tmpDir, { recursive: true, mode: 0o755 });
        const tmpFile = join(tmpDir, "schedules.json");
        if (!existsSync(tmpFile)) {
          await writeFile(tmpFile, JSON.stringify([], null, 2), "utf-8");
        }
        // Mettre à jour les constantes pour utiliser /tmp
        (global as any).SCHEDULES_DIR = tmpDir;
        (global as any).SCHEDULES_FILE = tmpFile;
      } catch (tmpError: any) {
        console.error("Erreur création schedules dans /tmp:", tmpError.message);
      }
    } else {
      console.error("Erreur création schedules dir:", error.message);
    }
  }
}

// Lire les schedules
async function readSchedules(): Promise<TestSchedule[]> {
  await initSchedules();
  try {
    // Utiliser le chemin global si défini (fallback vers /tmp)
    const filePath = (global as any).SCHEDULES_FILE || SCHEDULES_FILE;
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

// Écrire les schedules
async function writeSchedules(schedules: TestSchedule[]) {
  await initSchedules();
  // Utiliser le chemin global si défini (fallback vers /tmp)
  const filePath = (global as any).SCHEDULES_FILE || SCHEDULES_FILE;
  await writeFile(filePath, JSON.stringify(schedules, null, 2));
}

// GET: Lister les schedules
export async function GET(request: NextRequest) {
  try {
    const schedules = await readSchedules();
    return NextResponse.json({
      success: true,
      schedules,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// POST: Créer un nouveau schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, interval, customCron, config } = body;

    if (!name || !type || !interval) {
      return NextResponse.json(
        { success: false, error: "Paramètres manquants" },
        { status: 400 },
      );
    }

    const schedules = await readSchedules();

    const newSchedule: TestSchedule = {
      id: `schedule-${Date.now()}`,
      name,
      type,
      interval,
      customCron: interval === "custom" ? customCron : undefined,
      enabled: true,
      createdAt: new Date().toISOString(),
      config: config || {},
    };

    // Calculer nextRun
    const now = new Date();
    switch (interval) {
      case "hourly":
        newSchedule.nextRun = new Date(
          now.getTime() + 60 * 60 * 1000,
        ).toISOString();
        break;
      case "daily":
        newSchedule.nextRun = new Date(
          now.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "weekly":
        newSchedule.nextRun = new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "custom":
        // Pour custom, on utilisera le cron plus tard
        newSchedule.nextRun = new Date(
          now.getTime() + 60 * 60 * 1000,
        ).toISOString();
        break;
    }

    schedules.push(newSchedule);
    await writeSchedules(schedules);

    return NextResponse.json({
      success: true,
      schedule: newSchedule,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// PUT: Mettre à jour un schedule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID manquant" },
        { status: 400 },
      );
    }

    const schedules = await readSchedules();
    const index = schedules.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Schedule non trouvé" },
        { status: 404 },
      );
    }

    schedules[index] = { ...schedules[index], ...updates };
    await writeSchedules(schedules);

    return NextResponse.json({
      success: true,
      schedule: schedules[index],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// DELETE: Supprimer un schedule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID manquant" },
        { status: 400 },
      );
    }

    const schedules = await readSchedules();
    const filtered = schedules.filter((s) => s.id !== id);
    await writeSchedules(filtered);

    return NextResponse.json({
      success: true,
      message: "Schedule supprimé",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

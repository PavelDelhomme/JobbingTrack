import { NextResponse } from "next/server";
import {
  proxyLauncherGetStatus,
  proxyLauncherPost,
} from "@/lib/server/emulatorLauncherFetch";
import {
  proxyEmulatorGet,
  proxyEmulatorPost,
} from "@/lib/server/emulatorProxyFetch";

export const maxDuration = 60;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Démarre le contrôleur (via lanceur 5056) + adb reverse sur appareils connectés. */
export async function POST() {
  const steps: string[] = [];

  let health = await proxyEmulatorGet("/health", undefined, 4000);
  if (health.ok) {
    steps.push("Contrôleur déjà actif (5055)");
  } else {
    steps.push("Contrôleur absent — démarrage via lanceur…");
    const launcherStatus = await proxyLauncherGetStatus();
    if (!launcherStatus.ok) {
      await proxyLauncherPost("start");
      await sleep(2500);
    } else if (!launcherStatus.running) {
      await proxyLauncherPost("start");
      await sleep(2500);
    } else {
      await proxyLauncherPost("start");
      await sleep(1500);
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      health = await proxyEmulatorGet("/health", undefined, 4000);
      if (health.ok) break;
      await sleep(1000);
    }

    if (!health.ok) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          steps,
          error:
            "Contrôleur mobile injoignable. Vérifiez que le service emulator-controller tourne (docker compose).",
        },
        { status: 502 },
      );
    }
    steps.push("Contrôleur démarré");
  }

  const setup = await proxyEmulatorPost("/setup-dev", {}, undefined, 45_000);
  if (setup.ok) {
    const data = setup.data as { message?: string; devices?: unknown[] };
    steps.push(data.message || "Environnement ADB préparé");
  } else {
    steps.push("Préparation ADB partielle (aucun appareil ou adb absent)");
  }

  const devices = await proxyEmulatorGet("/devices", undefined, 20_000);
  const deviceList =
    devices.ok && devices.data && typeof devices.data === "object"
      ? ((devices.data as { devices?: unknown[] }).devices ?? [])
      : [];

  return NextResponse.json({
    ok: true,
    success: true,
    steps,
    controller: true,
    deviceCount: Array.isArray(deviceList) ? deviceList.length : 0,
    apkReady:
      health.ok && health.data && typeof health.data === "object"
        ? (health.data as { apkReady?: boolean }).apkReady === true
        : false,
  });
}

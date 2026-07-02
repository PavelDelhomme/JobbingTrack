import { NextRequest, NextResponse } from "next/server";
import { resolveEmulatorControllerBase } from "@/lib/server/emulatorControllerBase";

export const maxDuration = 120;

/** Télécharge l’APK debug buildé sur la machine hôte (contrôleur émulateur). */
export async function GET(request: NextRequest) {
  const clientUrl = request.nextUrl.searchParams.get("controllerBaseUrl") || undefined;
  const base = resolveEmulatorControllerBase(clientUrl || undefined);
  const url = `${base}/download-apk`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { success: false, error: text || `HTTP ${res.status}` },
        { status: res.status === 404 ? 404 : 502 },
      );
    }
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="app-debug.apk"',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        success: false,
        error: message,
        _hint:
          "Lancez le contrôleur : bash scripts/mobile/setup/restart-emulator-controller.sh",
      },
      { status: 502 },
    );
  }
}

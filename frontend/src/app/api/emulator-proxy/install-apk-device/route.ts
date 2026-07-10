import { NextRequest, NextResponse } from "next/server";

const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;

export const maxDuration = 600;

function tryFetch(
  controllerUrl: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<
  | { ok: true; data: Record<string, unknown>; status: number }
  | { ok: false; error: string }
> {
  return fetch(controllerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
    .then(async (res) => {
      const text = await res.text();
      let data: Record<string, unknown>;
      try {
        data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        return { ok: false as const, error: `Réponse non-JSON (${res.status})` };
      }
      return { ok: true as const, data, status: res.status };
    })
    .catch((e) => ({
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    }));
}

export async function POST(request: NextRequest) {
  try {
    const envUrl = process.env.EMULATOR_CONTROLLER_URL?.trim();
    let body: { deviceId?: string; controllerBaseUrl?: string } = {};
    try {
      body = (await request.json().catch(() => ({}))) as typeof body;
    } catch {
      /* ignore */
    }

    const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Body { "deviceId": "…" } requis' },
        { status: 400 },
      );
    }

    const clientUrl =
      typeof body.controllerBaseUrl === "string" &&
      (body.controllerBaseUrl.startsWith("http://") ||
        body.controllerBaseUrl.startsWith("https://"))
        ? body.controllerBaseUrl.replace(/\/$/, "")
        : "http://127.0.0.1:5055";

    const controllerBase =
      envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://"))
        ? envUrl.replace(/\/$/, "")
        : clientUrl;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), INSTALL_TIMEOUT_MS);

    const payload = { deviceId };
    const controllerUrl = `${controllerBase}/install-apk-device`;
    let result = await tryFetch(controllerUrl, payload, controller.signal);

    if (!result.ok && controllerBase !== clientUrl) {
      result = await tryFetch(`${clientUrl}/install-apk-device`, payload, controller.signal);
    }

    clearTimeout(timeoutId);

    if (result.ok) {
      return NextResponse.json(result.data, { status: result.status });
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error,
        message: `Installation : ${result.error}`,
      },
      { status: 502 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message, message: `Erreur proxy install : ${message}` },
      { status: 502 },
    );
  }
}

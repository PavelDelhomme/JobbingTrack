import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

function tryFetch(
  controllerUrl: string,
): Promise<
  | { ok: true; data: Record<string, unknown>; status: number }
  | { ok: false; error: string }
> {
  return fetch(controllerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(15_000),
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
  const envUrl = process.env.EMULATOR_CONTROLLER_URL?.trim();
  let body: { controllerBaseUrl?: string } = {};
  try {
    body = (await request.json().catch(() => ({}))) as typeof body;
  } catch {
    /* ignore */
  }
  const clientUrl =
    typeof body.controllerBaseUrl === "string" &&
    (body.controllerBaseUrl.startsWith("http://") || body.controllerBaseUrl.startsWith("https://"))
      ? body.controllerBaseUrl.replace(/\/$/, "")
      : "http://127.0.0.1:5055";
  const controllerBase =
    envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://"))
      ? envUrl.replace(/\/$/, "")
      : clientUrl;

  const controllerUrl = `${controllerBase}/cancel-operation`;
  let result = await tryFetch(controllerUrl);
  if (!result.ok && controllerBase !== clientUrl) {
    result = await tryFetch(`${clientUrl}/cancel-operation`);
  }

  if (result.ok) {
    return NextResponse.json(result.data, { status: result.status });
  }

  return NextResponse.json(
    { success: false, error: result.error, message: `Annulation : ${result.error}` },
    { status: 502 },
  );
}

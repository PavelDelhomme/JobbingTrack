import { NextRequest, NextResponse } from 'next/server'

const BUILD_TIMEOUT_MS = 5 * 60 * 1000 // 5 min

// Autoriser cette route à durer jusqu'à 5 min (build Flutter long). Sans ça Next coupe vers 15s → NetworkError côté client.
export const maxDuration = 300

function tryFetch(
  controllerUrl: string,
  signal: AbortSignal
): Promise<{ ok: true; data: Record<string, unknown>; status: number } | { ok: false; error: string }> {
  return fetch(controllerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    signal,
  })
    .then(async (res) => {
      const text = await res.text()
      let data: Record<string, unknown>
      try {
        data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
      } catch {
        return { ok: false as const, error: `Réponse non-JSON (${res.status})` }
      }
      return { ok: true as const, data, status: res.status }
    })
    .catch((e) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }))
}

/**
 * Proxy POST /build-apk vers le contrôleur.
 * - Utilise EMULATOR_CONTROLLER_URL si défini (Docker : host.docker.internal:5055).
 * - Si fetch échoue (ex. host.docker.internal ne résout pas en dev local), réessaie avec body.controllerBaseUrl (ex. localhost:5055).
 */
export async function POST(request: NextRequest) {
  const envUrl = process.env.EMULATOR_CONTROLLER_URL?.trim()
  let body: { controllerBaseUrl?: string } = {}
  try {
    body = (await request.json().catch(() => ({}))) as { controllerBaseUrl?: string }
  } catch {
    /* ignore */
  }
  const clientUrl =
    typeof body?.controllerBaseUrl === 'string' &&
    (body.controllerBaseUrl.startsWith('http://') || body.controllerBaseUrl.startsWith('https://'))
      ? body.controllerBaseUrl.replace(/\/$/, '')
      : 'http://127.0.0.1:5055'

  const controllerBase = envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))
    ? envUrl.replace(/\/$/, '')
    : clientUrl

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), BUILD_TIMEOUT_MS)

  const controllerUrl = `${controllerBase}/build-apk`
  let result = await tryFetch(controllerUrl, controller.signal)

  // Si l’URL env (ex. host.docker.internal) échoue, réessayer avec l’URL du client (ex. localhost:5055)
  if (!result.ok && controllerBase !== clientUrl) {
    const fallbackUrl = `${clientUrl}/build-apk`
    result = await tryFetch(fallbackUrl, controller.signal)
  }

  clearTimeout(timeoutId)

  if (result.ok) {
    return NextResponse.json(result.data, { status: result.status })
  }

  return NextResponse.json(
    {
      success: false,
      error: result.error,
      message: `Proxy: ${result.error}`,
      _triedUrl: controllerUrl,
    },
    { status: 502 }
  )
}

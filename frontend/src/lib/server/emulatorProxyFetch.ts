import {
  emulatorControllerFallbackBases,
  resolveEmulatorControllerBase,
} from "@/lib/server/emulatorControllerBase";

type ProxyResult =
  | {
      ok: true;
      data: unknown;
      status: number;
      contentType?: string;
      buffer?: ArrayBuffer;
      contentDisposition?: string | null;
    }
  | { ok: false; error: string; status?: number };

async function fetchWithBase(
  base: string,
  path: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<ProxyResult> {
  const url = `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const contentType = res.headers.get("content-type") || "";
  const contentDisposition = res.headers.get("content-disposition");
  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => ({}));
    return { ok: true, data, status: res.status, contentType, contentDisposition };
  }
  const buffer = await res.arrayBuffer();
  return { ok: true, data: null, status: res.status, contentType, buffer, contentDisposition };
}

export async function proxyEmulatorGet(
  path: string,
  clientBaseUrl?: string,
  timeoutMs = 30_000,
): Promise<ProxyResult> {
  const primary = resolveEmulatorControllerBase(clientBaseUrl);
  let lastError = "fetch failed";
  for (const base of emulatorControllerFallbackBases(primary)) {
    try {
      return await fetchWithBase(base, path, timeoutMs);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: lastError, status: 502 };
}

export async function proxyEmulatorPost(
  path: string,
  body: unknown,
  clientBaseUrl?: string,
  timeoutMs = 300_000,
): Promise<ProxyResult> {
  const primary = resolveEmulatorControllerBase(clientBaseUrl);
  let lastError = "fetch failed";
  for (const base of emulatorControllerFallbackBases(primary)) {
    try {
      return await fetchWithBase(base, path, timeoutMs, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: lastError, status: 502 };
}

export function controllerUnavailableResponse(error: string) {
  return {
    success: false,
    ok: false,
    error,
    _hint:
      "Démarrez le contrôleur sur la machine hôte : bash scripts/mobile/setup/restart-emulator-controller.sh",
  };
}

/** Client navigateur pour le contrôleur émulateur (build APK local). */

export const DEFAULT_EMULATOR_CONTROLLER_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_EMULATOR_CONTROLLER_URL || "http://127.0.0.1:5055"
    : "http://127.0.0.1:5055";

export type EmulatorHealth = {
  ok?: boolean;
  service?: string;
  mobilePath?: string;
  apkReady?: boolean;
  buildScript?: boolean;
};

export type ApkInfo = {
  exists: boolean;
  version?: string | null;
  buildNumber?: number | null;
  sizeBytes?: number;
  modifiedAt?: string;
};

export type BuildApkResult = {
  success?: boolean;
  message?: string;
  error?: string;
  stdout?: string;
  stderr?: string;
  version?: string | null;
  buildNumber?: number | null;
  _hint?: string;
  _triedUrl?: string;
};

export type AdbDevice = { id: string; status: string };

function controllerBase(override?: string): string {
  return (override || DEFAULT_EMULATOR_CONTROLLER_URL).replace(/\/$/, "");
}

export async function fetchEmulatorHealth(
  baseUrl = DEFAULT_EMULATOR_CONTROLLER_URL,
): Promise<EmulatorHealth | null> {
  try {
    const res = await fetch(`${controllerBase(baseUrl)}/health`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as EmulatorHealth;
  } catch {
    return null;
  }
}

export async function fetchApkInfo(baseUrl = DEFAULT_EMULATOR_CONTROLLER_URL): Promise<ApkInfo | null> {
  try {
    const res = await fetch(`${controllerBase(baseUrl)}/apk-info`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as ApkInfo;
  } catch {
    return null;
  }
}

export async function fetchAdbDevices(
  baseUrl = DEFAULT_EMULATOR_CONTROLLER_URL,
): Promise<AdbDevice[]> {
  try {
    const res = await fetch(`${controllerBase(baseUrl)}/devices`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { devices?: AdbDevice[] };
    return (data.devices || []).filter((d) => d.status === "device");
  } catch {
    return [];
  }
}

export async function buildApkFromBackoffice(
  baseUrl = DEFAULT_EMULATOR_CONTROLLER_URL,
  signal?: AbortSignal,
): Promise<{ ok: boolean; data: BuildApkResult; via: "direct" | "proxy" }> {
  const BUILD_TIMEOUT_MS = 5 * 60 * 1000;
  const abort = signal || new AbortController().signal;
  const directUrl = `${controllerBase(baseUrl)}/build-apk`;

  try {
    const res = await fetch(directUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal,
    });
    const data = (await res.json().catch(() => ({}))) as BuildApkResult;
    if (res.ok || res.status === 502) {
      return { ok: !!data.success, data, via: "direct" };
    }
  } catch {
    /* proxy fallback */
  }

  const res = await fetch("/api/emulator-proxy/build-apk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ controllerBaseUrl: controllerBase(baseUrl) }),
    signal: AbortSignal.timeout(BUILD_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as BuildApkResult;
  return { ok: !!data.success, data, via: "proxy" };
}

export function localApkDownloadHref(): string {
  return "/api/emulator-proxy/download-apk";
}

export async function installApkOnDevice(
  deviceId: string,
  baseUrl = DEFAULT_EMULATOR_CONTROLLER_URL,
): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${controllerBase(baseUrl)}/install-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
      signal: AbortSignal.timeout(120_000),
    });
    return (await res.json()) as { success?: boolean; message?: string; error?: string };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchBuiltApkBlob(): Promise<Blob> {
  const res = await fetch(localApkDownloadHref(), { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    throw new Error(`Téléchargement APK HTTP ${res.status}`);
  }
  return res.blob();
}

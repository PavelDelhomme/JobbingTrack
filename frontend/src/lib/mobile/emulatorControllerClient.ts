/** Client navigateur pour le contrôleur émulateur — passe par le proxy same-origin (/api/emulator-proxy). */

const PROXY = "/api/emulator-proxy";

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
};

export type AdbDevice = {
  id: string;
  status: string;
  model?: string | null;
  androidVersion?: string | null;
  appInstalled?: boolean;
  appVersionName?: string | null;
  appVersionCode?: number | null;
  localApkVersion?: string | null;
  localApkBuild?: number | null;
  updateNeeded?: boolean;
};

async function proxyGet<T>(path: string, timeoutMs = 15_000): Promise<T | null> {
  try {
    const res = await fetch(`${PROXY}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function proxyPost<T>(
  path: string,
  body: Record<string, unknown> = {},
  timeoutMs = 120_000,
): Promise<{ ok: boolean; data: T; status: number }> {
  const res = await fetch(`${PROXY}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, data, status: res.status };
}

export async function fetchEmulatorHealth(): Promise<EmulatorHealth | null> {
  return proxyGet<EmulatorHealth>("/health", 8000);
}

export async function fetchApkInfo(): Promise<ApkInfo | null> {
  return proxyGet<ApkInfo>("/apk-info", 8000);
}

export async function fetchAdbDevices(): Promise<AdbDevice[]> {
  const data = await proxyGet<{ devices?: AdbDevice[] }>("/devices", 20_000);
  return (data?.devices || []).filter((d) => d.status === "device");
}

export async function buildApkFromBackoffice(
  signal?: AbortSignal,
): Promise<{ ok: boolean; data: BuildApkResult }> {
  const res = await fetch(`${PROXY}/build-apk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal: signal || AbortSignal.timeout(5 * 60 * 1000),
  });
  const data = (await res.json().catch(() => ({}))) as BuildApkResult;
  return { ok: !!data.success && res.ok, data };
}

export function localApkDownloadHref(): string {
  return `${PROXY}/download-apk`;
}

export async function installApkOnDevice(
  deviceId: string,
): Promise<{ success?: boolean; message?: string; error?: string }> {
  const { data } = await proxyPost<{ success?: boolean; message?: string; error?: string }>(
    "/install-run",
    { deviceId },
    180_000,
  );
  return data;
}

export async function fetchBuiltApkBlob(): Promise<Blob> {
  const res = await fetch(localApkDownloadHref(), { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Téléchargement APK HTTP ${res.status}`);
  }
  return res.blob();
}

export type BootstrapResult = {
  ok?: boolean;
  success?: boolean;
  steps?: string[];
  deviceCount?: number;
  apkReady?: boolean;
  error?: string;
};

/** Démarre le contrôleur + adb reverse automatiquement (sans terminal). */
export async function bootstrapEmulatorDev(): Promise<BootstrapResult> {
  try {
    const res = await fetch(`${PROXY}/bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(90_000),
    });
    return (await res.json().catch(() => ({}))) as BootstrapResult;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

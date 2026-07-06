/** Client navigateur pour le contrôleur émulateur — passe par le proxy same-origin (/api/emulator-proxy). */

const PROXY = "/api/emulator-proxy";

export type EmulatorHealth = {
  ok?: boolean;
  service?: string;
  mobilePath?: string;
  apkReady?: boolean;
  buildScript?: boolean;
  lastBuildSession?: BuildSession | null;
};

export type ApkInfo = {
  exists: boolean;
  version?: string | null;
  buildNumber?: number | null;
  sizeBytes?: number;
  modifiedAt?: string;
  downloadFilename?: string | null;
};

export function formatApkDownloadFilename(
  version?: string | null,
  buildNumber?: number | string | null,
): string {
  const v = String(version || "0.0.0").replace(/[^a-zA-Z0-9._+-]/g, "_");
  const b = String(buildNumber ?? 1).replace(/[^a-zA-Z0-9._+-]/g, "_");
  return `jobbingtrack-v${v}+${b}-debug.apk`;
}

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

export type AdbDiagnostics = {
  readyCount?: number;
  pendingCount?: number;
  hints?: string[];
  flutterDevices?: { id: string; name: string; platform?: string }[];
};

export type BuildSession = {
  startedAt?: string;
  finishedAt?: string;
  inProgress?: boolean;
  success?: boolean;
  exitCode?: number;
  version?: string | null;
  buildNumber?: number | null;
  message?: string;
  stderrTail?: string;
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

export async function fetchAdbDevices(options?: { light?: boolean }): Promise<{
  devices: AdbDevice[];
  pendingDevices: AdbDevice[];
  diagnostics: AdbDiagnostics | null;
}> {
  const q = options?.light ? "?light=1" : "";
  const data = await proxyGet<{
    devices?: AdbDevice[];
    pendingDevices?: AdbDevice[];
    diagnostics?: AdbDiagnostics;
  }>(`/devices${q}`, 20_000);
  return {
    devices: (data?.devices || []).filter((d) => d.status === "device"),
    pendingDevices: data?.pendingDevices || [],
    diagnostics: data?.diagnostics || null,
  };
}

export async function fetchBuildSession(): Promise<{
  session: BuildSession | null;
  apkInfo?: { exists?: boolean; modifiedAt?: string; version?: string; buildNumber?: number };
} | null> {
  return proxyGet("/build-session", 8000);
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
): Promise<{
  success?: boolean;
  message?: string;
  error?: string;
  steps?: { phase: string; ok: boolean; detail?: string; at?: string }[];
}> {
  const { data } = await proxyPost<{
    success?: boolean;
    message?: string;
    error?: string;
    steps?: { phase: string; ok: boolean; detail?: string; at?: string }[];
  }>(
    "/install-run",
    { deviceId },
    300_000,
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

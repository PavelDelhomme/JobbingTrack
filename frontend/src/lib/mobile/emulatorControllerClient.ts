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
  warnings?: string[];
  warningCount?: number;
  exitCode?: number;
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
  id?: string;
  startedAt?: string;
  finishedAt?: string;
  inProgress?: boolean;
  success?: boolean;
  exitCode?: number;
  version?: string | null;
  buildNumber?: number | null;
  message?: string;
  stderrTail?: string;
  stdoutTail?: string;
  warnings?: string[];
  warningCount?: number;
};

export type BuildHistoryEntry = BuildSession & {
  id: string;
  finishedAt: string;
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
  signal?: AbortSignal,
): Promise<{ ok: boolean; data: T; status: number }> {
  try {
    const res = await fetch(`${PROXY}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(timeoutMs),
    });
    const data = (await res.json().catch(() => ({}))) as T;
    return { ok: res.ok, data, status: res.status };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      data: {
        success: false,
        error: message,
        cancelled: aborted,
        message: aborted ? "Opération annulée" : `Réseau : ${message}`,
        _hint:
          "Proxy /api/emulator-proxy injoignable ou requête interrompue (timeout, dev server Next). "
          + "Vérifiez le contrôleur : curl http://127.0.0.1:5055/health",
      } as T,
      status: 0,
    };
  }
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
  history?: BuildHistoryEntry[];
  apkInfo?: { exists?: boolean; modifiedAt?: string; version?: string; buildNumber?: number };
} | null> {
  return proxyGet("/build-session", 8000);
}

/** Historique via /build-session uniquement (évite 404 si route /build-history absente). */
export async function fetchBuildHistory(): Promise<BuildHistoryEntry[]> {
  const sessionData = await fetchBuildSession();
  return Array.isArray(sessionData?.history) ? sessionData.history : [];
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

export async function cancelEmulatorOperation(): Promise<{ cancelled?: string[] }> {
  const { data } = await proxyPost<{ success?: boolean; cancelled?: string[] }>(
    "/cancel-operation",
    {},
    15_000,
  );
  return { cancelled: data.cancelled };
}

export type InstallStepResult = {
  success?: boolean;
  cancelled?: boolean;
  error?: string;
  detail?: string;
  ports?: number;
};

export async function adbReverseDevice(
  deviceId: string,
  signal?: AbortSignal,
): Promise<InstallStepResult> {
  const { ok, data } = await proxyPost<InstallStepResult & { success?: boolean }>(
    "/adb-reverse-device",
    { deviceId },
    60_000,
    signal,
  );
  if (data.cancelled) return { success: false, cancelled: true };
  if (!ok || data.success === false) {
    return { success: false, error: data.error || "adb reverse échoué" };
  }
  return { success: true, detail: data.detail, ports: data.ports };
}

function isRetryableInstallNetworkError(message: string): boolean {
  return /failed to fetch|network_changed|load failed|network error|réseau\s*:/i.test(message);
}

function installRetryDelayMs(attempt: number): number {
  return attempt * 2500;
}

export async function installApkDeviceOnly(
  deviceId: string,
  signal?: AbortSignal,
): Promise<InstallStepResult> {
  const maxAttempts = 3;
  let lastError = "Installation échouée";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      return { success: false, cancelled: true };
    }

    const { ok, data, status } = await proxyPost<InstallStepResult & { success?: boolean }>(
      "/install-apk-device",
      { deviceId },
      600_000,
      signal,
    );

    if (data.cancelled) return { success: false, cancelled: true };
    if (ok && data.success !== false) {
      return { success: true, detail: data.detail };
    }

    lastError = data.error || `Installation HTTP ${status || "réseau"}`;
    if (status === 409) {
      return { success: false, error: lastError };
    }

    const retryable = status === 0 || isRetryableInstallNetworkError(lastError);
    if (retryable && attempt < maxAttempts && !signal?.aborted) {
      await new Promise((r) => setTimeout(r, installRetryDelayMs(attempt)));
      continue;
    }

    if (isRetryableInstallNetworkError(lastError)) {
      lastError +=
        " — connexion interrompue (souvent hot-reload Next.js pendant l’install). "
        + "Attendez la fin du rechargement, puis recliquez « Réinstaller l’APK » sans toucher au code.";
    }
    return { success: false, error: lastError };
  }

  return { success: false, error: lastError };
}

export async function launchAppOnDevice(
  deviceId: string,
  signal?: AbortSignal,
): Promise<InstallStepResult> {
  const { ok, data } = await proxyPost<InstallStepResult & { success?: boolean }>(
    "/launch-app-device",
    { deviceId },
    60_000,
    signal,
  );
  if (data.cancelled) return { success: false, cancelled: true };
  if (!ok || data.success === false) {
    return { success: false, error: data.error || "Relance app échouée" };
  }
  return { success: true, detail: data.detail };
}

export async function installApkOnDevice(
  deviceId: string,
  signal?: AbortSignal,
): Promise<{
  success?: boolean;
  message?: string;
  error?: string;
  steps?: { phase: string; ok: boolean; detail?: string; at?: string }[];
}> {
  type InstallPayload = {
    success?: boolean;
    message?: string;
    error?: string;
    cancelled?: boolean;
    _hint?: string;
    steps?: { phase: string; ok: boolean; detail?: string; at?: string }[];
  };
  const { ok, data, status } = await proxyPost<InstallPayload>(
    "/install-run",
    { deviceId },
    600_000,
    signal,
  );
  if (data.cancelled) {
    return { success: false, error: "Installation annulée", steps: data.steps };
  }
  if (!ok || data.success === false) {
    const err = data.error || data.message || (status ? `HTTP ${status}` : "Échec réseau");
    return {
      success: false,
      error: [err, data._hint].filter(Boolean).join(" — "),
      steps: data.steps,
    };
  }
  return { success: true, ...data };
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

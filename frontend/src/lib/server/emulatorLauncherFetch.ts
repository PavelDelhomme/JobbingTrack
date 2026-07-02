import { existsSync } from "fs";

const LOCAL_LAUNCHER = "http://127.0.0.1:5056";
const DOCKER_HOST_LAUNCHER = "http://host.docker.internal:5056";

function runningInDocker(): boolean {
  if (process.env.JOBBINGTRACK_IN_DOCKER === "1") return true;
  try {
    return existsSync("/.dockerenv");
  } catch {
    return false;
  }
}

export function resolveEmulatorLauncherBase(): string {
  const envUrl = process.env.EMULATOR_LAUNCHER_URL?.trim();
  if (envUrl && envUrl.startsWith("http")) return envUrl.replace(/\/$/, "");
  return runningInDocker() ? DOCKER_HOST_LAUNCHER : LOCAL_LAUNCHER;
}

export function emulatorLauncherFallbackBases(primary: string): string[] {
  const bases = [primary.replace(/\/$/, "")];
  if (runningInDocker()) {
    bases.unshift(DOCKER_HOST_LAUNCHER);
    if (!bases.includes(LOCAL_LAUNCHER)) bases.push(LOCAL_LAUNCHER);
  }
  return [...new Set(bases)];
}

export async function proxyLauncherPost(
  action: "start" | "stop" | "status",
  timeoutMs = 15_000,
): Promise<{ ok: boolean; data: unknown; status: number }> {
  const primary = resolveEmulatorLauncherBase();
  let lastError = "fetch failed";
  for (const base of emulatorLauncherFallbackBases(primary)) {
    try {
      const res = await fetch(`${base}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data, status: res.status };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, data: { error: lastError }, status: 502 };
}

export async function proxyLauncherGetStatus(timeoutMs = 8000): Promise<{
  ok: boolean;
  running?: boolean;
}> {
  const primary = resolveEmulatorLauncherBase();
  for (const base of emulatorLauncherFallbackBases(primary)) {
    try {
      const res = await fetch(`${base}/status`, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) continue;
      const data = (await res.json()) as { running?: boolean };
      return { ok: true, running: data.running === true };
    } catch {
      /* try next */
    }
  }
  return { ok: false };
}

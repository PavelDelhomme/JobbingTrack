import { existsSync } from "fs";

const LOCAL_CONTROLLER = "http://127.0.0.1:5055";
const DOCKER_HOST_CONTROLLER = "http://host.docker.internal:5055";

function isLocalhostControllerUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

function runningInDocker(): boolean {
  if (process.env.JOBBINGTRACK_IN_DOCKER === "1") return true;
  try {
    return existsSync("/.dockerenv");
  } catch {
    return false;
  }
}

/** URL du contrôleur émulateur (machine hôte Flutter + ADB). */
export function resolveEmulatorControllerBase(clientBaseUrl?: string): string {
  const envUrl = process.env.EMULATOR_CONTROLLER_URL?.trim();
  if (envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://"))) {
    const normalized = envUrl.replace(/\/$/, "");
    if (runningInDocker()) {
      if (isLocalhostControllerUrl(normalized)) {
        return DOCKER_HOST_CONTROLLER;
      }
    }
    return normalized;
  }
  if (
    clientBaseUrl &&
    (clientBaseUrl.startsWith("http://") || clientBaseUrl.startsWith("https://"))
  ) {
    return clientBaseUrl.replace(/\/$/, "");
  }
  return runningInDocker() ? DOCKER_HOST_CONTROLLER : LOCAL_CONTROLLER;
}

/** Ordre de tentative quand le proxy ne joint pas le contrôleur (Docker vs hôte). */
export function emulatorControllerFallbackBases(primary: string): string[] {
  const bases = [primary.replace(/\/$/, "")];
  if (primary === DOCKER_HOST_CONTROLLER) bases.push(LOCAL_CONTROLLER);
  else if (primary === LOCAL_CONTROLLER && runningInDocker()) bases.push(DOCKER_HOST_CONTROLLER);
  else if (isLocalhostControllerUrl(primary) && runningInDocker()) {
    bases.unshift(DOCKER_HOST_CONTROLLER);
  }
  return [...new Set(bases)];
}

export const EMULATOR_BUILD_TIMEOUT_MS = 5 * 60 * 1000;

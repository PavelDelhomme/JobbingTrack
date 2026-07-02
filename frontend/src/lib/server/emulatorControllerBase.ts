/** URL du contrôleur émulateur (machine hôte Flutter + ADB). */
export function resolveEmulatorControllerBase(clientBaseUrl?: string): string {
  const envUrl = process.env.EMULATOR_CONTROLLER_URL?.trim();
  if (envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://"))) {
    return envUrl.replace(/\/$/, "");
  }
  if (
    clientBaseUrl &&
    (clientBaseUrl.startsWith("http://") || clientBaseUrl.startsWith("https://"))
  ) {
    return clientBaseUrl.replace(/\/$/, "");
  }
  return "http://127.0.0.1:5055";
}

export const EMULATOR_BUILD_TIMEOUT_MS = 5 * 60 * 1000;

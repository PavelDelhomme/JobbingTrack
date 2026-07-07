const INSTALL_KEY = "jt-mobile-ota-install";
const PUBLISH_KEY = "jt-mobile-ota-publish";
const LOG_KEY = "jt-mobile-ota-activity-log";
const LOG_MAX = 80;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type WizardInstallState = {
  version: string;
  buildNumber: string;
  deviceId: string;
  at: string;
};

export type WizardPublishState = {
  version: string;
  buildNumber: string;
  channel: string;
  message: string;
  at: string;
};

export type StoredActivityLine = {
  ts: string;
  msg: string;
  level: "info" | "success" | "warning" | "error";
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T & { at?: string };
    if (parsed && typeof parsed === "object" && "at" in parsed && parsed.at) {
      const age = Date.now() - new Date(parsed.at).getTime();
      if (Number.isFinite(age) && age > MAX_AGE_MS) {
        sessionStorage.removeItem(key);
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function readWizardInstall(): WizardInstallState | null {
  return readJson<WizardInstallState>(INSTALL_KEY);
}

export function writeWizardInstall(state: Omit<WizardInstallState, "at">) {
  writeJson(INSTALL_KEY, { ...state, at: new Date().toISOString() });
}

export function clearWizardInstall() {
  if (typeof window !== "undefined") sessionStorage.removeItem(INSTALL_KEY);
}

export function readWizardPublish(): WizardPublishState | null {
  return readJson<WizardPublishState>(PUBLISH_KEY);
}

export function writeWizardPublish(state: Omit<WizardPublishState, "at">) {
  writeJson(PUBLISH_KEY, { ...state, at: new Date().toISOString() });
}

export function readWizardActivityLog(): StoredActivityLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as StoredActivityLine[];
    return Array.isArray(arr) ? arr.slice(-LOG_MAX) : [];
  } catch {
    return [];
  }
}

export function writeWizardActivityLog(lines: StoredActivityLine[]) {
  writeJson(LOG_KEY, lines.slice(-LOG_MAX));
}

export function installMatchesApk(
  install: WizardInstallState | null,
  version?: string | null,
  buildNumber?: string | number | null,
): boolean {
  if (!install || !version || buildNumber == null) return false;
  return install.version === version && String(install.buildNumber) === String(buildNumber);
}

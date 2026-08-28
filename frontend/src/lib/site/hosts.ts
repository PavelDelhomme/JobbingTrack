/**
 * Hôtes publics JobbingTrack (vitrine vs backoffice admin).
 * La vitrine = apex / préprod / dev local.
 * Le backoffice = sous-domaine dédié → /backoffice (middleware).
 */

export const BACKOFFICE_HOSTS = [
  "backoffice.jobbingtrack.com",
  "backoffice-preprod.jobbingtrack.com",
  "backoffice.jobbingtrack.localhost",
] as const;

export const VITRINE_HOSTS = [
  "jobbingtrack.com",
  "www.jobbingtrack.com",
  "preprod.jobbingtrack.com",
  "jobbingtrack.localhost",
  "localhost",
] as const;

export function normalizeHost(host: string | null | undefined): string {
  return (host || "").split(":")[0].toLowerCase();
}

export function isBackofficeHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host);
  return BACKOFFICE_HOSTS.some((entry) => entry === h);
}

export function isVitrineHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host);
  if (isBackofficeHost(h)) return false;
  return (
    VITRINE_HOSTS.some((entry) => entry === h) ||
    h.endsWith(".jobbingtrack.localhost")
  );
}

/** URL publique du backoffice (sous-domaine, sans chemin). */
export function resolveBackofficeOrigin(): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_BACKOFFICE_URL ||
    process.env.BACKOFFICE_FRONTEND_URL ||
    ""
  ).replace(/\/$/, "");
  if (fromEnv && !fromEnv.includes("/backoffice")) {
    return fromEnv.replace(/\/b4ck0ff1ce\/?$/i, "");
  }
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* ignore */
    }
  }
  if (process.env.NODE_ENV === "development") {
    const port = process.env.DEV_HTTPS_PORT || "5443";
    return `https://backoffice.jobbingtrack.localhost:${port}`;
  }
  return "https://backoffice.jobbingtrack.com";
}

export function backofficeLoginUrl(): string {
  return `${resolveBackofficeOrigin()}/login`;
}

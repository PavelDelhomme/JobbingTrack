/**
 * MailHog n’est utile qu’en local / stack dev (capture SMTP).
 * En prod publique l’iframe pointe souvent vers localhost:8025 → KO.
 *
 * Forcer l’activation : NEXT_PUBLIC_MAILHOG_ENABLED=true
 * Forcer la coupure : NEXT_PUBLIC_MAILHOG_ENABLED=false
 */

export function isMailhogUiAvailable(
  hostname?: string | null,
): boolean {
  const flag = process.env.NEXT_PUBLIC_MAILHOG_ENABLED;
  if (flag === "true") return true;
  if (flag === "false") return false;

  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");

  if (!host) {
    // SSR / build : laisser le lien visible uniquement hors production Next
    return process.env.NODE_ENV !== "production";
  }

  const local =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.");

  return local;
}

export const MAILHOG_DISABLED_REASON =
  "MailHog est réservé au développement local (SMTP de capture). Indisponible sur cet environnement.";

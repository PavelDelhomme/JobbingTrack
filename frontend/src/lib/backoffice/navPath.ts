/**
 * Correspondance pathname ↔ liens drawer / sous-nav backoffice.
 * Gère les alias (ex. /services/logs → /services/service-logs) et les
 * segments réservés qui ne sont pas des détails dynamiques.
 */

/** Alias URL connus (canonique en premier). */
const PATH_ALIASES: Record<string, string[]> = {
  "/backoffice/services/service-logs": ["/backoffice/services/logs"],
  "/backoffice/mobile/logs": ["/backoffice/administration/mobile-logs"],
};

/** Segments sous /backoffice/services/* qui ne sont PAS un détail de service. */
const SERVICES_RESERVED = new Set(["logs", "service-logs"]);

function stripQueryHash(pathname: string): string {
  return pathname.split("?")[0].split("#")[0] || "";
}

function expandAliases(href: string): string[] {
  const normalized = stripQueryHash(href).replace(/\/$/, "") || "/";
  const aliases = PATH_ALIASES[normalized] || [];
  const reverse = Object.entries(PATH_ALIASES)
    .filter(([, alts]) => alts.includes(normalized))
    .map(([canon]) => canon);
  return Array.from(new Set([normalized, ...aliases, ...reverse]));
}

/** True si pathname correspond à href (exact ou alias). */
export function pathMatchesHref(pathname: string, href: string): boolean {
  const path = stripQueryHash(pathname).replace(/\/$/, "") || "/";
  return expandAliases(href).some((candidate) => path === candidate);
}

/**
 * Onglet « Liste des services » : exact, ou détail `/services/:name`
 * hors pages réservées (logs / service-logs).
 */
export function isServicesListPath(pathname: string): boolean {
  const path = stripQueryHash(pathname).replace(/\/$/, "") || "/";
  if (path === "/backoffice/services") return true;
  const m = path.match(/^\/backoffice\/services\/([^/]+)$/);
  if (!m) return false;
  return !SERVICES_RESERVED.has(m[1]);
}

/** Onglet Services & Logs (alias logs / service-logs). */
export function isServicesLogsPath(pathname: string): boolean {
  return pathMatchesHref(pathname, "/backoffice/services/service-logs");
}

export function isServicesTabActive(pathname: string, href: string): boolean {
  if (href === "/backoffice/services") {
    return isServicesListPath(pathname);
  }
  if (
    href === "/backoffice/services/logs" ||
    href === "/backoffice/services/service-logs"
  ) {
    return isServicesLogsPath(pathname);
  }
  return pathMatchesHref(pathname, href);
}

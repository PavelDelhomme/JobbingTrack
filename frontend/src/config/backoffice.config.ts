/**
 * Chemin public du backoffice admin.
 * Sécurité = login + token (JWT auth-service) vérifié par l'API gateway, pas obscurité d'URL.
 */
export const BACKOFFICE_BASE_PATH = "/backoffice" as const;

/** Ancien alias conservé en redirect permanent (middleware). Ne pas aligner sur BASE. */
export const BACKOFFICE_LEGACY_PATH = "/b4ck0ff1ce" as const;

export function backofficePath(subpath = ""): string {
  if (!subpath) return BACKOFFICE_BASE_PATH;
  const normalized = subpath.startsWith("/") ? subpath : `/${subpath}`;
  return `${BACKOFFICE_BASE_PATH}${normalized}`;
}

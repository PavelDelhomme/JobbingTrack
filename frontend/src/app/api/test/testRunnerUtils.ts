import { join } from "path";

/**
 * Indique si l'API tourne dans le conteneur frontend (Docker).
 * En Docker on n'a pas accès à make ni au repo racine ; on exécute npm directement.
 */
export function isRunningInFrontendContainer(): boolean {
  const root = process.env.PROJECT_ROOT || "";
  return root === "/app" || process.cwd() === "/app";
}

/**
 * Racine du projet (contenant scripts/ et tests/).
 * En Docker (frontend) : PROJECT_ROOT=/app, scripts montés en /app/scripts (volume ./scripts:/app/scripts).
 * En local : remonter d'un niveau si on est dans frontend/.
 */
export function getProjectRoot(): string {
  const envRoot = process.env.PROJECT_ROOT;
  if (envRoot && envRoot.trim()) return envRoot.trim();
  const cwd = process.cwd();
  // Docker: frontend tourne dans /app, scripts en /app/scripts (volume dédié)
  if (cwd === "/app") return "/app";
  if (cwd.endsWith("frontend") || cwd.includes("/frontend")) {
    return join(cwd, "..");
  }
  return cwd;
}

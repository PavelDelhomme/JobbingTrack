/**
 * Gate environnement : actions d’écriture pilotage (OK/KO, édition md)
 * uniquement hors production.
 *
 * Priorité : JT_RUNTIME_ENV / APP_ENV / NEXT_PUBLIC_JT_RUNTIME_ENV
 * Fallback : NODE_ENV !== 'production'
 */

const PROD = new Set(["production", "prod"]);
const ALLOWED = new Set([
  "development",
  "dev",
  "local",
  "preprod",
  "staging",
  "test",
  "ci",
]);

export function getPilotageRuntimeEnv(): string {
  return (
    process.env.JT_RUNTIME_ENV ||
    process.env.APP_ENV ||
    process.env.NEXT_PUBLIC_JT_RUNTIME_ENV ||
    process.env.NODE_ENV ||
    "development"
  )
    .trim()
    .toLowerCase();
}

/** true = on peut muter les .md depuis l’UI (dev / préprod / local). */
export function isPilotageInteractiveAllowed(): boolean {
  const runtime = getPilotageRuntimeEnv();
  if (PROD.has(runtime)) return false;
  if (ALLOWED.has(runtime)) return true;
  // Node production sans label explicite → bloquer
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

export function pilotageEnvDenialMessage(): string {
  return `Écriture pilotage désactivée en environnement « ${getPilotageRuntimeEnv()} ». Disponible en development / preprod / staging uniquement.`;
}

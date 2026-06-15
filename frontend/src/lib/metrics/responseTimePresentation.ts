/** Services métier à suivre en priorité pour la validation P1B temps de réponse. */
export const PRIORITY_RESPONSE_SERVICES = [
  "auth-service",
  "deployment-service",
  "call-service",
  "notification-service",
  "followup-service",
  "application-service",
] as const;

export const RESPONSE_TIME_SOURCE_NOTE =
  "Instantané : sonde HTTP metrics-aggregator (réseau Docker). Historique agrégé : monitoring-agent-rs / persistance système. Postgres = santé Docker, pas de latence HTTP.";

export function normalizeServiceShortName(name: string): string {
  return (name || "")
    .replace(/^jobbingtrack-/, "")
    .trim()
    .toLowerCase();
}

export function isNonHttpDependency(serviceName: string): boolean {
  const key = normalizeServiceShortName(serviceName);
  return key === "postgres" || key === "redis";
}

export function formatServiceResponseTime(
  ms: number,
  serviceName: string,
): string {
  if (isNonHttpDependency(serviceName)) return "Santé Docker";
  if (Number.isFinite(ms) && ms > 0) return `${Math.round(ms)}ms`;
  return "N/A";
}

export function isPriorityResponseService(serviceName: string): boolean {
  const key = normalizeServiceShortName(serviceName);
  return (PRIORITY_RESPONSE_SERVICES as readonly string[]).includes(key);
}

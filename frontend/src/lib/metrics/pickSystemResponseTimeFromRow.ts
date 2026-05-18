/**
 * Extrait un temps de réponse agrégé (ms) depuis une ligne d’historique système
 * (persistance metrics-aggregator / Prisma), quel que soit le nommage snake_case ou camelCase.
 */
export function pickSystemResponseTimeAvgMsFromRow(
  d: Record<string, unknown>,
): number | null {
  const keys = [
    "responseTimeAvg",
    "avg_response_time_ms",
    "response_time_avg",
    "responseTimeMs",
    "avgResponseTimeMs",
  ] as const;
  for (const k of keys) {
    const v = d[k];
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

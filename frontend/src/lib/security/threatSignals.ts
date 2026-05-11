/**
 * Heuristiques alignées Analyse sécurité / Vue d’ensemble (signaux menaces + logs).
 * Les données peuvent provenir de la BDD de test ou d’événements réels.
 */

export function hasToken(v: unknown, tokens: string[]): boolean {
  const text = String(v || '').toLowerCase();
  return tokens.some((t) => text.includes(t));
}

export function isSqliThreat(t: Record<string, unknown>): boolean {
  return (
    hasToken(t?.threatType, ['sql_injection', 'sql injection']) ||
    hasToken(t?.message, ['sql_injection', 'sql injection']) ||
    hasToken((t?.metadata as Record<string, unknown> | undefined)?.payload, ["' or", 'union select', 'drop table'])
  );
}

export function isXssThreat(t: Record<string, unknown>): boolean {
  return (
    hasToken(t?.threatType, ['xss']) ||
    hasToken(t?.message, ['xss']) ||
    hasToken((t?.metadata as Record<string, unknown> | undefined)?.payload, ['<script', 'onerror=', 'javascript:'])
  );
}

export function isDdosThreat(t: Record<string, unknown>): boolean {
  return String(t?.threatType || '').toUpperCase().includes('DDOS');
}

type CountLogsOpts = { excludeEventTypes?: string[] };

/** Compte les événements « détection » dans les logs (même logique que la page Analyse). */
export function countDetectionLikeLogs(
  logs: Record<string, unknown>[],
  opts?: CountLogsOpts
): number {
  const ex = new Set((opts?.excludeEventTypes || []).map((x) => String(x).toLowerCase()));
  return logs.filter((l: Record<string, unknown>) => {
    const e = String(l?.eventType || '').toLowerCase();
    if (ex.has(e)) return false;
    return (
      e.includes('threat_detect') ||
      e === 'network_threat_detected' ||
      e === 'waf_block' ||
      e.includes('intrusion') ||
      e === 'suspicious_request'
    );
  }).length;
}

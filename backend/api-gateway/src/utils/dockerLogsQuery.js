/**
 * Même contrat que metrics-aggregator `docker.routes.js` (since/until + lines)
 * pour éviter l'injection shell et garder des fenêtres relatives homogènes.
 */

const DOCKER_LOGS_ALLOWED_RELATIVE = new Set([
  '15m', '30m', '45m', '1h', '2h', '6h', '12h', '24h', '48h', '72h', '7d', '168h',
]);

function sanitizeDockerLogsSinceUntil(value) {
  if (value == null || value === '') return null;
  const v = String(value).trim();
  if (DOCKER_LOGS_ALLOWED_RELATIVE.has(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/.test(v)) return v;
  return null;
}

/** Aligné aggregator : 10–5000 lignes (défaut def si absent / NaN). */
function clampDockerLogLines(raw, def = 100) {
  const n = parseInt(raw, 10);
  const base = Number.isFinite(n) ? n : def;
  return Math.min(5000, Math.max(10, base));
}

/**
 * Normalise les paramètres de logs Docker (gateway → metrics-aggregator).
 * @returns {{ lines: number, since: string|null, until: string|null, queryString: string }}
 */
function normalizeDockerLogsQuery(query = {}) {
  const lines = clampDockerLogLines(query.lines, 100);
  const since = sanitizeDockerLogsSinceUntil(query.since);
  const until = sanitizeDockerLogsSinceUntil(query.until);
  const qs = new URLSearchParams();
  qs.set('lines', String(lines));
  if (since) qs.set('since', since);
  if (until) qs.set('until', until);
  return {
    lines,
    since,
    until,
    queryString: qs.toString(),
  };
}

module.exports = {
  DOCKER_LOGS_ALLOWED_RELATIVE,
  sanitizeDockerLogsSinceUntil,
  clampDockerLogLines,
  normalizeDockerLogsQuery,
};

/**
 * Masque les secrets potentiels dans les contenus pilotage (affichage + refuse écriture brute).
 * Ne remplace pas le vault .env : juste une barrière anti-fuite dans les docs.
 */

const SECRET_LINE_PATTERNS: RegExp[] = [
  /\b(password|passwd|pwd|secret|api[_-]?key|token|authorization|bearer|private[_-]?key|smtp_pass|database_url|jwt[_-]?secret)\b\s*[:=]\s*['"]?[^\s'"]{8,}/gi,
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
];

export function redactPilotageSecrets(content: string): {
  content: string;
  redactedCount: number;
} {
  let out = content;
  let redactedCount = 0;
  for (const re of SECRET_LINE_PATTERNS) {
    out = out.replace(re, (match) => {
      redactedCount += 1;
      if (/^[^=:]+=/.test(match) || /:/.test(match)) {
        const sep = match.includes("=") ? "=" : ":";
        const [left] = match.split(sep);
        return `${left}${sep} ***REDACTED***`;
      }
      return "***REDACTED***";
    });
  }
  return { content: out, redactedCount };
}

/** Détecte si un contenu à écrire contient encore des secrets non masqués. */
export function detectRawSecrets(content: string): string[] {
  const hits: string[] = [];
  for (const re of SECRET_LINE_PATTERNS) {
    re.lastIndex = 0;
    const m = content.match(re);
    if (m?.length) hits.push(...m.slice(0, 3));
  }
  return hits;
}

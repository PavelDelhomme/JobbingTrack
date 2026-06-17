/** Sépare une saisie multi-valeurs (virgule, point-virgule ou pipe). */
export function parseMultiFilterValues(raw: string | null | undefined): string[] {
  if (raw == null) return [];
  const text = String(raw).trim();
  if (!text) return [];
  const parts = text.split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(part);
  }
  return result;
}

/** Sérialise une liste de valeurs pour stockage URL / état filtre. */
export function serializeMultiFilterValues(values: string[]): string {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");
}

export function matchesAnyToken(
  haystack: string,
  tokens: string[],
  mode: "includes" | "equals" = "includes",
): boolean {
  if (tokens.length === 0) return true;
  const normalizedHaystack = haystack.trim().toLowerCase();
  return tokens.some((token) => {
    const needle = token.trim().toLowerCase();
    if (!needle) return false;
    return mode === "equals"
      ? normalizedHaystack === needle
      : normalizedHaystack.includes(needle);
  });
}

export function matchesAnyNormalizedValue(
  value: string,
  tokens: string[],
  normalize: (value: string) => string = (input) => input.trim().toLowerCase(),
): boolean {
  if (tokens.length === 0) return true;
  const normalizedValue = normalize(value);
  return tokens.some((token) => normalize(token) === normalizedValue);
}

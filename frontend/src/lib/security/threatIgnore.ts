export function isThreatIgnored(
  threat: { ignored?: boolean; metadata?: unknown } | null | undefined,
): boolean {
  if (!threat) return false;
  if (threat.ignored === true) return true;
  const meta = threat.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return (meta as Record<string, unknown>).ignored === true;
  }
  return false;
}

export function filterActiveThreats<T extends { ignored?: boolean; metadata?: unknown }>(
  threats: T[],
): T[] {
  return threats.filter((t) => !isThreatIgnored(t));
}

export function normalizeSecurityStatusFromCounts(
  rawStatus: string,
  critical: number,
  high: number,
  medium: number,
  low: number,
): string {
  const normalized = rawStatus.trim().toLowerCase();
  if (normalized === "skipped" || normalized === "skip") return "skipped";
  if (critical > 0 || high > 0) return "vulnerable";
  if (medium > 0 || low > 0) return "warning";
  return normalized || "ok";
}

export function securityStatusLabel(status: string): string {
  switch (status) {
    case "vulnerable":
      return "À traiter";
    case "warning":
      return "À surveiller";
    case "skipped":
    case "skip":
      return "Ignoré";
    case "ok":
      return "OK";
    case "error":
      return "Erreur scan";
    default:
      return status;
  }
}

/** Tons sémantiques partagés (backoffice, pages publiques, OTA, etc.). */
export type SemanticTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "critical";

/** Alias OTA / actions device → ton sémantique. */
export function mapDeviceToneToSemantic(
  tone: "warning" | "info" | "amber" | "ok" | "neutral" | "critical",
): SemanticTone {
  switch (tone) {
    case "ok":
      return "success";
    case "amber":
    case "warning":
      return "warning";
    case "info":
      return "info";
    case "critical":
      return "critical";
    default:
      return "neutral";
  }
}

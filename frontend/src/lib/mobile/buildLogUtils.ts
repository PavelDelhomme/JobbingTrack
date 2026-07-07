export type BuildLogLevel = "info" | "success" | "warning" | "error";

export function classifyBuildLogLine(msg: string): BuildLogLevel {
  const t = msg.trim();
  if (!t) return "info";
  if (
    /^WARNING:/i.test(t) ||
    /\bwarning\b/i.test(t) ||
    /Built-in Kotlin/i.test(t) ||
    /Kotlin Gradle Plugin/i.test(t) ||
    /KGP\b/.test(t)
  ) {
    return "warning";
  }
  if (
    /^ERROR:/i.test(t) ||
    /\berror\b/i.test(t) ||
    /échec|failed|Build échoué|Impossible de/i.test(t)
  ) {
    return "error";
  }
  if (/réussi|succès|Installation réussie|\bOK\b/i.test(t)) {
    return "success";
  }
  return "info";
}

export function splitBuildOutput(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
}

export function extractWarningsFromOutput(raw: string | undefined | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of splitBuildOutput(raw)) {
    const level = classifyBuildLogLine(line);
    if (level !== "warning") continue;
    const key = line.slice(0, 240);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line.trim());
  }
  return out.slice(0, 25);
}

export const BUILD_LOG_LEVEL_CLASS: Record<BuildLogLevel, string> = {
  info: "text-gray-800 dark:text-gray-200",
  success: "text-emerald-800 dark:text-emerald-200",
  warning: "text-amber-900 dark:text-amber-200 font-medium",
  error: "text-red-800 dark:text-red-200 font-medium",
};

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

/** Réduit le bruit Kotlin (6 lignes similaires → 2 messages lisibles). */
export function summarizeBuildWarnings(raw: string[] | undefined | null): string[] {
  if (!raw?.length) return [];
  const kotlinRelated = raw.some((w) => /Built-in Kotlin|Kotlin Gradle Plugin|KGP/i.test(w));
  if (!kotlinRelated) return raw.slice(0, 8);

  const out: string[] = [
    "Migration Built-in Kotlin Flutter (BL-26-09) — APK produit ; voir docs/mobile/ANDROID_TOOLCHAIN.md avant maj Flutter.",
  ];
  const pluginsLine = raw.find((w) => /plugins that apply Kotlin Gradle Plugin/i.test(w));
  if (pluginsLine) {
    out.push(pluginsLine.replace(/\s+/g, " ").trim().slice(0, 420));
  }
  for (const w of raw) {
    if (/Built-in Kotlin|Kotlin Gradle Plugin|plugins that apply Kotlin|build\.gradle\.kts/i.test(w)) {
      continue;
    }
    if (out.length >= 4) break;
    out.push(w.trim().slice(0, 420));
  }
  return out;
}

import type { CrashReportSummary } from "@/lib/services/applicationAnalyticsService";

const FEEDBACK_PREFIX =
  /^\[(bug|suggestion|signalement)\]\s/i;

export function isUserFeedbackCrash(crash: CrashReportSummary): boolean {
  const nested = (crash.metadata?.metadata ?? {}) as Record<string, unknown>;
  if (nested.feedback === true) return true;
  if (crash.crashType === "ManualReport" && FEEDBACK_PREFIX.test(crash.message || "")) {
    return true;
  }
  return FEEDBACK_PREFIX.test(crash.message || "");
}

export function feedbackCategoryFromCrash(crash: CrashReportSummary): string {
  const nested = (crash.metadata?.metadata ?? {}) as Record<string, unknown>;
  const cat = nested.category as string | undefined;
  if (cat) return cat.toLowerCase();
  const m = (crash.message || "").match(FEEDBACK_PREFIX);
  if (m?.[1]) return m[1].toLowerCase();
  return "retour";
}

/** Détail exploitable pour le dialogue backoffice (diag, perf, logs). */
export function crashReportDetailRecord(
  crash: CrashReportSummary,
): Record<string, unknown> {
  const raw = (crash.metadata ?? {}) as Record<string, unknown>;
  const nestedMeta = (raw.metadata ?? {}) as Record<string, unknown>;
  const diagnosticCompressed = nestedMeta.diagnosticCompressed as string | undefined;
  let diagnostic: Record<string, unknown> | undefined;
  if (diagnosticCompressed) {
    diagnostic = { note: "Diagnostic compressé (gz) — décompresser côté agent si besoin", size: diagnosticCompressed.length };
  } else {
    diagnostic = nestedMeta.diagnostic as Record<string, unknown> | undefined;
  }
  return {
    id: crash.id,
    timestamp: crash.timestamp,
    crashType: crash.crashType,
    category: feedbackCategoryFromCrash(crash),
    message: crash.message,
    screenName: raw.screenName ?? nestedMeta.screenName,
    sessionId: raw.sessionId,
    appVersion: raw.appVersion,
    deviceInfo: raw.deviceInfo ?? raw.device,
    analytics: raw.analytics,
    diagnostic,
    userActions: raw.userActions,
    stackTrace: raw.stackTrace,
    metadata: nestedMeta,
  };
}

export function formatMemoryBytes(bytes?: number | null): string {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  // Valeurs mobile_snapshot récentes : memoryUsage stocké en Mo entiers côté BDD.
  if (bytes > 0 && bytes < 4096) return `${bytes} Mo`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${bytes} o`;
}

export function formatPerfMetricValue(p: {
  metricType?: string | null;
  metricName?: string | null;
  duration?: number | null;
  memoryUsage?: number | null;
  networkLatency?: number | null;
  value?: number | null;
}): string {
  if (
    p.metricType === "mobile_snapshot" ||
    p.metricName === "session_health"
  ) {
    if (p.memoryUsage != null) return `${p.memoryUsage} Mo RSS`;
    if (p.duration != null) {
      return `session ${Math.round(p.duration / 60000)} min · API ${p.value ?? "—"} · err ${p.networkLatency ?? "—"}`;
    }
  }
  if (p.metricType === "memory" || p.metricName?.includes("rss")) {
    return formatMemoryBytes(p.memoryUsage ?? p.value);
  }
  if (p.duration != null) return `${p.duration} ms`;
  if (p.networkLatency != null) return `${p.networkLatency} ms latence`;
  if (p.memoryUsage != null) return formatMemoryBytes(p.memoryUsage);
  if (p.value != null) return String(p.value);
  return "—";
}

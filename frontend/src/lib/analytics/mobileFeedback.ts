import type { CrashReportSummary } from "@/lib/services/applicationAnalyticsService";
import {
  decompressImageDataUrl,
  decompressJsonPayload,
} from "@/lib/analytics/diagnosticPayloadCodec";

const FEEDBACK_PREFIX =
  /^\[(bug|suggestion|signalement)\]\s/i;

/** Données générées par scripts de validation / smokes (pas du terrain utilisateur). */
const TEST_SMOKE_MESSAGE =
  /live-verify-|smoke\s+(auto|pipeline)|simulation porteur|test validation|message de test/i;

function nestedMeta(crash: CrashReportSummary): Record<string, unknown> {
  const raw = (crash.metadata ?? {}) as Record<string, unknown>;
  return (raw.metadata ?? {}) as Record<string, unknown>;
}

export function isMonitoringTestOrSmokeCrash(crash: CrashReportSummary): boolean {
  const nested = nestedMeta(crash);
  const tag = String(nested.tag ?? "");
  if (tag.startsWith("live-verify") || nested.validation === true || nested.smoke === true) {
    return true;
  }
  return TEST_SMOKE_MESSAGE.test(crash.message || "");
}

export function isMonitoringTestOrSmokeError(err: {
  errorMessage?: string | null;
  properties?: Record<string, unknown> | null;
}): boolean {
  const props = (err.properties ?? {}) as Record<string, unknown>;
  const tag = String(props.tag ?? "");
  if (tag.startsWith("live-verify")) return true;
  return TEST_SMOKE_MESSAGE.test(err.errorMessage || "");
}

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

function nestedMetaFromCrash(crash: CrashReportSummary): Record<string, unknown> {
  const raw = (crash.metadata ?? {}) as Record<string, unknown>;
  return (raw.metadata ?? {}) as Record<string, unknown>;
}

/** Détail exploitable pour le dialogue backoffice (diag, perf, logs). */
export function crashReportDetailRecord(
  crash: CrashReportSummary,
): Record<string, unknown> {
  const raw = (crash.metadata ?? {}) as Record<string, unknown>;
  const nestedMeta = nestedMetaFromCrash(crash);
  const diagnosticCompressed = nestedMeta.diagnosticCompressed as string | undefined;
  const screenshotCompressed = nestedMeta.screenshotCompressed as string | undefined;
  return {
    id: crash.id,
    timestamp: crash.timestamp,
    crashType: crash.crashType,
    category: feedbackCategoryFromCrash(crash),
    message: crash.message,
    screenName: raw.screenName ?? nestedMeta.screenName,
    sessionId: raw.sessionId ?? nestedMeta.sessionId,
    userId: raw.userId ?? nestedMeta.userId,
    appVersion: raw.appVersion,
    deviceInfo: raw.deviceInfo ?? raw.device,
    analytics: raw.analytics,
    diagnosticCompressed: diagnosticCompressed ?? null,
    screenshotCompressed: screenshotCompressed ?? null,
    userActions: raw.userActions,
    stackTrace: raw.stackTrace,
    metadata: nestedMeta,
  };
}

/** Décompression async pour affichage détail (diagnostic + capture). */
export async function enrichCrashDetailRecord(
  record: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const out = { ...record };
  const diag = record.diagnosticCompressed;
  if (typeof diag === "string" && diag.length > 0) {
    const parsed = await decompressJsonPayload(diag);
    if (parsed) out.diagnostic = parsed;
  }
  const shot = record.screenshotCompressed;
  if (typeof shot === "string" && shot.length > 0) {
    const dataUrl = await decompressImageDataUrl(shot);
    if (dataUrl) out.screenshotPreview = dataUrl;
  }
  delete out.diagnosticCompressed;
  delete out.screenshotCompressed;
  return out;
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

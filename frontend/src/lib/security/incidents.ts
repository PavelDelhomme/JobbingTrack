/** Types d'événements logs considérés comme incidents (pas le bruit api_access / health). */
export const INCIDENT_LOG_EVENT_TYPES = new Set([
  "network_threat_detected",
  "waf_blocked",
  "waf_toggled",
  "threat_blocked",
  "ip_blocked_manually",
  "ip_blocked_automatically",
  "ip_blocked_lab_simulation",
  "intrusion_detected",
  "sql_injection_detected",
  "xss_detected",
  "high_traffic",
  "ddos_detected",
  "dos_attack",
  "security_alert_email_settings_updated",
]);

export function isIncidentLog(eventType: string, level?: string): boolean {
  const et = String(eventType || "").trim();
  if (!et) return false;
  if (INCIDENT_LOG_EVENT_TYPES.has(et)) return true;
  const lv = String(level || "").toLowerCase();
  if (lv === "critical" || lv === "error") {
    return !et.startsWith("api_access");
  }
  return false;
}

export type IncidentRow = {
  id: string;
  kind: "threat" | "alert" | "event";
  title: string;
  subtitle: string;
  severity: string;
  source: string;
  timestamp: string;
  href: string;
  threatId?: string;
  alertId?: string;
  logId?: string;
};

export function threatHref(threatId: string): string {
  return `/b4ck0ff1ce/security/threats/${threatId}`;
}

export function alertHref(alertId: string): string {
  return `/b4ck0ff1ce/security/incidents/alert/${alertId}`;
}

export function logHref(logId: string, eventType?: string): string {
  const q = new URLSearchParams({ highlight: logId });
  if (eventType) q.set("eventType", eventType);
  return `/b4ck0ff1ce/security/logs?${q.toString()}`;
}

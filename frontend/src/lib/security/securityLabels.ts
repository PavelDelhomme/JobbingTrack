export type SecuritySeverityKey =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

const SECURITY_SEVERITY_LABELS: Record<SecuritySeverityKey, string> = {
  critical: "Critique",
  high: "Haute",
  medium: "Moyenne",
  low: "Faible",
  info: "Info",
};

const THREAT_TYPE_LABELS: Record<string, string> = {
  SYN_FLOOD: "SYN flood",
  PORT_SCAN: "Balayage de ports",
  BRUTE_FORCE: "Force brute",
  DDOS: "DDoS",
  DOS_ATTACK: "Déni de service",
  SUSPICIOUS_REQUEST: "Requête suspecte",
  SQL_INJECTION: "Injection SQL",
  XSS: "XSS",
  PATH_TRAVERSAL: "Traversal de chemin",
  INTRUSION: "Intrusion",
  INTRUSION_DETECTED: "Intrusion détectée",
  WAF_BLOCK: "Blocage WAF",
  WAF_BLOCKED: "Blocage WAF",
  FIREWALL_BLOCK: "Blocage firewall",
  NETWORK_THREAT_DETECTED: "Menace réseau détectée",
  HIGH_TRAFFIC: "Trafic élevé",
};

const SECURITY_EVENT_TYPE_LABELS: Record<string, string> = {
  ...THREAT_TYPE_LABELS,
  API_ACCESS: "Accès API",
  IP_BLOCKED_MANUALLY: "IP bloquée manuellement",
  IP_BLOCKED_AUTOMATICALLY: "IP bloquée automatiquement",
  IP_BLOCKED_LAB_SIMULATION: "IP bloquée en test lab",
  THREAT_BLOCKED: "Menace bloquée",
  SECURITY_ALERT_EMAIL_SETTINGS_UPDATED: "Paramètres email sécurité modifiés",
  WAF_TOGGLED: "WAF modifié",
  FAILED_LOGIN: "Connexion échouée",
  INVALID_TOKEN: "Jeton invalide",
  MOBILE_CRASH_REPORT: "Rapport crash mobile",
  MOBILE_AUTH_FAILURE: "Échec authentification mobile",
  MOBILE_LOGOUT: "Déconnexion mobile",
  MOBILE_SESSION_REVOKED: "Session mobile révoquée",
  MOBILE_OTP_FAILED: "OTP mobile échoué",
  MOBILE_PASSWORD_CHANGED: "Mot de passe mobile modifié",
  MOBILE_FORCED_LOGOUT: "Déconnexion forcée mobile",
  MOBILE_SECURITY_EVENT: "Événement sécurité mobile",
};

const BLOCK_ORIGIN_LABELS: Record<string, string> = {
  lab_simulation: "Test lab",
  manual_rule: "Manuel",
  automatic_threat: "Automatique",
  iptables: "iptables",
  log_inferred: "Déduit des logs",
  unknown: "Origine inconnue",
};

export type SecurityEventNature =
  | "detection"
  | "manual_block"
  | "auto_block"
  | "policy_change"
  | "auth"
  | "other";

const SECURITY_EVENT_NATURE_LABELS: Record<SecurityEventNature, string> = {
  detection: "Détection",
  manual_block: "Blocage manuel",
  auto_block: "Blocage automatique",
  policy_change: "Changement politique",
  auth: "Authentification",
  other: "Événement",
};

const FIREWALL_ACTION_LABELS: Record<string, string> = {
  DENY: "Bloquer (DROP)",
  REJECT: "Rejeter",
  ALLOW: "Autoriser",
};

export function normalizeSecuritySeverity(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function enumToReadable(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "Non renseigné";

  return raw
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/^\p{L}/u, (letter) => letter.toUpperCase());
}

export function formatSecuritySeverity(value?: string | null): string {
  const key = normalizeSecuritySeverity(value) as SecuritySeverityKey;
  return SECURITY_SEVERITY_LABELS[key] || enumToReadable(value);
}

export function isHighOrCriticalSeverity(value?: string | null): boolean {
  const key = normalizeSecuritySeverity(value);
  return key === "high" || key === "critical";
}

export function formatThreatTypeLabel(value?: string | null): string {
  const key = String(value || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
  return THREAT_TYPE_LABELS[key] || enumToReadable(value);
}

export function formatSecurityEventTypeLabel(value?: string | null): string {
  const key = String(value || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
  return SECURITY_EVENT_TYPE_LABELS[key] || enumToReadable(value);
}

export function formatBlockOriginLabel(value?: string | null): string | null {
  const key = String(value || "").trim();
  if (!key) return null;
  return BLOCK_ORIGIN_LABELS[key] || enumToReadable(value);
}

export function formatBlockOriginLabelOrUnknown(
  value?: string | null,
): string {
  return formatBlockOriginLabel(value) || BLOCK_ORIGIN_LABELS.unknown;
}

export function classifySecurityEventNature(
  eventType?: string | null,
): SecurityEventNature {
  const key = String(eventType || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();

  if (
    key.includes("WAF") ||
    key.includes("INTRUSION") ||
    key.includes("DETECTED") ||
    key.includes("ATTACK") ||
    key.includes("SCAN") ||
    key.includes("FLOOD") ||
    key === "FAILED_LOGIN"
  ) {
    return "detection";
  }
  if (
    key.includes("BLOCKED") ||
    key === "THREAT_BLOCKED" ||
    key === "IP_BLOCKED_MANUALLY" ||
    key === "IP_BLOCKED_LAB_SIMULATION"
  ) {
    if (key.includes("MANUAL") || key.includes("LAB")) return "manual_block";
    return "auto_block";
  }
  if (
    key.includes("TOGGLED") ||
    key.includes("SETTINGS") ||
    key === "SECURITY_ALERT_EMAIL_SETTINGS_UPDATED"
  ) {
    return "policy_change";
  }
  if (
    key.includes("LOGIN") ||
    key.includes("AUTH") ||
    key.includes("TOKEN")
  ) {
    return "auth";
  }
  return "other";
}

export function formatSecurityEventNatureLabel(
  eventType?: string | null,
): string {
  const nature = classifySecurityEventNature(eventType);
  return SECURITY_EVENT_NATURE_LABELS[nature];
}

export function formatFirewallActionLabel(value?: string | null): string {
  const key = String(value || "")
    .trim()
    .toUpperCase();
  return FIREWALL_ACTION_LABELS[key] || enumToReadable(value);
}

export function getSecuritySeverityFilterOptions(): Array<{
  value: string;
  label: string;
}> {
  return [
    { value: "critical", label: SECURITY_SEVERITY_LABELS.critical },
    { value: "error", label: "Erreur" },
    { value: "warning", label: "Avertissement" },
    { value: "info", label: SECURITY_SEVERITY_LABELS.info },
  ];
}

export function getThreatSeverityFilterOptions(): Array<{
  value: string;
  label: string;
}> {
  return [
    { value: "CRITICAL", label: "Critique" },
    { value: "HIGH", label: "Haute" },
    { value: "MEDIUM", label: "Moyenne" },
    { value: "LOW", label: "Faible" },
  ];
}

export function getThreatTypeFilterOptions(): Array<{
  value: string;
  label: string;
}> {
  return Object.entries(THREAT_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
}

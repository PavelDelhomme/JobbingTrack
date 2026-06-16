import {
  formatBlockOriginLabel,
  isHighOrCriticalSeverity,
} from "./securityLabels";

export type BlockedIpConsolidatedEntry = {
  ip?: string;
  threatId?: string;
  blockOrigin?: string;
  reason?: string;
};

export type ThreatBlockInput = {
  id: string;
  sourceIp: string;
  severity: string;
  blocked: boolean;
  metadata?: Record<string, unknown> | null;
};

export type ThreatBlockStatusKind =
  | "blocked_automatic"
  | "blocked_manual"
  | "blocked_consolidated"
  | "blocked"
  | "recommended"
  | "not_blocked";

export type ThreatBlockStatus = {
  kind: ThreatBlockStatusKind;
  label: string;
  detail: string;
  tone: "danger" | "warning" | "neutral" | "info";
  showBlockButton: boolean;
};

export function normalizeListedThreatIp(ip: string): string {
  const value = String(ip || "").trim();
  return value.startsWith("::ffff:") ? value.slice(7) : value;
}

function isPrivateOrLocalIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const value = normalizeListedThreatIp(ip);
  if (value === "127.0.0.1" || value === "::1") return true;
  if (value.startsWith("10.") || value.startsWith("192.168.")) return true;
  const secondOctet = Number(value.split(".")[1]);
  return value.startsWith("172.") && secondOctet >= 16 && secondOctet <= 31;
}

function isLabDocumentationIp(ip: string | null | undefined): boolean {
  const value = normalizeListedThreatIp(String(ip || ""));
  return (
    value.startsWith("192.0.2.") ||
    value.startsWith("198.51.100.") ||
    value.startsWith("203.0.113.")
  );
}

function readThreatBlockOrigin(
  threat: ThreatBlockInput,
  consolidatedEntry?: BlockedIpConsolidatedEntry | null,
): string | null {
  const meta = threat.metadata;
  if (meta && typeof meta.blockOrigin === "string" && meta.blockOrigin.trim()) {
    return meta.blockOrigin.trim();
  }
  return consolidatedEntry?.blockOrigin?.trim() || null;
}

export function findConsolidatedBlockEntry(
  threat: Pick<ThreatBlockInput, "id" | "sourceIp">,
  entries: BlockedIpConsolidatedEntry[],
): BlockedIpConsolidatedEntry | null {
  const normSource = normalizeListedThreatIp(threat.sourceIp);
  for (const entry of entries) {
    if (entry.threatId && String(entry.threatId) === String(threat.id)) {
      return entry;
    }
    if (
      entry.ip &&
      normSource &&
      normalizeListedThreatIp(entry.ip) === normSource
    ) {
      return entry;
    }
  }
  return null;
}

export function resolveThreatBlockStatus(
  threat: ThreatBlockInput,
  consolidatedEntry?: BlockedIpConsolidatedEntry | null,
): ThreatBlockStatus {
  const blockOrigin = readThreatBlockOrigin(threat, consolidatedEntry);
  const inConsolidated = Boolean(consolidatedEntry);
  const highOrCritical = isHighOrCriticalSeverity(threat.severity);

  if (threat.blocked) {
    if (blockOrigin === "automatic_threat") {
      return {
        kind: "blocked_automatic",
        label: "Bloqué automatiquement",
        detail:
          consolidatedEntry?.reason ||
          "IP bloquée par la politique auto-blocage high/critical.",
        tone: "danger",
        showBlockButton: false,
      };
    }
    if (blockOrigin === "manual_rule" || blockOrigin === "iptables") {
      return {
        kind: "blocked_manual",
        label: "Bloqué manuellement",
        detail:
          consolidatedEntry?.reason ||
          "Action admin ou règle firewall explicite.",
        tone: "danger",
        showBlockButton: false,
      };
    }
    if (blockOrigin === "lab_simulation") {
      return {
        kind: "blocked_manual",
        label: "Bloqué (simulation lab)",
        detail: "Blocage de test lab — hors auto-blocage production.",
        tone: "info",
        showBlockButton: false,
      };
    }
    if (inConsolidated) {
      const originLabel = formatBlockOriginLabel(blockOrigin);
      return {
        kind: "blocked_consolidated",
        label: "Bloqué",
        detail: originLabel
          ? `Présent sur la liste consolidée (${originLabel}).`
          : "Présent sur la liste consolidée des IP bloquées.",
        tone: "danger",
        showBlockButton: false,
      };
    }
    return {
      kind: "blocked",
      label: "Bloqué",
      detail: "Menace marquée bloquée en base.",
      tone: "danger",
      showBlockButton: false,
    };
  }

  if (inConsolidated && blockOrigin === "automatic_threat") {
    return {
      kind: "blocked_automatic",
      label: "Bloqué automatiquement (liste IP)",
      detail:
        "IP présente sur la liste consolidée ; le drapeau menace n’est pas synchronisé.",
      tone: "warning",
      showBlockButton: true,
    };
  }

  if (highOrCritical) {
    if (isPrivateOrLocalIp(threat.sourceIp)) {
      return {
        kind: "recommended",
        label: "Blocage recommandé",
        detail:
          "Auto-blocage désactivé : IP privée ou locale (politique bornée B12).",
        tone: "warning",
        showBlockButton: true,
      };
    }
    if (isLabDocumentationIp(threat.sourceIp)) {
      return {
        kind: "recommended",
        label: "Blocage recommandé",
        detail:
          "IP lab RFC5737 : exemptée du blocage automatique jusqu’à validation B12.",
        tone: "warning",
        showBlockButton: true,
      };
    }
    return {
      kind: "recommended",
      label: "Blocage recommandé",
      detail:
        "Politique auto-blocage non confirmée : le moteur firewall n’a pas marqué la menace bloquée (iptables indisponible ou politique B12 en attente).",
      tone: "warning",
      showBlockButton: true,
    };
  }

  return {
    kind: "not_blocked",
    label: "Non bloqué",
    detail: "Sévérité modérée : surveillance sans action bloquante immédiate.",
    tone: "neutral",
    showBlockButton: true,
  };
}

export function threatBlockStatusToneClass(
  tone: ThreatBlockStatus["tone"],
): string {
  switch (tone) {
    case "danger":
      return "text-red-600 dark:text-red-400";
    case "warning":
      return "text-amber-600 dark:text-amber-400";
    case "info":
      return "text-blue-600 dark:text-blue-400";
    default:
      return "text-gray-500 dark:text-gray-400";
  }
}

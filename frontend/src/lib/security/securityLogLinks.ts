import { threatHref } from "@/lib/security/incidents";

export type SecurityLogLinkReason =
  | "metadata_threat_id"
  | "correlation_ip_temps"
  | "lab_non_rattache"
  | "menace_introuvable"
  | "aucune_menace_ip"
  | "aucune_menace_proche"
  | "ip_absente"
  | "evenement_non_menace"
  | string;

export type SecurityLogLinkSource = "metadata" | "correlation" | null;

export type SecurityLogLinkFields = {
  metadata?: Record<string, unknown>;
  correlatedThreatId?: string | null;
  linkSource?: SecurityLogLinkSource;
  linkReason?: SecurityLogLinkReason | null;
};

/** Identifiant Prisma CUID — rejette les IDs synthétiques lab. */
export function isPersistedThreatId(id: unknown): boolean {
  const value = String(id ?? "").trim();
  return /^c[a-z0-9]{15,}$/i.test(value);
}

export function readSecurityLogThreatId(
  log: SecurityLogLinkFields,
): string | null {
  if (log.correlatedThreatId && isPersistedThreatId(log.correlatedThreatId)) {
    return String(log.correlatedThreatId);
  }
  const metadataId = log.metadata?.threatId;
  if (metadataId && isPersistedThreatId(metadataId)) {
    return String(metadataId);
  }
  return null;
}

export function formatSecurityLogLinkReason(
  reason?: SecurityLogLinkReason | null,
): string {
  switch (reason) {
    case "metadata_threat_id":
      return "Menace liée (métadonnée)";
    case "correlation_ip_temps":
      return "Menace corrélée par IP et horodatage";
    case "lab_non_rattache":
      return "Log lab sans menace rattachée";
    case "menace_introuvable":
      return "Menace référencée introuvable";
    case "aucune_menace_ip":
      return "Aucune menace pour cette IP";
    case "aucune_menace_proche":
      return "Aucune menace proche dans la fenêtre";
    case "ip_absente":
      return "IP source absente";
    case "evenement_non_menace":
      return "Événement sans lien menace attendu";
    default:
      return reason ? String(reason) : "Aucune menace liée";
  }
}

export function resolveSecurityLogLink(log: SecurityLogLinkFields): {
  href: string | null;
  label: string;
  title: string;
} {
  const threatId = readSecurityLogThreatId(log);
  if (threatId) {
    const viaCorrelation = log.linkSource === "correlation";
    return {
      href: threatHref(threatId),
      label: viaCorrelation ? "Menace corrélée" : "Menace liée",
      title: formatSecurityLogLinkReason(log.linkReason),
    };
  }

  return {
    href: null,
    label: formatSecurityLogLinkReason(log.linkReason),
    title: formatSecurityLogLinkReason(log.linkReason),
  };
}

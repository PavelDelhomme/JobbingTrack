export type ConnectionConfidence = "high" | "medium" | "low";

export type ConnectionSourceSide = {
  kind: string;
  label: string;
  confidence: ConnectionConfidence;
  detail?: string | null;
  ip?: string | null;
};

export type ConnectionDestinationSide = {
  kind: string;
  label: string;
  confidence: ConnectionConfidence;
  port?: number | null;
};

export type ConnectionSourcePresentation = {
  remoteIp?: string | null;
  localIp?: string | null;
  localPort?: number | null;
  remotePort?: number | null;
  protocol?: string | null;
  state?: string | null;
  containerName?: string | null;
  source?: ConnectionSourceSide;
  destination?: ConnectionDestinationSide;
  serviceLabel?: string | null;
  observedAt?: string | null;
};

export type IpEnrichmentHints = {
  vpn?: boolean | null;
  proxy?: boolean | null;
  tor?: boolean | null;
  asn?: string | null;
  organization?: string | null;
  country?: string | null;
  enrichmentConfidence?: string | null;
  enrichmentSource?: string | null;
};

export function formatConnectionConfidence(
  confidence?: ConnectionConfidence | string | null,
): string {
  if (confidence === "high") return "Élevée";
  if (confidence === "medium") return "Moyenne";
  if (confidence === "low") return "Faible";
  return "—";
}

export function formatReputationBadges(
  enrichment?: IpEnrichmentHints | null,
): string[] {
  if (!enrichment) return [];
  const badges: string[] = [];
  if (enrichment.vpn === true) badges.push("VPN");
  if (enrichment.proxy === true) badges.push("Proxy");
  if (enrichment.tor === true) badges.push("Tor");
  if (enrichment.asn) badges.push(enrichment.asn);
  if (enrichment.organization) badges.push(enrichment.organization);
  return badges;
}

export function resolveConnectionPresentation(
  conn: Record<string, unknown>,
): ConnectionSourcePresentation {
  const remoteIp = String(conn.remoteIp || conn.sourceIp || "").trim() || null;
  const localIp = String(conn.localIp || conn.destIp || "").trim() || null;
  const localPort = Number(conn.localPort ?? conn.destPort ?? 0) || null;
  const remotePort = Number(conn.remotePort ?? conn.sourcePort ?? 0) || null;

  const existingSource = conn.source as ConnectionSourceSide | undefined;
  const existingDestination = conn.destination as
    | ConnectionDestinationSide
    | undefined;

  if (existingSource && existingDestination) {
    return {
      remoteIp,
      localIp,
      localPort,
      remotePort,
      protocol: String(conn.protocol || "TCP"),
      state: conn.state ? String(conn.state) : null,
      containerName: conn.containerName ? String(conn.containerName) : null,
      source: existingSource,
      destination: existingDestination,
      serviceLabel: String(
        conn.serviceLabel || existingDestination.label || "Non corrélé",
      ),
      observedAt: conn.observedAt ? String(conn.observedAt) : null,
    };
  }

  const source = classifySourceSide(remoteIp);
  const destination = classifyDestinationSide(conn, localIp, localPort, remotePort);

  return {
    remoteIp,
    localIp,
    localPort,
    remotePort,
    protocol: String(conn.protocol || "TCP"),
    state: conn.state ? String(conn.state) : null,
    containerName: conn.containerName ? String(conn.containerName) : null,
    source,
    destination,
    serviceLabel: destination.label,
    observedAt: conn.observedAt ? String(conn.observedAt) : null,
  };
}

function isPrivateIp(ip: string | null): boolean {
  if (!ip) return false;
  const value = ip.replace(/^::ffff:/, "");
  if (value === "127.0.0.1" || value === "::1") return true;
  if (value.startsWith("10.") || value.startsWith("192.168.")) return true;
  const secondOctet = Number(value.split(".")[1]);
  return value.startsWith("172.") && secondOctet >= 16 && secondOctet <= 31;
}

function classifySourceSide(remoteIp: string | null): ConnectionSourceSide {
  if (!remoteIp || remoteIp === "0.0.0.0" || remoteIp === "::") {
    return {
      kind: "ephemeral",
      label: "Port éphémère",
      confidence: "low",
      detail: "Adresse distante non résolue",
      ip: null,
    };
  }
  if (remoteIp === "127.0.0.1" || remoteIp === "::1") {
    return {
      kind: "local",
      label: "Localhost",
      confidence: "high",
      detail: remoteIp,
      ip: remoteIp,
    };
  }
  if (isPrivateIp(remoteIp)) {
    return {
      kind: "docker-internal",
      label: "Réseau Docker / interne",
      confidence: "high",
      detail: remoteIp,
      ip: remoteIp,
    };
  }
  return {
    kind: "public",
    label: "IP publique",
    confidence: "high",
    detail: remoteIp,
    ip: remoteIp,
  };
}

const PORT_HINTS: Record<number, string> = {
  3000: "api-gateway (3000)",
  3008: "calls / notification (3008)",
  3014: "metrics-aggregator (3014)",
  3017: "security-service (3017)",
  5432: "postgres (5432)",
};

function classifyDestinationSide(
  conn: Record<string, unknown>,
  localIp: string | null,
  localPort: number | null,
  remotePort: number | null,
): ConnectionDestinationSide {
  const containerName = String(conn.containerName || "").trim();
  if (containerName && containerName.toLowerCase() !== "unknown") {
    return { kind: "docker", label: containerName, confidence: "high", port: localPort };
  }
  if (localIp === "127.0.0.1" || localIp === "::1") {
    return {
      kind: "host-local",
      label: "Service local (loopback)",
      confidence: "high",
      port: localPort,
    };
  }
  if (localIp && isPrivateIp(localIp)) {
    return {
      kind: "host-network",
      label: "Interface Docker / privée",
      confidence: "medium",
      port: localPort,
    };
  }
  if (localPort && PORT_HINTS[localPort]) {
    return {
      kind: "service-hint",
      label: PORT_HINTS[localPort],
      confidence: "medium",
      port: localPort,
    };
  }
  if (remotePort && PORT_HINTS[remotePort]) {
    return {
      kind: "service-hint",
      label: PORT_HINTS[remotePort],
      confidence: "low",
      port: localPort,
    };
  }
  if (localPort) {
    return {
      kind: "port",
      label: `Port local ${localPort}`,
      confidence: "low",
      port: localPort,
    };
  }
  return { kind: "unmapped", label: "Non corrélé", confidence: "low", port: localPort };
}

export function threatLinkForSourceIp(ip?: string | null): string | null {
  if (!ip || isPrivateIp(ip)) return null;
  return `/backoffice/security/threats?sourceIp=${encodeURIComponent(ip)}`;
}

export function logsLinkForSourceIp(ip?: string | null): string | null {
  if (!ip) return null;
  return `/backoffice/security/logs?q=${encodeURIComponent(ip)}`;
}

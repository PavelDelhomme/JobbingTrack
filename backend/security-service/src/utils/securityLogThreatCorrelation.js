const CORRELATABLE_EVENT_TYPES = new Set([
  "network_threat_detected",
  "threat_blocked",
  "intrusion_detected",
  "sql_injection_detected",
  "xss_detected",
  "high_traffic",
  "ddos_detected",
  "dos_attack",
  "ip_blocked_automatically",
  "ip_blocked_manually",
  "ip_blocked_lab_simulation",
]);

const CORRELATABLE_CATEGORIES = new Set([
  "network",
  "intrusion",
  "firewall",
  "ddos",
  "waf",
]);

const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

function readThreatIdFromMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return null;
  const id = metadata.threatId;
  return id ? String(id) : null;
}

function shouldAttemptCorrelation(log) {
  if (readThreatIdFromMetadata(log?.metadata)) return false;
  const eventType = String(log?.eventType || "").trim();
  const category = String(log?.category || "").trim().toLowerCase();
  if (CORRELATABLE_EVENT_TYPES.has(eventType)) return true;
  if (CORRELATABLE_CATEGORIES.has(category)) return true;
  return false;
}

function isLabAutocompleteLog(log) {
  return String(log?.message || "").includes("Lab autocomplete");
}

function resolveCorrelationReason(log, threatId, linkSource) {
  if (threatId && linkSource === "metadata") {
    return "metadata_threat_id";
  }
  if (threatId && linkSource === "correlation") {
    return "correlation_ip_temps";
  }
  if (!shouldAttemptCorrelation(log) && !isLabAutocompleteLog(log)) {
    return "evenement_non_menace";
  }
  if (isLabAutocompleteLog(log)) {
    return "lab_non_rattache";
  }
  if (!String(log?.sourceIP || "").trim()) {
    return "ip_absente";
  }
  return "aucune_menace_proche";
}

function correlateLogWithThreats(log, threatsByIp, windowMs = DEFAULT_WINDOW_MS) {
  const explicitThreatId = readThreatIdFromMetadata(log?.metadata);
  if (explicitThreatId) {
    return {
      correlatedThreatId: explicitThreatId,
      linkSource: "metadata",
      linkReason: resolveCorrelationReason(log, explicitThreatId, "metadata"),
    };
  }

  if (!shouldAttemptCorrelation(log)) {
    return {
      correlatedThreatId: null,
      linkSource: null,
      linkReason: resolveCorrelationReason(log, null, null),
    };
  }

  const ip = String(log?.sourceIP || "").trim();
  if (!ip) {
    return {
      correlatedThreatId: null,
      linkSource: null,
      linkReason: "ip_absente",
    };
  }

  const candidates = threatsByIp.get(ip) || [];
  if (!candidates.length) {
    return {
      correlatedThreatId: null,
      linkSource: null,
      linkReason: isLabAutocompleteLog(log)
        ? "lab_non_rattache"
        : "aucune_menace_ip",
    };
  }

  const logTime = new Date(log.timestamp || log.createdAt || Date.now()).getTime();
  let best = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const threat of candidates) {
    const threatTime = new Date(threat.detectedAt || threat.createdAt).getTime();
    const delta = Math.abs(threatTime - logTime);
    if (delta <= windowMs && delta < bestDelta) {
      bestDelta = delta;
      best = threat;
    }
  }

  if (best) {
    return {
      correlatedThreatId: String(best.id),
      linkSource: "correlation",
      linkReason: "correlation_ip_temps",
    };
  }

  return {
    correlatedThreatId: null,
    linkSource: null,
    linkReason: isLabAutocompleteLog(log)
      ? "lab_non_rattache"
      : "aucune_menace_proche",
  };
}

function buildThreatsByIp(threats) {
  const map = new Map();
  for (const threat of threats || []) {
    const ip = String(threat.sourceIp || "").trim();
    if (!ip) continue;
    const bucket = map.get(ip) || [];
    bucket.push(threat);
    map.set(ip, bucket);
  }
  return map;
}

function enrichSecurityLogsWithThreatLinks(logs, threats, windowMs = DEFAULT_WINDOW_MS) {
  const threatsByIp = buildThreatsByIp(threats);
  return (logs || []).map((log) => {
    const link = correlateLogWithThreats(log, threatsByIp, windowMs);
    return {
      ...log,
      correlatedThreatId: link.correlatedThreatId,
      linkSource: link.linkSource,
      linkReason: link.linkReason,
    };
  });
}

function collectCorrelationSourceIps(logs) {
  const ips = new Set();
  for (const log of logs || []) {
    if (!shouldAttemptCorrelation(log)) continue;
    const ip = String(log?.sourceIP || "").trim();
    if (ip) ips.add(ip);
  }
  return Array.from(ips);
}

function buildThreatLookupWindow(logs, paddingMs = DEFAULT_WINDOW_MS) {
  const timestamps = (logs || [])
    .map((log) => new Date(log.timestamp || log.createdAt || Date.now()).getTime())
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) {
    const now = Date.now();
    return {
      gte: new Date(now - paddingMs),
      lte: new Date(now + paddingMs),
    };
  }

  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  return {
    gte: new Date(min - paddingMs),
    lte: new Date(max + paddingMs),
  };
}

module.exports = {
  CORRELATABLE_CATEGORIES,
  CORRELATABLE_EVENT_TYPES,
  buildThreatLookupWindow,
  collectCorrelationSourceIps,
  correlateLogWithThreats,
  enrichSecurityLogsWithThreatLinks,
  readThreatIdFromMetadata,
  resolveCorrelationReason,
  shouldAttemptCorrelation,
};

const { prisma } = require("../config/database");
const { logger } = require("../utils/logger");
const {
  isPersistedThreatId,
  readThreatIdFromMetadata,
} = require("./securityLogThreatCorrelation");

const AUTO_THREAT_LEVELS = new Set(["critical", "error", "warning"]);

function mapLevelToThreatSeverity(level) {
  const normalized = String(level || "").toLowerCase();
  if (normalized === "critical") return "CRITICAL";
  if (normalized === "error") return "HIGH";
  if (normalized === "warning") return "MEDIUM";
  return "LOW";
}

function mapEventToThreatType(eventType, category) {
  const event = String(eventType || "").trim();
  if (event) return event.toUpperCase().slice(0, 64);
  const cat = String(category || "").trim();
  if (cat) return `${cat.toUpperCase()}_EVENT`.slice(0, 64);
  return "SECURITY_EVENT";
}

async function maybeCreateThreatForSecurityLog(logData, log) {
  const level = String(logData?.level || "").toLowerCase();
  if (!AUTO_THREAT_LEVELS.has(level)) return log;

  if (
    !prisma.networkThreat ||
    typeof prisma.networkThreat.create !== "function"
  ) {
    return log;
  }

  const metadata =
    logData?.metadata && typeof logData.metadata === "object"
      ? { ...logData.metadata }
      : {};
  const existingId = readThreatIdFromMetadata(metadata);
  if (existingId) {
    const existing = await prisma.networkThreat.findUnique({
      where: { id: existingId },
      select: { id: true },
    });
    if (existing) return log;
  }

  try {
    const sourceIp = String(logData?.sourceIP || "").trim() || "0.0.0.0";
    const threat = await prisma.networkThreat.create({
      data: {
        threatType: mapEventToThreatType(logData.eventType, logData.category),
        sourceIp,
        severity: mapLevelToThreatSeverity(level),
        blocked: false,
        metadata: {
          autoCreatedFromLog: true,
          logId: log.id,
          eventType: logData.eventType || null,
          category: logData.category || null,
          message: logData.message || null,
          level,
        },
      },
    });

    const updatedMetadata = {
      ...metadata,
      threatId: threat.id,
      autoThreat: true,
    };

    const updated = await prisma.securityLog.update({
      where: { id: log.id },
      data: { metadata: updatedMetadata },
    });

    return updated;
  } catch (error) {
    logger.warn("Création automatique de menace échouée pour le log sécurité", {
      logId: log?.id,
      message: error.message,
    });
    return log;
  }
}

module.exports = {
  AUTO_THREAT_LEVELS,
  isPersistedThreatId,
  maybeCreateThreatForSecurityLog,
  mapEventToThreatType,
  mapLevelToThreatSeverity,
};

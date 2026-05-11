/**
 * Network Threat Detector - Détection continue des menaces réseau
 * Analyse les connexions réseau et détecte les anomalies
 */

const { PrismaClient } = require('@prisma/client');
const networkMonitor = require('../network-monitor');
const firewallEngine = require('../firewall-engine');
const securityService = require('./securityService');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

let previousConnections = [];
let detectionInterval = null;

/**
 * Démarrer la détection continue des menaces
 */
function startDetection(intervalMs = 30000) {
  if (detectionInterval) {
    logger.warn('Détection de menaces déjà démarrée');
    return;
  }

  logger.info('🔍 Démarrage de la détection continue des menaces réseau...');

  detectionInterval = setInterval(async () => {
    try {
      await detectAndHandleThreats();
    } catch (error) {
      logger.error('Erreur lors de la détection de menaces:', error);
    }
  }, intervalMs);

  // Détection immédiate au démarrage
  detectAndHandleThreats().catch(err => {
    logger.error('Erreur détection initiale:', err);
  });
}

/**
 * Arrêter la détection continue
 */
function stopDetection() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
    logger.info('🛑 Détection de menaces arrêtée');
  }
}

/**
 * Détecter et gérer les menaces
 */
async function detectAndHandleThreats() {
  try {
    // Collecter les métriques réseau
    const metrics = await networkMonitor.collectNetworkMetrics();
    
    // Détecter les anomalies
    const anomalies = networkMonitor.detectAnomalies(metrics.connections, previousConnections);
    
    // Sauvegarder les connexions pour la prochaine itération
    previousConnections = metrics.connections;

    // Traiter chaque anomalie
    for (const anomaly of anomalies) {
      await handleAnomaly(anomaly, metrics);
    }

    // Sauvegarder les connexions importantes en base
    await saveNetworkConnections(metrics.connections);

    logger.debug(`Détection terminée: ${anomalies.length} anomalies détectées`);
  } catch (error) {
    logger.error('Erreur détection menaces:', error);
  }
}

/**
 * Gérer une anomalie détectée
 */
async function handleAnomaly(anomaly, metrics) {
  try {
    // Vérifier si cette menace existe déjà
    const existingThreat = await prisma.networkThreat.findFirst({
      where: {
        sourceIp: anomaly.sourceIp,
        threatType: anomaly.type,
        detectedAt: {
          gte: new Date(Date.now() - 3600000) // Dernière heure
        }
      }
    });

    if (existingThreat) {
      // Mettre à jour la menace existante
      await prisma.networkThreat.update({
        where: { id: existingThreat.id },
        data: {
          severity: anomaly.severity,
          metadata: {
            ...existingThreat.metadata,
            count: (existingThreat.metadata?.count || 0) + 1,
            lastDetected: new Date().toISOString()
          }
        }
      });
      return;
    }

    // Enrichir les métadonnées avec plus de détails
    const threatConnections = metrics.connections.filter(
      conn => conn.remoteIp === anomaly.sourceIp
    );
    
    const ports = [...new Set(threatConnections.map(c => c.localPort))];
    const protocols = [...new Set(threatConnections.map(c => c.protocol))];
    const states = [...new Set(threatConnections.map(c => (
      typeof c.state === 'string' ? c.state : getStateName(c.state)
    )))];
    
    // Créer une nouvelle menace avec métadonnées enrichies
    const threat = await prisma.networkThreat.create({
      data: {
        threatType: anomaly.type,
        sourceIp: anomaly.sourceIp,
        destIp: threatConnections[0]?.localIp || null,
        destPort: ports.length === 1 ? ports[0] : null,
        severity: anomaly.severity,
        blocked: false,
        metadata: {
          message: anomaly.message,
          count: anomaly.count || anomaly.portCount || 1,
          detectedAt: new Date().toISOString(),
          ports: ports,
          protocols: protocols,
          states: states,
          totalConnections: threatConnections.length,
          connectionDetails: threatConnections.slice(0, 10).map(c => ({
            localIp: c.localIp,
            localPort: c.localPort,
            remotePort: c.remotePort,
            protocol: c.protocol,
            state: typeof c.state === 'string' ? c.state : getStateName(c.state),
            containerName: c.containerName,
            containerId: c.containerId
          })),
          containerInfo: threatConnections[0]?.containerName ? {
            containerName: threatConnections[0].containerName,
            containerId: threatConnections[0].containerId
          } : null
        }
      }
    });

    logger.warn(`⚠️ Menace détectée: ${anomaly.type} depuis ${anomaly.sourceIp} (${anomaly.severity})`);

    // Bloquer automatiquement les menaces CRITICAL ou HIGH
    if (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH') {
      const blockResult = await firewallEngine.blockIp(
        anomaly.sourceIp,
        `Auto-block: ${anomaly.type} (${anomaly.severity})`
      );

      if (blockResult.success) {
        await prisma.networkThreat.update({
          where: { id: threat.id },
          data: { blocked: true }
        });

        logger.info(`🔒 IP ${anomaly.sourceIp} bloquée automatiquement`);
      }
    }

    // Créer une alerte de sécurité
    await prisma.securityAlert.create({
      data: {
        level: anomaly.severity.toLowerCase(),
        title: `Menace réseau détectée: ${anomaly.type}`,
        description: anomaly.message,
        category: 'network',
        source: anomaly.sourceIp,
        metadata: {
          threatId: threat.id,
          threatType: anomaly.type
        }
      }
    });

    // Écrire dans security_logs pour affichage dans « Logs de sécurité » backoffice
    await securityService.createSecurityLog({
      level: anomaly.severity === 'CRITICAL' ? 'critical' : anomaly.severity === 'HIGH' ? 'error' : 'warning',
      category: 'network',
      eventType: 'network_threat_detected',
      message: `Menace détectée: ${anomaly.type} depuis ${anomaly.sourceIp} - ${anomaly.message}`,
      sourceIP: anomaly.sourceIp,
      riskScore: anomaly.severity === 'CRITICAL' ? 90 : anomaly.severity === 'HIGH' ? 70 : 50,
      isBlocked: false,
      metadata: { threatId: threat.id, threatType: anomaly.type }
    }).catch(() => {});
  } catch (error) {
    logger.error('Erreur gestion anomalie:', error);
  }
}

/**
 * Sauvegarder les connexions réseau importantes
 */
async function saveNetworkConnections(connections) {
  try {
    // Sauvegarder seulement les connexions ESTABLISHED et LISTEN
    const importantConnections = connections.filter(
      conn => conn.state === 0x01 || conn.state === 0x0A // ESTABLISHED ou LISTEN
    );

    // Limiter à 100 connexions pour éviter la surcharge
    const connectionsToSave = importantConnections.slice(0, 100);

    // Sauvegarder seulement les nouvelles connexions (éviter les doublons)
    const existingConnections = new Set();
    try {
      const recent = await prisma.networkConnection.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60000) // Dernière minute
          }
        },
        select: {
          sourceIp: true,
          destIp: true,
          sourcePort: true,
          destPort: true,
          protocol: true
        }
      });
      
      for (const conn of recent) {
        existingConnections.add(`${conn.sourceIp}:${conn.sourcePort}-${conn.destIp}:${conn.destPort}-${conn.protocol}`);
      }
    } catch (error) {
      // Si la table n'existe pas, continuer sans vérification
      if (error.code !== 'P2021' && !error.message?.includes('does not exist')) {
        logger.error('Erreur vérification connexions existantes:', error);
      }
    }

    for (const conn of connectionsToSave) {
      try {
        const connKey = `${conn.remoteIp}:${conn.remotePort}-${conn.localIp}:${conn.localPort}-${conn.protocol}`;
        
        // Vérifier si la connexion existe déjà
        if (existingConnections.has(connKey)) {
          // Mettre à jour la connexion existante
          await prisma.networkConnection.updateMany({
            where: {
              sourceIp: conn.remoteIp,
              destIp: conn.localIp,
              sourcePort: conn.remotePort,
              destPort: conn.localPort,
              protocol: conn.protocol
            },
            data: {
              state: getStateName(conn.state),
              containerId: conn.containerId,
              containerName: conn.containerName,
              updatedAt: new Date()
            }
          });
        } else {
          // Créer une nouvelle connexion
          await prisma.networkConnection.create({
            data: {
              sourceIp: conn.remoteIp,
              destIp: conn.localIp,
              sourcePort: conn.remotePort,
              destPort: conn.localPort,
              protocol: conn.protocol,
              state: getStateName(conn.state),
              containerId: conn.containerId,
              containerName: conn.containerName
            }
          });
          existingConnections.add(connKey);
        }
      } catch (error) {
        // Gérer les erreurs P2021 (table n'existe pas) gracieusement
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
          // Ignorer silencieusement si la table n'existe pas
          return;
        }
        logger.error('Erreur sauvegarde connexion:', error);
      }
    }
  } catch (error) {
    logger.error('Erreur sauvegarde connexions:', error);
  }
}

/**
 * Convertir l'état TCP en nom lisible
 */
function getStateName(state) {
  const states = {
    0x01: 'ESTABLISHED',
    0x02: 'SYN_SENT',
    0x03: 'SYN_RECV',
    0x04: 'FIN_WAIT1',
    0x05: 'FIN_WAIT2',
    0x06: 'TIME_WAIT',
    0x07: 'CLOSE',
    0x08: 'CLOSE_WAIT',
    0x09: 'LAST_ACK',
    0x0A: 'LISTEN',
    0x0B: 'CLOSING'
  };
  return states[state] || 'UNKNOWN';
}

module.exports = {
  startDetection,
  stopDetection,
  detectAndHandleThreats
};


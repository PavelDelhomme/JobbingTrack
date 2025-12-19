/**
 * Contrôleur pour la gestion du firewall
 */

const { PrismaClient } = require('@prisma/client');
const networkMonitor = require('../network-monitor');
const firewallEngine = require('../firewall-engine');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * GET /api/v1/security/firewall/rules
 * Récupérer toutes les règles de firewall
 */
async function getFirewallRules(req, res) {
  try {
    const rules = await prisma.firewallRule.findMany({
      orderBy: { priority: 'asc' }
    });

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    logger.error('Erreur récupération règles firewall:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des règles'
    });
  }
}

/**
 * POST /api/v1/security/firewall/rules
 * Créer une nouvelle règle de firewall
 */
async function createFirewallRule(req, res) {
  try {
    const { name, description, sourceIp, destPort, protocol, action, priority } = req.body;

    // Validation
    if (!name || !protocol || !action) {
      return res.status(400).json({
        success: false,
        error: 'Les champs name, protocol et action sont requis'
      });
    }

    // Créer la règle en base
    const rule = await prisma.firewallRule.create({
      data: {
        name,
        description,
        sourceIp,
        destPort,
        protocol: protocol.toUpperCase(),
        action: action.toUpperCase(),
        priority: priority || 100,
        enabled: true
      }
    });

    // Appliquer la règle avec iptables si activée
    if (rule.enabled) {
      const result = await firewallEngine.applyFirewallRule(rule);
      if (!result.success) {
        logger.warn(`Impossible d'appliquer la règle firewall: ${result.error}`);
      }
    }

    res.status(201).json({
      success: true,
      data: rule
    });
  } catch (error) {
    logger.error('Erreur création règle firewall:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la règle'
    });
  }
}

/**
 * PUT /api/v1/security/firewall/rules/:id
 * Mettre à jour une règle de firewall
 */
async function updateFirewallRule(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const rule = await prisma.firewallRule.update({
      where: { id },
      data: updates
    });

    // Réappliquer la règle si activée
    if (rule.enabled) {
      await firewallEngine.applyFirewallRule(rule);
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    logger.error('Erreur mise à jour règle firewall:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la règle'
    });
  }
}

/**
 * DELETE /api/v1/security/firewall/rules/:id
 * Supprimer une règle de firewall
 */
async function deleteFirewallRule(req, res) {
  try {
    const { id } = req.params;

    const rule = await prisma.firewallRule.findUnique({ where: { id } });
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Règle non trouvée'
      });
    }

    // Supprimer la règle iptables
    await firewallEngine.removeFirewallRule(rule);

    // Supprimer de la base
    await prisma.firewallRule.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Règle supprimée avec succès'
    });
  } catch (error) {
    logger.error('Erreur suppression règle firewall:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la règle'
    });
  }
}

/**
 * GET /api/v1/security/firewall/network/stats
 * Récupérer les statistiques réseau globales
 */
async function getNetworkStats(req, res) {
  try {
    const metrics = await networkMonitor.collectNetworkMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Erreur récupération stats réseau:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques réseau'
    });
  }
}

/**
 * GET /api/v1/security/firewall/network/containers/:containerId
 * Récupérer les statistiques réseau pour un conteneur
 */
async function getContainerStats(req, res) {
  try {
    const { containerId } = req.params;
    const metrics = await networkMonitor.collectNetworkMetrics();
    
    const containerConnections = metrics.connections.filter(
      conn => conn.containerId === containerId || conn.containerName?.includes(containerId)
    );

    res.json({
      success: true,
      data: {
        containerId,
        connections: containerConnections,
        stats: {
          totalConnections: containerConnections.length,
          tcpConnections: containerConnections.filter(c => c.protocol === 'TCP').length,
          udpConnections: containerConnections.filter(c => c.protocol === 'UDP').length
        }
      }
    });
  } catch (error) {
    logger.error('Erreur récupération stats conteneur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques du conteneur'
    });
  }
}

/**
 * GET /api/v1/security/firewall/threats
 * Récupérer les menaces réseau détectées
 */
async function getNetworkThreats(req, res) {
  try {
    const { page = 1, limit = 50, severity } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (severity) {
      where.severity = severity.toUpperCase();
    }

    const [threats, total] = await Promise.all([
      prisma.networkThreat.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { detectedAt: 'desc' }
      }),
      prisma.networkThreat.count({ where })
    ]);

    res.json({
      success: true,
      data: threats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Erreur récupération menaces:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des menaces'
    });
  }
}

/**
 * POST /api/v1/security/firewall/threats/:id/block
 * Bloquer une menace (bloquer l'IP)
 */
async function blockThreat(req, res) {
  try {
    const { id } = req.params;

    const threat = await prisma.networkThreat.findUnique({ where: { id } });
    if (!threat) {
      return res.status(404).json({
        success: false,
        error: 'Menace non trouvée'
      });
    }

    // Bloquer l'IP avec iptables
    const result = await firewallEngine.blockIp(threat.sourceIp, `Threat: ${threat.threatType}`);

    if (result.success) {
      // Mettre à jour la menace
      await prisma.networkThreat.update({
        where: { id },
        data: { blocked: true }
      });
    }

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    logger.error('Erreur blocage menace:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du blocage de la menace'
    });
  }
}

/**
 * POST /api/v1/security/firewall/block-ip
 * Bloquer une IP manuellement
 */
async function blockIp(req, res) {
  try {
    const { ip, reason } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP requise'
      });
    }

    const result = await firewallEngine.blockIp(ip, reason || 'Manual block');

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    logger.error('Erreur blocage IP:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du blocage de l\'IP'
    });
  }
}

/**
 * POST /api/v1/security/firewall/unblock-ip
 * Débloquer une IP
 */
async function unblockIp(req, res) {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP requise'
      });
    }

    const result = await firewallEngine.unblockIp(ip);

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    logger.error('Erreur déblocage IP:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du déblocage de l\'IP'
    });
  }
}

/**
 * GET /api/v1/security/firewall/blocked-ips
 * Récupérer la liste des IPs bloquées
 */
async function getBlockedIps(req, res) {
  try {
    const result = await firewallEngine.listFirewallRules();
    
    // Parser les règles iptables pour extraire les IPs bloquées
    const blockedIps = [];
    if (result.success && result.rules) {
      const lines = result.rules.split('\n');
      for (const line of lines) {
        // Parser les lignes iptables pour trouver les DROP
        if (line.includes('DROP') && line.includes('-s')) {
          const match = line.match(/-s\s+(\S+)/);
          if (match) {
            blockedIps.push(match[1]);
          }
        }
      }
    }

    res.json({
      success: true,
      data: blockedIps
    });
  } catch (error) {
    logger.error('Erreur récupération IPs bloquées:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des IPs bloquées'
    });
  }
}

module.exports = {
  getFirewallRules,
  createFirewallRule,
  updateFirewallRule,
  deleteFirewallRule,
  getNetworkStats,
  getContainerStats,
  getNetworkThreats,
  blockThreat,
  blockIp,
  unblockIp,
  getBlockedIps
};


const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// TODO: Implémenter les contrôleurs spécifiques au service
const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Statistiques et tableaux de bord opérationnel',
    service: 'dashboard-service',
    timestamp: new Date().toISOString()
  });
};

const getStats = async (req, res) => {
  try {
    // Récupérer les statistiques depuis les autres services
    // Pour l'instant, retourner des statistiques basiques
    const stats = {
      applications: {
        total: 15,
        byStatus: {
          'DRAFT': 3,
          'SENT': 5,
          'IN_REVIEW': 4,
          'INTERVIEW_SCHEDULED': 2,
          'INTERVIEWED': 1,
          'OFFER_RECEIVED': 0,
          'ACCEPTED': 0,
          'REJECTED': 0,
          'WITHDRAWN': 0,
          'NO_RESPONSE': 0
        },
        byType: {
          'FULL_TIME': 12,
          'PART_TIME': 2,
          'CONTRACT': 1
        },
        thisMonth: 8,
        thisWeek: 3
      },
      users: {
        total: 3,
        byRole: {
          'USER': 1,
          'ADMIN': 1,
          'SUPER_ADMIN': 1
        },
        activeUsers: 3,
        newThisMonth: 2
      },
      companies: {
        total: 8,
        byIndustry: {
          'Technology': 3,
          'Finance': 2,
          'Healthcare': 2,
          'Education': 1
        },
        bySize: {
          'Startup': 4,
          'SMB': 3,
          'Enterprise': 1
        }
      },
      performance: {
        averageResponseTime: 2.5,
        successRate: 85.5,
        errorRate: 1.2
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
};

module.exports = {
  getHealth,
  getStats
};

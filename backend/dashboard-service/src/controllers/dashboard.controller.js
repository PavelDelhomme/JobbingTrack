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
    // Récupérer les vraies statistiques depuis la base de données
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    // Statistiques des applications
    const [
      totalApplications,
      applicationsByStatus,
      applicationsThisMonth,
      applicationsThisWeek
    ] = await Promise.all([
      prisma.application.count(),
      prisma.application.groupBy({
        by: ['status'],
        _count: true
      }),
      prisma.application.count({
        where: {
          createdAt: {
            gte: startOfMonth
          }
        }
      }),
      prisma.application.count({
        where: {
          createdAt: {
            gte: startOfWeek
          }
        }
      })
    ]);

    // Statistiques des utilisateurs
    const [
      totalUsers,
      usersByRole,
      newUsersThisMonth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: true
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfMonth
          }
        }
      })
    ]);

    // Statistiques des entreprises
    const [
      totalCompanies,
      companiesByIndustry
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.groupBy({
        by: ['industry'],
        _count: true
      })
    ]);

    // Formater les résultats
    const byStatus = {};
    applicationsByStatus.forEach(item => {
      byStatus[item.status] = item._count;
    });

    const byRole = {};
    usersByRole.forEach(item => {
      byRole[item.role] = item._count;
    });

    const byIndustry = {};
    companiesByIndustry.forEach(item => {
      if (item.industry) {
        byIndustry[item.industry] = item._count;
      }
    });

    const stats = {
      applications: {
        total: totalApplications,
        by_status: byStatus,
        by_type: {}, // TODO: Ajouter le champ type dans le modèle si nécessaire
        this_month: applicationsThisMonth,
        this_week: applicationsThisWeek
      },
      users: {
        total: totalUsers,
        by_role: byRole,
        active: totalUsers, // TODO: Améliorer avec une vraie détection d'utilisateurs actifs
        new_this_month: newUsersThisMonth
      },
      companies: {
        total: totalCompanies,
        by_industry: byIndustry,
        by_size: {} // TODO: Ajouter le champ size dans le modèle si nécessaire
      },
      performance: {
        averageResponseTime: 0, // Ces données viennent des métriques système
        successRate: 100,
        errorRate: 0
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error.message
    });
  }
};

module.exports = {
  getHealth,
  getStats
};

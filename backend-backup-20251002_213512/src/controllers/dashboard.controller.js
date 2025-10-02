// backend/src/controllers/dashboard.controller.js
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Stats générales
    const [
      totalApplications,
      thisMonthApplications,
      pendingInterviews,
      pendingReminders,
      statusStats
    ] = await Promise.all([
      // Total candidatures
      prisma.application.count({
        where: { userId }
      }),
      
      // Candidatures ce mois
      prisma.application.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      
      // Entretiens à venir
      prisma.interview.count({
        where: {
          application: { userId },
          status: 'SCHEDULED',
          scheduledAt: { gte: new Date() }
        }
      }),
      
      // Rappels non traités
      prisma.reminder.count({
        where: {
          userId,
          completed: false,
          dueDate: { lte: new Date() }
        }
      }),
      
      // Stats par statut
      prisma.application.groupBy({
        by: ['status'],
        where: { userId },
        _count: true
      })
    ]);

    // Taux de réponse
    const withResponse = await prisma.application.count({
      where: {
        userId,
        status: {
          in: ['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFER_RECEIVED', 'ACCEPTED', 'REJECTED']
        }
      }
    });

    const responseRate = totalApplications > 0 ? 
      ((withResponse / totalApplications) * 100).toFixed(1) : 0;

    // Formatter les stats par statut
    const statusBreakdown = statusStats.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {});

    res.json({
      overview: {
        totalApplications,
        thisMonthApplications,
        pendingInterviews,
        pendingReminders,
        responseRate: parseFloat(responseRate)
      },
      statusBreakdown,
      trends: {
        // À calculer selon tes besoins
        weeklyGrowth: 0,
        monthlyGrowth: 0
      }
    });
  } catch (error) {
    logger.error('Erreur récupération stats dashboard:', error);
    next(error);
  }
};

const getRecentActivities = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const activities = await prisma.activity.findMany({
      where: {
        OR: [
          { application: { userId } },
          { contact: { userId } }
        ]
      },
      include: {
        application: {
          include: { company: true }
        },
        contact: {
          include: { company: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    res.json(activities);
  } catch (error) {
    logger.error('Erreur récupération activités:', error);
    next(error);
  }
};

const getUpcomingReminders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const reminders = await prisma.reminder.findMany({
      where: {
        userId,
        completed: false,
        dueDate: { gte: new Date() }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    res.json(reminders);
  } catch (error) {
    logger.error('Erreur récupération rappels:', error);
    next(error);
  }
};

const getApplicationsTimeline = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period = '30' } = req.query;
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const timeline = await prisma.application.groupBy({
      by: ['applicationDate'],
      where: {
        userId,
        applicationDate: { gte: daysAgo }
      },
      _count: true,
      orderBy: { applicationDate: 'asc' }
    });

    // Formater pour le graphique
    const formattedTimeline = timeline.map(item => ({
      date: item.applicationDate?.toISOString().split('T'),
      count: item._count
    }));

    res.json(formattedTimeline);
  } catch (error) {
    logger.error('Erreur récupération timeline:', error);
    next(error);
  }
};

const getTopCompanies = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const topCompanies = await prisma.company.findMany({
      where: {
        applications: {
          some: { userId }
        }
      },
      include: {
        _count: {
          select: {
            applications: {
              where: { userId }
            }
          }
        }
      },
      orderBy: {
        applications: {
          _count: 'desc'
        }
      },
      take: 10
    });

    res.json(topCompanies);
  } catch (error) {
    logger.error('Erreur récupération top entreprises:', error);
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivities,
  getUpcomingReminders,
  getApplicationsTimeline,
  getTopCompanies
};
const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');

// Route de santé de base
router.get('/', async (req, res) => {
  try {
    // Test de connexion à la base de données
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'OK',
      service: 'security-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      service: 'security-service',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// Route de santé détaillée
router.get('/detailed', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      service: 'security-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    };

    // Vérification de la base de données
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthCheck.checks.database = {
        status: 'OK',
        message: 'Database connection successful'
      };
    } catch (error) {
      healthCheck.status = 'ERROR';
      healthCheck.checks.database = {
        status: 'ERROR',
        message: 'Database connection failed',
        error: error.message
      };
    }

    // Vérification de la mémoire
    const memUsage = process.memoryUsage();
    healthCheck.checks.memory = {
      status: memUsage.heapUsed / memUsage.heapTotal > 0.9 ? 'WARNING' : 'OK',
      message: `Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    };

    // Vérification des logs récents
    try {
      const recentLogs = await prisma.securityLog.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // 5 dernières minutes
          }
        }
      });
      healthCheck.checks.recentActivity = {
        status: 'OK',
        message: `${recentLogs} security events in last 5 minutes`
      };
    } catch (error) {
      healthCheck.checks.recentActivity = {
        status: 'ERROR',
        message: 'Unable to check recent activity',
        error: error.message
      };
    }

    const statusCode = healthCheck.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthCheck);

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      service: 'security-service',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

module.exports = router;

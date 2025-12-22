const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');

// Route de santé de base
router.get('/', async (req, res) => {
  try {
    // Test de connexion à la base de données avec timeout et retry
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);
    } catch (dbError) {
      // Si erreur de connexion (P1001), retourner 503 sans logger d'erreur
      // (c'est normal au démarrage si PostgreSQL n'est pas encore prêt)
      if (dbError.code === 'P1001' || dbError.message?.includes('Can\'t reach database server')) {
        return res.status(503).json({
          status: 'ERROR',
          service: 'deployment-service',
          timestamp: new Date().toISOString(),
          error: 'Database not ready',
          message: 'Service is starting, database connection will be established shortly'
        });
      }
      throw dbError;
    }

    res.json({
      status: 'OK',
      service: 'deployment-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    // Ne logger que les erreurs non-P1001 (erreurs de connexion temporaires)
    if (error.code !== 'P1001' && !error.message?.includes('Can\'t reach database server')) {
      logger.error('Health check failed:', error);
    }
    res.status(503).json({
      status: 'ERROR',
      service: 'deployment-service',
      timestamp: new Date().toISOString(),
      error: error.code === 'P1001' ? 'Database not ready' : 'Health check failed'
    });
  }
});

// Route de santé détaillée
router.get('/detailed', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      service: 'deployment-service',
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

    const statusCode = healthCheck.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthCheck);

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      service: 'deployment-service',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

module.exports = router;

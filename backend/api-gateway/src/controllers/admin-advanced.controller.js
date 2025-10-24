const axios = require('axios');
const logger = require('../utils/logger');

// ✅ Route pour récupérer la liste des services disponibles
const getServicesList = async (req, res) => {
  try {
    logger.info('📋 Route /api/v1/services interceptée');

    // Mode développement : retourner la liste des services avec leur statut
    const servicesStatus = [
      {
        name: 'api-gateway',
        status: 'running',
        port: 3000,
        url: 'http://localhost:3000',
        health: 'healthy',
        version: '1.0.0',
        environment: 'development'
      },
      {
        name: 'auth-service',
        status: 'running',
        port: 3001,
        url: 'http://localhost:3001',
        health: 'healthy',
        version: '1.0.0',
        environment: 'development'
      },
      {
        name: 'frontend',
        status: 'running',
        port: 8080,
        url: 'http://localhost:8080',
        health: 'healthy',
        version: '1.0.0',
        environment: 'development'
      },
      {
        name: 'postgres',
        status: 'running',
        port: 5432,
        url: 'localhost:5432',
        health: 'healthy',
        version: '15-alpine',
        environment: 'development'
      },
      {
        name: 'redis',
        status: 'running',
        port: 6379,
        url: 'localhost:6379',
        health: 'healthy',
        version: '7-alpine',
        environment: 'development'
      },
      {
        name: 'metrics-aggregator',
        status: 'running',
        port: 3014,
        url: 'http://localhost:3014',
        health: 'healthy',
        version: '1.0.0',
        environment: 'development'
      }
    ];

    res.status(200).json({
      success: true,
      services: servicesStatus,
      total: servicesStatus.length,
      running: servicesStatus.filter(s => s.status === 'running').length,
      fallback: true,
      message: 'Liste des services (mode développement)'
    });

  } catch (error) {
    logger.error('Error in services list:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
};

// Fonctions de base pour les routes admin (simplifiées)
const getSystemMetrics = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      metrics: {
        timestamp: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        }
      },
      fallback: true,
      message: 'Métriques système (mode développement)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getDetailedSystemMetrics = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      metrics: {
        timestamp: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          loadAverage: require('os').loadavg()
        }
      },
      fallback: true,
      message: 'Métriques système détaillées (mode développement)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPerformanceMetrics = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      metrics: {
        responseTime: '45ms',
        throughput: '120 req/min',
        errorRate: '0.1%',
        uptime: '99.9%'
      },
      fallback: true,
      message: 'Métriques de performance (mode développement)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getEndpointMetrics = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      endpoints: [
        {
          path: '/api/v1/auth/login',
          method: 'POST',
          requests: 150,
          avgResponseTime: '25ms',
          status: 'healthy'
        }
      ],
      fallback: true,
      message: 'Métriques des endpoints (mode développement)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getUserMetrics = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      metrics: {
        totalUsers: 5,
        activeUsers: 3,
        adminUsers: 1
      },
      fallback: true,
      message: 'Métriques utilisateurs (mode développement)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSecurityMetrics = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      metrics: {
        intrusionAttempts: 0,
        securityScore: 85,
        vulnerabilities: 0
      },
      fallback: true,
      message: 'Métriques de sécurité (mode développement)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getDevOpsMetrics = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      metrics: {
        deployments: { total: 15, successful: 14 },
        builds: { total: 25, successful: 23 }
      },
      fallback: true,
      message: 'Métriques DevOps (mode développement)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getRecommendations = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      recommendations: [
        {
          id: 'rec-1',
          type: 'performance',
          priority: 'medium',
          title: 'Optimisation de la base de données',
          description: 'Considérer l\'ajout d\'index'
        }
      ],
      fallback: true,
      message: 'Recommandations (mode développement)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPerformanceAlerts = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      alerts: [],
      fallback: true,
      message: 'Alertes de performance (mode développement)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Fonctions pour les tests Playwright (simplifiées)
const runPlaywrightTests = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      executionId: Date.now(),
      message: 'Tests Playwright lancés (simulation)',
      fallback: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getTestResults = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      results: { total: 10, passed: 8, failed: 2 },
      fallback: true,
      message: 'Résultats des tests (mode développement)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getTestEvents = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      events: [],
      fallback: true,
      message: 'Événements des tests (mode développement)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getTestReport = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      report: { summary: 'Rapport de test généré' },
      fallback: true,
      message: 'Rapport de test (mode développement)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getServicesList,
  getSystemMetrics,
  getDetailedSystemMetrics,
  getPerformanceMetrics,
  getEndpointMetrics,
  getUserMetrics,
  getSecurityMetrics,
  getDevOpsMetrics,
  getRecommendations,
  getPerformanceAlerts,
  runPlaywrightTests,
  getTestResults,
  getTestEvents,
  getTestReport
};

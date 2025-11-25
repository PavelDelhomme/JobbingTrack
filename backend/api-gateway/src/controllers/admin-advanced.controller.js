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

// Fonctions pour les tests Playwright
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const runPlaywrightTests = async (req, res) => {
  try {
    const { scenarios } = req.body;
    
    if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun scénario fourni'
      });
    }

    const executionId = `test-${Date.now()}`;
    logger.info(`🎭 Exécution de ${scenarios.length} scénario(s) Playwright: ${executionId}`);

    // Créer un fichier de test temporaire
    const testDir = path.join(__dirname, '../../../frontend/tests/e2e/custom');
    await fs.mkdir(testDir, { recursive: true });
    
    const testFile = path.join(testDir, `${executionId}.spec.ts`);
    
    // Générer le code Playwright à partir des scénarios
    let testCode = `import { test, expect } from '@playwright/test';\n\n`;
    
    scenarios.forEach((scenario, index) => {
      testCode += `test('${scenario.name}', async ({ page }) => {\n`;
      scenario.steps.forEach(step => {
        switch (step.action) {
          case 'navigate':
            testCode += `  await page.goto('${step.target}');\n`;
            break;
          case 'click':
            testCode += `  await page.click('${step.target}');\n`;
            break;
          case 'fill':
            testCode += `  await page.fill('${step.target}', '${(step.value || '').replace(/'/g, "\\'")}');\n`;
            break;
          case 'select':
            testCode += `  await page.selectOption('${step.target}', '${step.value || ''}');\n`;
            break;
          case 'waitFor':
            testCode += `  await page.waitForSelector('${step.target}');\n`;
            break;
          default:
            testCode += `  // ${step.description}\n`;
        }
      });
      testCode += `});\n\n`;
    });

    // Écrire le fichier de test
    await fs.writeFile(testFile, testCode, 'utf-8');
    logger.info(`📝 Fichier de test créé: ${testFile}`);

    // Exécuter Playwright en arrière-plan
    const frontendDir = path.join(__dirname, '../../../frontend');
    const command = `cd ${frontendDir} && npx playwright test tests/e2e/custom/${executionId}.spec.ts --reporter=json`;
    
    // Lancer l'exécution en arrière-plan
    exec(command, { cwd: frontendDir, timeout: 300000 }, (error, stdout, stderr) => {
      // Les résultats seront récupérés via getTestResults
    });

    res.status(200).json({
      success: true,
      executionId,
      message: `Tests Playwright lancés pour ${scenarios.length} scénario(s)`,
      testFile: testFile.replace(process.cwd(), '')
    });
  } catch (error) {
    logger.error('Erreur exécution tests Playwright:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

const getTestResults = async (req, res) => {
  try {
    const { executionId } = req.params;
    
    // Lire les résultats depuis le fichier JSON généré par Playwright
    const frontendDir = path.join(__dirname, '../../../frontend');
    const resultsFile = path.join(frontendDir, 'test-results.json');
    
    let results = { total: 0, passed: 0, failed: 0, tests: [] };
    
    try {
      const data = await fs.readFile(resultsFile, 'utf-8');
      const jsonData = JSON.parse(data);
      
      // Filtrer les résultats pour l'executionId si nécessaire
      results = {
        total: jsonData.stats?.total || 0,
        passed: jsonData.stats?.passed || 0,
        failed: jsonData.stats?.failed || 0,
        tests: jsonData.suites?.[0]?.specs || []
      };
    } catch (error) {
      // Fichier non trouvé ou erreur de lecture
      logger.warn('Fichier de résultats non trouvé, utilisation de résultats par défaut');
    }

    res.status(200).json({
      success: true,
      executionId,
      results,
      timestamp: new Date().toISOString()
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

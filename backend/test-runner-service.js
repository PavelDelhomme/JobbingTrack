/**
 * Service de test runner
 * API pour déclencher et gérer les tests depuis le frontend
 */

const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Configuration
const TESTS_DIR = path.join(__dirname, '..', 'tests');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const BACKEND_DIR = path.join(__dirname, '..', 'backend');

// Middleware d'authentification basique
const authenticate = (req, res, next) => {
  // Vérification basique - en production, utiliser une vraie authentification
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.includes('Bearer')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Endpoint pour exécuter les tests API
app.post('/api/test/run-api-tests', authenticate, async (req, res) => {
  try {
    const testProcess = exec('node tests/api/test-api.js', {
      cwd: path.join(__dirname, '..'),
      timeout: 300000 // 5 minutes
    });

    let output = '';
    testProcess.stdout.on('data', (data) => {
      output += data;
    });

    testProcess.stderr.on('data', (data) => {
      output += data;
    });

    testProcess.on('close', (code) => {
      const success = code === 0;
      res.json({
        success,
        output,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to run API tests',
      details: error.message
    });
  }
});

// Endpoint pour exécuter les tests backend
app.post('/api/test/run-backend-tests', authenticate, async (req, res) => {
  try {
    const testProcess = exec('node tests/backend/test-services.js', {
      cwd: path.join(__dirname, '..'),
      timeout: 300000
    });

    let output = '';
    testProcess.stdout.on('data', (data) => {
      output += data;
    });

    testProcess.stderr.on('data', (data) => {
      output += data;
    });

    testProcess.on('close', (code) => {
      const success = code === 0;
      res.json({
        success,
        output,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to run backend tests',
      details: error.message
    });
  }
});

// Endpoint pour exécuter les tests de performance
app.post('/api/test/run-performance-tests', authenticate, async (req, res) => {
  try {
    const testProcess = exec('node tests/performance/test-performance.js', {
      cwd: path.join(__dirname, '..'),
      timeout: 600000 // 10 minutes pour les tests de performance
    });

    let output = '';
    testProcess.stdout.on('data', (data) => {
      output += data;
    });

    testProcess.stderr.on('data', (data) => {
      output += data;
    });

    testProcess.on('close', (code) => {
      const success = code === 0;
      res.json({
        success,
        output,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to run performance tests',
      details: error.message
    });
  }
});

// Endpoint pour exécuter les tests de sécurité
app.post('/api/test/run-security-tests', authenticate, async (req, res) => {
  try {
    const testProcess = exec('node tests/security/test-security.js', {
      cwd: path.join(__dirname, '..'),
      timeout: 600000
    });

    let output = '';
    testProcess.stdout.on('data', (data) => {
      output += data;
    });

    testProcess.stderr.on('data', (data) => {
      output += data;
    });

    testProcess.on('close', (code) => {
      const success = code === 0;
      res.json({
        success,
        output,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to run security tests',
      details: error.message
    });
  }
});

// Endpoint pour exécuter les tests mobile
app.post('/api/test/run-mobile-tests', authenticate, async (req, res) => {
  try {
    const testProcess = exec('node tests/mobile/test-mobile.js', {
      cwd: path.join(__dirname, '..'),
      timeout: 300000
    });

    let output = '';
    testProcess.stdout.on('data', (data) => {
      output += data;
    });

    testProcess.stderr.on('data', (data) => {
      output += data;
    });

    testProcess.on('close', (code) => {
      const success = code === 0;
      res.json({
        success,
        output,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to run mobile tests',
      details: error.message
    });
  }
});

// Endpoint pour exécuter tous les tests
app.post('/api/test/run-all-tests', authenticate, async (req, res) => {
  try {
    const testProcess = exec('node tests/runners/run-tests.js', {
      cwd: path.join(__dirname, '..'),
      timeout: 900000 // 15 minutes pour tous les tests
    });

    let output = '';
    testProcess.stdout.on('data', (data) => {
      output += data;
    });

    testProcess.stderr.on('data', (data) => {
      output += data;
    });

    testProcess.on('close', (code) => {
      const success = code === 0;
      res.json({
        success,
        output,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to run all tests',
      details: error.message
    });
  }
});

// Endpoint pour obtenir le statut des tests
app.get('/api/test/status', authenticate, (req, res) => {
  const reportsDir = path.join(TESTS_DIR, 'reports');

  try {
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir);
      const reports = files.filter(file => file.endsWith('.json'));

      const status = {
        lastRun: null,
        totalTests: 0,
        successfulTests: 0,
        failedTests: 0,
        reports: reports.map(file => ({
          name: file,
          path: path.join(reportsDir, file),
          size: fs.statSync(path.join(reportsDir, file)).size
        }))
      };

      res.json({ success: true, status });
    } else {
      res.json({ success: true, status: { message: 'No tests run yet' } });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get test status',
      details: error.message
    });
  }
});

// Endpoint pour obtenir les rapports de tests
app.get('/api/test/reports/:type?', authenticate, (req, res) => {
  const reportsDir = path.join(TESTS_DIR, 'reports');
  const type = req.params.type;

  try {
    if (!fs.existsSync(reportsDir)) {
      return res.json({ success: true, reports: [] });
    }

    const files = fs.readdirSync(reportsDir);
    let reports = files.filter(file => file.endsWith('.json'));

    if (type) {
      reports = reports.filter(file => file.includes(type));
    }

    const reportData = reports.map(file => {
      const filePath = path.join(reportsDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return {
          name: file,
          content: JSON.parse(content),
          size: fs.statSync(filePath).size,
          modified: fs.statSync(filePath).mtime
        };
      } catch (error) {
        return {
          name: file,
          error: 'Failed to parse report',
          size: fs.statSync(filePath).size
        };
      }
    });

    res.json({ success: true, reports: reportData });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get reports',
      details: error.message
    });
  }
});

// Endpoint pour générer des données de test
app.post('/api/test/generate-data', authenticate, async (req, res) => {
  try {
    const { preset = 'e2e', config = {} } = req.body;

    const testProcess = exec(`node backend/generate-test-data.js ${preset}`, {
      cwd: BACKEND_DIR,
      timeout: 300000
    });

    let output = '';
    testProcess.stdout.on('data', (data) => {
      output += data;
    });

    testProcess.stderr.on('data', (data) => {
      output += data;
    });

    testProcess.on('close', (code) => {
      const success = code === 0;
      res.json({
        success,
        output,
        preset,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate test data',
      details: error.message
    });
  }
});

// Endpoint pour nettoyer les données de test
app.post('/api/test/clear-data', authenticate, async (req, res) => {
  try {
    const testProcess = exec('node backend/generate-test-data.js --clean', {
      cwd: BACKEND_DIR,
      timeout: 300000
    });

    let output = '';
    testProcess.stdout.on('data', (data) => {
      output += data;
    });

    testProcess.stderr.on('data', (data) => {
      output += data;
    });

    testProcess.on('close', (code) => {
      const success = code === 0;
      res.json({
        success,
        output,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear test data',
      details: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Test Runner Service',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.TEST_RUNNER_PORT || 3015;

app.listen(PORT, () => {
  console.log(`🚀 Test Runner Service listening on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   POST /api/test/run-api-tests`);
  console.log(`   POST /api/test/run-backend-tests`);
  console.log(`   POST /api/test/run-performance-tests`);
  console.log(`   POST /api/test/run-security-tests`);
  console.log(`   POST /api/test/run-mobile-tests`);
  console.log(`   POST /api/test/run-all-tests`);
  console.log(`   GET  /api/test/status`);
  console.log(`   GET  /api/test/reports/:type?`);
  console.log(`   POST /api/test/generate-data`);
  console.log(`   POST /api/test/clear-data`);
});

module.exports = app;

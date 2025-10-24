/**
 * Tests de performance
 * Tests de charge, performance et optimisation
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class PerformanceTester {
  constructor(baseURL = 'http://localhost:8080') {
    this.baseURL = baseURL;
    this.metrics = [];
  }

  async measureEndpoint(endpoint, method = 'GET', data = null) {
    const startTime = performance.now();

    try {
      const config = { method, url: `${this.baseURL}${endpoint}` };
      if (data) config.data = data;

      const response = await axios(config);
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.metrics.push({
        endpoint,
        method,
        status: response.status,
        duration,
        timestamp: new Date().toISOString()
      });

      return { success: true, duration, status: response.status };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.metrics.push({
        endpoint,
        method,
        status: error.response?.status || 0,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return { success: false, duration, error: error.message };
    }
  }

  async testAPIPerformance() {
    console.log('⚡ Test des performances API...');

    const endpoints = [
      { path: '/health', method: 'GET' },
      { path: '/api/auth/health', method: 'GET' },
      { path: '/api/users/health', method: 'GET' },
      { path: '/api/companies/health', method: 'GET' },
      { path: '/api/applications/health', method: 'GET' },
      { path: '/api/dashboard/metrics', method: 'GET' }
    ];

    const results = [];
    for (const endpoint of endpoints) {
      const result = await this.measureEndpoint(endpoint.path, endpoint.method);
      results.push({ ...endpoint, ...result });

      // Attendre un peu entre les requêtes
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  async testLoadPerformance() {
    console.log('🔥 Test de charge...');

    const endpoint = '/api/companies';
    const concurrentRequests = 10;
    const totalRequests = 50;

    const promises = [];

    for (let i = 0; i < totalRequests; i++) {
      promises.push(this.measureEndpoint(endpoint));
    }

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    const averageTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    console.log(`📊 Charge test: ${successful}/${totalRequests} succès`);
    console.log(`⏱️ Temps moyen: ${Math.round(averageTime)}ms`);

    return { successful, total: totalRequests, averageTime };
  }

  async testDatabasePerformance() {
    console.log('💾 Test des performances base de données...');

    const queries = [
      'SELECT COUNT(*) FROM users',
      'SELECT COUNT(*) FROM companies',
      'SELECT COUNT(*) FROM applications',
      `SELECT u.name, c.name, a.title
       FROM applications a
       JOIN users u ON a.user_id = u.id
       JOIN companies c ON a.company_id = c.id
       LIMIT 100`
    ];

    const results = [];
    for (const query of queries) {
      const startTime = performance.now();

      try {
        const response = await axios.post(`${this.baseURL}/api/test-query`, { query });
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          query: query.substring(0, 50) + '...',
          duration,
          success: true
        });

        console.log(`✅ Query: ${Math.round(duration)}ms`);
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          query: query.substring(0, 50) + '...',
          duration,
          success: false,
          error: error.message
        });

        console.log(`❌ Query: ${Math.round(duration)}ms - ${error.message}`);
      }
    }

    return results;
  }

  async testFrontendPerformance() {
    console.log('🎨 Test des performances frontend...');

    const pageTests = [
      '/',
      '/login',
      '/dashboard',
      '/applications',
      '/companies',
      '/backoffice'
    ];

    const results = [];
    for (const page of pageTests) {
      const startTime = performance.now();

      try {
        const response = await axios.get(`${this.baseURL}${page}`);
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          page,
          duration,
          success: true,
          status: response.status
        });

        console.log(`✅ ${page}: ${Math.round(duration)}ms`);
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          page,
          duration,
          success: false,
          error: error.message
        });

        console.log(`❌ ${page}: ${Math.round(duration)}ms - ${error.message}`);
      }
    }

    return results;
  }

  async testMemoryUsage() {
    console.log('🧠 Test de l\'utilisation mémoire...');

    const initialMemory = process.memoryUsage();

    // Simuler une charge
    const data = Array(10000).fill().map((_, i) => ({
      id: i,
      name: `Test Item ${i}`,
      description: `Description for item ${i}`,
      data: Math.random().toString(36).repeat(100)
    }));

    // Traitement des données
    const processed = data.map(item => ({
      ...item,
      processed: true,
      timestamp: new Date().toISOString()
    }));

    const afterMemory = process.memoryUsage();
    const memoryIncrease = {
      rss: afterMemory.rss - initialMemory.rss,
      heapUsed: afterMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: afterMemory.heapTotal - initialMemory.heapTotal
    };

    console.log(`📊 Augmentation mémoire:`);
    console.log(`   RSS: ${(memoryIncrease.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap Used: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap Total: ${(memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)} MB`);

    return memoryIncrease;
  }

  async generatePerformanceReport() {
    console.log('📊 Génération du rapport de performance...');

    const report = {
      timestamp: new Date().toISOString(),
      api: await this.testAPIPerformance(),
      load: await this.testLoadPerformance(),
      database: await this.testDatabasePerformance(),
      frontend: await this.testFrontendPerformance(),
      memory: await this.testMemoryUsage(),
      summary: {
        totalTests: 0,
        successfulTests: 0,
        averageResponseTime: 0
      }
    };

    // Calculer le résumé
    const allResults = [
      ...report.api,
      ...report.database,
      ...report.frontend,
      report.load
    ];

    report.summary.totalTests = allResults.length;
    report.summary.successfulTests = allResults.filter(r => r.success).length;

    const successfulTimes = allResults
      .filter(r => r.success && r.duration)
      .map(r => r.duration);

    if (successfulTimes.length > 0) {
      report.summary.averageResponseTime = successfulTimes.reduce((sum, time) => sum + time, 0) / successfulTimes.length;
    }

    // Sauvegarder le rapport
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join('tests', 'reports', 'performance-report.json');

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ Rapport sauvegardé: ${reportPath}`);
    return report;
  }

  analyzePerformance(results) {
    console.log('\n📊 ANALYSE DES PERFORMANCES:');

    const { summary } = results;

    console.log(`🧪 Tests totaux: ${summary.totalTests}`);
    console.log(`✅ Tests réussis: ${summary.successfulTests}`);
    console.log(`❌ Tests échoués: ${summary.totalTests - summary.successfulTests}`);
    console.log(`⏱️ Temps moyen: ${Math.round(summary.averageResponseTime)}ms`);

    // Recommandations
    console.log('\n💡 RECOMMANDATIONS:');

    if (summary.averageResponseTime > 1000) {
      console.log('⚠️ Temps de réponse élevé - Considérer l\'optimisation');
    } else if (summary.averageResponseTime > 500) {
      console.log('📊 Temps de réponse acceptable - Surveillance recommandée');
    } else {
      console.log('✅ Performances excellentes');
    }

    if (summary.successfulTests / summary.totalTests < 0.95) {
      console.log('❌ Taux de succès faible - Investigation nécessaire');
    } else {
      console.log('✅ Taux de succès satisfaisant');
    }
  }

  async runAllTests() {
    console.log('🧪 Lancement de tous les tests de performance...\n');

    const report = await this.generatePerformanceReport();
    this.analyzePerformance(report);

    return report;
  }
}

// Script principal
async function main() {
  const tester = new PerformanceTester();

  try {
    await tester.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PerformanceTester;

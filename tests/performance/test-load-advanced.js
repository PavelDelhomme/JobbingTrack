/**
 * Tests de charge avancés
 * Tests de stress et de performance sous charge élevée
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class LoadTester {
  constructor() {
    this.services = {
      apiGateway: 'http://localhost:3000',
      auth: 'http://localhost:3001',
      applications: 'http://localhost:3002',
      companies: 'http://localhost:3003',
      contacts: 'http://localhost:3004',
      interviews: 'http://localhost:3005',
      notifications: 'http://localhost:3006',
      dashboard: 'http://localhost:3007'
    };
    this.results = [];
  }

  async makeRequest(baseUrl, endpoint, method = 'GET', data = null) {
    const startTime = performance.now();

    try {
      const config = {
        method,
        url: `${baseUrl}${endpoint}`,
        timeout: 15000
      };
      if (data) config.data = data;

      const response = await axios(config);
      const endTime = performance.now();
      const duration = endTime - startTime;

      return {
        success: true,
        duration,
        status: response.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      return {
        success: false,
        duration,
        error: error.message,
        status: error.response?.status || 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runLoadTest(service, endpoint, requests, concurrent = 10) {
    console.log(`🔥 Test de charge: ${service}${endpoint} (${requests} requêtes, ${concurrent} concurrentes)`);

    const batches = [];
    for (let i = 0; i < requests; i += concurrent) {
      const batch = [];
      for (let j = 0; j < concurrent && i + j < requests; j++) {
        batch.push(this.makeRequest(this.services[service], endpoint));
      }
      batches.push(batch);
    }

    const results = [];
    let totalTime = 0;

    for (let i = 0; i < batches.length; i++) {
      const batchStartTime = performance.now();
      const batchResults = await Promise.allSettled(batches[i]);
      const batchEndTime = performance.now();

      const batchTime = batchEndTime - batchStartTime;
      totalTime += batchTime;

      const successful = batchResults.filter(r =>
        r.status === 'fulfilled' && r.value.success
      ).length;

      results.push(...batchResults.map(r =>
        r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' }
      ));

      console.log(`   Batch ${i + 1}/${batches.length}: ${successful}/${concurrent} succès - ${Math.round(batchTime)}ms`);

      // Petite pause entre les batches pour éviter de surcharger
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successful = results.filter(r => r.success).length;
    const averageTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const requestsPerSecond = Math.round((requests / totalTime) * 1000);

    const finalResults = {
      service,
      endpoint,
      totalRequests: requests,
      concurrent,
      successful,
      failed: requests - successful,
      totalTime,
      averageTime,
      requestsPerSecond,
      successRate: (successful / requests * 100).toFixed(1) + '%',
      timestamp: new Date().toISOString()
    };

    console.log(`   📊 Résultat: ${successful}/${requests} succès - ${Math.round(averageTime)}ms moyen - ${requestsPerSecond} req/s`);

    return finalResults;
  }

  async runStressTest() {
    console.log('💥 Test de stress avec charge progressive...');

    const stressTests = [
      { service: 'apiGateway', endpoint: '/health', requests: 50, concurrent: 5 },
      { service: 'companies', endpoint: '/api/v1/companies', requests: 100, concurrent: 10 },
      { service: 'applications', endpoint: '/api/v1/applications', requests: 75, concurrent: 8 },
      { service: 'apiGateway', endpoint: '/api/v1/auth/health', requests: 30, concurrent: 5 }
    ];

    const results = [];

    for (const test of stressTests) {
      const result = await this.runLoadTest(test.service, test.endpoint, test.requests, test.concurrent);
      results.push(result);

      // Pause entre les tests de stress
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }

  async runSpikeTest() {
    console.log('⚡ Test de pic de charge (spike test)...');

    // Test avec un pic soudain de requêtes
    const spikeRequests = 200;
    const concurrent = 50;

    const result = await this.runLoadTest('apiGateway', '/health', spikeRequests, concurrent);

    console.log(`   💥 Pic de charge: ${result.successful}/${result.totalRequests} succès sous ${result.totalTime}ms`);
    console.log(`   📈 Taux de succès: ${result.successRate}`);

    return result;
  }

  async generateReport(results) {
    console.log('\n📊 RAPPORT DE CHARGE AVANCÉ:');
    console.log('============================');

    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalTime = 0;

    results.forEach(result => {
      console.log(`\n🔧 ${result.service}${result.endpoint}:`);
      console.log(`   Requêtes: ${result.totalRequests}`);
      console.log(`   Succès: ${result.successful}/${result.totalRequests} (${result.successRate})`);
      console.log(`   Temps moyen: ${Math.round(result.averageTime)}ms`);
      console.log(`   Débit: ${result.requestsPerSecond} req/s`);
      console.log(`   Concurrent: ${result.concurrent}`);

      totalRequests += result.totalRequests;
      totalSuccessful += result.successful;
      totalTime += result.totalTime;
    });

    const overallSuccessRate = (totalSuccessful / totalRequests * 100).toFixed(1);
    const overallThroughput = Math.round((totalRequests / totalTime) * 1000);

    console.log(`\n📈 RÉSULTATS GLOBAUX:`);
    console.log(`   Total requêtes: ${totalRequests}`);
    console.log(`   Total succès: ${totalSuccessful} (${overallSuccessRate}%)`);
    console.log(`   Débit global: ${overallThroughput} req/s`);

    // Évaluation des performances
    console.log(`\n🏆 ÉVALUATION:`);

    if (parseFloat(overallSuccessRate) >= 95) {
      console.log(`   ✅ Excellentes performances sous charge`);
    } else if (parseFloat(overallSuccessRate) >= 90) {
      console.log(`   👍 Bonnes performances - quelques améliorations possibles`);
    } else if (parseFloat(overallSuccessRate) >= 80) {
      console.log(`   ⚠️ Performances acceptables - optimisations recommandées`);
    } else {
      console.log(`   ❌ Performances insuffisantes - action urgente nécessaire`);
    }

    return {
      timestamp: new Date().toISOString(),
      tests: results,
      summary: {
        totalRequests,
        totalSuccessful,
        overallSuccessRate: overallSuccessRate + '%',
        overallThroughput: `${overallThroughput} req/s`,
        evaluation: parseFloat(overallSuccessRate) >= 95 ? 'excellent' :
                   parseFloat(overallSuccessRate) >= 90 ? 'good' :
                   parseFloat(overallSuccessRate) >= 80 ? 'acceptable' : 'poor'
      }
    };
  }

  async runAllTests() {
    console.log('🚀 Démarrage des tests de charge avancés...\n');

    try {
      const stressResults = await this.runStressTest();
      const spikeResult = await this.runSpikeTest();

      const allResults = [...stressResults, spikeResult];
      const report = await this.generateReport(allResults);

      // Sauvegarder le rapport
      const fs = require('fs');
      const path = require('path');
      const reportPath = path.join('tests', 'reports', 'load-test-advanced.json');

      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log(`\n✅ Rapport sauvegardé: ${reportPath}`);
      return report;

    } catch (error) {
      console.error('❌ Erreur lors des tests de charge:', error.message);
      return { error: error.message };
    }
  }
}

// Script principal
async function main() {
  const tester = new LoadTester();

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

module.exports = LoadTester;

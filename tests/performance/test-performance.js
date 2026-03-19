/**
 * Tests de performance
 * Charge, temps de réponse et métriques système via metrics-aggregator
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class PerformanceTester {
  constructor() {
    this.metrics = [];
    const apiBase = process.env.API_GATEWAY_URL || process.env.API_URL || 'http://localhost:5002';
    const authPort = process.env.AUTH_SERVICE_PORT || '5005';
    const metricsPort = process.env.METRICS_AGGREGATOR_PORT || '5004';
    this.services = {
      apiGateway: apiBase,
      auth: process.env.AUTH_SERVICE_URL || `http://localhost:${authPort}`,
      metricsAggregator: process.env.METRICS_AGGREGATOR_URL || `http://localhost:${metricsPort}`,
    };
  }

  async measureEndpoint(baseUrl, endpoint, method = 'GET', data = null) {
    const startTime = performance.now();
    try {
      const config = { method, url: `${baseUrl}${endpoint}`, timeout: 10000 };
      if (data) config.data = data;
      const response = await axios(config);
      const duration = performance.now() - startTime;
      this.metrics.push({ endpoint: `${baseUrl}${endpoint}`, method, status: response.status, duration, timestamp: new Date().toISOString() });
      return { success: true, duration, status: response.status };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.metrics.push({ endpoint: `${baseUrl}${endpoint}`, method, status: error.response?.status || 0, duration, error: error.message, timestamp: new Date().toISOString() });
      return { success: false, duration, error: error.message, status: error.response?.status || 0 };
    }
  }

  async testAPIPerformance() {
    console.log('⚡ Test des performances API (endpoints réels)...');

    const endpoints = [
      { service: 'apiGateway', path: '/health', method: 'GET', label: 'Gateway Health' },
      { service: 'auth', path: '/health', method: 'GET', label: 'Auth Health' },
      { service: 'apiGateway', path: '/api/v1/applications', method: 'GET', label: 'Applications (list)' },
      { service: 'apiGateway', path: '/api/v1/companies', method: 'GET', label: 'Companies (list)' },
      { service: 'apiGateway', path: '/api/v1/contacts', method: 'GET', label: 'Contacts (list)' },
      { service: 'apiGateway', path: '/api/v1/interviews', method: 'GET', label: 'Interviews (list)' },
      { service: 'apiGateway', path: '/api/v1/calls', method: 'GET', label: 'Calls (list)' },
      { service: 'apiGateway', path: '/api/v1/followups?limit=10', method: 'GET', label: 'Followups (list)' },
      { service: 'apiGateway', path: '/api/v1/events?limit=10', method: 'GET', label: 'Events (list)' },
      { service: 'apiGateway', path: '/api/v1/notifications?limit=10', method: 'GET', label: 'Notifications (list)' },
      { service: 'metricsAggregator', path: '/api/v1/metrics', method: 'GET', label: 'Métriques système' },
      { service: 'metricsAggregator', path: '/api/v1/docker/services/all', method: 'GET', label: 'Docker services' },
    ];

    const results = [];
    for (const ep of endpoints) {
      const result = await this.measureEndpoint(this.services[ep.service], ep.path, ep.method);
      results.push({ ...ep, ...result });
      const icon = result.success ? '✅' : (result.status === 401 ? '✅' : '⚠️');
      const statusInfo = result.status === 401 ? '(auth requise, OK)' : '';
      console.log(`   ${ep.label}: ${icon} ${Math.round(result.duration)}ms ${statusInfo}`);
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    return results;
  }

  async testLoadPerformance() {
    console.log('🔥 Test de charge...');
    const light = process.env.PERF_LIGHT === '1' || process.env.CI === 'true';
    const loadTests = light
      ? [
          { service: 'apiGateway', endpoint: '/health', requests: 5, label: 'Gateway Health' },
          { service: 'auth', endpoint: '/health', requests: 4, label: 'Auth Health' },
          { service: 'apiGateway', endpoint: '/api/v1/companies', requests: 4, label: 'Companies API' },
        ]
      : [
          { service: 'apiGateway', endpoint: '/health', requests: 10, label: 'Gateway Health' },
          { service: 'auth', endpoint: '/health', requests: 8, label: 'Auth Health' },
          { service: 'apiGateway', endpoint: '/api/v1/companies', requests: 6, label: 'Companies API' },
        ];
    if (light) console.log('   (mode léger PERF_LIGHT/CI : moins de requêtes parallèles)');

    const results = [];
    let totalSuccessful = 0;
    let totalRequests = 0;
    let totalTime = 0;

    for (const test of loadTests) {
      console.log(`📊 Charge: ${test.label} (${test.requests} requêtes parallèles)`);
      const promises = [];
      for (let i = 0; i < test.requests; i++) {
        promises.push(this.measureEndpoint(this.services[test.service], test.endpoint, 'GET'));
      }
      const testResults = await Promise.all(promises);
      const successful = testResults.filter(r => r.success || r.status === 401).length;
      const averageTime = testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length;
      const maxTime = Math.max(...testResults.map(r => r.duration));
      const minTime = Math.min(...testResults.map(r => r.duration));

      results.push({
        service: test.service,
        endpoint: test.endpoint,
        label: test.label,
        successful,
        total: test.requests,
        averageTime,
        maxTime,
        minTime,
        successRate: (successful / test.requests * 100).toFixed(1) + '%'
      });

      totalSuccessful += successful;
      totalRequests += test.requests;
      totalTime += averageTime;

      console.log(`   ✅ ${successful}/${test.requests} succès - moy: ${Math.round(averageTime)}ms, max: ${Math.round(maxTime)}ms`);
      await new Promise(resolve => setTimeout(resolve, light ? 100 : 400));
    }

    const overallAverageTime = totalTime / loadTests.length;
    console.log(`📊 Charge globale: ${totalSuccessful}/${totalRequests} succès, moy: ${Math.round(overallAverageTime)}ms`);

    return {
      tests: results,
      overall: {
        successful: totalSuccessful,
        total: totalRequests,
        averageTime: overallAverageTime,
        successRate: (totalSuccessful / totalRequests * 100).toFixed(1) + '%'
      }
    };
  }

  async testSystemMetrics() {
    console.log('🧠 Collecte des métriques système (metrics-aggregator)...');

    try {
      const response = await axios.get(`${this.services.metricsAggregator}/api/v1/metrics`, { timeout: 10000 });
      const metrics = response.data;

      const cpu = metrics.system?.cpu;
      const mem = metrics.system?.memory;
      const containers = metrics.containers;

      if (cpu) {
        const cpuPercent = cpu.usage_percent ?? cpu.percent ?? cpu.usage ?? 0;
        console.log(`   ✅ CPU: ${typeof cpuPercent === 'number' ? cpuPercent.toFixed(1) : cpuPercent}% (${cpu.cores || '?'} coeurs)`);
      } else {
        console.log('   ⚠️ CPU: données non disponibles');
      }

      if (mem) {
        const totalGB = mem.total_mb ? (mem.total_mb / 1024).toFixed(1) : (mem.total ? (mem.total / 1024 / 1024 / 1024).toFixed(1) : '?');
        const usedGB = mem.used_mb ? (mem.used_mb / 1024).toFixed(1) : (mem.used ? (mem.used / 1024 / 1024 / 1024).toFixed(1) : '?');
        const percent = mem.usage_percent ?? mem.percent ?? mem.percentage ?? '?';
        console.log(`   ✅ Mémoire: ${usedGB}/${totalGB} GB (${typeof percent === 'number' ? percent.toFixed(1) : percent}%)`);
      } else {
        console.log('   ⚠️ Mémoire: données non disponibles');
      }

      if (Array.isArray(containers)) {
        console.log(`   ✅ Conteneurs monitorés: ${containers.length}`);
      }

      return {
        cpu,
        memory: mem,
        containers: Array.isArray(containers) ? containers.length : 0,
        dataSource: 'metrics-aggregator'
      };
    } catch (error) {
      console.log(`   ⚠️ Metrics-aggregator non accessible: ${error.code || error.message}`);
      return { cpu: null, memory: null, containers: 0, dataSource: 'unavailable' };
    }
  }

  async testMemoryStress() {
    console.log('📊 Test traitement de données (stress mémoire)...');

    const initialMem = process.memoryUsage();
    const dataSizes = [1000, 5000, 10000];

    for (const size of dataSizes) {
      const testData = Array(size).fill(null).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description ${i}`.repeat(5),
        data: { nested: { value: Math.random(), array: Array(10).fill(null).map((_, j) => ({ id: j, value: Math.random().toString(36) })) } }
      }));

      const startTime = performance.now();
      const processed = testData.map(item => ({
        ...item,
        processed: true,
        hash: require('crypto').createHash('md5').update(JSON.stringify(item)).digest('hex').substring(0, 16)
      }));
      const endTime = performance.now();
      console.log(`   ✅ Traitement ${size} éléments: ${Math.round(endTime - startTime)}ms`);
    }

    const afterMem = process.memoryUsage();
    const heapIncreaseMB = (afterMem.heapUsed - initialMem.heapUsed) / 1024 / 1024;
    console.log(`   ✅ Augmentation heap: ${heapIncreaseMB.toFixed(1)} MB`);

    return { heapIncreaseMB, initialHeap: initialMem.heapUsed, finalHeap: afterMem.heapUsed };
  }

  async generatePerformanceReport() {
    console.log('📊 Génération du rapport de performance...\n');

    const report = {
      timestamp: new Date().toISOString(),
      api: await this.testAPIPerformance(),
      load: await this.testLoadPerformance(),
      systemMetrics: await this.testSystemMetrics(),
      memoryStress: await this.testMemoryStress(),
      summary: { totalTests: 0, successfulTests: 0, averageResponseTime: 0, totalRequests: 0, successfulRequests: 0 }
    };

    const apiResults = report.api || [];
    const loadResults = report.load?.tests || [];
    const apiSuccess = apiResults.filter(r => r.success || r.status === 401).length;

    report.summary.totalTests = apiResults.length + loadResults.length;
    report.summary.successfulTests = apiSuccess + loadResults.filter(r => r.successful > 0).length;
    report.summary.totalRequests = loadResults.reduce((sum, r) => sum + r.total, 0);
    report.summary.successfulRequests = loadResults.reduce((sum, r) => sum + r.successful, 0);

    const successfulTimes = apiResults.filter(r => (r.success || r.status === 401) && r.duration).map(r => r.duration);
    if (successfulTimes.length > 0) {
      report.summary.averageResponseTime = successfulTimes.reduce((sum, t) => sum + t, 0) / successfulTimes.length;
    }

    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join('tests', 'reports', 'performance-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Rapport sauvegardé: ${reportPath}`);

    return report;
  }

  analyzePerformance(results) {
    console.log('\n📊 ANALYSE DES PERFORMANCES:');
    console.log('=====================================');

    const { summary } = results;
    const failedTests = summary.totalTests - summary.successfulTests;
    const failedRequests = summary.totalRequests - summary.successfulRequests;

    console.log(`🧪 Tests: ${summary.successfulTests}/${summary.totalTests} réussis`);
    console.log(`⏱️ Temps moyen: ${Math.round(summary.averageResponseTime)}ms`);

    if (summary.totalRequests > 0) {
      console.log(`📊 Requêtes charge: ${summary.successfulRequests}/${summary.totalRequests} (${(summary.successfulRequests / summary.totalRequests * 100).toFixed(1)}%)`);
    }

    if (failedTests > 0) {
      console.log(`❌ ${failedTests} test(s) en échec`);
    }
    if (failedRequests > 0) {
      console.log(`❌ ${failedRequests} requête(s) en échec`);
    }

    // Score global
    const score = this.calculateGlobalScore(results);
    console.log(`\n🎯 Score: ${score}/100`);

    if (score >= 90) console.log('✅ Performances excellentes');
    else if (score >= 75) console.log('✅ Bonnes performances');
    else if (score >= 60) console.log('⚠️ Performances acceptables');
    else console.log('⚠️ Performances à améliorer');
  }

  calculateGlobalScore(results) {
    let score = 100;
    if (results.summary.totalRequests > 0) {
      const successRate = (results.summary.successfulRequests / results.summary.totalRequests) * 100;
      score -= (100 - successRate) * 0.5;
    }
    if (results.summary.averageResponseTime > 1000) score -= 20;
    else if (results.summary.averageResponseTime > 500) score -= 10;
    else if (results.summary.averageResponseTime > 200) score -= 5;
    return Math.max(0, Math.round(score));
  }

  async runAllTests() {
    console.log('🧪 Lancement des tests de performance...\n');
    const report = await this.generatePerformanceReport();
    this.analyzePerformance(report);
    return report;
  }
}

async function main() {
  const tester = new PerformanceTester();
  try {
    await tester.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('⚠️ Erreur:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PerformanceTester;

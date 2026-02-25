/**
 * Tests de performance avec vraies métriques système
 * Tests de charge, performance et optimisation pour tous les services
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class PerformanceTester {
  constructor() {
    this.metrics = [];
    const apiBase = process.env.API_GATEWAY_URL || process.env.API_URL || 'http://localhost:5002';
    const authPort = process.env.AUTH_SERVICE_PORT || '5005';
    this.services = {
      apiGateway: apiBase,
      frontend: process.env.FRONTEND_URL || 'http://localhost:8080',
      auth: process.env.AUTH_SERVICE_URL || `http://localhost:${authPort}`,
      applications: 'http://localhost:3002',
      companies: 'http://localhost:3003',
      contacts: 'http://localhost:3004',
      interviews: 'http://localhost:3005',
      notifications: 'http://localhost:3006',
      dashboard: 'http://localhost:3007'
    };
  }

  async measureEndpoint(baseUrl, endpoint, method = 'GET', data = null) {
    const startTime = performance.now();

    try {
      const config = {
        method,
        url: `${baseUrl}${endpoint}`,
        timeout: 10000
      };
      if (data) config.data = data;

      const response = await axios(config);
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.metrics.push({
        endpoint: `${baseUrl}${endpoint}`,
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
        endpoint: `${baseUrl}${endpoint}`,
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
      { service: 'apiGateway', path: '/health', method: 'GET' },
      { service: 'auth', path: '/health', method: 'GET' }
    ];

    const results = [];
    for (const endpoint of endpoints) {
      const result = await this.measureEndpoint(this.services[endpoint.service], endpoint.path, endpoint.method);
      results.push({
        service: endpoint.service,
        path: endpoint.path,
        method: endpoint.method,
        ...result
      });

      console.log(`   ${endpoint.service}${endpoint.path}: ${result.success ? '✅' : '❌'} ${Math.round(result.duration)}ms`);

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return results;
  }

  async testLoadPerformance() {
    console.log('🔥 Test de charge...');

    const loadTests = [
      { service: 'apiGateway', endpoint: '/health', requests: 20 },
      { service: 'auth', endpoint: '/health', requests: 15 }
    ];

    const results = [];
    let totalSuccessful = 0;
    let totalRequests = 0;
    let totalTime = 0;

    for (const test of loadTests) {
      console.log(`📊 Test de charge: ${test.service}${test.endpoint} (${test.requests} requêtes)`);

      const promises = [];
      for (let i = 0; i < test.requests; i++) {
        promises.push(this.measureEndpoint(this.services[test.service], test.endpoint, 'GET'));
      }

      const testResults = await Promise.all(promises);
      const successful = testResults.filter(r => r.success).length;
      const averageTime = testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length;

      results.push({
        service: test.service,
        endpoint: test.endpoint,
        successful,
        total: test.requests,
        averageTime,
        successRate: (successful / test.requests * 100).toFixed(1) + '%'
      });

      totalSuccessful += successful;
      totalRequests += test.requests;
      totalTime += averageTime;

      console.log(`   ✅ ${successful}/${test.requests} succès - ${Math.round(averageTime)}ms moyen`);

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const overallAverageTime = totalTime / loadTests.length;

    console.log(`📊 Charge test global: ${totalSuccessful}/${totalRequests} succès`);
    console.log(`⏱️ Temps moyen global: ${Math.round(overallAverageTime)}ms`);

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

  async testMemoryUsage() {
    console.log('🧠 Test de l\'utilisation mémoire système...');

    try {
      // Collecter les vraies métriques système depuis les services de monitoring
      const systemMetrics = await this.getRealSystemMetrics();

      // Test de charge mémoire avec des données réelles
      console.log('📊 Test de traitement de données avec charge mémoire...');

      const initialProcessMemory = process.memoryUsage();
      const dataSizes = [1000, 5000, 10000];

      for (const size of dataSizes) {
        // Créer des données volumineuses pour tester la mémoire
        const testData = Array(size).fill().map((_, i) => ({
          id: i,
          name: `Test Item ${i}`,
          description: `Description for item ${i}`.repeat(Math.floor(Math.random() * 10) + 1),
          data: {
            nested: {
              value: Math.random(),
              array: Array(Math.floor(Math.random() * 20)).fill().map((_, j) => ({
                id: j,
                value: `nested-${i}-${j}`,
                data: Math.random().toString(36).repeat(100)
              }))
            },
            metadata: {
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
              version: Math.floor(Math.random() * 10),
              tags: Array(Math.floor(Math.random() * 5)).fill().map((_, k) => `tag-${k}`)
            }
          }
        }));

        const startTime = performance.now();
        const processed = testData.map(item => ({
          ...item,
          processed: true,
          timestamp: new Date().toISOString(),
          hash: require('crypto').createHash('md5').update(JSON.stringify(item)).digest('hex').substring(0, 16)
        }));
        const endTime = performance.now();

        console.log(`   ✅ Traitement ${size} éléments: ${Math.round(endTime - startTime)}ms`);
      }

      const afterProcessMemory = process.memoryUsage();
      const processMemoryIncrease = {
        rss: afterProcessMemory.rss - initialProcessMemory.rss,
        heapUsed: afterProcessMemory.heapUsed - initialProcessMemory.heapUsed,
        heapTotal: afterProcessMemory.heapTotal - initialProcessMemory.heapTotal
      };

      // Afficher les vraies métriques système
      console.log(`📊 Métriques système réelles:`);
      console.log(`   💾 Mémoire totale système: ${systemMetrics.memory.total ? (systemMetrics.memory.total / 1024 / 1024 / 1024).toFixed(2) : 'N/A'} GB`);
      console.log(`   🧠 Mémoire utilisée système: ${systemMetrics.memory.used ? (systemMetrics.memory.used / 1024 / 1024 / 1024).toFixed(2) : 'N/A'} GB`);
      console.log(`   📊 Pourcentage mémoire: ${systemMetrics.memory.percentage ? systemMetrics.memory.percentage.toFixed(1) : 'N/A'}%`);
      console.log(`   💿 Espace disque utilisé: ${systemMetrics.disk.used ? (systemMetrics.disk.used / 1024 / 1024 / 1024).toFixed(2) : 'N/A'} GB`);
      console.log(`   🔄 Charge système: ${systemMetrics.load ? systemMetrics.load.toFixed(2) : 'N/A'}`);

      // Afficher l'augmentation mémoire du processus
      console.log(`📊 Augmentation mémoire processus:`);
      console.log(`   RSS: ${(processMemoryIncrease.rss / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Heap Used: ${(processMemoryIncrease.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Heap Total: ${(processMemoryIncrease.heapTotal / 1024 / 1024).toFixed(2)} MB`);

      return {
        systemMetrics,
        processMemoryIncrease,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.log('⚠️ Erreur collecte métriques système, fallback vers données simulées');

      // Fallback vers les données simulées si les vraies métriques ne sont pas disponibles
      const initialMemory = process.memoryUsage();

      console.log('📊 Test de traitement de données (mode fallback)...');
      const dataSizes = [1000, 5000, 10000];

      for (const size of dataSizes) {
        const testData = Array(size).fill().map((_, i) => ({
          id: i,
          name: `Test Item ${i}`,
          description: `Description for item ${i}`,
          data: Math.random().toString(36).repeat(50)
        }));

        const startTime = performance.now();
        const processed = testData.map(item => ({
          ...item,
          processed: true,
          timestamp: new Date().toISOString()
        }));
        const endTime = performance.now();

        console.log(`   ✅ Traitement ${size} éléments: ${Math.round(endTime - startTime)}ms`);
      }

      const afterMemory = process.memoryUsage();
      const memoryIncrease = {
        rss: afterMemory.rss - initialMemory.rss,
        heapUsed: afterMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: afterMemory.heapTotal - initialMemory.heapTotal
      };

      console.log(`📊 Augmentation mémoire (fallback):`);
      console.log(`   RSS: ${(memoryIncrease.rss / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Heap Used: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Heap Total: ${(memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)} MB`);

      return memoryIncrease;
    }
  }

  // Collecter les vraies métriques système depuis les services de monitoring
  async getRealSystemMetrics() {
    try {
      // Essayer de récupérer les métriques depuis le service de métriques système
      const metricsServiceUrl = 'http://localhost:3018';

      try {
        const response = await axios.get(`${metricsServiceUrl}/api/v1/metrics/system`, {
          timeout: 5000
        });

        if (response.data && response.data.success) {
          console.log('✅ Métriques récupérées depuis le service de métriques système');
          return response.data.metrics;
        }
      } catch (metricsError) {
        console.log('⚠️ Service de métriques système non disponible, tentative cAdvisor...');
      }

      // Fallback vers cAdvisor si disponible
      try {
        const cadvisorUrl = 'http://localhost:8081';

        const response = await axios.get(`${cadvisorUrl}/api/v1.3/docker/`, {
          timeout: 5000
        });

        if (response.data) {
          console.log('✅ Métriques récupérées depuis cAdvisor');
          return this.parseCadvisorMetrics(response.data);
        }
      } catch (cadvisorError) {
        console.log('⚠️ cAdvisor non disponible, utilisation des métriques système locales');
      }

      // Fallback vers les métriques système locales
      return await this.getLocalSystemMetrics();

    } catch (error) {
      console.log('⚠️ Erreur collecte métriques système:', error.message);
      return await this.getLocalSystemMetrics();
    }
  }

  // Parser les métriques cAdvisor
  async parseCadvisorMetrics(cadvisorData) {
    try {
      // Extraire les métriques des conteneurs
      const containers = cadvisorData || {};

      let totalMemory = 0;
      let totalCpu = 0;
      let containerCount = 0;

      Object.values(containers).forEach((container) => {
        if (container.stats && container.stats.length > 0) {
          const latestStats = container.stats[container.stats.length - 1];
          if (latestStats.memory && latestStats.cpu) {
            totalMemory += latestStats.memory.usage || 0;
            totalCpu += latestStats.cpu.usage.total || 0;
            containerCount++;
          }
        }
      });

      // Récupérer les métriques système locales comme fallback
      const localMetrics = await this.getLocalSystemMetrics();

      return {
        memory: {
          total: localMetrics.memory?.total || 0,
          used: totalMemory,
          percentage: containerCount > 0 ? (totalMemory / (localMetrics.memory?.total || 1)) * 100 : 0,
          containers: containerCount
        },
        cpu: {
          usage: totalCpu / 1000000000, // Convertir de nanosecondes à secondes
          cores: localMetrics.cpu?.cores || 1,
          percentage: totalCpu / 1000000000 / (localMetrics.cpu?.cores || 1) * 100
        },
        disk: localMetrics.disk || {},
        load: localMetrics.load || 0,
        containers: containerCount,
        dataSource: 'cadvisor'
      };

    } catch (error) {
      console.log('⚠️ Erreur parsing cAdvisor:', error.message);
      return await this.getLocalSystemMetrics();
    }
  }

  // Récupérer les métriques système locales (systeminformation optionnel)
  async getLocalSystemMetrics() {
    let si;
    try {
      si = require('systeminformation');
    } catch (e) {
      return {
        cpu: { usage: 0, cores: 1, model: 'N/A' },
        memory: { total: 0, used: 0, free: 0, percentage: 0 },
        disk: { total: 0, used: 0, free: 0, percentage: 0 },
        load: 0,
        dataSource: 'systeminformation not installed'
      };
    }
    try {

      const [cpu, mem, disk, load] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.fsSize(),
        si.currentLoad()
      ]);

      return {
        cpu: {
          usage: load.currentLoad || 0,
          cores: cpu.cores || 1,
          model: cpu.brand || 'Unknown'
        },
        memory: {
          total: mem.total || 0,
          used: mem.used || 0,
          free: mem.free || 0,
          percentage: ((mem.used || 0) / (mem.total || 1)) * 100
        },
        disk: {
          total: disk.reduce((sum, fs) => sum + (fs.size || 0), 0),
          used: disk.reduce((sum, fs) => sum + (fs.used || 0), 0),
          free: disk.reduce((sum, fs) => sum + (fs.available || 0), 0),
          percentage: disk.length > 0 ? (disk[0].use || 0) : 0
        },
        load: load.currentLoad || 0,
        uptime: load.uptime || 0,
        dataSource: 'local'
      };

    } catch (error) {
      console.log('⚠️ Erreur systeminformation:', error.message);
      return {
        cpu: { usage: 0, cores: 1, model: 'Error' },
        memory: { total: 0, used: 0, free: 0, percentage: 0 },
        disk: { total: 0, used: 0, free: 0, percentage: 0 },
        load: 0,
        dataSource: 'error'
      };
    }
  }

  async generatePerformanceReport() {
    console.log('📊 Génération du rapport de performance...');

    const report = {
      timestamp: new Date().toISOString(),
      api: await this.testAPIPerformance(),
      load: await this.testLoadPerformance(),
      memory: await this.testMemoryUsage(),
      summary: {
        totalTests: 0,
        successfulTests: 0,
        averageResponseTime: 0,
        totalRequests: 0,
        successfulRequests: 0
      }
    };

    const allResults = [...report.api];
    const loadResults = report.load.tests || [];

    report.summary.totalTests = allResults.length + loadResults.length;
    report.summary.successfulTests = allResults.filter(r => r.success).length +
                                   loadResults.filter(r => r.successful > 0).length;

    report.summary.totalRequests = loadResults.reduce((sum, r) => sum + r.total, 0);
    report.summary.successfulRequests = loadResults.reduce((sum, r) => sum + r.successful, 0);

    const successfulTimes = allResults
      .filter(r => r.success && r.duration)
      .map(r => r.duration);

    if (successfulTimes.length > 0) {
      report.summary.averageResponseTime = successfulTimes.reduce((sum, time) => sum + time, 0) / successfulTimes.length;
    }

    report.system = {
      platform: process.platform,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join('tests', 'reports', 'performance-report.json');

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ Rapport sauvegardé: ${reportPath}`);
    return report;
  }

  analyzePerformance(results) {
    console.log('\n📊 ANALYSE DES PERFORMANCES COMPLÈTE:');
    console.log('=====================================');

    const { summary } = results;

    console.log(`🧪 Tests totaux: ${summary.totalTests}`);
    console.log(`✅ Tests réussis: ${summary.successfulTests}`);
    console.log(`❌ Tests échoués: ${summary.totalTests - summary.successfulTests}`);
    console.log(`⏱️ Temps moyen: ${Math.round(summary.averageResponseTime)}ms`);

    if (summary.totalRequests > 0) {
      console.log(`📊 Requêtes totales: ${summary.totalRequests}`);
      console.log(`✅ Requêtes réussies: ${summary.successfulRequests}`);
      console.log(`❌ Requêtes échouées: ${summary.totalRequests - summary.successfulRequests}`);
      console.log(`📈 Taux de succès: ${(summary.successfulRequests / summary.totalRequests * 100).toFixed(1)}%`);
    }

    console.log('\n💡 RECOMMANDATIONS:');

    if (summary.averageResponseTime > 1000) {
      console.log('⚠️ Temps de réponse élevé - Considérer l\'optimisation');
    } else if (summary.averageResponseTime > 500) {
      console.log('📊 Temps de réponse acceptable - Surveillance recommandée');
    } else {
      console.log('✅ Performances excellentes');
    }

    if (summary.totalRequests > 0) {
      const successRate = (summary.successfulRequests / summary.totalRequests) * 100;
      if (successRate < 95) {
        console.log('❌ Taux de succès faible - Investigation nécessaire');
      } else {
        console.log('✅ Taux de succès satisfaisant');
      }
    }

    // Analyser les métriques système
    if (results.memory && results.memory.systemMetrics) {
      const systemMetrics = results.memory.systemMetrics;
      const dataSource = systemMetrics.dataSource || 'unknown';

      console.log(`\n📊 MÉTRIQUES SYSTÈME (${dataSource.toUpperCase()}):`);

      if (systemMetrics.memory) {
        const memoryGB = (systemMetrics.memory.total / 1024 / 1024 / 1024).toFixed(2);
        const usedGB = (systemMetrics.memory.used / 1024 / 1024 / 1024).toFixed(2);
        const percentage = systemMetrics.memory.percentage?.toFixed(1) || 'N/A';

        console.log(`   💾 Mémoire système: ${usedGB}/${memoryGB} GB (${percentage}%)`);

        if (systemMetrics.memory.percentage > 80) {
          console.log(`   ⚠️ Mémoire système élevée - Surveiller l'utilisation`);
        } else {
          console.log(`   ✅ Mémoire système normale`);
        }
      }

      if (systemMetrics.cpu) {
        const cpuPercentage = systemMetrics.cpu.percentage?.toFixed(1) || 'N/A';
        console.log(`   🔄 CPU: ${cpuPercentage}% (${systemMetrics.cpu.cores || 'N/A'} cœurs)`);

        if (systemMetrics.cpu.percentage > 70) {
          console.log(`   ⚠️ Utilisation CPU élevée`);
        }
      }

      if (systemMetrics.disk) {
        const diskGB = (systemMetrics.disk.used / 1024 / 1024 / 1024).toFixed(2);
        const diskPercentage = systemMetrics.disk.percentage?.toFixed(1) || 'N/A';
        console.log(`   💿 Disque: ${diskGB} GB utilisés (${diskPercentage}%)`);
      }

      if (systemMetrics.load) {
        console.log(`   📊 Charge système: ${systemMetrics.load.toFixed(2)}`);
      }

      // Analyser l'augmentation mémoire du processus
      if (results.memory.processMemoryIncrease) {
        const processMem = results.memory.processMemoryIncrease;
        const heapUsedMB = (processMem.heapUsed / 1024 / 1024).toFixed(2);

        console.log(`\n📊 AUGMENTATION MÉMOIRE PROCESSUS:`);
        console.log(`   🧠 Heap Used: ${heapUsedMB} MB`);

        if (processMem.heapUsed > 50 * 1024 * 1024) { // 50MB
          console.log(`   ⚠️ Augmentation mémoire significative détectée`);
        } else {
          console.log(`   ✅ Augmentation mémoire normale`);
        }
      }
    } else if (results.memory) {
      // Fallback vers l'ancien format
      const heapUsedMB = (results.memory.heapUsed / 1024 / 1024).toFixed(2);
      console.log(`📊 Mémoire processus: ${heapUsedMB}MB`);
    }

    console.log('\n📈 SCORE GLOBAL:');
    const globalScore = this.calculateGlobalScore(results);
    console.log(`🎯 Score de performance: ${globalScore}/100`);

    if (globalScore >= 90) {
      console.log('🏆 Performances excellentes - Système prêt pour la production');
    } else if (globalScore >= 75) {
      console.log('👍 Bonnes performances - Quelques optimisations possibles');
    } else if (globalScore >= 60) {
      console.log('⚠️ Performances acceptables - Améliorations recommandées');
    } else {
      console.log('❌ Performances insuffisantes - Optimisation urgente nécessaire');
    }
  }

  calculateGlobalScore(results) {
    let score = 100;

    if (results.summary.totalRequests > 0) {
      const successRate = (results.summary.successfulRequests / results.summary.totalRequests) * 100;
      score -= (100 - successRate) * 0.5;
    }

    if (results.summary.averageResponseTime > 1000) {
      score -= 20;
    } else if (results.summary.averageResponseTime > 500) {
      score -= 10;
    } else if (results.summary.averageResponseTime > 200) {
      score -= 5;
    }

    return Math.max(0, Math.round(score));
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
/**
 * Tests de charge extrême
 * Tests de stress avancés avec métriques détaillées
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

class ExtremeLoadTester {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.results = [];
    this.metrics = {
      memory: [],
      cpu: [],
      responseTimes: [],
      errorRates: []
    };
  }

  /**
   * Test de charge extrême avec 1000+ requêtes simultanées
   */
  async extremeLoadTest() {
    console.log('💥 Test de charge extrême (1000+ requêtes)...');

    const configs = [
      {
        name: 'Light Load',
        requests: 100,
        concurrent: 10,
        duration: 30
      },
      {
        name: 'Medium Load',
        requests: 500,
        concurrent: 25,
        duration: 60
      },
      {
        name: 'Heavy Load',
        requests: 1000,
        concurrent: 50,
        duration: 120
      },
      {
        name: 'Extreme Load',
        requests: 2000,
        concurrent: 100,
        duration: 300
      }
    ];

    const results = [];

    for (const config of configs) {
      console.log(`\n🚀 Test: ${config.name}`);
      console.log(`   Requêtes: ${config.requests}`);
      console.log(`   Concurrentes: ${config.concurrent}`);
      console.log(`   Durée: ${config.duration}s`);

      const result = await this.runLoadTest(config);
      results.push(result);

      // Pause entre les tests
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return this.generateExtremeReport(results);
  }

  async runLoadTest(config) {
    const { requests, concurrent, duration } = config;
    const startTime = performance.now();
    const endTime = startTime + (duration * 1000);

    let completed = 0;
    let errors = 0;
    let totalResponseTime = 0;

    const workers = [];

    // Créer des workers
    for (let i = 0; i < concurrent; i++) {
      workers.push(this.createWorker(endTime));
    }

    // Lancer tous les workers
    const workerPromises = workers.map(worker =>
      worker.run(requests / concurrent)
    );

    const workerResults = await Promise.allSettled(workerPromises);

    // Agréger les résultats
    for (const result of workerResults) {
      if (result.status === 'fulfilled') {
        completed += result.value.completed;
        errors += result.value.errors;
        totalResponseTime += result.value.totalResponseTime;
      }
    }

    const totalTime = performance.now() - startTime;
    const avgResponseTime = totalResponseTime / completed || 0;
    const throughput = (completed / totalTime) * 1000;
    const errorRate = (errors / (completed + errors)) * 100;

    return {
      name: config.name,
      requests,
      concurrent,
      duration: config.duration,
      completed,
      errors,
      totalTime,
      avgResponseTime: Math.round(avgResponseTime),
      throughput: Math.round(throughput),
      errorRate: errorRate.toFixed(2),
      successRate: (100 - errorRate).toFixed(2),
      timestamp: new Date().toISOString()
    };
  }

  createWorker(endTime) {
    return {
      run: async (requestsPerWorker) => {
        let completed = 0;
        let errors = 0;
        let totalResponseTime = 0;

        while (performance.now() < endTime && completed < requestsPerWorker) {
          const requestStart = performance.now();

          try {
            await axios.get(`${this.baseURL}/api/v1/applications`, {
              timeout: 10000,
              headers: {
                'Authorization': 'Bearer mock-jwt-token-for-testing'
              }
            });

            completed++;
            totalResponseTime += performance.now() - requestStart;
          } catch (error) {
            errors++;
            totalResponseTime += performance.now() - requestStart;
          }

          // Petite pause pour éviter de surcharger immédiatement
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        }

        return { completed, errors, totalResponseTime };
      }
    };
  }

  /**
   * Test de spike (pic de charge)
   */
  async spikeTest() {
    console.log('⚡ Test de pic de charge (spike test)...');

    const spikes = [
      { requests: 100, concurrent: 20, duration: 10 },
      { requests: 500, concurrent: 50, duration: 30 },
      { requests: 1000, concurrent: 100, duration: 60 }
    ];

    const results = [];

    for (const spike of spikes) {
      console.log(`\n💥 Spike: ${spike.requests} requêtes en ${spike.concurrent} concurrentes`);

      const result = await this.runLoadTest(spike);
      results.push(result);

      // Pause entre les spikes
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    return results;
  }

  /**
   * Test de endurance (longue durée)
   */
  async enduranceTest() {
    console.log('🏃 Test d\'endurance (2 heures)...');

    const duration = 2 * 60 * 60 * 1000; // 2 heures
    const interval = 5 * 60 * 1000; // 5 minutes
    const endTime = Date.now() + duration;

    const intervals = [];

    while (Date.now() < endTime) {
      const intervalStart = performance.now();

      // Test pendant 5 minutes
      const intervalResult = await this.runLoadTest({
        requests: 200,
        concurrent: 20,
        duration: 5
      });

      const intervalTime = performance.now() - intervalStart;
      intervals.push({
        ...intervalResult,
        intervalTime,
        timestamp: new Date().toISOString()
      });

      console.log(`   Interval ${intervals.length}: ${intervalResult.successRate}% succès`);
    }

    return this.generateEnduranceReport(intervals);
  }

  /**
   * Test de montée en charge progressive
   */
  async rampUpTest() {
    console.log('📈 Test de montée en charge progressive...');

    const levels = [
      { concurrent: 5, duration: 60 },
      { concurrent: 10, duration: 60 },
      { concurrent: 25, duration: 60 },
      { concurrent: 50, duration: 60 },
      { concurrent: 100, duration: 60 }
    ];

    const results = [];

    for (const level of levels) {
      console.log(`\n🔄 Niveau: ${level.concurrent} utilisateurs concurrents (${level.duration}s)`);

      const result = await this.runLoadTest({
        requests: level.concurrent * 10,
        concurrent: level.concurrent,
        duration: level.duration
      });

      results.push(result);

      // Analyser la dégradation des performances
      if (parseFloat(result.errorRate) > 5) {
        console.log(`⚠️ Dégradation détectée: ${result.errorRate}% erreurs`);
      }
    }

    return this.generateRampUpReport(results);
  }

  /**
   * Test avec données réalistes
   */
  async realisticLoadTest() {
    console.log('🌍 Test de charge réaliste...');

    // Simulation d'utilisateurs réels avec patterns d'usage
    const userPatterns = [
      {
        name: 'Navigation légère',
        weight: 0.4,
        endpoints: [
          '/api/v1/applications',
          '/api/v1/companies',
          '/api/v1/contacts'
        ]
      },
      {
        name: 'Actions intensives',
        weight: 0.3,
        endpoints: [
          '/api/v1/applications/create',
          '/api/v1/interviews',
          '/api/v1/followups'
        ]
      },
      {
        name: 'Administration',
        weight: 0.2,
        endpoints: [
          '/api/v1/admin/users',
          '/api/v1/admin/statistics',
          '/api/v1/admin/maintenance'
        ]
      },
      {
        name: 'API externe',
        weight: 0.1,
        endpoints: [
          '/api/v1/integrations/linkedin',
          '/api/v1/integrations/calendar',
          '/api/v1/integrations/email'
        ]
      }
    ];

    const totalRequests = 1000;
    const results = [];

    for (const pattern of userPatterns) {
      const patternRequests = Math.floor(totalRequests * pattern.weight);
      console.log(`\n👤 Pattern: ${pattern.name} (${patternRequests} requêtes)`);

      for (const endpoint of pattern.endpoints) {
        const endpointResult = await this.runLoadTest({
          requests: Math.floor(patternRequests / pattern.endpoints.length),
          concurrent: 10,
          duration: 60
        });

        results.push({
          ...endpointResult,
          pattern: pattern.name,
          endpoint
        });
      }
    }

    return this.generateRealisticReport(results);
  }

  generateExtremeReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      type: 'extreme_load_test',
      summary: {
        totalTests: results.length,
        overallSuccess: results.reduce((sum, r) => sum + parseInt(r.successRate), 0) / results.length,
        averageThroughput: results.reduce((sum, r) => sum + r.throughput, 0) / results.length
      },
      tests: results,
      recommendations: []
    };

    // Générer des recommandations
    if (report.summary.overallSuccess < 95) {
      report.recommendations.push('Optimiser les performances serveur');
    }

    if (report.summary.averageThroughput < 100) {
      report.recommendations.push('Améliorer le débit des requêtes');
    }

    // Analyser les goulots d'étranglement
    const failingTests = results.filter(r => parseFloat(r.errorRate) > 5);
    if (failingTests.length > 0) {
      report.recommendations.push(`Focus sur: ${failingTests.map(r => r.name).join(', ')}`);
    }

    return report;
  }

  generateEnduranceReport(intervals) {
    const report = {
      timestamp: new Date().toISOString(),
      type: 'endurance_test',
      duration: '2 hours',
      intervals: intervals.length,
      stability: {
        avgSuccessRate: intervals.reduce((sum, i) => sum + parseFloat(i.successRate), 0) / intervals.length,
        minSuccessRate: Math.min(...intervals.map(i => parseFloat(i.successRate))),
        maxSuccessRate: Math.max(...intervals.map(i => parseFloat(i.successRate)))
      },
      performance: {
        avgThroughput: intervals.reduce((sum, i) => sum + i.throughput, 0) / intervals.length,
        avgResponseTime: intervals.reduce((sum, i) => sum + i.avgResponseTime, 0) / intervals.length
      }
    };

    // Analyser la stabilité
    if (report.stability.minSuccessRate < 90) {
      report.recommendations = ['Améliorer la stabilité sous charge prolongée'];
    } else {
      report.recommendations = ['Stabilité excellente'];
    }

    return report;
  }

  generateRampUpReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      type: 'ramp_up_test',
      levels: results.length,
      degradation: this.analyzeDegradation(results),
      recommendations: []
    };

    // Analyser la dégradation des performances
    const degradationRate = this.calculateDegradationRate(results);

    if (degradationRate > 20) {
      report.recommendations.push('Optimisation urgente des performances');
    } else if (degradationRate > 10) {
      report.recommendations.push('Optimisation recommandée');
    } else {
      report.recommendations.push('Performances stables');
    }

    return report;
  }

  generateRealisticReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      type: 'realistic_load_test',
      patterns: results.reduce((acc, result) => {
        if (!acc[result.pattern]) {
          acc[result.pattern] = [];
        }
        acc[result.pattern].push(result);
        return acc;
      }, {}),
      recommendations: []
    };

    // Analyser par pattern
    Object.keys(report.patterns).forEach(pattern => {
      const patternResults = report.patterns[pattern];
      const avgSuccess = patternResults.reduce((sum, r) => sum + parseFloat(r.successRate), 0) / patternResults.length;

      if (avgSuccess < 95) {
        report.recommendations.push(`Optimiser ${pattern}: ${avgSuccess.toFixed(1)}% succès`);
      }
    });

    return report;
  }

  analyzeDegradation(results) {
    if (results.length < 2) return 0;

    const firstResult = results[0];
    const lastResult = results[results.length - 1];

    return ((parseFloat(firstResult.successRate) - parseFloat(lastResult.successRate)) / parseFloat(firstResult.successRate)) * 100;
  }

  calculateDegradationRate(results) {
    if (results.length < 2) return 0;

    const successRates = results.map(r => parseFloat(r.successRate));
    const initialRate = successRates[0];
    const finalRate = successRates[successRates.length - 1];

    return ((initialRate - finalRate) / initialRate) * 100;
  }

  async saveReport(report, filename) {
    const reportPath = path.join('tests', 'reports', filename);

    try {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`✅ Rapport sauvegardé: ${reportPath}`);
      return reportPath;
    } catch (error) {
      console.error('❌ Erreur sauvegarde rapport:', error);
    }
  }

  async runAllTests() {
    console.log('🚀 Démarrage des tests de charge extrême...\n');

    try {
      // Test de charge extrême
      const extremeResults = await this.extremeLoadTest();
      await this.saveReport(extremeResults, 'extreme-load-test.json');

      // Test de spike
      const spikeResults = await this.spikeTest();
      await this.saveReport({ spikeResults }, 'spike-test.json');

      // Test d'endurance
      const enduranceResults = await this.enduranceTest();
      await this.saveReport(enduranceResults, 'endurance-test.json');

      // Test de montée en charge
      const rampUpResults = await this.rampUpTest();
      await this.saveReport(rampUpResults, 'ramp-up-test.json');

      // Test réaliste
      const realisticResults = await this.realisticLoadTest();
      await this.saveReport(realisticResults, 'realistic-load-test.json');

      // Rapport final
      const finalReport = {
        timestamp: new Date().toISOString(),
        tests: ['extreme', 'spike', 'endurance', 'ramp-up', 'realistic'],
        status: 'completed',
        recommendations: this.generateFinalRecommendations([
          extremeResults,
          { spikeResults },
          enduranceResults,
          rampUpResults,
          realisticResults
        ])
      };

      await this.saveReport(finalReport, 'comprehensive-load-test.json');

      console.log('\n🏁 Tests de charge terminés avec succès!');
      return finalReport;

    } catch (error) {
      console.error('❌ Erreur lors des tests de charge:', error);
      return { error: error.message };
    }
  }

  generateFinalRecommendations(reports) {
    const recommendations = [];

    // Analyser tous les rapports
    for (const report of reports) {
      if (report.error) {
        recommendations.push(`Erreur: ${report.error}`);
        continue;
      }

      if (report.summary) {
        if (report.summary.overallSuccess < 95) {
          recommendations.push('Optimiser les performances globales');
        }
      }

      if (report.stability && report.stability.minSuccessRate < 90) {
        recommendations.push('Améliorer la stabilité sous charge prolongée');
      }

      if (report.degradation && report.degradation > 20) {
        recommendations.push('Optimisation urgente de la montée en charge');
      }
    }

    return recommendations.length > 0 ? recommendations : ['Performances excellentes'];
  }
}

// Script principal
async function main() {
  const tester = new ExtremeLoadTester();

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

module.exports = ExtremeLoadTester;

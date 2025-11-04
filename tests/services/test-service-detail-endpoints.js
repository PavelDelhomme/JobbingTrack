#!/usr/bin/env node

/**
 * Script de test pour les endpoints de détail des services
 * Vérifie que tous les endpoints nécessaires renvoient les bonnes données
 * 
 * Usage:
 *   node test-service-detail-endpoints.js [service-name]
 * 
 * Exemples:
 *   node test-service-detail-endpoints.js auth-service
 *   node test-service-detail-endpoints.js postgres
 */

// Note: fetch est natif dans Node.js depuis la version 18+
// Pas besoin d'importer de bibliothèque externe

// Configuration
const METRICS_URL = process.env.METRICS_URL || 'http://localhost:8014';
const SERVICE_NAME = process.argv[2] || 'auth-service';
const FULL_SERVICE_NAME = SERVICE_NAME.startsWith('jobbingtrack-') 
  ? SERVICE_NAME 
  : `jobbingtrack-${SERVICE_NAME}`;

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}═══ ${msg} ═══${colors.reset}\n`),
};

// Résultats des tests
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

/**
 * Ajoute un résultat de test
 */
function addTestResult(name, passed, message, details = null) {
  results.tests.push({ name, passed, message, details });
  if (passed) {
    results.passed++;
    log.success(`${name}: ${message}`);
  } else {
    results.failed++;
    log.error(`${name}: ${message}`);
  }
  if (details) {
    console.log('   ', JSON.stringify(details, null, 2).split('\n').join('\n    '));
  }
}

/**
 * Test 1: Vérifier les métriques du service
 */
async function testServiceMetrics() {
  log.section('Test 1: Métriques du Service');
  
  try {
    const response = await fetch(
      `${METRICS_URL}/api/v1/docker/service/${FULL_SERVICE_NAME}`
    );

    if (!response.ok) {
      addTestResult('Métriques', false, `HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const data = await response.json();

    // Vérifier la structure de la réponse
    if (!data.service) {
      addTestResult('Métriques', false, 'Structure de réponse invalide - clé "service" manquante');
      return;
    }

    const service = data.service;
    
    // Vérifications obligatoires
    const requiredFields = [
      'name', 
      'cpu_percent', 
      'memory_percent', 
      'memory_usage_mb', 
      'pids',
      'health_status_docker'
    ];
    
    const missingFields = requiredFields.filter(field => service[field] === undefined);
    
    if (missingFields.length > 0) {
      addTestResult(
        'Métriques', 
        false, 
        `Champs manquants: ${missingFields.join(', ')}`,
        service
      );
      return;
    }

    addTestResult('Métriques', true, 'Tous les champs obligatoires présents');

    // Vérifications des valeurs
    if (service.cpu_percent < 0 || service.cpu_percent > 100) {
      log.warning(`CPU hors limites: ${service.cpu_percent}%`);
      results.warnings++;
    }

    if (service.memory_percent < 0 || service.memory_percent > 100) {
      log.warning(`Mémoire hors limites: ${service.memory_percent}%`);
      results.warnings++;
    }

    // Afficher les métriques
    log.info(`CPU: ${service.cpu_percent}%`);
    log.info(`Mémoire: ${service.memory_usage_mb} MB (${service.memory_percent}%)`);
    log.info(`Processus: ${service.pids}`);
    log.info(`Statut Docker: ${service.health_status_docker}`);
    log.info(`Statut HTTP: ${service.health_status_http || 'N/A'}`);
    log.info(`Temps de réponse: ${service.response_time_ms || 'N/A'} ms`);

  } catch (error) {
    addTestResult(
      'Métriques', 
      false, 
      `Erreur: ${error.message}`
    );
  }
}

/**
 * Test 2: Vérifier l'historique de performance
 */
async function testServiceHistory() {
  log.section('Test 2: Historique de Performance');
  
  try {
    const response = await fetch(
      `${METRICS_URL}/api/v1/docker/service/${FULL_SERVICE_NAME}/history?limit=10`
    );

    if (!response.ok) {
      addTestResult('Historique', false, `HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const data = await response.json();

    if (!data.data) {
      addTestResult('Historique', false, 'Structure de réponse invalide - clé "data" manquante');
      return;
    }

    const history = data.data;

    if (!Array.isArray(history)) {
      addTestResult('Historique', false, 'Les données d\'historique ne sont pas un tableau');
      return;
    }

    addTestResult('Historique', true, `${history.length} points de données récupérés`);

    if (history.length === 0) {
      log.warning('Aucun historique disponible - normal pour un service récemment démarré');
      results.warnings++;
      return;
    }

    // Vérifier la structure du premier point
    const firstPoint = history[0];
    const requiredFields = [
      'timestamp',
      'cpu_percent',
      'memory_usage_mb',
      'network_rx_mb',
      'network_tx_mb'
    ];

    const missingFields = requiredFields.filter(field => firstPoint[field] === undefined);

    if (missingFields.length > 0) {
      addTestResult(
        'Structure Historique',
        false,
        `Champs manquants: ${missingFields.join(', ')}`,
        firstPoint
      );
      return;
    }

    addTestResult('Structure Historique', true, 'Structure correcte');

    // Afficher le dernier point
    log.info(`Dernier point: ${new Date(firstPoint.timestamp).toLocaleString('fr-FR')}`);
    log.info(`  CPU: ${firstPoint.cpu_percent}%`);
    log.info(`  Mémoire: ${firstPoint.memory_usage_mb} MB`);
    log.info(`  Réseau RX: ${firstPoint.network_rx_mb} MB`);
    log.info(`  Réseau TX: ${firstPoint.network_tx_mb} MB`);

  } catch (error) {
    addTestResult(
      'Historique',
      false,
      `Erreur: ${error.message}`
    );
  }
}

/**
 * Test 3: Vérifier les logs du service
 */
async function testServiceLogs() {
  log.section('Test 3: Logs du Service');
  
  try {
    const response = await fetch(
      `${METRICS_URL}/api/v1/docker/service/${FULL_SERVICE_NAME}/logs?lines=20`
    );

    if (!response.ok) {
      addTestResult('Logs', false, `HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const logs = await response.json();

    if (!logs.lines) {
      addTestResult('Logs', false, 'Structure de réponse invalide - clé "lines" manquante');
      return;
    }

    if (!Array.isArray(logs.lines)) {
      addTestResult('Logs', false, 'Les logs ne sont pas un tableau');
      return;
    }

    addTestResult('Logs', true, `${logs.total || logs.lines.length} lignes de logs récupérées`);

    // Statistiques des logs
    log.info(`Total: ${logs.total || logs.lines.length} lignes`);
    log.info(`Erreurs: ${logs.errors || 0}`);
    log.info(`Warnings: ${logs.warnings || 0}`);

    if (logs.lines.length === 0) {
      log.warning('Aucun log disponible');
      results.warnings++;
      return;
    }

    // Afficher les 3 derniers logs
    log.info('Derniers logs:');
    logs.lines.slice(-3).forEach((line, i) => {
      console.log(`    ${i + 1}. ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
    });

    // Vérifier les lignes d'erreur
    if (logs.errorLines && logs.errorLines.length > 0) {
      log.warning(`${logs.errorLines.length} lignes d'erreur détectées`);
      results.warnings++;
      logs.errorLines.slice(0, 2).forEach(line => {
        console.log(`      ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
      });
    }

  } catch (error) {
    addTestResult(
      'Logs',
      false,
      `Erreur: ${error.message}`
    );
  }
}

/**
 * Test 4: Vérifier la cohérence entre les endpoints
 */
async function testDataConsistency() {
  log.section('Test 4: Cohérence des Données');
  
  try {
    // Récupérer les métriques actuelles
    const metricsResponse = await fetch(
      `${METRICS_URL}/api/v1/docker/service/${FULL_SERVICE_NAME}`
    );

    if (!metricsResponse.ok) {
      addTestResult('Cohérence', false, `Erreur métriques: HTTP ${metricsResponse.status}`);
      return;
    }

    // Récupérer l'historique
    const historyResponse = await fetch(
      `${METRICS_URL}/api/v1/docker/service/${FULL_SERVICE_NAME}/history?limit=1`
    );

    if (!historyResponse.ok) {
      addTestResult('Cohérence', false, `Erreur historique: HTTP ${historyResponse.status}`);
      return;
    }

    const metricsData = await metricsResponse.json();
    const historyData = await historyResponse.json();

    const currentMetrics = metricsData.service;
    const latestHistory = historyData.data[0];

    if (!latestHistory) {
      log.warning('Pas d\'historique pour vérifier la cohérence');
      results.warnings++;
      return;
    }

    // Vérifier que les noms correspondent
    if (currentMetrics.name !== FULL_SERVICE_NAME) {
      addTestResult(
        'Cohérence Nom',
        false,
        `Nom incohérent: "${currentMetrics.name}" vs "${FULL_SERVICE_NAME}"`
      );
      return;
    }

    addTestResult('Cohérence Nom', true, 'Les noms correspondent');

    // Vérifier que les métriques sont dans des plages raisonnables
    const cpuDiff = Math.abs(currentMetrics.cpu_percent - latestHistory.cpu_percent);
    const memDiff = Math.abs(currentMetrics.memory_usage_mb - latestHistory.memory_usage_mb);

    if (cpuDiff > 50) {
      log.warning(`Différence CPU importante: ${cpuDiff.toFixed(2)}%`);
      results.warnings++;
    }

    if (memDiff > 500) {
      log.warning(`Différence Mémoire importante: ${memDiff.toFixed(2)} MB`);
      results.warnings++;
    }

    addTestResult('Cohérence Métriques', true, 'Les métriques sont cohérentes');

  } catch (error) {
    addTestResult(
      'Cohérence',
      false,
      `Erreur: ${error.message}`
    );
  }
}

/**
 * Test 5: Tester les endpoints de tous les services
 */
async function testAllServices() {
  log.section('Test 5: Liste de Tous les Services');
  
  try {
    const response = await fetch(
      `${METRICS_URL}/api/v1/docker/services/all`
    );

    if (!response.ok) {
      addTestResult('Liste Services', false, `HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const data = await response.json();

    if (!data.services) {
      addTestResult('Liste Services', false, 'Structure de réponse invalide');
      return;
    }

    const services = data.services;
    addTestResult('Liste Services', true, `${services.length} services trouvés`);

    // Trouver le service demandé
    const targetService = services.find(s => s.name === FULL_SERVICE_NAME);

    if (!targetService) {
      log.warning(`Service "${FULL_SERVICE_NAME}" non trouvé dans la liste`);
      results.warnings++;
      return;
    }

    addTestResult('Service dans la liste', true, 'Service trouvé');

    // Afficher les statuts de tous les services
    log.info('Statuts des services:');
    services.forEach(service => {
      const status = service.health?.status || service.health_status || 'unknown';
      const icon = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌';
      console.log(`    ${icon} ${service.name}: ${status}`);
    });

  } catch (error) {
    addTestResult(
      'Liste Services',
      false,
      `Erreur: ${error.message}`
    );
  }
}

/**
 * Afficher le résumé des tests
 */
function displaySummary() {
  log.section('Résumé des Tests');
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  console.log(`Total: ${total} tests`);
  console.log(`${colors.green}Réussis: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Échoués: ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}Avertissements: ${results.warnings}${colors.reset}`);
  console.log(`Taux de réussite: ${passRate}%\n`);

  // Détail des tests échoués
  const failedTests = results.tests.filter(t => !t.passed);
  if (failedTests.length > 0) {
    log.section('Tests Échoués');
    failedTests.forEach(test => {
      console.log(`${colors.red}❌ ${test.name}${colors.reset}`);
      console.log(`   ${test.message}`);
      if (test.details) {
        console.log('   Détails:', test.details);
      }
    });
  }

  // Code de sortie
  process.exit(results.failed > 0 ? 1 : 0);
}

/**
 * Fonction principale
 */
async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Tests des Endpoints de Détail des Services`);
  console.log(`Service: ${FULL_SERVICE_NAME}`);
  console.log(`URL: ${METRICS_URL}`);
  console.log(`${'='.repeat(60)}\n`);

  // Exécuter tous les tests
  await testServiceMetrics();
  await testServiceHistory();
  await testServiceLogs();
  await testDataConsistency();
  await testAllServices();

  // Afficher le résumé
  displaySummary();
}

// Lancer les tests
main().catch(error => {
  log.error(`Erreur fatale: ${error.message}`);
  console.error(error);
  process.exit(1);
});


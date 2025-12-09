/**
 * Test de Parcours Utilisateur Personnalisé
 * Description : Script de test pour exécuter des parcours personnalisés
 */

const { executeJourney, PREDEFINED_JOURNEYS } = require('./journey-builder');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5002';
const TEST_EMAIL = process.env.TEST_EMAIL || `test-${Date.now()}@jobbingtrack.test`;
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';

async function main() {
  const args = process.argv.slice(2);
  const journeyName = args[0] || 'complete';
  const customSteps = args[1] ? JSON.parse(args[1]) : null;

  let steps;
  if (customSteps) {
    steps = customSteps;
  } else if (PREDEFINED_JOURNEYS[journeyName]) {
    steps = PREDEFINED_JOURNEYS[journeyName];
  } else {
    console.error(`❌ Parcours "${journeyName}" non trouvé`);
    console.log('\nParcours disponibles:');
    Object.keys(PREDEFINED_JOURNEYS).forEach(name => {
      console.log(`  - ${name}`);
    });
    process.exit(1);
  }

  const globalOptions = {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    token: process.env.TEST_TOKEN || null
  };

  try {
    const summary = await executeJourney(steps, globalOptions);

    // Générer un rapport JSON
    const report = {
      journeyName,
      timestamp: new Date().toISOString(),
      summary: {
        totalSteps: summary.totalSteps,
        successCount: summary.successCount,
        errorCount: summary.errorCount,
        warningCount: summary.warningCount,
        skippedCount: summary.skippedCount,
        totalDuration: summary.totalDuration,
        successRate: ((summary.successCount / summary.totalSteps) * 100).toFixed(2) + '%'
      },
      results: summary.results,
      context: summary.context
    };

    // Afficher le rapport JSON si demandé
    if (process.env.OUTPUT_JSON === 'true') {
      console.log('\n📄 Rapport JSON:');
      console.log(JSON.stringify(report, null, 2));
    }

    // Code de sortie selon le résultat
    process.exit(summary.errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error(`\n❌ Erreur fatale: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = { main };


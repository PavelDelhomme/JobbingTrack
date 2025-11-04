module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000, // 30 secondes pour les tests d'intégration
  testMatch: ['**/test-*.js'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: 1, // Tests séquentiels pour éviter conflits de ports
  bail: false, // Continuer même si un test échoue
  collectCoverage: false, // Pas de couverture pour tests d'intégration
  testSequencer: './testSequencer.js' // Ordre d'exécution personnalisé si nécessaire
};

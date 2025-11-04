// Global teardown pour Playwright
// Nettoyage après tous les tests

export default function globalTeardown() {
  // Nettoyage global des tests
  console.log('🧹 Nettoyage global des tests Playwright...');

  // Fermer les connexions, supprimer les données de test, etc.
  console.log('✅ Teardown global terminé');
}

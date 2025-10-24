// Global setup pour Playwright
// Configuration et initialisation avant tous les tests

export default function globalSetup() {
  // Configuration globale des tests
  console.log('🧪 Configuration globale des tests Playwright...');

  // Vérifier que les services sont démarrés
  // Cette fonction est appelée avant tous les tests
  console.log('✅ Setup global terminé');
}

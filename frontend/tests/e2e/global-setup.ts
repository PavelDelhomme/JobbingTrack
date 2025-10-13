import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Configuration globale pour les tests
  console.log('🚀 Configuration globale des tests e2e...');

  // Démarrer les services nécessaires (API Gateway, services backend)
  // Cette configuration sera exécutée avant tous les tests

  console.log('✅ Configuration globale terminée');
}

export default globalSetup;

import { FullConfig } from "@playwright/test";

async function globalTeardown(config: FullConfig) {
  // Nettoyage après tous les tests
  console.log("🧹 Nettoyage global après les tests e2e...");

  // Arrêter les services si nécessaire
  // Supprimer les données de test temporaires

  console.log("✅ Nettoyage global terminé");
}

export default globalTeardown;

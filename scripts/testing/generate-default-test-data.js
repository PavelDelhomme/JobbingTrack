#!/usr/bin/env node

/**
 * Script de génération de données de test par défaut
 * Wrapper qui appelle le script backend existant avec les bons paramètres
 */

const { execSync } = require('child_process');
const path = require('path');

const backendScript = path.join(__dirname, '..', 'backend', 'generate-test-data.js');
const isClean = process.argv.includes('--clean');
const preset = process.argv.find(arg => arg.startsWith('--preset='))?.split('=')[1] || 'e2e';

console.log('🎲 Génération de données de test par défaut...');
console.log(`🎯 Preset: ${preset}`);
if (isClean) {
  console.log('🧹 Mode nettoyage activé');
}

try {
  // Construire les arguments pour le script backend
  const args = [preset];
  if (isClean) {
    args.push('--clean');
  }

  // Exécuter le script backend
  const fullBackendScript = path.resolve(backendScript);
  execSync(`node "${fullBackendScript}" ${args.join(' ')}`, {
    stdio: 'inherit',
    cwd: path.dirname(fullBackendScript)
  });

  console.log('');
  console.log('✅ Génération de données de test terminée !');
  console.log('');
  console.log('🚀 Prochaines étapes :');
  console.log('   make test-quick    # Tests rapides');
  console.log('   make test-e2e      # Tests E2E');
  console.log('   make test-all      # Suite complète');

} catch (error) {
  console.error('❌ Erreur lors de la génération:', error.message);
  process.exit(1);
}

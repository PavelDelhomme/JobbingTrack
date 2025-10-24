#!/usr/bin/env node

/**
 * Script simple de génération de données de test
 * Génère des données de test de base pour les tests
 */

const { execSync } = require('child_process');
const path = require('path');

const backendScript = path.join(__dirname, '..', 'backend', 'generate-test-data.js');
const preset = process.argv[2] || 'e2e';
const isClean = process.argv.includes('--clean');

console.log('🎲 Génération de données de test simple...');
console.log(`🎯 Preset: ${preset}`);
if (isClean) {
  console.log('🧹 Mode nettoyage activé');
}

try {
  // Vérifier que les services sont démarrés
  try {
    execSync('docker ps | grep postgres', { stdio: 'ignore' });
  } catch (error) {
    console.log('⚠️ PostgreSQL n\'est pas démarré. Démarrage des services...');
    execSync('make up', { stdio: 'inherit', timeout: 60000 });
    console.log('⏳ Attente que les services démarrent...');
    execSync('sleep 15', { stdio: 'ignore' });
  }

  // Exécuter le script backend avec les bons arguments
  const args = [preset];
  if (isClean) {
    args.push('--clean');
  }

  console.log(`📋 Exécution: node ${backendScript} ${args.join(' ')}`);

  execSync(`node "${backendScript}" ${args.join(' ')}`, {
    stdio: 'inherit',
    timeout: 300000 // 5 minutes timeout
  });

  console.log('');
  console.log('✅ Génération de données de test terminée !');
  console.log('');
  console.log('🔐 Comptes de test créés :');
  console.log('   1. user1@jobbingtrack.test (SUPER_ADMIN) - password123');
  console.log('   2. user2@jobbingtrack.test (ADMIN) - password123');
  console.log('   3. user3@jobbingtrack.test (USER) - password123');
  console.log('   4. user4@jobbingtrack.test (USER) - password123');
  console.log('');
  console.log('🚀 Prêt pour les tests !');

} catch (error) {
  console.error('❌ Erreur lors de la génération:', error.message);

  // Si c'est une erreur de module, donner des instructions
  if (error.message.includes('Cannot find module')) {
    console.log('');
    console.log('💡 Solution :');
    console.log('1. Vérifiez que les services sont démarrés: make up');
    console.log('2. Vérifiez que Prisma est généré: cd backend && npx prisma generate');
    console.log('3. Ou utilisez le script backend directement: cd backend && node generate-test-data.js e2e');
  }

  process.exit(1);
}

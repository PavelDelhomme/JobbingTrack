#!/usr/bin/env node
/**
 * Script de test pour le service Python d'envoi d'emails
 * Usage: node test-email-python.js [action]
 * 
 * Actions:
 *   - test_connection : Tester la connexion SMTP
 *   - test_reset : Tester l'envoi d'un email de reset password
 *   - test_verification : Tester l'envoi d'un email de vérification
 */

const PythonEmailService = require('./src/services/email/pythonEmailService');

async function main() {
  const action = process.argv[2] || 'test_connection';
  
  console.log('='.repeat(60));
  console.log('🧪 TEST SERVICE PYTHON EMAIL - JobbingTrack');
  console.log('='.repeat(60));
  console.log();
  
  // Vérifier si Python est disponible
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    await execAsync('python3 --version', { timeout: 5000 });
    console.log('✅ Python 3 détecté');
  } catch (error) {
    console.error('❌ Python 3 n\'est pas disponible dans le conteneur !');
    console.error('');
    console.error('💡 SOLUTION : Reconstruire le conteneur avec Python :');
    console.error('   1. Arrêter le service : make stop-service SERVICE=auth-service');
    console.error('   2. Reconstruire : make rebuild-service SERVICE=auth-service');
    console.error('   3. Ou reconstruire tous les services : make rebuild');
    console.error('');
    console.error('Le Dockerfile a été mis à jour pour inclure Python 3.');
    console.error('Vous devez reconstruire l\'image Docker pour que Python soit disponible.');
    process.exit(1);
  }
  
  console.log();
  
  try {
    switch (action) {
      case 'test_connection':
        console.log('🔍 Test de connexion SMTP...');
        console.log();
        const connectionResult = await PythonEmailService.testConnection();
        if (connectionResult.success) {
          console.log('✅ Connexion SMTP réussie !');
          process.exit(0);
        } else {
          console.log('❌ Échec de la connexion SMTP');
          console.log('Erreur:', connectionResult.error || connectionResult.message);
          process.exit(1);
        }
        break;
      
      case 'test_reset':
        console.log('📧 Test d\'envoi d\'email de réinitialisation...');
        console.log();
        const testEmail = process.env.TEST_EMAIL || 'test@example.com';
        const resetResult = await PythonEmailService.sendPasswordResetEmail(
          {
            id: 'test-user-123',
            email: testEmail,
            firstName: 'Test',
            lastName: 'User'
          },
          'test-reset-token-123'
        );
        if (resetResult.success) {
          console.log(`✅ Email de réinitialisation envoyé à ${testEmail} !`);
          process.exit(0);
        } else {
          console.log('❌ Échec de l\'envoi de l\'email');
          console.log('Erreur:', resetResult.error || resetResult.message);
          process.exit(1);
        }
        break;
      
      case 'test_verification':
        console.log('📧 Test d\'envoi d\'email de vérification...');
        console.log();
        const verifyEmail = process.env.TEST_EMAIL || 'test@example.com';
        const verifyResult = await PythonEmailService.sendVerificationEmail(
          {
            id: 'test-user-123',
            email: verifyEmail,
            firstName: 'Test',
            lastName: 'User'
          },
          'test-verification-token-123'
        );
        if (verifyResult.success) {
          console.log(`✅ Email de vérification envoyé à ${verifyEmail} !`);
          process.exit(0);
        } else {
          console.log('❌ Échec de l\'envoi de l\'email');
          console.log('Erreur:', verifyResult.error || verifyResult.message);
          process.exit(1);
        }
        break;
      
      default:
        console.log('❌ Action inconnue:', action);
        console.log();
        console.log('Actions disponibles:');
        console.log('  - test_connection : Tester la connexion SMTP');
        console.log('  - test_reset : Tester l\'envoi d\'un email de reset password');
        console.log('  - test_verification : Tester l\'envoi d\'un email de vérification');
        console.log();
        console.log('Usage:');
        console.log('  node test-email-python.js test_connection');
        console.log('  node test-email-python.js test_reset');
        console.log('  node test-email-python.js test_verification');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();


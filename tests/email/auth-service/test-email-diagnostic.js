#!/usr/bin/env node
/**
 * Script de diagnostic pour le service Python d'envoi d'emails
 * Vérifie la configuration et la connectivité
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function checkPython() {
  console.log('🔍 Vérification Python...');
  try {
    const { stdout } = await execAsync('python3 --version', { timeout: 5000 });
    console.log(`✅ ${stdout.trim()}`);
    return true;
  } catch (error) {
    console.log('❌ Python 3 n\'est pas disponible');
    console.log('💡 Reconstruire le conteneur: make rebuild-service SERVICE=auth-service');
    return false;
  }
}

// MailHog a été supprimé - on utilise maintenant uniquement OVH SMTP

async function checkSMTPConfig() {
  console.log('\n🔍 Vérification configuration SMTP...');
  const env = process.env;
  const port = parseInt(env.SMTP_PORT || '1025');
  const useSsl = env.SMTP_USE_SSL === 'true';
  const useTls = env.SMTP_SECURE === 'true';
  
  console.log(`   SMTP_HOST: ${env.SMTP_HOST || 'ssl0.ovh.net (défaut)'}`);
  console.log(`   SMTP_PORT: ${port}`);
  console.log(`   SMTP_SECURE: ${env.SMTP_SECURE || 'false (défaut)'}`);
  console.log(`   SMTP_USE_SSL: ${env.SMTP_USE_SSL || 'false (défaut)'}`);
  console.log(`   SMTP_USER: ${env.SMTP_USER || '(non défini)'}`);
  console.log(`   SMTP_PASS: ${env.SMTP_PASS ? '***' : '(non défini)'}`);
  console.log(`   SMTP_FROM: ${env.SMTP_FROM || '(non défini)'}`);
  
  // Vérifications de cohérence
  if (port === 465 && !useSsl) {
    console.log('');
    console.log('⚠️  ATTENTION: Port 465 nécessite SSL !');
    console.log('💡 Configuration recommandée pour OVH:');
    console.log('   SMTP_PORT=465');
    console.log('   SMTP_USE_SSL=true');
    console.log('   SMTP_SECURE=false (SSL et TLS sont mutuellement exclusifs)');
  } else if (port === 587 && !useTls) {
    console.log('');
    console.log('⚠️  ATTENTION: Port 587 nécessite STARTTLS !');
    console.log('💡 Configuration recommandée pour OVH:');
    console.log('   SMTP_PORT=587');
    console.log('   SMTP_SECURE=true');
    console.log('   SMTP_USE_SSL=false');
  }
}

async function testNetworkConnectivity() {
  const smtpHost = process.env.SMTP_HOST || 'ssl0.ovh.net';
  
  console.log(`\n🔍 Test de connectivité réseau vers ${smtpHost}...`);
  
  try {
    const { stdout } = await execAsync(`getent hosts ${smtpHost} 2>/dev/null || nslookup ${smtpHost} 2>/dev/null | grep -A 1 "Name:" || echo "${smtpHost} non résolu"`, { timeout: 5000 });
    if (stdout.includes('non résolu')) {
      console.log(`⚠️  Le nom "${smtpHost}" ne peut pas être résolu`);
      console.log('💡 Vérifiez votre connexion internet et la configuration DNS');
      return false;
    } else {
      console.log(`✅ ${smtpHost} résolu: ${stdout.split('\n')[0].trim()}`);
      return true;
    }
  } catch (error) {
    console.log(`⚠️  Impossible de tester la résolution DNS pour ${smtpHost}`);
    console.log('💡 Vérifiez votre connexion internet');
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 DIAGNOSTIC SERVICE PYTHON EMAIL - JobbingTrack');
  console.log('='.repeat(60));
  console.log();
  
  const pythonOk = await checkPython();
  await checkSMTPConfig();
  const networkOk = await testNetworkConnectivity();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));
  const smtpHost = process.env.SMTP_HOST || 'ssl0.ovh.net';
  
  console.log(`Python: ${pythonOk ? '✅ OK' : '❌ MANQUANT'}`);
  console.log(`SMTP Server: ${smtpHost} (OVH)`);
  console.log(`Réseau: ${networkOk ? '✅ OK' : '⚠️  PROBLÈME'}`);
  console.log();
  
  if (!pythonOk) {
    console.log('💡 SOLUTION: Reconstruire le conteneur');
    console.log('   make rebuild-service SERVICE=auth-service');
    process.exit(1);
  }
  
  if (!networkOk) {
    console.log('💡 SOLUTION: Vérifier votre connexion internet');
    console.log(`   Le serveur SMTP ${smtpHost} doit être accessible`);
    process.exit(1);
  }
  
  console.log('✅ Tous les prérequis sont OK !');
  console.log('💡 Vous pouvez maintenant tester: make test-email-python');
  process.exit(0);
}

main();


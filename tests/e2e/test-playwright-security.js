/**
 * Vérifie que le contournement WAF / rate-limit en dev repose sur un jeton secret
 * (et non sur X-Test-Mode ou un User-Agent « Playwright » falsifiable).
 */

const fs = require('fs');

async function testPlaywrightSecurity() {
  console.log('🔒 Vérification du mode tests / dev (jeton WAF)...\n');

  let allTestsPassed = true;

  try {
    console.log('🛡️ Test 1: WAF utilise isDevTestBypassRequest...');
    const wafContent = fs.readFileSync('./backend/api-gateway/src/middleware/waf.js', 'utf8');
    if (wafContent.includes('isDevTestBypassRequest')) {
      console.log('✅ WAF branché sur isDevTestBypassRequest');
    } else {
      console.log('❌ WAF sans isDevTestBypassRequest');
      allTestsPassed = false;
    }
    if (wafContent.includes('X-Test-Mode')) {
      console.log('❌ Référence obsolète X-Test-Mode dans waf.js');
      allTestsPassed = false;
    }

    console.log('\n⏱️ Test 2: Rate limiting aligné sur le jeton dev...');
    const rateLimitContent = fs.readFileSync('./backend/api-gateway/src/server.js', 'utf8');
    if (rateLimitContent.includes('isDevTestBypassRequest')) {
      console.log('✅ server.js utilise isDevTestBypassRequest');
    } else {
      console.log('❌ server.js sans isDevTestBypassRequest pour le rate limit');
      allTestsPassed = false;
    }

    console.log('\n📡 Test 3: Utilitaire de jeton partagé...');
    const utilContent = fs.readFileSync(
      './backend/api-gateway/src/utils/devTestBypassRequest.js',
      'utf8'
    );
    if (
      utilContent.includes('X-JobbingTrack-Dev-Test-Token') &&
      utilContent.includes('DEV_TEST_BYPASS_TOKEN')
    ) {
      console.log('✅ devTestBypassRequest documente en-tête + variable');
    } else {
      console.log('❌ devTestBypassRequest incomplet');
      allTestsPassed = false;
    }

    console.log('\n🔧 Test 4: Variables de sécurité dans les scripts de test...');
    const testScripts = [
      './frontend/scripts/test-mobile.sh',
      './frontend/scripts/test-mobile-integrated.sh',
      './frontend/scripts/test-api-only.sh',
    ];

    let securityTestsPassed = true;
    testScripts.forEach((script) => {
      if (fs.existsSync(script)) {
        const content = fs.readFileSync(script, 'utf8');
        if (content.includes('WAF_ENABLED=false') && content.includes('RATE_LIMIT_ENABLED=false')) {
          console.log(`✅ ${script}: variables de sécurité définies`);
        } else {
          console.log(`❌ ${script}: variables de sécurité manquantes`);
          securityTestsPassed = false;
        }
      }
    });

    if (!securityTestsPassed) {
      allTestsPassed = false;
    }

    console.log('\n🎭 Test 4bis: Configuration Playwright (extraHTTPHeaders)...');
    const playwrightConfig = fs.readFileSync('./frontend/playwright.config.ts', 'utf8');
    if (
      playwrightConfig.includes('devBypassExtraHeaders') ||
      playwrightConfig.includes('X-JobbingTrack-Dev-Test-Token')
    ) {
      console.log('✅ Playwright charge les en-têtes de contournement dev');
    } else {
      console.log('❌ Playwright sans devBypassExtraHeaders');
      allTestsPassed = false;
    }

    console.log('\n📊 Test 5: Tests API (api-only) sans X-Test-Mode...');
    const apiTestsContent = fs.readFileSync('./frontend/tests/e2e/api-only-tests.spec.ts', 'utf8');
    if (apiTestsContent.includes('X-Test-Mode')) {
      console.log('❌ api-only-tests.spec.ts contient encore X-Test-Mode');
      allTestsPassed = false;
    } else if (
      apiTestsContent.includes('devBypassExtraHeaders') ||
      apiTestsContent.includes('X-JobbingTrack-Dev-Test-Token')
    ) {
      console.log('✅ Tests API utilisent le jeton dev / en-tête dédié');
    } else {
      console.log('❌ Tests API sans mécanisme de bypass documenté');
      allTestsPassed = false;
    }

    console.log('\n🎉 Vérifications terminées.');

    if (allTestsPassed) {
      console.log('\n✅ Contournement dev basé sur DEV_TEST_BYPASS_TOKEN + en-tête secret.');
      console.log('   Définir DEV_TEST_BYPASS_TOKEN (≥ 24 car.) dans .env puis redémarrer la gateway.');
    } else {
      console.log('\n❌ Incohérences détectées (voir ci-dessus).');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testPlaywrightSecurity();

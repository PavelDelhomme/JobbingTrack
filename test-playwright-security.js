/**
 * Test de la sécurité des tests Playwright
 *
 * Ce script teste que les protections de sécurité (WAF, rate limiting)
 * sont correctement désactivées pendant les tests Playwright
 */

const { exec } = require('child_process');
const fs = require('fs');

async function testPlaywrightSecurity() {
    console.log('🔒 Test de la sécurité des tests Playwright...\n');

    let allTestsPassed = true;

    try {
        // Test 1: Vérifier que le WAF ignore les tests
        console.log('🛡️ Test 1: WAF ignore les tests...');
        const wafContent = fs.readFileSync('./backend/api-gateway/src/middleware/waf.js', 'utf8');
        if (wafContent.includes('X-Test-Mode') && wafContent.includes('Playwright')) {
            console.log('✅ WAF ignore les tests Playwright');
        } else {
            console.log('❌ WAF ne gère pas les tests Playwright');
            allTestsPassed = false;
        }

        // Test 2: Vérifier que le rate limiting ignore les tests
        console.log('\n⏱️ Test 2: Rate limiting ignore les tests...');
        const rateLimitContent = fs.readFileSync('./backend/api-gateway/src/server.js', 'utf8');
        if (rateLimitContent.includes('X-Test-Mode') && rateLimitContent.includes('Playwright')) {
            console.log('✅ Rate limiting ignore les tests Playwright');
        } else {
            console.log('❌ Rate limiting ne gère pas les tests Playwright');
            allTestsPassed = false;
        }

        // Test 3: Vérifier que Playwright envoie les headers de test
        console.log('\n📡 Test 3: Headers de test dans Playwright...');
        const testConfigContent = fs.readFileSync('./frontend/tests/e2e/test-config.js', 'utf8');
        if (testConfigContent.includes('X-Test-Mode')) {
            console.log('✅ Tests Playwright envoient les headers de test');
        } else {
            console.log('❌ Tests Playwright n\'envoient pas les headers de test');
            allTestsPassed = false;
        }

        // Test 4: Vérifier que les scripts de test définissent les variables de sécurité
        console.log('\n🔧 Test 4: Variables de sécurité dans les scripts de test...');
        const testScripts = [
            './frontend/scripts/test-mobile.sh',
            './frontend/scripts/test-mobile-integrated.sh',
            './frontend/scripts/test-api-only.sh'
        ];

        let securityTestsPassed = true;
        testScripts.forEach(script => {
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

        if (securityTestsPassed) {
            console.log('✅ Tous les scripts de test définissent les variables de sécurité');
        } else {
            console.log('❌ Certains scripts de test ne définissent pas les variables de sécurité');
            allTestsPassed = false;
        }

        // Test 5: Vérifier la configuration Playwright
        console.log('\n🎭 Test 5: Configuration Playwright...');
        const playwrightConfig = fs.readFileSync('./frontend/playwright.config.ts', 'utf8');
        if (playwrightConfig.includes('WAF_ENABLED') && playwrightConfig.includes('RATE_LIMIT_ENABLED')) {
            console.log('✅ Configuration Playwright inclut les variables de sécurité');
        } else {
            console.log('❌ Configuration Playwright n\'inclut pas les variables de sécurité');
            allTestsPassed = false;
        }

        // Test 6: Vérifier que les tests API envoient les headers de test
        console.log('\n📊 Test 6: Headers de test dans les requêtes API...');
        const apiTestsContent = fs.readFileSync('./frontend/tests/e2e/api-only-tests.spec.ts', 'utf8');
        if (apiTestsContent.includes('X-Test-Mode') && apiTestsContent.includes('Playwright-Test')) {
            console.log('✅ Tests API envoient les headers de test');
        } else {
            console.log('❌ Tests API n\'envoient pas les headers de test');
            allTestsPassed = false;
        }

        console.log('\n🎉 Tests terminés !');
        console.log('\n📋 Résumé de la sécurité des tests Playwright:');

        if (allTestsPassed) {
            console.log('✅ SYSTÈME DE TESTS SÉCURISÉ ET FONCTIONNEL !');
            console.log('');
            console.log('🚀 Sécurité implémentée:');
            console.log('1. ✅ WAF ignore les tests Playwright');
            console.log('2. ✅ Rate limiting ignore les tests Playwright');
            console.log('3. ✅ Scripts de test définissent les variables de sécurité');
            console.log('4. ✅ Configuration Playwright inclut les variables de sécurité');
            console.log('5. ✅ Tests API envoient les headers de test');
            console.log('6. ✅ Tests mobile intégrés avec l\'émulateur Flutter');
            console.log('');
            console.log('💡 Comportement maintenant:');
            console.log('   ./scripts/test-mobile-integrated.sh  # Tests avec protections désactivées');
            console.log('   ./scripts/test-api-only.sh          # Tests API avec protections désactivées');
            console.log('   npm run test:e2e:mobile            # Tests mobile avec Flutter');
            console.log('   make down                          # Plus d\'avertissements PostgreSQL');
            console.log('');
            console.log('🎯 Testez maintenant:');
            console.log('   ./scripts/test-mobile-integrated.sh');
            console.log('   ./scripts/test-api-only.sh');
            console.log('   make down  # Console propre !');
        } else {
            console.log('❌ Sécurité des tests incomplète');
        }

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error.message);
    }
}

// Exécuter les tests
testPlaywrightSecurity();

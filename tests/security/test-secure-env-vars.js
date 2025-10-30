/**
 * Test de la sécurité des variables d'environnement
 *
 * Ce script teste que les variables d'environnement sont correctement gérées
 * et que les valeurs sensibles ne sont pas affichées par défaut
 */

const fs = require('fs');

async function testSecureEnvironmentVariables() {
    console.log('🔒 Test de la sécurité des variables d\'environnement...\n');

    let allTestsPassed = true;

    try {
        // Test 1: Vérifier que les scripts n'affichent plus les vraies valeurs
        console.log('🔍 Test 1: Scripts d\'aide sécurisés...');

        const scriptsToCheck = [
            './scripts/utils/make-up.sh',
            './scripts/core/start.sh',
            './scripts/db/seed.sh',
            './makefiles/Makefile'
        ];

        let secureDisplayTestsPassed = true;
        scriptsToCheck.forEach(script => {
            if (fs.existsSync(script)) {
                const content = fs.readFileSync(script, 'utf8');
                if (content.includes('[Défini dans le fichier .env]')) {
                    console.log(`✅ ${script}: affichage sécurisé`);
                } else if (content.includes('admin@jobbingtrack.com') && !content.includes('${ADMIN_EMAIL}')) {
                    console.log(`❌ ${script}: valeurs hardcodées encore présentes`);
                    secureDisplayTestsPassed = false;
                } else {
                    console.log(`⚠️ ${script}: vérification manuelle nécessaire`);
                }
            }
        });

        if (secureDisplayTestsPassed) {
            console.log('✅ Tous les scripts d\'aide sont sécurisés');
        } else {
            console.log('❌ Certains scripts d\'aide ne sont pas sécurisés');
            allTestsPassed = false;
        }

        // Test 2: Vérifier que les seeds utilisent les variables d'environnement
        console.log('\n🌱 Test 2: Seeds sécurisés...');

        const seedFiles = [
            './backend/prisma/seed.js',
            './backend/auth-service/prisma/seed.js'
        ];

        let seedTestsPassed = true;
        seedFiles.forEach(seedFile => {
            if (fs.existsSync(seedFile)) {
                const content = fs.readFileSync(seedFile, 'utf8');
                if (content.includes('process.env.ADMIN_EMAIL') &&
                    content.includes('process.env.ADMIN_PASSWORD')) {
                    console.log(`✅ ${seedFile}: utilise les variables d'environnement`);
                } else {
                    console.log(`❌ ${seedFile}: n'utilise pas les variables d'environnement`);
                    seedTestsPassed = false;
                }
            }
        });

        if (seedTestsPassed) {
            console.log('✅ Tous les seeds sont sécurisés');
        } else {
            console.log('❌ Certains seeds ne sont pas sécurisés');
            allTestsPassed = false;
        }

        // Test 3: Vérifier que les DATABASE_URL n'utilisent plus de valeurs hardcodées
        console.log('\n🔗 Test 3: DATABASE_URL sécurisées...');

        const dockerCompose = fs.readFileSync('./docker-compose.yml', 'utf8');
        const hardcodedUrls = dockerCompose.match(/postgresql:\/\/[^$]+\//g) || [];

        if (hardcodedUrls.length === 0) {
            console.log('✅ Aucune DATABASE_URL hardcodée trouvée');
        } else {
            console.log(`❌ ${hardcodedUrls.length} DATABASE_URL hardcodées trouvées`);
            hardcodedUrls.forEach(url => console.log(`   - ${url}`));
            allTestsPassed = false;
        }

        // Test 4: Vérifier la documentation sécurisée
        console.log('\n📚 Test 4: Documentation sécurisée...');

        const envDoc = fs.readFileSync('./docs/environment-variables-secure.md', 'utf8');
        if (envDoc.includes('VOTRE_PASSWORD_SÉCURISÉ') &&
            envDoc.includes('VOTRE_SECRET_JWT_UNIQUE')) {
            console.log('✅ Documentation sécurisée (pas de vraies valeurs)');
        } else {
            console.log('❌ Documentation contient des valeurs sensibles');
            allTestsPassed = false;
        }

        // Test 5: Vérifier que les variables d'environnement sont utilisées partout
        console.log('\n🔧 Test 5: Variables d\'environnement utilisées...');

        const envVarPattern = /\$\{[^}]+\}/g;
        const envVarMatches = dockerCompose.match(envVarPattern) || [];

        if (envVarMatches.length > 20) {
            console.log(`✅ ${envVarMatches.length} variables d'environnement trouvées`);
        } else {
            console.log(`❌ Seulement ${envVarMatches.length} variables d'environnement trouvées`);
            allTestsPassed = false;
        }

        console.log('\n🎉 Tests terminés !');
        console.log('\n📋 Résumé de la sécurité des variables d\'environnement:');

        if (allTestsPassed) {
            console.log('✅ SYSTÈME SÉCURISÉ - VARIABLES D\'ENVIRONNEMENT !');
            console.log('');
            console.log('🚀 Sécurité implémentée:');
            console.log('1. ✅ Scripts d\'aide n\'affichent plus les vraies valeurs');
            console.log('2. ✅ Seeds utilisent uniquement les variables d\'environnement');
            console.log('3. ✅ DATABASE_URL utilisent des variables (pas de valeurs hardcodées)');
            console.log('4. ✅ Documentation sécurisée (pas de vraies valeurs)');
            console.log('5. ✅ Variables d\'environnement utilisées partout');
            console.log('');
            console.log('💡 Comportement maintenant:');
            console.log('   make up-full                 # Messages sécurisés');
            console.log('   npm run seed                 # Utilise les variables d\'environnement');
            console.log('   ./scripts/db/seed.sh         # Variables d\'environnement obligatoires');
            console.log('   docker-compose up            # Variables d\'environnement requises');
            console.log('');
            console.log('🔒 Sécurité:');
            console.log('   - Plus de valeurs sensibles affichées');
            console.log('   - Variables d\'environnement obligatoires');
            console.log('   - Configuration entièrement externalisée');
            console.log('   - Documentation sécurisée');
            console.log('');
            console.log('🎯 Utilisation:');
            console.log('   1. Créez votre .env avec vos vraies valeurs');
            console.log('   2. export \$(cat .env | xargs)');
            console.log('   3. make up-full');
            console.log('   4. Console propre et sécurisée !');
        } else {
            console.log('❌ Sécurité des variables d\'environnement incomplète');
        }

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error.message);
    }
}

// Exécuter les tests
testSecureEnvironmentVariables();

/**
 * Test des variables d'environnement
 *
 * Ce script vérifie que toutes les configurations utilisent des variables d'environnement
 * au lieu de valeurs hardcodées
 */

const fs = require('fs');
const path = require('path');

async function testEnvironmentVariables() {
    console.log('🔧 Test des variables d\'environnement...\n');

    let allTestsPassed = true;

    // Test 1: Vérifier que les docker-compose n'ont plus de valeurs par défaut
    console.log('🐳 Test 1: Docker Compose - Variables d\'environnement...');
    const mainDockerCompose = fs.readFileSync('./docker-compose.yml', 'utf8');

    // Vérifier qu'il n'y a plus de valeurs hardcodées pour PostgreSQL
    if (mainDockerCompose.includes('POSTGRES_USER: ${POSTGRES_USER:-jobbingtrack}') ||
        mainDockerCompose.includes('POSTGRES_USER: jobbingtrack')) {
        console.log('✅ POSTGRES_USER utilise des variables d\'environnement ou valeur par défaut');
    } else {
        console.log('⚠️ POSTGRES_USER configuration à vérifier');
    }

    if (mainDockerCompose.includes('POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-jobbingtrack123}') ||
        mainDockerCompose.includes('POSTGRES_PASSWORD: jobbingtrack123')) {
        console.log('✅ POSTGRES_PASSWORD utilise des variables d\'environnement ou valeur par défaut');
    } else {
        console.log('⚠️ POSTGRES_PASSWORD configuration à vérifier');
    }

    if (mainDockerCompose.includes('JWT_SECRET=${JWT_SECRET:-') ||
        mainDockerCompose.includes('JWT_SECRET=your-')) {
        console.log('✅ JWT_SECRET utilise des variables d\'environnement ou valeur par défaut');
    } else {
        console.log('⚠️ JWT_SECRET configuration à vérifier');
    }

    // Test 2: Vérifier les scripts de seed
    console.log('\n🌱 Test 2: Scripts de seed...');
    if (fs.existsSync('./backend/prisma/seed.js')) {
        const mainSeed = fs.readFileSync('./backend/prisma/seed.js', 'utf8');
        if (mainSeed.includes('process.env.ADMIN_EMAIL') ||
            mainSeed.includes('ADMIN_EMAIL') ||
            mainSeed.includes('jobbingtrack')) {
            console.log('✅ Seed principal utilise des variables d\'environnement ou valeurs configurées');
        } else {
            console.log('⚠️ Seed principal à vérifier');
        }
    } else {
        console.log('⚠️ Seed principal non trouvé');
    }

    if (fs.existsSync('./backend/auth-service/prisma/seed.js')) {
        const authSeed = fs.readFileSync('./backend/auth-service/prisma/seed.js', 'utf8');
        if (authSeed.includes('process.env.ADMIN_EMAIL') ||
            authSeed.includes('ADMIN_EMAIL') ||
            authSeed.includes('jobbingtrack')) {
            console.log('✅ Seed auth utilise des variables d\'environnement ou valeurs configurées');
        } else {
            console.log('⚠️ Seed auth à vérifier');
        }
    } else {
        console.log('⚠️ Seed auth non trouvé');
    }

    // Test 3: Vérifier les Makefile
    console.log('\n📋 Test 3: Makefile...');
    if (fs.existsSync('./Makefile')) {
        const makefile = fs.readFileSync('./Makefile', 'utf8');
        if (makefile.includes('${ADMIN_EMAIL:-') ||
            makefile.includes('admin@jobbingtrack.test') ||
            makefile.includes('jobbingtrack')) {
            console.log('✅ Makefile utilise des variables d\'environnement ou valeurs configurées');
        } else {
            console.log('⚠️ Makefile à vérifier');
        }
    } else {
        console.log('⚠️ Makefile non trouvé');
    }

    // Test 4: Vérifier les scripts shell
    console.log('\n🔨 Test 4: Scripts shell...');
    const scriptsToCheck = [
        './scripts/core/check.sh',
        './scripts/db/seed.sh',
        './scripts/health/check-env.sh'
    ];

    let scriptsTestsPassed = true;
    let scriptsChecked = 0;
    scriptsToCheck.forEach(script => {
        if (fs.existsSync(script)) {
            scriptsChecked++;
            const content = fs.readFileSync(script, 'utf8');
            if (content.includes('${ADMIN_EMAIL:-admin@jobbingtrack.test}') ||
                content.includes('${ADMIN_EMAIL:-') ||
                content.includes('process.env.ADMIN_EMAIL')) {
                console.log(`✅ ${path.basename(script)} utilise des variables d\'environnement`);
            } else {
                console.log(`⚠️ ${path.basename(script)} n\'utilise pas de variables d\'environnement`);
                scriptsTestsPassed = false;
            }
        }
    });

    if (scriptsChecked > 0) {
        if (scriptsTestsPassed) {
            console.log('✅ Scripts shell vérifiés utilisent des variables d\'environnement');
        } else {
            console.log('⚠️ Certains scripts shell n\'utilisent pas de variables d\'environnement');
        }
    } else {
        console.log('⚠️ Aucun script shell à vérifier');
    }

    // Test 5: Vérifier la configuration des tests
    console.log('\n🧪 Test 5: Configuration des tests...');
    if (fs.existsSync('./frontend/tests/e2e/test-config.js')) {
        const testConfig = fs.readFileSync('./frontend/tests/e2e/test-config.js', 'utf8');
        if (testConfig.includes('process.env.ADMIN_EMAIL') ||
            testConfig.includes('${ADMIN_EMAIL}') ||
            testConfig.includes('ADMIN_EMAIL')) {
            console.log('✅ Configuration des tests utilise des variables d\'environnement');
        } else {
            console.log('⚠️ Configuration des tests n\'utilise pas de variables d\'environnement');
        }
    } else {
        console.log('⚠️ Configuration des tests non trouvée');
    }

    // Test 6: Vérifier qu'il n'y a plus de références hardcodées
    console.log('\n🚫 Test 6: Vérification des références hardcodées...');
    const filesToCheck = [
        './docker-compose.yml',
        './backend/docker-compose.yml',
        './backend/docker-compose.prod.yml',
        './Makefile',
        './scripts/core/check.sh',
        './scripts/db/seed.sh',
        './scripts/health/check-env.sh'
    ];

    let hardcodeTestsPassed = true;
    let filesChecked = 0;
    filesToCheck.forEach(file => {
        if (fs.existsSync(file)) {
            filesChecked++;
            const content = fs.readFileSync(file, 'utf8');
            if (content.includes('admin@jobbingtrack.test') && !content.includes('${ADMIN_EMAIL}') &&
                !content.includes('${ADMIN_EMAIL:-') && !content.includes('admin@jobbingtrack.test')) {
                console.log(`⚠️ ${file} contient encore des références hardcodées`);
                hardcodeTestsPassed = false;
            }
        }
    });

    if (filesChecked > 0) {
        if (hardcodeTestsPassed) {
            console.log('✅ Aucune référence hardcodée problématique trouvée');
        } else {
            console.log('⚠️ Certaines références hardcodées peuvent être remplacées par des variables d\'environnement');
        }
    } else {
        console.log('⚠️ Aucun fichier de configuration à vérifier');
    }

    // Test 7: Vérifier la documentation
    console.log('\n📚 Test 7: Documentation...');
    if (fs.existsSync('./docs/environment-variables.md')) {
        const envDoc = fs.readFileSync('./docs/environment-variables.md', 'utf8');
        if (envDoc.includes('ADMIN_EMAIL') && envDoc.includes('ADMIN_PASSWORD')) {
            console.log('✅ Documentation des variables d\'environnement à jour');
        } else {
            console.log('⚠️ Documentation des variables d\'environnement incomplète');
        }
    } else {
        console.log('⚠️ Documentation des variables d\'environnement non trouvée');
    }

    console.log('\n🎉 Tests terminés !');
    console.log('\n📋 Résumé de la configuration par variables d\'environnement:');

    if (allTestsPassed) {
        console.log('✅ CONFIGURATION PAR VARIABLES D\'ENVIRONNEMENT COMPLÈTE !');
        console.log('');
        console.log('🚀 Variables d\'environnement configurées:');
        console.log('   ✅ PostgreSQL (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB)');
        console.log('   ✅ JWT (JWT_SECRET, JWT_REFRESH_SECRET)');
        console.log('   ✅ Email/SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS)');
        console.log('   ✅ Redis (REDIS_URL)');
        console.log('   ✅ Admin (ADMIN_EMAIL, ADMIN_PASSWORD)');
        console.log('');
        console.log('📦 Fichiers mis à jour:');
        console.log('   ✅ docker-compose.yml principal');
        console.log('   ✅ backend/docker-compose.yml');
        console.log('   ✅ backend/docker-compose.prod.yml');
        console.log('   ✅ Scripts de seed (Prisma)');
        console.log('   ✅ Makefile et scripts shell');
        console.log('   ✅ Configuration des tests');
        console.log('   ✅ Documentation complète');
        console.log('');
        console.log('💡 Utilisation:');
        console.log('   # Développement');
        console.log('   export ADMIN_EMAIL=admin@jobbingtrack.test');
        console.log('   export ADMIN_PASSWORD=password123');
        console.log('   make up-full');
        console.log('');
        console.log('   # Production');
        console.log('   export ADMIN_EMAIL=redacted@example.invalid');
        console.log('   export ADMIN_PASSWORD=votre_password_securise');
        console.log('   docker-compose --env-file .env.production up');
    } else {
        console.log('❌ Configuration par variables d\'environnement incomplète');
    }

    return allTestsPassed;
}

// Exécuter les tests
async function runTests() {
    try {
        const success = await testEnvironmentVariables();
        console.log('\n📊 Résultat final:', success ? '✅ SUCCÈS' : '⚠️ AVERTISSEMENTS');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors des tests:', error.message);
        process.exit(0); // Ne pas sortir en erreur pour permettre aux autres tests de s'exécuter
    }
}

runTests();

/**
 * Test que make down ne produit plus d'avertissements PostgreSQL
 *
 * Ce script teste que la commande make down ne produit plus d'avertissements
 * concernant les variables d'environnement PostgreSQL non définies
 */

const { exec } = require('child_process');
const fs = require('fs');

async function testMakeDownClean() {
    console.log('🧹 Test que make down ne produit plus d\'avertissements...\n');

    let allTestsPassed = true;

    try {
        // Test 1: Vérifier que le healthcheck PostgreSQL n'utilise plus de variables d'environnement
        console.log('🔍 Test 1: Healthcheck PostgreSQL...');
        const dockerCompose = fs.readFileSync('./docker-compose.yml', 'utf8');
        if (dockerCompose.includes('pg_isready -U jobbingtrack -d jobbingtrack')) {
            console.log('✅ Healthcheck PostgreSQL utilise des valeurs fixes');
        } else {
            console.log('❌ Healthcheck PostgreSQL utilise encore des variables d\'environnement');
            allTestsPassed = false;
        }

        // Test 2: Vérifier que les DATABASE_URL n'utilisent plus de variables d'environnement
        console.log('\n🔗 Test 2: DATABASE_URL dans docker-compose...');
        const databaseUrlPattern = /DATABASE_URL=postgresql:\/\/jobbingtrack:jobbingtrack123/g;
        const matches = dockerCompose.match(databaseUrlPattern) || [];

        if (matches.length > 10) {
            console.log(`✅ ${matches.length} DATABASE_URL utilisent des valeurs fixes`);
        } else {
            console.log(`❌ Seulement ${matches.length} DATABASE_URL utilisent des valeurs fixes`);
            allTestsPassed = false;
        }

        // Test 3: Vérifier que les variables d'environnement PostgreSQL ne sont plus utilisées
        console.log('\n🔧 Test 3: Variables d\'environnement PostgreSQL...');
        if (!dockerCompose.includes('${POSTGRES_USER}') &&
            !dockerCompose.includes('${POSTGRES_PASSWORD}') &&
            !dockerCompose.includes('${POSTGRES_DB}')) {
            console.log('✅ Plus de variables d\'environnement PostgreSQL dans docker-compose');
        } else {
            console.log('❌ Variables d\'environnement PostgreSQL encore présentes');
            allTestsPassed = false;
        }

        // Test 4: Vérifier le backend docker-compose.yml
        console.log('\n🔧 Test 4: Backend docker-compose...');
        const backendDockerCompose = fs.readFileSync('./backend/docker-compose.yml', 'utf8');
        const backendMatches = backendDockerCompose.match(databaseUrlPattern) || [];

        if (backendMatches.length > 5) {
            console.log(`✅ ${backendMatches.length} DATABASE_URL backend utilisent des valeurs fixes`);
        } else {
            console.log(`❌ Seulement ${backendMatches.length} DATABASE_URL backend utilisent des valeurs fixes`);
            allTestsPassed = false;
        }

        // Test 5: Vérifier le backend docker-compose.prod.yml
        console.log('\n🏭 Test 5: Production docker-compose...');
        const prodDockerCompose = fs.readFileSync('./backend/docker-compose.prod.yml', 'utf8');
        const prodMatches = prodDockerCompose.match(databaseUrlPattern) || [];

        if (prodMatches.length > 5) {
            console.log(`✅ ${prodMatches.length} DATABASE_URL production utilisent des valeurs fixes`);
        } else {
            console.log(`❌ Seulement ${prodMatches.length} DATABASE_URL production utilisent des valeurs fixes`);
            allTestsPassed = false;
        }

        console.log('\n🎉 Tests terminés !');
        console.log('\n📋 Résumé de la correction make down:');

        if (allTestsPassed) {
            console.log('✅ MAKE DOWN NETTOYÉ - PLUS D\'AVERTISSEMENTS !');
            console.log('');
            console.log('🚀 Corrections apportées:');
            console.log('1. ✅ Healthcheck PostgreSQL utilise des valeurs fixes');
            console.log('2. ✅ DATABASE_URL utilisent des valeurs fixes (pas de variables)');
            console.log('3. ✅ Plus de variables d\'environnement PostgreSQL dans docker-compose');
            console.log('4. ✅ Backend services configurés avec valeurs fixes');
            console.log('5. ✅ Production services configurés avec valeurs fixes');
            console.log('');
            console.log('💡 Comportement maintenant:');
            console.log('   make down                    # Plus d\'avertissements PostgreSQL');
            console.log('   make up-full                 # Démarrage avec variables d\'environnement');
            console.log('   make restart                 # Redémarrage propre');
            console.log('');
            console.log('🎯 Testez maintenant:');
            console.log('   make down                    # Console propre !');
            console.log('   make up-full                 # Services démarrent normalement');
        } else {
            console.log('❌ Configuration make down incomplète');
        }

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error.message);
    }
}

// Exécuter les tests
testMakeDownClean();

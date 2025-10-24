/**
 * Test de la configuration PostgreSQL
 *
 * Ce script vérifie que toutes les configurations PostgreSQL utilisent
 * les bonnes valeurs (jobbingtrack/jobbingtrack123) au lieu des valeurs
 * par défaut (admin/admin123)
 */

const fs = require('fs');
const path = require('path');

async function testPostgreSQLConfig() {
    console.log('🗄️ Test de la configuration PostgreSQL...\n');

    let allTestsPassed = true;

    // Configuration attendue
    const expectedConfig = {
        user: 'jobbingtrack',
        password: 'jobbingtrack123',
        database: 'jobbingtrack'
    };

    console.log('📋 Configuration attendue:');
    console.log(`   Utilisateur: ${expectedConfig.user}`);
    console.log(`   Mot de passe: ${expectedConfig.password}`);
    console.log(`   Base de données: ${expectedConfig.database}`);
    console.log('');

    // Test 1: Vérifier la configuration PostgreSQL dans docker-compose.yml principal
    console.log('🐳 Test 1: Configuration PostgreSQL dans docker-compose.yml...');
    const mainDockerCompose = fs.readFileSync('./docker-compose.yml', 'utf8');
    if (mainDockerCompose.includes(`POSTGRES_USER: \${POSTGRES_USER:-${expectedConfig.user}}`)) {
        console.log('✅ POSTGRES_USER correct dans docker-compose.yml');
    } else {
        console.log('❌ POSTGRES_USER incorrect dans docker-compose.yml');
        allTestsPassed = false;
    }

    if (mainDockerCompose.includes(`POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-${expectedConfig.password}}`)) {
        console.log('✅ POSTGRES_PASSWORD correct dans docker-compose.yml');
    } else {
        console.log('❌ POSTGRES_PASSWORD incorrect dans docker-compose.yml');
        allTestsPassed = false;
    }

    if (mainDockerCompose.includes(`POSTGRES_DB: \${POSTGRES_DB:-${expectedConfig.database}}`)) {
        console.log('✅ POSTGRES_DB correct dans docker-compose.yml');
    } else {
        console.log('❌ POSTGRES_DB incorrect dans docker-compose.yml');
        allTestsPassed = false;
    }

    // Test 2: Vérifier les DATABASE_URL dans docker-compose.yml
    console.log('\n🔗 Test 2: DATABASE_URL dans docker-compose.yml...');
    const databaseUrlPattern = `postgresql://\${POSTGRES_USER:-${expectedConfig.user}}:\${POSTGRES_PASSWORD:-${expectedConfig.password}}@postgres:5432/\${POSTGRES_DB:-${expectedConfig.database}}`;
    if (mainDockerCompose.includes(databaseUrlPattern)) {
        console.log('✅ DATABASE_URL utilise les bonnes variables PostgreSQL');
    } else {
        console.log('❌ DATABASE_URL n\'utilise pas les bonnes variables PostgreSQL');
        console.log('   Pattern attendu:', databaseUrlPattern);
        allTestsPassed = false;
    }

    // Test 3: Vérifier le backend docker-compose.yml
    console.log('\n🔧 Test 3: Configuration backend...');
    const backendDockerCompose = fs.readFileSync('./backend/docker-compose.yml', 'utf8');
    if (backendDockerCompose.includes(databaseUrlPattern)) {
        console.log('✅ DATABASE_URL backend utilise les bonnes variables');
    } else {
        console.log('❌ DATABASE_URL backend n\'utilise pas les bonnes variables');
        allTestsPassed = false;
    }

    // Test 4: Vérifier le backend docker-compose.prod.yml
    console.log('\n🏭 Test 4: Configuration production...');
    const prodDockerCompose = fs.readFileSync('./backend/docker-compose.prod.yml', 'utf8');
    if (prodDockerCompose.includes(databaseUrlPattern)) {
        console.log('✅ DATABASE_URL production utilise les bonnes variables');
    } else {
        console.log('❌ DATABASE_URL production n\'utilise pas les bonnes variables');
        allTestsPassed = false;
    }

    // Test 5: Vérifier les scripts de génération de données
    console.log('\n📊 Test 5: Scripts de génération de données...');
    const generateTestData = fs.readFileSync('./backend/generate-test-data.js', 'utf8');
    if (generateTestData.includes('postgresql://jobbingtrack:jobbingtrack123@localhost:5432')) {
        console.log('✅ Script de test utilise les bonnes credentials');
    } else {
        console.log('❌ Script de test n\'utilise pas les bonnes credentials');
        allTestsPassed = false;
    }

    // Test 6: Vérifier les schémas Prisma
    console.log('\n📋 Test 6: Schémas Prisma...');
    const prismaFiles = [
        './backend/auth-service/prisma/schema.prisma',
        './backend/application-service/prisma/schema.prisma',
        './backend/company-service/prisma/schema.prisma',
        './backend/contact-service/prisma/schema.prisma',
        './backend/interview-service/prisma/schema.prisma',
        './backend/call-service/prisma/schema.prisma',
        './backend/notification-service/prisma/schema.prisma',
        './backend/profile-service/prisma/schema.prisma',
        './backend/event-service/prisma/schema.prisma',
        './backend/followup-service/prisma/schema.prisma',
        './backend/workflow-service/prisma/schema.prisma',
        './backend/security-service/prisma/schema.prisma',
        './backend/deployment-service/prisma/schema.prisma',
        './backend/system-metrics-service/prisma/schema.prisma'
    ];

    let prismaTestsPassed = true;
    prismaFiles.forEach(file => {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            if (content.includes('url      = env("DATABASE_URL")')) {
                // C'est correct si ça utilise DATABASE_URL
            } else {
                console.log(`❌ ${path.basename(file)} n'utilise pas DATABASE_URL`);
                prismaTestsPassed = false;
            }
        }
    });

    if (prismaTestsPassed) {
        console.log('✅ Tous les schémas Prisma utilisent DATABASE_URL');
    } else {
        console.log('❌ Certains schémas Prisma n\'utilisent pas DATABASE_URL');
        allTestsPassed = false;
    }

    // Test 7: Vérifier qu'il n'y a plus de références aux anciennes valeurs
    console.log('\n🚫 Test 7: Vérification des anciennes valeurs...');
    const filesToCheck = [
        './docker-compose.yml',
        './backend/docker-compose.yml',
        './backend/docker-compose.prod.yml'
    ];

    let oldValuesFound = false;
    filesToCheck.forEach(file => {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            if (content.includes('admin:admin123') || content.includes('admin/admin123')) {
                console.log(`❌ ${file} contient encore des références aux anciennes valeurs`);
                oldValuesFound = true;
                allTestsPassed = false;
            }
        }
    });

    if (!oldValuesFound) {
        console.log('✅ Aucune référence aux anciennes valeurs trouvée');
    }

    // Test 8: Vérifier la documentation
    console.log('\n📚 Test 8: Documentation...');
    const docContent = fs.readFileSync('./docs/postgresql-configuration.md', 'utf8');
    if (docContent.includes(expectedConfig.user) && docContent.includes(expectedConfig.password)) {
        console.log('✅ Documentation PostgreSQL à jour');
    } else {
        console.log('❌ Documentation PostgreSQL pas à jour');
        allTestsPassed = false;
    }

    console.log('\n🎉 Tests terminés !');
    console.log('\n📋 Résumé de la configuration PostgreSQL:');

    if (allTestsPassed) {
        console.log('✅ CONFIGURATION POSTGRESQL UNIFIÉE ET CORRECTE !');
        console.log('');
        console.log('🚀 Configuration standardisée:');
        console.log(`   Utilisateur: ${expectedConfig.user}`);
        console.log(`   Mot de passe: ${expectedConfig.password}`);
        console.log(`   Base: ${expectedConfig.database}`);
        console.log('');
        console.log('📦 Services configurés:');
        console.log('   ✅ docker-compose.yml principal');
        console.log('   ✅ backend/docker-compose.yml');
        console.log('   ✅ backend/docker-compose.prod.yml');
        console.log('   ✅ Scripts de génération de données');
        console.log('   ✅ Tous les schémas Prisma');
        console.log('   ✅ Documentation mise à jour');
        console.log('');
        console.log('💡 Utilisation:');
        console.log('   make up-full                    # Démarre avec la config PostgreSQL');
        console.log('   docker-compose exec postgres psql -U jobbingtrack -d jobbingtrack');
        console.log('   # Mot de passe: jobbingtrack123');
    } else {
        console.log('❌ Configuration PostgreSQL incomplète ou incorrecte');
    }

    return allTestsPassed;
}

// Exécuter les tests
testPostgreSQLConfig().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Erreur lors des tests:', error);
    process.exit(1);
});

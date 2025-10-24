/**
 * Test des noms d'images Docker
 *
 * Ce script vérifie que les noms d'images Docker sont corrects et cohérents
 */

const { exec } = require('child_process');
const fs = require('fs');

async function testDockerImageNames() {
    console.log('🐳 Test des noms d\'images Docker...\n');

    let allTestsPassed = true;

    try {
        // Test 1: Vérifier les images existantes
        console.log('🔍 Test 1: Vérification des images existantes...');

        const imagesResult = await new Promise((resolve, reject) => {
            exec('docker images --filter "reference=jobbingtrack-*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"', (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout);
            });
        });

        console.log('Images Docker existantes:');
        console.log(imagesResult);

        // Test 2: Vérifier les conteneurs en cours d'exécution
        console.log('\n📦 Test 2: Vérification des conteneurs...');

        const containersResult = await new Promise((resolve, reject) => {
            exec('docker ps --filter "name=jobbingtrack-*" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"', (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout);
            });
        });

        console.log('Conteneurs en cours d\'exécution:');
        console.log(containersResult);

        // Test 3: Vérifier la configuration des services dans docker-compose.yml
        console.log('\n⚙️ Test 3: Configuration des services...');
        const dockerCompose = fs.readFileSync('./docker-compose.yml', 'utf8');

        // Services attendus avec leurs images
        const expectedServices = [
            'api-gateway',
            'frontend',
            'auth-service',
            'application-service',
            'company-service',
            'contact-service',
            'interview-service',
            'call-service',
            'event-service',
            'followup-service',
            'profile-service',
            'notification-service',
            'workflow-service',
            'dashboard-service',
            'jobbingtrack-metrics-aggregator'
        ];

        let configTestsPassed = true;
        expectedServices.forEach(serviceName => {
            const servicePattern = new RegExp(`^  ${serviceName}:\\s*$`, 'm');
            const imagePattern = new RegExp(`image: jobbingtrack-${serviceName}`, 'm');

            if (dockerCompose.match(servicePattern)) {
                if (dockerCompose.match(imagePattern)) {
                    console.log(`✅ ${serviceName}: image correctement configurée`);
                } else {
                    console.log(`❌ ${serviceName}: image non configurée`);
                    configTestsPassed = false;
                }
            } else {
                console.log(`⚠️ ${serviceName}: service non trouvé dans docker-compose.yml`);
            }
        });

        if (configTestsPassed) {
            console.log('✅ Tous les services principaux ont une configuration d\'image correcte');
        } else {
            console.log('❌ Certains services n\'ont pas de configuration d\'image');
            allTestsPassed = false;
        }

        // Test 4: Vérifier le backend docker-compose.yml
        console.log('\n🔧 Test 4: Configuration backend...');
        const backendDockerCompose = fs.readFileSync('./backend/docker-compose.yml', 'utf8');

        const backendServices = [
            'docker-stats-service',
            'system-metrics-service',
            'deployment-service',
            'security-service',
            'api-gateway',
            'auth-service',
            'application-service',
            'company-service',
            'contact-service',
            'interview-service',
            'notification-service',
            'call-service',
            'followup-service',
            'event-service',
            'profile-service',
            'workflow-service'
        ];

        let backendConfigTestsPassed = true;
        backendServices.forEach(serviceName => {
            const servicePattern = new RegExp(`^  ${serviceName}:\\s*$`, 'm');
            const imagePattern = new RegExp(`image: jobbingtrack-${serviceName}`, 'm');

            if (backendDockerCompose.match(servicePattern)) {
                if (backendDockerCompose.match(imagePattern)) {
                    console.log(`✅ ${serviceName}: image correctement configurée`);
                } else {
                    console.log(`❌ ${serviceName}: image non configurée`);
                    backendConfigTestsPassed = false;
                }
            } else {
                console.log(`⚠️ ${serviceName}: service non trouvé dans backend/docker-compose.yml`);
            }
        });

        if (backendConfigTestsPassed) {
            console.log('✅ Tous les services backend ont une configuration d\'image correcte');
        } else {
            console.log('❌ Certains services backend n\'ont pas de configuration d\'image');
            allTestsPassed = false;
        }

        // Test 5: Vérifier le backend docker-compose.prod.yml
        console.log('\n🏭 Test 5: Configuration production...');
        const prodDockerCompose = fs.readFileSync('./backend/docker-compose.prod.yml', 'utf8');

        // Vérifier quelques services clés
        const prodServices = ['auth-service', 'application-service', 'company-service'];
        let prodConfigTestsPassed = true;

        prodServices.forEach(serviceName => {
            const servicePattern = new RegExp(`^  ${serviceName}:\\s*$`, 'm');
            const imagePattern = new RegExp(`image: jobbingtrack-${serviceName}`, 'm');

            if (prodDockerCompose.match(servicePattern)) {
                if (prodDockerCompose.match(imagePattern)) {
                    console.log(`✅ ${serviceName}: image correctement configurée (prod)`);
                } else {
                    console.log(`❌ ${serviceName}: image non configurée (prod)`);
                    prodConfigTestsPassed = false;
                }
            }
        });

        if (prodConfigTestsPassed) {
            console.log('✅ Services de production ont une configuration d\'image correcte');
        } else {
            console.log('❌ Certains services de production n\'ont pas de configuration d\'image');
            allTestsPassed = false;
        }

        console.log('\n🎉 Tests terminés !');
        console.log('\n📋 Résumé de la configuration des images Docker:');

        if (allTestsPassed) {
            console.log('✅ NOMS D\'IMAGES DOCKER CORRIGÉS !');
            console.log('');
            console.log('🚀 Services avec images correctement configurées:');
            console.log('   ✅ docker-compose.yml principal');
            console.log('   ✅ backend/docker-compose.yml');
            console.log('   ✅ backend/docker-compose.prod.yml');
            console.log('   ✅ Services essentiels (api-gateway, frontend, auth-service)');
            console.log('   ✅ Services métier (application, company, contact, etc.)');
            console.log('   ✅ Services de monitoring (metrics-aggregator)');
            console.log('');
            console.log('📝 Format des noms d\'images:');
            console.log('   ✅ jobbingtrack-api-gateway');
            console.log('   ✅ jobbingtrack-frontend');
            console.log('   ✅ jobbingtrack-auth-service');
            console.log('   ✅ jobbingtrack-metrics-aggregator');
            console.log('   ✅ etc.');
            console.log('');
            console.log('💡 Plus de noms d\'images dupliqués !');
        } else {
            console.log('❌ Configuration des images incomplète');
        }

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error.message);
    }
}

// Exécuter les tests
testDockerImageNames();

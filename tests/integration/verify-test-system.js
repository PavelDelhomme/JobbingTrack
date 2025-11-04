#!/usr/bin/env node

/**
 * Script de vérification du système de test JobbingTrack
 * Vérifie que user1@jobbingtrack.test existe et que la route /api/v1/services fonctionne
 */

const axios = require('axios');

const API_GATEWAY_URL = 'http://localhost:3000';
const METRICS_URL = 'http://localhost:3014';

console.log('🧪 VÉRIFICATION DU SYSTÈME DE TEST\n');
console.log('=' .repeat(50));

// Test 1: Vérifier la connexion à la base de données de test
async function testDatabaseConnection() {
  console.log('\n📊 Test 1: Connexion à la base de données de test');

  try {
    const { execSync } = require('child_process');
    const result = execSync(`docker exec jobbingtrack-postgres-test psql -U admin@jobbingtrack.test -d jobbingtrack_test -c "SELECT id, email, role FROM \\"User\\" WHERE email LIKE 'user%';" -t`, {
      encoding: 'utf8'
    });

    console.log('✅ Base de données de test accessible');
    console.log('📋 Utilisateurs trouvés:');

    const lines = result.trim().split('\n');
    if (lines.length > 0 && lines[0].trim()) {
      lines.forEach(line => {
        if (line.trim()) {
          const [id, email, role] = line.trim().split('|').map(s => s.trim());
          console.log(`   - ${email} (${role})`);
        }
      });
    } else {
      console.log('   - Aucun utilisateur user* trouvé');
    }

    return true;
  } catch (error) {
    console.log(`❌ Erreur de connexion à la base de données: ${error.message}`);
    return false;
  }
}

// Test 2: Vérifier l'utilisateur user1@jobbingtrack.test
async function testUser1Login() {
  console.log('\n👤 Test 2: Connexion avec user1@jobbingtrack.test');

  try {
    const response = await axios.post(`${API_GATEWAY_URL}/api/v1/auth/login`, {
      email: 'user1@jobbingtrack.test',
      password: 'password123'
    }, {
      timeout: 5000
    });

    if (response.data.success) {
      console.log('✅ Utilisateur user1@jobbingtrack.test peut se connecter');
      console.log(`   - Rôle: ${response.data.user.role}`);
      console.log(`   - Token généré: ${response.data.token ? 'Oui' : 'Non'}`);
      console.log(`   - Email: ${response.data.user.email}`);
      return true;
    } else {
      console.log('❌ Échec de connexion pour user1@jobbingtrack.test');
      console.log(`   - Message: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur lors du test de connexion: ${error.message}`);
    return false;
  }
}

// Test 3: Vérifier la route /api/v1/services
async function testServicesRoute() {
  console.log('\n🌐 Test 3: Route /api/v1/services');

  try {
    const response = await axios.get(`${API_GATEWAY_URL}/api/v1/services`, {
      timeout: 5000
    });

    if (response.data.success) {
      console.log('✅ Route /api/v1/services fonctionne');
      console.log(`   - ${response.data.services.length} services détectés`);
      console.log(`   - ${response.data.running} services en cours d'exécution`);
      console.log(`   - Source des données: ${response.data.fallback ? 'fallback (hardcodé)' : 'temps réel (métriques)'}`);

      // Vérifier que les services attendus sont présents
      const serviceNames = response.data.services.map(s => s.name);
      const expectedServices = ['api-gateway', 'auth-service', 'postgres', 'redis', 'metrics-aggregator'];

      console.log('📋 Services détectés:');
      response.data.services.forEach(service => {
        console.log(`   - ${service.name}: ${service.status} (${service.health})`);
      });

      const missingServices = expectedServices.filter(s => !serviceNames.includes(s));
      if (missingServices.length === 0) {
        console.log('✅ Tous les services attendus sont présents');
      } else {
        console.log(`⚠️ Services manquants: ${missingServices.join(', ')}`);
      }

      return true;
    } else {
      console.log('❌ Route /api/v1/services a échoué');
      console.log(`   - Message: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erreur lors du test de la route services: ${error.message}`);
    return false;
  }
}

// Test 4: Vérifier le service de métriques
async function testMetricsService() {
  console.log('\n📊 Test 4: Service de métriques');

  try {
    const response = await axios.get(`${METRICS_URL}/api/v1/metrics`, {
      timeout: 5000
    });

    if (response.data.services) {
      console.log('✅ Service de métriques répond');
      console.log(`   - ${Object.keys(response.data.services).length} services monitorés`);

      // Vérifier si l'API Gateway est détecté
      const hasApiGateway = Object.keys(response.data.services).some(key =>
        key.includes('api-gateway') || key.includes('gateway')
      );

      if (hasApiGateway) {
        console.log('✅ API Gateway détecté dans les métriques');
      } else {
        console.log('⚠️ API Gateway non trouvé dans les métriques');
      }

      return true;
    } else {
      console.log('⚠️ Aucune donnée de services dans les métriques');
      return false;
    }
  } catch (error) {
    console.log(`❌ Service de métriques non disponible: ${error.message}`);
    return false;
  }
}

// Test 5: Vérifier les données de test en base
async function testTestData() {
  console.log('\n🗄️ Test 5: Données de test en base');

  try {
    // Récupérer le token d'abord
    const loginResponse = await axios.post(`${API_GATEWAY_URL}/api/v1/auth/login`, {
      email: 'user1@jobbingtrack.test',
      password: 'password123'
    });

    if (loginResponse.data.success) {
      const token = loginResponse.data.token;

      // Tester la récupération des candidatures
      const applicationsResponse = await axios.get(`${API_GATEWAY_URL}/api/v1/applications`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 5000
      });

      if (applicationsResponse.data.success) {
        console.log('✅ Données de test disponibles en base');
        console.log(`   - ${applicationsResponse.data.applications?.length || 0} candidatures trouvées`);
        console.log(`   - ${applicationsResponse.data.companies?.length || 0} entreprises trouvées`);
        console.log(`   - ${applicationsResponse.data.contacts?.length || 0} contacts trouvés`);
        return true;
      } else {
        console.log('⚠️ Données de test non disponibles');
        return false;
      }
    }
  } catch (error) {
    console.log(`❌ Erreur lors du test de la base de données: ${error.message}`);
    return false;
  }
}

// Exécuter tous les tests
async function runAllTests() {
  const results = {
    database: await testDatabaseConnection(),
    user1: await testUser1Login(),
    services: await testServicesRoute(),
    metrics: await testMetricsService(),
    data: await testTestData()
  };

  console.log('\n' + '='.repeat(50));
  console.log('🎯 RÉSUMÉ DES TESTS:');
  console.log('=' .repeat(50));

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`✅ ${passed}/${total} tests réussis`);

  if (passed === total) {
    console.log('\n🎉 SYSTÈME DE TEST OPÉRATIONNEL !');
    console.log('✅ user1@jobbingtrack.test disponible');
    console.log('✅ Route /api/v1/services fonctionnelle');
    console.log('✅ Données de test en base');
    console.log('✅ Service de métriques actif');
    console.log('\n🚀 Prêt pour les tests Playwright !');
  } else {
    console.log('\n⚠️ Certains tests ont échoué');
    console.log('📋 Vérifiez que les services sont démarrés avec: make up');
    console.log('📋 Vérifiez la base de données avec: make generate-test-data');
  }

  console.log('\n🔧 Commandes suivantes:');
  console.log('   make test-e2e    # Lancer les tests');
  console.log('   make logs        # Voir les logs');
  console.log('   make status      # État des services');

  process.exit(passed === total ? 0 : 1);
}

runAllTests().catch(console.error);

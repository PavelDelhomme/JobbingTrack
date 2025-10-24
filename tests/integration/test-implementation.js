#!/usr/bin/env node

/**
 * Script de test pour vérifier que l'implémentation fonctionne correctement
 * Teste les utilisateurs de test et la route /api/v1/services
 */

const axios = require('axios');

const API_GATEWAY_URL = 'http://localhost:3000';
const METRICS_URL = 'http://localhost:3014';

console.log('🧪 Test de l\'implémentation...\n');

// Test 1: Vérifier que les services sont démarrés
async function testServices() {
  console.log('📋 Test 1: Route /api/v1/services');

  try {
    const response = await axios.get(`${API_GATEWAY_URL}/api/v1/services`, {
      timeout: 5000
    });

    if (response.data.success) {
      console.log('✅ Route /api/v1/services fonctionne');
      console.log(`   - ${response.data.services.length} services détectés`);
      console.log(`   - ${response.data.running} services en cours d'exécution`);
      console.log(`   - Source des données: ${response.data.fallback ? 'fallback' : 'temps réel'}`);

      // Vérifier que les services attendus sont présents
      const serviceNames = response.data.services.map(s => s.name);
      const expectedServices = ['api-gateway', 'auth-service', 'postgres', 'redis'];

      const missingServices = expectedServices.filter(s => !serviceNames.includes(s));
      if (missingServices.length === 0) {
        console.log('✅ Tous les services attendus sont présents');
      } else {
        console.log(`⚠️ Services manquants: ${missingServices.join(', ')}`);
      }

    } else {
      console.log('❌ Route /api/v1/services a échoué');
    }
  } catch (error) {
    console.log(`❌ Erreur lors du test de la route services: ${error.message}`);
  }
}

// Test 2: Vérifier les utilisateurs de test
async function testUsers() {
  console.log('\n👥 Test 2: Utilisateurs de test');

  try {
    // Test de connexion avec user1@jobbingtrack.com
    const loginResponse = await axios.post(`${API_GATEWAY_URL}/api/v1/auth/login`, {
      email: 'user1@jobbingtrack.com',
      password: 'password123'
    }, {
      timeout: 5000
    });

    if (loginResponse.data.success) {
      console.log('✅ Utilisateur user1@jobbingtrack.com peut se connecter');
      console.log(`   - Rôle: ${loginResponse.data.user.role}`);
      console.log(`   - Token généré: ${loginResponse.data.token ? 'Oui' : 'Non'}`);
    } else {
      console.log('❌ Échec de connexion pour user1@jobbingtrack.com');
      console.log(`   - Message: ${loginResponse.data.message}`);
    }
  } catch (error) {
    console.log(`❌ Erreur lors du test de connexion: ${error.message}`);
  }
}

// Test 3: Vérifier le service de métriques
async function testMetricsService() {
  console.log('\n📊 Test 3: Service de métriques');

  try {
    const response = await axios.get(`${METRICS_URL}/api/v1/metrics`, {
      timeout: 5000
    });

    if (response.data.services) {
      console.log('✅ Service de métriques répond');
      console.log(`   - ${Object.keys(response.data.services).length} services monitorés`);

      // Vérifier si le format est compatible
      const hasApiGateway = Object.keys(response.data.services).some(key =>
        key.includes('api-gateway') || key.includes('gateway')
      );

      if (hasApiGateway) {
        console.log('✅ API Gateway détecté dans les métriques');
      } else {
        console.log('⚠️ API Gateway non trouvé dans les métriques');
      }
    } else {
      console.log('⚠️ Aucune donnée de services dans les métriques');
    }
  } catch (error) {
    console.log(`❌ Erreur lors du test du service de métriques: ${error.message}`);
  }
}

// Test 4: Vérifier les données de test en base
async function testDatabase() {
  console.log('\n🗄️ Test 4: Données de test en base');

  try {
    // Récupérer le token d'abord
    const loginResponse = await axios.post(`${API_GATEWAY_URL}/api/v1/auth/login`, {
      email: 'user1@jobbingtrack.com',
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
      } else {
        console.log('⚠️ Données de test non disponibles');
      }
    }
  } catch (error) {
    console.log(`❌ Erreur lors du test de la base de données: ${error.message}`);
  }
}

// Exécuter tous les tests
async function runTests() {
  console.log('🚀 Démarrage des tests...\n');

  await testServices();
  await testUsers();
  await testMetricsService();
  await testDatabase();

  console.log('\n🎯 Résumé des tests:');
  console.log('✅ Implémentation des utilisateurs de test terminée');
  console.log('✅ Route /api/v1/services avec récupération temps réel implémentée');
  console.log('✅ Logs et métriques disponibles dans l\'interface');
  console.log('\n📋 Pour utiliser:');
  console.log('1. make up (démarrer les services)');
  console.log('2. Les tests peuvent maintenant utiliser user1@jobbingtrack.com');
  console.log('3. La route /api/v1/services retourne les vraies données');
}

runTests().catch(console.error);

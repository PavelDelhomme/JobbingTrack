/**
 * Tests API complets
 * Tests de tous les endpoints de l'API backend
 */

const request = require('supertest');
const axios = require('axios');

class APITester {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.agent = request(baseURL);
    this.authToken = null;
  }

  async authenticate(email = 'admin@jobbingtrack.test', password = 'admin123') {
    console.log('🔐 Authentification...');
    try {
      const response = await this.agent
        .post('/api/auth/login')
        .send({ email, password });

      if (response.status === 200 && response.body.token) {
        this.authToken = response.body.token;
        console.log('✅ Authentifié avec succès');
        return true;
      } else {
        console.log('❌ Échec de l\'authentification');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur d\'authentification:', error.message);
      return false;
    }
  }

  async testHealth() {
    console.log('🏥 Test de santé API Gateway...');
    try {
      const response = await this.agent.get('/health');
      console.log(`✅ Health check: ${response.status}`);
      return response.status === 200;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return false;
    }
  }

  async testServices() {
    console.log('🔧 Test des services backend...');
    const services = [
      { name: 'Auth Service', url: '/api/auth/health', expectedStatus: 200 },
      { name: 'User Service', url: '/api/users/health', expectedStatus: 200 },
      { name: 'Company Service', url: '/api/companies/health', expectedStatus: 200 },
      { name: 'Application Service', url: '/api/applications/health', expectedStatus: 200 },
      { name: 'Interview Service', url: '/api/interviews/health', expectedStatus: 200 },
      { name: 'Call Service', url: '/api/calls/health', expectedStatus: 200 },
      { name: 'Contact Service', url: '/api/contacts/health', expectedStatus: 200 },
      { name: 'Event Service', url: '/api/events/health', expectedStatus: 200 },
      { name: 'Notification Service', url: '/api/notifications/health', expectedStatus: 200 },
      { name: 'Dashboard Service', url: '/api/dashboard/health', expectedStatus: 200 }
    ];

    const results = [];
    for (const service of services) {
      try {
        const response = await this.agent.get(service.url);
        const success = response.status === service.expectedStatus;
        console.log(`${success ? '✅' : '❌'} ${service.name}: ${response.status}`);
        results.push({ service: service.name, success });
      } catch (error) {
        console.log(`❌ ${service.name}: ${error.message}`);
        results.push({ service: service.name, success: false });
      }
    }

    return results;
  }

  async testUserEndpoints() {
    console.log('👤 Test des endpoints utilisateurs...');
    if (!this.authToken) await this.authenticate();

    const endpoints = [
      { method: 'get', url: '/api/users', expectedStatus: 200 },
      { method: 'get', url: '/api/users/profile', expectedStatus: 200 },
      { method: 'put', url: '/api/users/profile', data: { name: 'Test User' }, expectedStatus: 200 }
    ];

    const results = [];
    for (const endpoint of endpoints) {
      try {
        let response;
        if (endpoint.method === 'get') {
          response = await this.agent.get(endpoint.url)
            .set('Authorization', `Bearer ${this.authToken}`);
        } else {
          response = await this.agent[endpoint.method](endpoint.url)
            .set('Authorization', `Bearer ${this.authToken}`)
            .send(endpoint.data || {});
        }

        const success = response.status === endpoint.expectedStatus;
        console.log(`${success ? '✅' : '❌'} ${endpoint.method.toUpperCase()} ${endpoint.url}: ${response.status}`);
        results.push({ endpoint: `${endpoint.method} ${endpoint.url}`, success });
      } catch (error) {
        console.log(`❌ ${endpoint.method.toUpperCase()} ${endpoint.url}: ${error.message}`);
        results.push({ endpoint: `${endpoint.method} ${endpoint.url}`, success: false });
      }
    }

    return results;
  }

  async testCompanyEndpoints() {
    console.log('🏢 Test des endpoints entreprises...');
    if (!this.authToken) await this.authenticate();

    const testCompany = {
      name: 'Test Company',
      description: 'Test company for API testing',
      website: 'https://example.com',
      industry: 'Technology'
    };

    // Test creation
    let companyId;
    try {
      const createResponse = await this.agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${this.authToken}`)
        .send(testCompany);

      if (createResponse.status === 201) {
        companyId = createResponse.body.id;
        console.log('✅ Company creation: OK');

        // Test retrieval
        const getResponse = await this.agent
          .get(`/api/companies/${companyId}`)
          .set('Authorization', `Bearer ${this.authToken}`);

        console.log(`✅ Company retrieval: ${getResponse.status}`);

        // Test update
        const updateResponse = await this.agent
          .put(`/api/companies/${companyId}`)
          .set('Authorization', `Bearer ${this.authToken}`)
          .send({ ...testCompany, name: 'Updated Test Company' });

        console.log(`✅ Company update: ${updateResponse.status}`);

        // Test deletion
        const deleteResponse = await this.agent
          .delete(`/api/companies/${companyId}`)
          .set('Authorization', `Bearer ${this.authToken}`);

        console.log(`✅ Company deletion: ${deleteResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Company endpoints: ${error.message}`);
    }
  }

  async testApplicationEndpoints() {
    console.log('📋 Test des endpoints candidatures...');
    if (!this.authToken) await this.authenticate();

    // Créer une entreprise de test d'abord
    let companyId;
    try {
      const companyResponse = await this.agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${this.authToken}`)
        .send({
          name: 'Test Company for Apps',
          description: 'Test company',
          website: 'https://example.com',
          industry: 'Technology'
        });

      companyId = companyResponse.body.id;

      const testApplication = {
        title: 'Test Application',
        description: 'Test application for API testing',
        companyId: companyId,
        status: 'applied'
      };

      // Test creation
      const createResponse = await this.agent
        .post('/api/applications')
        .set('Authorization', `Bearer ${this.authToken}`)
        .send(testApplication);

      if (createResponse.status === 201) {
        const applicationId = createResponse.body.id;
        console.log('✅ Application creation: OK');

        // Test retrieval
        const getResponse = await this.agent
          .get(`/api/applications/${applicationId}`)
          .set('Authorization', `Bearer ${this.authToken}`);

        console.log(`✅ Application retrieval: ${getResponse.status}`);

        // Test list
        const listResponse = await this.agent
          .get('/api/applications')
          .set('Authorization', `Bearer ${this.authToken}`);

        console.log(`✅ Application list: ${listResponse.status}`);

        // Cleanup
        await this.agent
          .delete(`/api/applications/${applicationId}`)
          .set('Authorization', `Bearer ${this.authToken}`);
      }

      // Cleanup company
      await this.agent
        .delete(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${this.authToken}`);

    } catch (error) {
      console.log(`❌ Application endpoints: ${error.message}`);
    }
  }

  async testMetrics() {
    console.log('📊 Test des métriques...');
    try {
      const response = await this.agent.get('/api/metrics/system');
      console.log(`✅ System metrics: ${response.status}`);
      return response.status === 200;
    } catch (error) {
      console.log(`❌ Metrics: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    console.log('🧪 Lancement de tous les tests API...\n');

    const results = {
      health: await this.testHealth(),
      services: await this.testServices(),
      auth: await this.authenticate(),
      users: await this.testUserEndpoints(),
      companies: await this.testCompanyEndpoints(),
      applications: await this.testApplicationEndpoints(),
      metrics: await this.testMetrics()
    };

    console.log('\n📋 Résumé des tests API:');
    Object.entries(results).forEach(([category, result]) => {
      if (Array.isArray(result)) {
        const successCount = result.filter(r => r.success).length;
        const totalCount = result.length;
        console.log(`📊 ${category}: ${successCount}/${totalCount} ✅`);
      } else {
        console.log(`${result ? '✅' : '❌'} ${category}`);
      }
    });

    return results;
  }
}

// Script principal
async function main() {
  const tester = new APITester();

  try {
    await tester.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = APITester;

/**
 * Tests des services backend
 * Tests unitaires et d'intégration des services backend
 */

const request = require('supertest');
const axios = require('axios');

class BackendServiceTester {
  constructor() {
    this.baseURL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    this.authServiceURL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    this.dashboardServiceURL = process.env.DASHBOARD_SERVICE_URL || 'http://localhost:3007';
    this.testUser = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };
  }

  async testAuthService() {
    console.log('🔐 Test du service d\'authentification...');

    const tests = [];

    // Test health check
    try {
      const healthResponse = await axios.get(`${this.authServiceURL}/health`);
      tests.push({ name: 'Auth health check', success: healthResponse.status === 200 });
    } catch (error) {
      tests.push({ name: 'Auth health check', success: false, error: error.message });
    }

    // Test inscription
    try {
      const registerResponse = await axios.post(`${this.authServiceURL}/register`, this.testUser);
      tests.push({ name: 'User registration', success: registerResponse.status === 201 });
    } catch (error) {
      tests.push({ name: 'User registration', success: false, error: error.message });
    }

    // Test connexion
    try {
      const loginResponse = await axios.post(`${this.authServiceURL}/login`, {
        email: this.testUser.email,
        password: this.testUser.password
      });
      tests.push({ name: 'User login', success: loginResponse.status === 200 });

      if (loginResponse.data.token) {
        this.authToken = loginResponse.data.token;
      }
    } catch (error) {
      tests.push({ name: 'User login', success: false, error: error.message });
    }

    return tests;
  }

  async testUserService() {
    console.log('👤 Test du service utilisateurs...');

    const tests = [];

    if (!this.authToken) {
      tests.push({ name: 'User service - No auth token', success: false, error: 'No auth token available' });
      return tests;
    }

    // Test get profile
    try {
      const profileResponse = await axios.get(`${this.baseURL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      tests.push({ name: 'Get user profile', success: profileResponse.status === 200 });
    } catch (error) {
      tests.push({ name: 'Get user profile', success: false, error: error.message });
    }

    // Test update profile
    try {
      const updateResponse = await axios.put(`${this.baseURL}/api/users/profile`, {
        name: 'Updated Test User'
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      tests.push({ name: 'Update user profile', success: updateResponse.status === 200 });
    } catch (error) {
      tests.push({ name: 'Update user profile', success: false, error: error.message });
    }

    return tests;
  }

  async testCompanyService() {
    console.log('🏢 Test du service entreprises...');

    const tests = [];
    let companyId;

    if (!this.authToken) {
      tests.push({ name: 'Company service - No auth token', success: false, error: 'No auth token available' });
      return tests;
    }

    // Test create company
    try {
      const createResponse = await axios.post(`${this.baseURL}/api/companies`, {
        name: 'Test Company',
        description: 'Test company for backend testing',
        website: 'https://example.com',
        industry: 'Technology'
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      if (createResponse.status === 201) {
        companyId = createResponse.data.id;
        tests.push({ name: 'Create company', success: true });
      }
    } catch (error) {
      tests.push({ name: 'Create company', success: false, error: error.message });
    }

    // Test get companies
    try {
      const listResponse = await axios.get(`${this.baseURL}/api/companies`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      tests.push({ name: 'List companies', success: listResponse.status === 200 });
    } catch (error) {
      tests.push({ name: 'List companies', success: false, error: error.message });
    }

    // Test update company
    if (companyId) {
      try {
        const updateResponse = await axios.put(`${this.baseURL}/api/companies/${companyId}`, {
          name: 'Updated Test Company'
        }, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });
        tests.push({ name: 'Update company', success: updateResponse.status === 200 });
      } catch (error) {
        tests.push({ name: 'Update company', success: false, error: error.message });
      }
    }

    // Cleanup
    if (companyId) {
      try {
        await axios.delete(`${this.baseURL}/api/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });
        tests.push({ name: 'Delete company', success: true });
      } catch (error) {
        tests.push({ name: 'Delete company', success: false, error: error.message });
      }
    }

    return tests;
  }

  async testApplicationService() {
    console.log('📋 Test du service candidatures...');

    const tests = [];
    let applicationId;

    if (!this.authToken) {
      tests.push({ name: 'Application service - No auth token', success: false, error: 'No auth token available' });
      return tests;
    }

    // Create test company first
    let companyId;
    try {
      const companyResponse = await axios.post(`${this.baseURL}/api/companies`, {
        name: 'Test Company for Apps',
        description: 'Test company',
        website: 'https://example.com',
        industry: 'Technology'
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      companyId = companyResponse.data.id;
    } catch (error) {
      tests.push({ name: 'Create test company for applications', success: false, error: error.message });
      return tests;
    }

    // Test create application
    try {
      const createResponse = await axios.post(`${this.baseURL}/api/applications`, {
        title: 'Test Application',
        description: 'Test application for backend testing',
        companyId: companyId,
        status: 'applied'
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      if (createResponse.status === 201) {
        applicationId = createResponse.data.id;
        tests.push({ name: 'Create application', success: true });
      }
    } catch (error) {
      tests.push({ name: 'Create application', success: false, error: error.message });
    }

    // Test get applications
    try {
      const listResponse = await axios.get(`${this.baseURL}/api/applications`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      tests.push({ name: 'List applications', success: listResponse.status === 200 });
    } catch (error) {
      tests.push({ name: 'List applications', success: false, error: error.message });
    }

    // Cleanup
    if (applicationId) {
      try {
        await axios.delete(`${this.baseURL}/api/applications/${applicationId}`, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    if (companyId) {
      try {
        await axios.delete(`${this.baseURL}/api/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    return tests;
  }

  async testDashboardService() {
    console.log('📊 Test du service dashboard...');

    const tests = [];

    // Test health check
    try {
      const healthResponse = await axios.get(`${this.dashboardServiceURL}/health`);
      tests.push({ name: 'Dashboard health check', success: healthResponse.status === 200 });
    } catch (error) {
      tests.push({ name: 'Dashboard health check', success: false, error: error.message });
    }

    // Test metrics endpoint
    if (this.authToken) {
      try {
        const metricsResponse = await axios.get(`${this.baseURL}/api/dashboard/metrics`, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });
        tests.push({ name: 'Dashboard metrics', success: metricsResponse.status === 200 });
      } catch (error) {
        tests.push({ name: 'Dashboard metrics', success: false, error: error.message });
      }
    }

    return tests;
  }

  async testAPIGateway() {
    console.log('🚪 Test de l\'API Gateway...');

    const tests = [];

    // Test health endpoint
    try {
      const healthResponse = await axios.get(`${this.baseURL}/health`);
      tests.push({ name: 'API Gateway health', success: healthResponse.status === 200 });
    } catch (error) {
      tests.push({ name: 'API Gateway health', success: false, error: error.message });
    }

    // Test routes
    const routes = [
      '/api/auth/health',
      '/api/users/health',
      '/api/companies/health',
      '/api/applications/health'
    ];

    for (const route of routes) {
      try {
        const response = await axios.get(`${this.baseURL}${route}`);
        tests.push({ name: `Route ${route}`, success: response.status === 200 });
      } catch (error) {
        tests.push({ name: `Route ${route}`, success: false, error: error.message });
      }
    }

    return tests;
  }

  async runAllTests() {
    console.log('🧪 Tests backend - Démarrage...\n');

    const results = {
      apiGateway: await this.testAPIGateway(),
      authService: await this.testAuthService(),
      userService: await this.testUserService(),
      companyService: await this.testCompanyService(),
      applicationService: await this.testApplicationService(),
      dashboardService: await this.testDashboardService()
    };

    console.log('\n📋 Résumé tests backend:');
    Object.entries(results).forEach(([service, tests]) => {
      const successCount = tests.filter(t => t.success).length;
      const totalCount = tests.length;
      console.log(`📊 ${service}: ${successCount}/${totalCount} ✅`);
    });

    return results;
  }
}

// Script principal
async function main() {
  const tester = new BackendServiceTester();

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

module.exports = BackendServiceTester;

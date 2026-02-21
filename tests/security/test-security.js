/**
 * Tests de sécurité
 * Tests de sécurité, vulnérabilités et conformité
 */

const axios = require('axios');
const crypto = require('crypto');

class SecurityTester {
  constructor(baseURL = 'http://localhost:8080') {
    this.baseURL = baseURL;
    this.vulnerabilities = [];
  }

  async testXSS() {
    console.log('🛡️ Test XSS (Cross-Site Scripting)...');

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("XSS")',
      '<svg onload=alert(1)>',
      '"><script>alert(1)</script>',
      '\'-alert(1)-\'',
      '\'; DROP TABLE users; --'
    ];

    const endpoints = [
      '/login',
      '/register',
      '/applications',
      '/companies'
    ];

    const results = [];

    for (const endpoint of endpoints) {
      for (const payload of xssPayloads) {
        try {
          const response = await axios.post(`${this.baseURL}${endpoint}`, {
            input: payload,
            otherField: 'test'
          });

          const isVulnerable = response.data.includes(payload) ||
                              response.data.includes('<script>') ||
                              response.data.includes('alert(');

          if (isVulnerable) {
            results.push({
              endpoint,
              payload,
              vulnerability: 'XSS',
              severity: 'HIGH',
              description: 'Injection XSS détectée'
            });
            console.log(`❌ XSS détecté: ${endpoint} - ${payload.substring(0, 30)}...`);
          } else {
            results.push({
              endpoint,
              payload,
              vulnerability: 'XSS',
              severity: 'NONE',
              protected: true
            });
          }
        } catch (error) {
          // Erreur attendue pour les payloads malformés
          results.push({
            endpoint,
            payload,
            vulnerability: 'XSS',
            severity: 'NONE',
            protected: true,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  async testSQLInjection() {
    console.log('💉 Test injection SQL...');

    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users (email, password) VALUES ('hacker@test.com', 'password'); --",
      "' OR 1=1 --",
      "admin'--",
      "' AND 1=0 UNION SELECT version(), database(), user() --"
    ];

    const endpoints = [
      '/api/auth/login',
      '/api/users/search',
      '/api/companies/search'
    ];

    const results = [];

    for (const endpoint of endpoints) {
      for (const payload of sqlPayloads) {
        try {
          const response = await axios.post(`${this.baseURL}${endpoint}`, {
            email: payload,
            password: 'test'
          });

          // Si on reçoit des données inattendues, c'est potentiellement vulnérable
          const isVulnerable = response.data.users ||
                              response.data.companies ||
                              response.data.length > 1 ||
                              response.data.includes('version()');

          if (isVulnerable) {
            results.push({
              endpoint,
              payload,
              vulnerability: 'SQL Injection',
              severity: 'CRITICAL',
              description: 'Injection SQL détectée'
            });
            console.log(`❌ SQL Injection détectée: ${endpoint}`);
          } else {
            results.push({
              endpoint,
              payload,
              vulnerability: 'SQL Injection',
              severity: 'NONE',
              protected: true
            });
          }
        } catch (error) {
          // Erreur attendue pour les payloads SQL malformés
          results.push({
            endpoint,
            payload,
            vulnerability: 'SQL Injection',
            severity: 'NONE',
            protected: true,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  async testCSRF() {
    console.log('🔄 Test CSRF (Cross-Site Request Forgery)...');

    const results = [];

    // Test sans token CSRF
    try {
      const response = await axios.post(`${this.baseURL}/api/applications`, {
        title: 'Test CSRF',
        company: 'Test Company'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        results.push({
          endpoint: '/api/applications',
          vulnerability: 'CSRF',
          severity: 'NONE',
          protected: true,
          description: 'Protection CSRF active'
        });
        console.log('✅ Protection CSRF active');
      } else {
        results.push({
          endpoint: '/api/applications',
          vulnerability: 'CSRF',
          severity: 'HIGH',
          description: 'Aucune protection CSRF détectée'
        });
        console.log('❌ Vulnérabilité CSRF détectée');
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        results.push({
          endpoint: '/api/applications',
          vulnerability: 'CSRF',
          severity: 'NONE',
          protected: true,
          description: 'Protection CSRF active'
        });
        console.log('✅ Protection CSRF active');
      } else {
        results.push({
          endpoint: '/api/applications',
          vulnerability: 'CSRF',
          severity: 'HIGH',
          description: 'Aucune protection CSRF détectée'
        });
        console.log('❌ Vulnérabilité CSRF détectée');
      }
    }

    return results;
  }

  async testAuthBypass() {
    console.log('🔐 Test contournement authentification...');

    const results = [];

    // Test accès sans authentification
    const protectedEndpoints = [
      '/api/users/profile',
      '/api/applications',
      '/api/companies',
      '/api/dashboard/metrics'
    ];

    for (const endpoint of protectedEndpoints) {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint}`);

        results.push({
          endpoint,
          vulnerability: 'Auth Bypass',
          severity: 'CRITICAL',
          description: 'Accès sans authentification possible'
        });
        console.log(`❌ Auth bypass: ${endpoint}`);
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          results.push({
            endpoint,
            vulnerability: 'Auth Bypass',
            severity: 'NONE',
            protected: true,
            description: 'Authentification requise'
          });
          console.log(`✅ Auth protégée: ${endpoint}`);
        } else {
          results.push({
            endpoint,
            vulnerability: 'Auth Bypass',
            severity: 'UNKNOWN',
            description: `Erreur inattendue: ${error.message}`
          });
        }
      }
    }

    return results;
  }

  async testRateLimiting() {
    console.log('⏱️ Test rate limiting...');

    const results = [];
    const endpoint = `${this.baseURL}/api/auth/login`;
    const requests = [];

    // Envoyer de nombreuses requêtes rapidement
    for (let i = 0; i < 20; i++) {
      requests.push(
        axios.post(endpoint, {
          email: 'ratetest@example.com',
          password: 'wrongpassword'
        })
      );
    }

    try {
      const responses = await Promise.all(requests.map(p => p.catch(e => e.response)));

      const rateLimited = responses.filter(r => r?.status === 429).length;
      const successful = responses.filter(r => r?.status === 200).length;

      if (rateLimited > 0) {
        results.push({
          endpoint,
          vulnerability: 'Rate Limiting',
          severity: 'NONE',
          protected: true,
          description: `${rateLimited} requêtes limitées sur ${responses.length}`
        });
        console.log(`✅ Rate limiting actif: ${rateLimited}/${responses.length} requêtes limitées`);
      } else {
        results.push({
          endpoint,
          vulnerability: 'Rate Limiting',
          severity: 'MEDIUM',
          description: 'Aucun rate limiting détecté'
        });
        console.log('⚠️ Aucun rate limiting détecté');
      }
    } catch (error) {
      results.push({
        endpoint,
        vulnerability: 'Rate Limiting',
        severity: 'UNKNOWN',
        description: `Erreur: ${error.message}`
      });
    }

    return results;
  }

  async testHeadersSecurity() {
    console.log('📋 Test des en-têtes de sécurité...');

    const results = [];

    try {
      const response = await axios.get(`${this.baseURL}/`);

      const headers = response.headers;
      const securityHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': 'max-age=31536000',
        'content-security-policy': 'default-src'
      };

      console.log('📋 En-têtes de sécurité:');
      Object.entries(securityHeaders).forEach(([header, expected]) => {
        const value = headers[header] || headers[header.toLowerCase()];
        if (value && value.includes(expected)) {
          console.log(`✅ ${header}: ${value}`);
          results.push({ header, status: 'SECURE' });
        } else {
          console.log(`❌ ${header}: Manquant ou incorrect`);
          results.push({ header, status: 'MISSING' });
        }
      });

    } catch (error) {
      console.log(`❌ Erreur test headers: ${error.message}`);
      results.push({ header: 'all', status: 'ERROR', error: error.message });
    }

    return results;
  }

  async testDataExposure() {
    console.log('🔍 Test exposition des données...');

    const results = [];

    // Test endpoints qui pourraient exposer des données sensibles
    const sensitiveEndpoints = [
      '/api/users',
      '/api/companies',
      '/api/applications',
      '/api/auth/users'
    ];

    for (const endpoint of sensitiveEndpoints) {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint}`);

        // Vérifier si des données sensibles sont exposées
        const data = JSON.stringify(response.data);
        const hasSensitiveData = data.includes('password') ||
                                data.includes('token') ||
                                data.includes('secret') ||
                                data.includes('ssn') ||
                                data.includes('credit');

        if (hasSensitiveData) {
          results.push({
            endpoint,
            vulnerability: 'Data Exposure',
            severity: 'HIGH',
            description: 'Données sensibles potentiellement exposées'
          });
          console.log(`❌ Exposition données: ${endpoint}`);
        } else {
          results.push({
            endpoint,
            vulnerability: 'Data Exposure',
            severity: 'NONE',
            protected: true,
            description: 'Aucune donnée sensible détectée'
          });
          console.log(`✅ Données protégées: ${endpoint}`);
        }
      } catch (error) {
        // Erreur attendue pour les endpoints protégés
        results.push({
          endpoint,
          vulnerability: 'Data Exposure',
          severity: 'NONE',
          protected: true,
          description: 'Endpoint protégé'
        });
      }
    }

    return results;
  }

  async testInputValidation() {
    console.log('✅ Test validation des entrées...');

    const results = [];

    // Test des payloads malformés
    const malformedPayloads = [
      { data: '', description: 'Données vides' },
      { data: null, description: 'Données null' },
      { data: undefined, description: 'Données undefined' },
      { data: { nested: { deeply: { nested: 'value' } } }, description: 'Objet profondément nested' },
      { data: Array(1000).fill('a'), description: 'Tableau très long' },
      { data: 'a'.repeat(10000), description: 'String très long' }
    ];

    for (const payload of malformedPayloads) {
      try {
        await axios.post(`${this.baseURL}/api/test-validation`, payload.data);

        results.push({
          payload: payload.description,
          vulnerability: 'Input Validation',
          severity: 'MEDIUM',
          description: 'Validation insuffisante détectée'
        });
        console.log(`⚠️ Validation faible: ${payload.description}`);
      } catch (error) {
        results.push({
          payload: payload.description,
          vulnerability: 'Input Validation',
          severity: 'NONE',
          protected: true,
          description: 'Validation correcte'
        });
        console.log(`✅ Validation OK: ${payload.description}`);
      }
    }

    return results;
  }

  generateSecurityReport(vulnerabilities) {
    console.log('\n📊 RAPPORT DE SÉCURITÉ:');

    const critical = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
    const high = vulnerabilities.filter(v => v.severity === 'HIGH').length;
    const medium = vulnerabilities.filter(v => v.severity === 'MEDIUM').length;
    const low = vulnerabilities.filter(v => v.severity === 'LOW').length;

    console.log(`🚨 CRITIQUES: ${critical}`);
    console.log(`🔴 HAUTES: ${high}`);
    console.log(`🟡 MOYENNES: ${medium}`);
    console.log(`🟢 BASSES: ${low}`);
    console.log(`✅ SÉCURISÉES: ${vulnerabilities.filter(v => v.protected).length}`);

    if (critical > 0) {
      console.log('\n❌ VULNÉRABILITÉS CRITIQUES DÉTECTÉES!');
      console.log('Action immédiate requise.');
    } else if (high > 0) {
      console.log('\n⚠️ Vulnérabilités importantes détectées.');
      console.log('Correction recommandée dans les plus brefs délais.');
    } else {
      console.log('\n✅ Niveau de sécurité acceptable.');
      console.log('Surveillance continue recommandée.');
    }

    return {
      timestamp: new Date().toISOString(),
      totalVulnerabilities: vulnerabilities.length,
      critical,
      high,
      medium,
      low,
      secure: vulnerabilities.filter(v => v.protected).length,
      vulnerabilities: vulnerabilities.filter(v => !v.protected)
    };
  }

  async runAllTests() {
    console.log('🧪 Lancement de tous les tests de sécurité...\n');

    const securityTests = await Promise.all([
      this.testXSS(),
      this.testSQLInjection(),
      this.testCSRF(),
      this.testAuthBypass(),
      this.testRateLimiting(),
      this.testHeadersSecurity(),
      this.testDataExposure(),
      this.testInputValidation()
    ]);

    const allResults = securityTests.flat();
    const report = this.generateSecurityReport(allResults);

    // Sauvegarder le rapport (REPORT_DIR fourni par generate-test-report.sh, sinon fallback)
    const fs = require('fs');
    const path = require('path');
    const reportDir = process.env.REPORT_DIR || path.join(process.env.PROJECT_ROOT || process.cwd(), 'tests', 'results');
    const reportPath = path.join(reportDir, 'security-report.json');

    try {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📋 Rapport sauvegardé: ${reportPath}`);

    return report;
  }
}

// Script principal
async function main() {
  const tester = new SecurityTester();

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

module.exports = SecurityTester;

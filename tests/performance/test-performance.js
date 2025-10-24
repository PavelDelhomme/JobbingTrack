/**
 * Tests de performance complets
 * Tests de charge, performance et optimisation pour tous les services
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class PerformanceTester {
  constructor() {
    this.metrics = [];
    this.availableServices = new Map();
    this.serviceMapping = {
      'jobbingtrack-api-gateway': { name: 'apiGateway', port: 3000 },
      'jobbingtrack-frontend': { name: 'frontend', port: 8080 },
      'jobbingtrack-auth-service': { name: 'auth', port: 3001 },
      'jobbingtrack-application-service': { name: 'applications', port: 3002 },
      'jobbingtrack-company-service': { name: 'companies', port: 3003 },
      'jobbingtrack-contact-service': { name: 'contacts', port: 3004 },
      'jobbingtrack-interview-service': { name: 'interviews', port: 3005 },
      'jobbingtrack-notification-service': { name: 'notifications', port: 3006 },
      'jobbingtrack-dashboard-service': { name: 'dashboard', port: 3007 },
      'jobbingtrack-call-service': { name: 'calls', port: 3008 },
      'jobbingtrack-profile-service': { name: 'profile', port: 3009 },
      'jobbingtrack-event-service': { name: 'events', port: 3011 },
      'jobbingtrack-followup-service': { name: 'followups', port: 3012 },
      'jobbingtrack-workflow-service': { name: 'workflows', port: 3013 },
      'jobbingtrack-metrics-aggregator': { name: 'metrics', port: 3014 }
    };
  }

  // Détection automatique des services disponibles
  async detectAvailableServices() {
    console.log('🔍 Détection des services disponibles...');

    try {
      const { execSync } = require('child_process');

      // Lister les conteneurs Docker en cours d'exécution
      const dockerPs = execSync('docker ps --filter "name=jobbingtrack-" --format "{{.Names}}\\t{{.Ports}}"', { encoding: 'utf8' });

      const containers = dockerPs.trim().split('\n').filter(line => line.length > 0);

      this.availableServices.clear();

      for (const container of containers) {
        const [name, ports] = container.split('\t');

        if (this.serviceMapping[name]) {
          const serviceInfo = this.serviceMapping[name];
          const portMatch = ports.match(/0\.0\.0\.0:(\d+)/);

          if (portMatch) {
            const port = parseInt(portMatch[1]);
            this.availableServices.set(serviceInfo.name, {
              name: serviceInfo.name,
              port: port,
              url: `http://localhost:${port}`,
              containerName: name,
              status: 'running'
            });
          }
        }
      }

      console.log(`✅ Services détectés: ${this.availableServices.size}`);
      this.availableServices.forEach((service, name) => {
        console.log(`   ${name}: ${service.url} (${service.status})`);
      });

      return Array.from(this.availableServices.keys());

    } catch (error) {
      console.log('⚠️ Impossible de détecter les services Docker, utilisation des services par défaut');
      // Fallback vers les services essentiels
      this.availableServices.set('apiGateway', { name: 'apiGateway', port: 3000, url: 'http://localhost:3000', status: 'default' });
      this.availableServices.set('frontend', { name: 'frontend', port: 8080, url: 'http://localhost:8080', status: 'default' });

      return ['apiGateway', 'frontend'];
    }
  }

  // Démarrage intelligent des services nécessaires
  async startRequiredServices(services) {
    console.log('🚀 Démarrage des services nécessaires pour les tests...');

    const requiredServices = new Set();
    const { execSync } = require('child_process');

    // Services toujours nécessaires
    requiredServices.add('postgres');
    requiredServices.add('redis');

    // Ajouter les services demandés
    services.forEach(serviceName => {
      switch(serviceName) {
        case 'apiGateway':
          requiredServices.add('api-gateway');
          break;
        case 'frontend':
          requiredServices.add('frontend');
          break;
        case 'auth':
          requiredServices.add('auth-service');
          break;
        case 'applications':
          requiredServices.add('application-service');
          break;
        case 'companies':
          requiredServices.add('company-service');
          break;
        case 'contacts':
          requiredServices.add('contact-service');
          break;
        case 'interviews':
          requiredServices.add('interview-service');
          break;
        case 'notifications':
          requiredServices.add('notification-service');
          break;
        case 'dashboard':
          requiredServices.add('dashboard-service');
          break;
        case 'metrics':
          requiredServices.add('jobbingtrack-metrics-aggregator');
          break;
      }
    });

    try {
      const servicesList = Array.from(requiredServices).join(' ');
      console.log(`📦 Services à démarrer: ${servicesList}`);

      // Démarrer les services avec Docker Compose
      execSync(`docker-compose up -d ${servicesList}`, {
        stdio: 'inherit',
        timeout: 60000
      });

      console.log('⏳ Attente du démarrage des services...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Vérifier que les services sont bien démarrés
      await this.verifyServicesHealth();

    } catch (error) {
      console.log('⚠️ Erreur lors du démarrage des services:', error.message);
    }
  }

  // Vérification de la santé des services
  async verifyServicesHealth() {
    console.log('🔍 Vérification de la santé des services...');

    const healthChecks = [];

    for (const [serviceName, serviceInfo] of this.availableServices) {
      healthChecks.push(this.checkServiceHealth(serviceName, serviceInfo));
    }

    await Promise.allSettled(healthChecks);
  }

  async checkServiceHealth(serviceName, serviceInfo) {
    try {
      const response = await this.measureEndpoint(serviceInfo.url, '/health', 'GET');
      if (response.success) {
        console.log(`   ✅ ${serviceName}: ${response.status} - ${Math.round(response.duration)}ms`);
        serviceInfo.status = 'healthy';
      } else {
        console.log(`   ❌ ${serviceName}: ${response.error}`);
        serviceInfo.status = 'unhealthy';
      }
    } catch (error) {
      console.log(`   ❌ ${serviceName}: Service non accessible`);
      serviceInfo.status = 'unavailable';
    }
  }

  // Arrêt des services démarrés temporairement
  async stopTemporaryServices() {
    console.log('🛑 Arrêt des services temporaires...');

    try {
      const { execSync } = require('child_process');

      // Arrêter seulement les services qui n'étaient pas en cours d'exécution au départ
      const servicesToStop = [];

      for (const [serviceName, serviceInfo] of this.availableServices) {
        if (serviceInfo.wasRunning === false) {
          // Convertir le nom du service vers le nom du conteneur Docker
          const dockerServiceName = this.getDockerServiceName(serviceName);
          if (dockerServiceName) {
            servicesToStop.push(dockerServiceName);
          }
        }
      }

      if (servicesToStop.length > 0) {
        const servicesList = servicesToStop.join(' ');
        console.log(`📦 Services à arrêter: ${servicesList}`);

        execSync(`docker-compose stop ${servicesList}`, {
          stdio: 'inherit',
          timeout: 30000
        });

        console.log('✅ Services temporaires arrêtés');
      }

    } catch (error) {
      console.log('⚠️ Erreur lors de l\'arrêt des services:', error.message);
    }
  }

  getDockerServiceName(serviceName) {
    for (const [dockerName, serviceInfo] of Object.entries(this.serviceMapping)) {
      if (serviceInfo.name === serviceName) {
        return dockerName.replace('jobbingtrack-', '');
      }
    }
    return null;
  }

  async measureEndpoint(baseUrl, endpoint, method = 'GET', data = null) {
    const startTime = performance.now();

    try {
      const config = {
        method,
        url: `${baseUrl}${endpoint}`,
        timeout: 10000
      };
      if (data) config.data = data;

      const response = await axios(config);
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.metrics.push({
        endpoint: `${baseUrl}${endpoint}`,
        method,
        status: response.status,
        duration,
        timestamp: new Date().toISOString()
      });

      return { success: true, duration, status: response.status };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.metrics.push({
        endpoint: `${baseUrl}${endpoint}`,
        method,
        status: error.response?.status || 0,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return { success: false, duration, error: error.message };
    }
  }

  async testAPIPerformance() {
    console.log('⚡ Test des performances API...');

    // Générer les endpoints basés sur les services disponibles
    const endpoints = [];

    for (const [serviceName, serviceInfo] of this.availableServices) {
      // Test de base pour tous les services
      endpoints.push({
        service: serviceName,
        path: '/health',
        method: 'GET',
        description: `${serviceName} health check`
      });

      // Tests spécifiques selon le type de service
      switch (serviceName) {
        case 'apiGateway':
          endpoints.push(
            { service: serviceName, path: '/api/v1/services', method: 'GET', description: 'API Gateway services list' },
            { service: serviceName, path: '/metrics', method: 'GET', description: 'API Gateway metrics' }
          );
          break;
        case 'auth':
          endpoints.push(
            { service: serviceName, path: '/api/v1/auth/health', method: 'GET', description: 'Auth service health' }
          );
          break;
        case 'applications':
          endpoints.push(
            { service: serviceName, path: '/api/v1/applications', method: 'GET', description: 'Applications list' }
          );
          break;
        case 'companies':
          endpoints.push(
            { service: serviceName, path: '/api/v1/companies', method: 'GET', description: 'Companies list' }
          );
          break;
        case 'contacts':
          endpoints.push(
            { service: serviceName, path: '/api/v1/contacts', method: 'GET', description: 'Contacts list' }
          );
          break;
        case 'interviews':
          endpoints.push(
            { service: serviceName, path: '/api/v1/interviews', method: 'GET', description: 'Interviews list' }
          );
          break;
        case 'notifications':
          endpoints.push(
            { service: serviceName, path: '/api/v1/notifications', method: 'GET', description: 'Notifications list' }
          );
          break;
        case 'dashboard':
          endpoints.push(
            { service: serviceName, path: '/api/v1/dashboard/metrics', method: 'GET', description: 'Dashboard metrics' }
          );
          break;
        case 'metrics':
          endpoints.push(
            { service: serviceName, path: '/api/v1/metrics', method: 'GET', description: 'System metrics' }
          );
          break;
      }
    }

    console.log(`📋 Tests API programmés: ${endpoints.length} endpoints`);

    const results = [];
    for (const endpoint of endpoints) {
      if (this.availableServices.has(endpoint.service)) {
        const serviceInfo = this.availableServices.get(endpoint.service);
        const result = await this.measureEndpoint(serviceInfo.url, endpoint.path, endpoint.method);
        results.push({
          service: endpoint.service,
          path: endpoint.path,
          method: endpoint.method,
          description: endpoint.description,
          ...result
        });

        console.log(`   ${endpoint.service}${endpoint.path}: ${result.success ? '✅' : '❌'} ${Math.round(result.duration)}ms`);
      }

      // Attendre un peu entre les requêtes
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return results;
  }

  async testLoadPerformance() {
    console.log('🔥 Test de charge...');

    // Générer les tests de charge basés sur les services disponibles
    const loadTests = [];

    // Services prioritaires pour les tests de charge
    const priorityServices = ['apiGateway', 'auth', 'companies', 'applications', 'contacts', 'dashboard'];

    for (const serviceName of priorityServices) {
      if (this.availableServices.has(serviceName)) {
        const serviceInfo = this.availableServices.get(serviceName);

        // Déterminer l'endpoint à tester selon le service
        let endpoint = '/health';
        let requests = 20;

        switch (serviceName) {
          case 'apiGateway':
            endpoint = '/health';
            requests = 30;
            break;
          case 'auth':
            endpoint = '/health';
            requests = 25;
            break;
          case 'companies':
          case 'applications':
          case 'contacts':
            endpoint = '/api/v1/' + serviceName;
            requests = 15;
            break;
          case 'dashboard':
            endpoint = '/api/v1/dashboard/metrics';
            requests = 20;
            break;
        }

        loadTests.push({
          service: serviceName,
          endpoint: endpoint,
          requests: requests,
          description: `${serviceName} load test`
        });
      }
    }

    console.log(`📋 Tests de charge programmés: ${loadTests.length} services`);

    const results = [];
    let totalSuccessful = 0;
    let totalRequests = 0;
    let totalTime = 0;

    for (const test of loadTests) {
      console.log(`📊 Test de charge: ${test.service}${test.endpoint} (${test.requests} requêtes)`);

    const promises = [];
      for (let i = 0; i < test.requests; i++) {
        const serviceInfo = this.availableServices.get(test.service);
        promises.push(this.measureEndpoint(serviceInfo.url, test.endpoint, 'GET'));
      }

      const testResults = await Promise.all(promises);
      const successful = testResults.filter(r => r.success).length;
      const averageTime = testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length;

      results.push({
        service: test.service,
        endpoint: test.endpoint,
        description: test.description,
        successful,
        total: test.requests,
        averageTime,
        successRate: (successful / test.requests * 100).toFixed(1) + '%'
      });

      totalSuccessful += successful;
      totalRequests += test.requests;
      totalTime += averageTime;

      console.log(`   ✅ ${successful}/${test.requests} succès - ${Math.round(averageTime)}ms moyen`);

      // Petite pause entre les tests de charge
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const overallAverageTime = totalTime / loadTests.length;

    console.log(`📊 Charge test global: ${totalSuccessful}/${totalRequests} succès`);
    console.log(`⏱️ Temps moyen global: ${Math.round(overallAverageTime)}ms`);

    return {
      tests: results,
      overall: {
        successful: totalSuccessful,
        total: totalRequests,
        averageTime: overallAverageTime,
        successRate: (totalSuccessful / totalRequests * 100).toFixed(1) + '%'
      }
    };
  }

  async testDatabasePerformance() {
    console.log('💾 Test des performances base de données...');

    // Tests via les services qui interagissent avec la base de données
    const dbTests = [];

    // Services qui utilisent la base de données
    const dbServices = ['auth', 'companies', 'applications', 'contacts', 'interviews', 'dashboard'];

    for (const serviceName of dbServices) {
      if (this.availableServices.has(serviceName)) {
        let endpoint = '/health';
        let description = `${serviceName} DB connection`;

        switch (serviceName) {
          case 'companies':
            endpoint = '/api/v1/companies';
            description = 'Companies data access';
            break;
          case 'applications':
            endpoint = '/api/v1/applications';
            description = 'Applications data access';
            break;
          case 'contacts':
            endpoint = '/api/v1/contacts';
            description = 'Contacts data access';
            break;
          case 'interviews':
            endpoint = '/api/v1/interviews';
            description = 'Interviews data access';
            break;
          case 'dashboard':
            endpoint = '/api/v1/dashboard/metrics';
            description = 'Dashboard data aggregation';
            break;
        }

        dbTests.push({
          service: serviceName,
          endpoint: endpoint,
          description: description
        });
      }
    }

    console.log(`📋 Tests DB programmés: ${dbTests.length} services`);

    const results = [];
    for (const test of dbTests) {
      const serviceInfo = this.availableServices.get(test.service);
      const startTime = performance.now();

      try {
        const response = await axios.get(`${serviceInfo.url}${test.endpoint}`, { timeout: 5000 });
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          query: test.description,
          duration,
          success: true,
          status: response.status,
          service: test.service
        });

        console.log(`✅ ${test.service}: ${Math.round(duration)}ms`);
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          query: test.description,
          duration,
          success: false,
          error: error.message,
          service: test.service
        });

        console.log(`❌ ${test.service}: ${Math.round(duration)}ms - ${error.message}`);
      }
    }

    return results;
  }

  async testFrontendPerformance() {
    console.log('🎨 Test des performances frontend...');

    // Vérifier si le frontend est disponible
    if (!this.availableServices.has('frontend')) {
      console.log('⚠️ Frontend non disponible, tests frontend ignorés');
      return [];
    }

    const frontendInfo = this.availableServices.get('frontend');
    const frontendUrl = frontendInfo.url;

    const pageTests = [
      { path: '/', description: 'Page d\'accueil' },
      { path: '/login', description: 'Page de connexion' },
      { path: '/dashboard', description: 'Tableau de bord' },
      { path: '/applications', description: 'Gestion des candidatures' },
      { path: '/companies', description: 'Gestion des entreprises' },
      { path: '/contacts', description: 'Gestion des contacts' },
      { path: '/interviews', description: 'Gestion des entretiens' },
      { path: '/backoffice', description: 'Interface d\'administration' },
      { path: '/admin', description: 'Administration avancée' }
    ];

    console.log(`📋 Tests frontend programmés: ${pageTests.length} pages sur ${frontendUrl}`);

    const results = [];
    for (const page of pageTests) {
      const startTime = performance.now();

      try {
        const response = await axios.get(`${frontendUrl}${page.path}`, { timeout: 10000 });
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          page: page.path,
          description: page.description,
          duration,
          success: true,
          status: response.status,
          contentLength: response.headers['content-length'] || 'N/A'
        });

        console.log(`✅ ${page.path}: ${Math.round(duration)}ms`);
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          page: page.path,
          description: page.description,
          duration,
          success: false,
          error: error.message
        });

        console.log(`❌ ${page.path}: ${Math.round(duration)}ms - ${error.message}`);
      }
    }

    return results;
  }

  async testMemoryUsage() {
    console.log('🧠 Test de l\'utilisation mémoire...');

    const initialMemory = process.memoryUsage();

    // Simuler une charge de données réaliste
    console.log('📊 Test de traitement de données...');
    const dataSizes = [1000, 5000, 10000];

    for (const size of dataSizes) {
      const testData = Array(size).fill().map((_, i) => ({
      id: i,
      name: `Test Item ${i}`,
      description: `Description for item ${i}`,
        data: Math.random().toString(36).repeat(50),
        tags: [`tag${i % 10}`, `category${i % 5}`],
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: Math.floor(Math.random() * 10)
        }
    }));

    // Traitement des données
      const startTime = performance.now();
      const processed = testData.map(item => ({
      ...item,
      processed: true,
        timestamp: new Date().toISOString(),
        hash: require('crypto').createHash('md5').update(JSON.stringify(item)).digest('hex')
    }));
      const endTime = performance.now();

      console.log(`   ✅ Traitement ${size} éléments: ${Math.round(endTime - startTime)}ms`);
    }

    const afterMemory = process.memoryUsage();
    const memoryIncrease = {
      rss: afterMemory.rss - initialMemory.rss,
      heapUsed: afterMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: afterMemory.heapTotal - initialMemory.heapTotal
    };

    console.log(`📊 Augmentation mémoire:`);
    console.log(`   RSS: ${(memoryIncrease.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap Used: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap Total: ${(memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)} MB`);

    return memoryIncrease;
  }

  async testStressPerformance() {
    console.log('💥 Test de stress...');

    // Services pour les tests de stress (basés sur les services disponibles)
    const stressServices = ['apiGateway', 'auth', 'companies', 'applications', 'dashboard'];
    const stressTests = [];

    for (const serviceName of stressServices) {
      if (this.availableServices.has(serviceName)) {
        let endpoint = '/health';
        let requests = 50;

        switch (serviceName) {
          case 'apiGateway':
            endpoint = '/health';
            requests = 100; // Plus de charge pour le gateway
            break;
          case 'auth':
            endpoint = '/health';
            requests = 75;
            break;
          case 'companies':
          case 'applications':
            endpoint = '/api/v1/' + serviceName;
            requests = 50;
            break;
          case 'dashboard':
            endpoint = '/api/v1/dashboard/metrics';
            requests = 60;
            break;
        }

        stressTests.push({
          service: serviceName,
          endpoint: endpoint,
          requests: requests,
          description: `${serviceName} stress test`
        });
      }
    }

    console.log(`📋 Tests de stress programmés: ${stressTests.length} services`);

    const results = [];
    for (const test of stressTests) {
      console.log(`💥 Test de stress: ${test.service}${test.endpoint} (${test.requests} requêtes simultanées)`);

      const promises = [];
      for (let i = 0; i < test.requests; i++) {
        const serviceInfo = this.availableServices.get(test.service);
        promises.push(this.measureEndpoint(serviceInfo.url, test.endpoint, 'GET'));
      }

      const startTime = performance.now();
      const testResults = await Promise.allSettled(promises);
      const endTime = performance.now();

      const successful = testResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = testResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      const totalTime = endTime - startTime;

      results.push({
        service: test.service,
        endpoint: test.endpoint,
        description: test.description,
        successful,
        failed,
        total: test.requests,
        totalTime,
        requestsPerSecond: Math.round((test.requests / totalTime) * 1000),
        successRate: (successful / test.requests * 100).toFixed(1) + '%'
      });

      console.log(`   ✅ ${successful}/${test.requests} succès - ${Math.round(totalTime)}ms total - ${Math.round((test.requests / totalTime) * 1000)} req/s`);
    }

    return results;
  }

  async generatePerformanceReport() {
    console.log('📊 Génération du rapport de performance...');

    // 1. Détecter les services disponibles
    const availableServiceNames = await this.detectAvailableServices();

    // 2. Marquer l'état initial des services
    for (const [serviceName, serviceInfo] of this.availableServices) {
      serviceInfo.wasRunning = serviceInfo.status === 'running' || serviceInfo.status === 'healthy';
    }

    // 3. Déterminer les services à tester
    const servicesToTest = availableServiceNames.length > 0 ? availableServiceNames : ['apiGateway', 'frontend'];

    // 4. Démarrer les services nécessaires
    await this.startRequiredServices(servicesToTest);

    // 5. Attendre que les services soient prêts
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 6. Redétecter les services après démarrage
    await this.detectAvailableServices();

    const report = {
      timestamp: new Date().toISOString(),
      availableServices: Array.from(this.availableServices.keys()),
      api: await this.testAPIPerformance(),
      load: await this.testLoadPerformance(),
      database: await this.testDatabasePerformance(),
      frontend: await this.testFrontendPerformance(),
      memory: await this.testMemoryUsage(),
      stress: await this.testStressPerformance(),
      summary: {
        totalTests: 0,
        successfulTests: 0,
        averageResponseTime: 0,
        totalRequests: 0,
        successfulRequests: 0
      }
    };

    // Calculer le résumé
    const allResults = [
      ...report.api,
      ...report.database,
      ...report.frontend
    ];

    const loadResults = report.load.tests || [];
    const stressResults = report.stress || [];

    report.summary.totalTests = allResults.length + loadResults.length + stressResults.length;
    report.summary.successfulTests = allResults.filter(r => r.success).length +
                                   loadResults.filter(r => r.successful > 0).length +
                                   stressResults.filter(r => r.successful > 0).length;

    report.summary.totalRequests = loadResults.reduce((sum, r) => sum + r.total, 0) +
                                 stressResults.reduce((sum, r) => sum + r.total, 0);

    report.summary.successfulRequests = loadResults.reduce((sum, r) => sum + r.successful, 0) +
                                      stressResults.reduce((sum, r) => sum + r.successful, 0);

    const successfulTimes = allResults
      .filter(r => r.success && r.duration)
      .map(r => r.duration);

    if (successfulTimes.length > 0) {
      report.summary.averageResponseTime = successfulTimes.reduce((sum, time) => sum + time, 0) / successfulTimes.length;
    }

    // Ajouter des métriques de performance système
    report.system = {
      platform: process.platform,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    // Sauvegarder le rapport
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join('tests', 'reports', 'performance-report.json');

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 7. Arrêter les services temporaires
    await this.stopTemporaryServices();

    console.log(`✅ Rapport sauvegardé: ${reportPath}`);
    return report;
  }

  analyzePerformance(results) {
    console.log('\n📊 ANALYSE DES PERFORMANCES COMPLÈTE:');
    console.log('=====================================');

    const { summary } = results;

    console.log(`🧪 Tests totaux: ${summary.totalTests}`);
    console.log(`✅ Tests réussis: ${summary.successfulTests}`);
    console.log(`❌ Tests échoués: ${summary.totalTests - summary.successfulTests}`);
    console.log(`⏱️ Temps moyen: ${Math.round(summary.averageResponseTime)}ms`);

    if (summary.totalRequests > 0) {
      console.log(`📊 Requêtes totales: ${summary.totalRequests}`);
      console.log(`✅ Requêtes réussies: ${summary.successfulRequests}`);
      console.log(`❌ Requêtes échouées: ${summary.totalRequests - summary.successfulRequests}`);
      console.log(`📈 Taux de succès: ${(summary.successfulRequests / summary.totalRequests * 100).toFixed(1)}%`);
    }

    // Afficher les services disponibles
    console.log('\n🔍 SERVICES DÉTECTÉS:');
    if (results.availableServices && results.availableServices.length > 0) {
      console.log(`📦 Services disponibles: ${results.availableServices.length}`);
      results.availableServices.forEach(service => {
        const serviceInfo = this.availableServices.get(service);
        const status = serviceInfo ? serviceInfo.status : 'unknown';
        console.log(`   ${service}: ${status}`);
      });
    }

    // Analyser les services temporaires
    const tempServices = [];
    for (const [serviceName, serviceInfo] of this.availableServices) {
      if (serviceInfo.wasRunning === false && serviceInfo.status !== 'default') {
        tempServices.push(serviceName);
      }
    }

    if (tempServices.length > 0) {
      console.log(`\n🚀 Services démarrés temporairement: ${tempServices.join(', ')}`);
      console.log(`   (Arrêtés automatiquement après les tests)`);
    }

    // Analyse détaillée par catégorie
    console.log('\n📋 ANALYSE PAR CATÉGORIE:');

    if (results.api && results.api.length > 0) {
      const apiSuccess = results.api.filter(r => r.success).length;
      console.log(`🔧 API Services: ${apiSuccess}/${results.api.length} succès`);
    }

    if (results.database && results.database.length > 0) {
      const dbSuccess = results.database.filter(r => r.success).length;
      console.log(`💾 Base de données: ${dbSuccess}/${results.database.length} succès`);
    }

    if (results.frontend && results.frontend.length > 0) {
      const frontendSuccess = results.frontend.filter(r => r.success).length;
      console.log(`🎨 Frontend: ${frontendSuccess}/${results.frontend.length} succès`);
    }

    if (results.load && results.load.overall) {
      console.log(`🔥 Tests de charge: ${results.load.overall.successRate} de succès`);
      console.log(`⚡ Débit moyen: ${Math.round(results.load.overall.averageTime)}ms par requête`);
    }

    if (results.stress && results.stress.length > 0) {
      const stressSuccess = results.stress.filter(r => r.successful > 0).length;
      console.log(`💥 Tests de stress: ${stressSuccess}/${results.stress.length} services stables`);
    }

    // Recommandations détaillées
    console.log('\n💡 RECOMMANDATIONS:');

    if (summary.averageResponseTime > 1000) {
      console.log('⚠️  Temps de réponse élevé - Considérer l\'optimisation des requêtes et du cache');
    } else if (summary.averageResponseTime > 500) {
      console.log('📊 Temps de réponse acceptable - Surveillance recommandée');
    } else {
      console.log('✅ Performances de latence excellentes');
    }

    if (summary.totalRequests > 0) {
      const successRate = (summary.successfulRequests / summary.totalRequests) * 100;
      if (successRate < 90) {
        console.log('❌ Taux de succès sous les tests de charge faible - Investigation nécessaire');
        console.log('💡 Suggestions: Augmenter les ressources, optimiser les requêtes, vérifier les timeouts');
      } else if (successRate < 95) {
        console.log('⚠️ Taux de succès acceptable - Amélioration possible');
      } else {
        console.log('✅ Taux de succès excellent sous charge');
      }
    }

    if (results.memory) {
      const heapUsedMB = (results.memory.heapUsed / 1024 / 1024).toFixed(2);
      if (results.memory.heapUsed > 100 * 1024 * 1024) { // 100MB
        console.log(`⚠️ Utilisation mémoire élevée: ${heapUsedMB}MB - Optimisation recommandée`);
      } else {
        console.log(`✅ Utilisation mémoire correcte: ${heapUsedMB}MB`);
      }
    }

    console.log('\n📈 SCORE GLOBAL:');
    const globalScore = this.calculateGlobalScore(results);
    console.log(`🎯 Score de performance: ${globalScore}/100`);

    if (globalScore >= 90) {
      console.log('🏆 Performances excellentes - Système prêt pour la production');
    } else if (globalScore >= 75) {
      console.log('👍 Bonnes performances - Quelques optimisations possibles');
    } else if (globalScore >= 60) {
      console.log('⚠️ Performances acceptables - Améliorations recommandées');
    } else {
      console.log('❌ Performances insuffisantes - Optimisation urgente nécessaire');
    }
  }

  calculateGlobalScore(results) {
    let score = 100;

    // Pénalité basée sur le taux de succès
    if (results.summary.totalRequests > 0) {
      const successRate = (results.summary.successfulRequests / results.summary.totalRequests) * 100;
      score -= (100 - successRate) * 0.5;
    }

    // Pénalité basée sur le temps de réponse
    if (results.summary.averageResponseTime > 1000) {
      score -= 20;
    } else if (results.summary.averageResponseTime > 500) {
      score -= 10;
    } else if (results.summary.averageResponseTime > 200) {
      score -= 5;
    }

    // Pénalité basée sur l'utilisation mémoire
    if (results.memory && results.memory.heapUsed > 100 * 1024 * 1024) {
      score -= 15;
    } else if (results.memory && results.memory.heapUsed > 50 * 1024 * 1024) {
      score -= 5;
    }

    return Math.max(0, Math.round(score));
  }

  async runAllTests() {
    console.log('🧪 Lancement de tous les tests de performance...\n');

    const report = await this.generatePerformanceReport();
    this.analyzePerformance(report);

    return report;
  }
}

// Script principal
async function main() {
  const tester = new PerformanceTester();

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

module.exports = PerformanceTester;

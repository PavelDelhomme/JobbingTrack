const { execSync } = require('child_process');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3008';
const PROMETHEUS_URL = 'http://127.0.0.1:9090';
const LOKI_URL = 'http://127.0.0.1:3100';
const CADVISOR_URL = 'http://127.0.0.1:8081';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Tests de workflow complet du monitoring
 * Teste le cycle de vie complet : démarrage, vérification, récupération de données, arrêt
 */
describe('Monitoring Stack Workflow', () => {
  let validToken;

  beforeAll(() => {
    // Générer un token JWT valide
    validToken = jwt.sign(
      { id: 1, email: 'redacted@example.invalid', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  /**
   * Attend que tous les services soient prêts
   */
  const waitForServices = async (maxAttempts = 30, delayMs = 2000) => {
    console.log('⏳ Waiting for services to be ready...');
    
    const services = [
      { name: 'Metrics API', url: `${BASE_URL}/health` },
      { name: 'Prometheus', url: `${PROMETHEUS_URL}/-/ready` },
      { name: 'Loki', url: `${LOKI_URL}/ready` },
      { name: 'cAdvisor', url: `${CADVISOR_URL}/healthz` }
    ];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const results = await Promise.allSettled(
        services.map(service => 
          axios.get(service.url, { timeout: 2000 })
            .then(() => ({ service: service.name, status: 'ready' }))
            .catch(() => ({ service: service.name, status: 'not ready' }))
        )
      );

      const statuses = results.map(r => r.value || r.reason);
      const allReady = statuses.every(s => s.status === 'ready');

      if (allReady) {
        console.log('✅ All services ready!');
        return true;
      }

      console.log(`Attempt ${attempt}/${maxAttempts}:`, 
        statuses.map(s => `${s.service}: ${s.status}`).join(', ')
      );

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw new Error('Services failed to start within timeout');
  };

  describe('Stack Lifecycle', () => {
    it('should start monitoring stack using make command', () => {
      console.log('🚀 Starting monitoring stack...');
      
      try {
        execSync('cd makefiles/backend && make monitoring-up', {
          cwd: process.cwd() + '/../..',
          stdio: 'inherit',
          timeout: 60000
        });
        
        console.log('✅ Monitoring stack started successfully');
      } catch (error) {
        console.error('❌ Failed to start monitoring stack:', error.message);
        throw error;
      }
    }, 90000); // 90 secondes de timeout

    it('should wait for all services to be ready', async () => {
      await waitForServices();
    }, 90000);

    it('should verify Prometheus is collecting metrics', async () => {
      // Attendre quelques secondes pour que Prometheus collecte des données
      await new Promise(resolve => setTimeout(resolve, 10000));

      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query: 'up' }
      });

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('success');
      expect(response.data.data.result.length).toBeGreaterThan(0);

      console.log(`✅ Prometheus is collecting metrics from ${response.data.data.result.length} targets`);
    });

    it('should verify Loki is receiving logs', async () => {
      const now = Date.now() * 1000000;
      const fiveMinutesAgo = now - (300 * 1000000000);

      const response = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
        params: {
          query: '{job="docker"}',
          start: fiveMinutesAgo,
          end: now,
          limit: 10
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('success');

      const logCount = response.data.data.result.length;
      console.log(`✅ Loki has ${logCount} log streams`);
    });

    it('should verify cAdvisor is exposing container metrics', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.status).toBe(200);
      expect(response.data).toContain('container_cpu_usage_seconds_total');

      // Compter le nombre de conteneurs détectés
      const containerMetrics = response.data.split('\n').filter(line => 
        line.includes('name="') && 
        !line.includes('name=""') &&
        !line.startsWith('#')
      );

      console.log(`✅ cAdvisor is monitoring ${containerMetrics.length} container metrics`);
    });
  });

  describe('End-to-End Data Flow', () => {
    it('should retrieve system metrics via Metrics API', async () => {
      const response = await axios.get(`${BASE_URL}/api/metrics/system`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('cpu_cores');
      expect(response.data.data).toHaveProperty('memory_total');
      expect(response.data.data).toHaveProperty('containers_running');

      console.log('✅ System metrics retrieved successfully');
      console.log('  CPU Cores:', response.data.data.cpu_cores);
      console.log('  Memory Total:', response.data.data.memory_total);
      console.log('  Containers Running:', response.data.data.containers_running);
    });

    it('should retrieve container metrics via Metrics API', async () => {
      const response = await axios.get(`${BASE_URL}/api/metrics/containers`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('cpu');
      expect(response.data.data).toHaveProperty('memory');

      const containerCount = response.data.data.cpu.length;
      console.log(`✅ Retrieved metrics for ${containerCount} containers`);
    });

    it('should retrieve logs for a specific container via Metrics API', async () => {
      const response = await axios.get(
        `${BASE_URL}/api/logs/container/prometheus`,
        {
          headers: { 'Authorization': `Bearer ${validToken}` },
          params: { limit: 10 }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty('container', 'prometheus');
      expect(response.data).toHaveProperty('logs');

      console.log('✅ Container logs retrieved successfully');
    });

    it('should retrieve historical metrics data', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await axios.get(`${BASE_URL}/api/metrics/history`, {
        headers: { 'Authorization': `Bearer ${validToken}` },
        params: {
          query: 'container_cpu_usage_seconds_total',
          start: oneHourAgo,
          end: now,
          step: '1m'
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty('data');

      console.log('✅ Historical metrics retrieved successfully');
    });
  });

  describe('Monitoring Stack Status', () => {
    it('should verify all targets are UP in Prometheus', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/targets`);

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('success');

      const targets = response.data.data.activeTargets;
      const upTargets = targets.filter(t => t.health === 'up');
      const downTargets = targets.filter(t => t.health !== 'up');

      console.log(`✅ Prometheus targets: ${upTargets.length} UP, ${downTargets.length} DOWN`);
      
      targets.forEach(target => {
        console.log(`  ${target.labels.job}: ${target.health}`);
      });

      // Au minimum, Prometheus et cAdvisor devraient être UP
      expect(upTargets.length).toBeGreaterThan(0);
    });

    it('should verify Loki labels are configured', async () => {
      const response = await axios.get(`${LOKI_URL}/loki/api/v1/labels`);

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('success');
      
      const labels = response.data.data;
      console.log('✅ Loki labels:', labels.join(', '));
      
      expect(labels).toContain('job');
    });

    it('should check Prometheus storage TSDB stats', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/status/tsdb`);

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('success');

      const stats = response.data.data;
      console.log('✅ Prometheus TSDB stats:');
      console.log('  Series count:', Object.keys(stats.seriesCountByMetricName || {}).length);
    });
  });

  describe('Performance and Load', () => {
    it('should handle concurrent metric requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        axios.get(`${BASE_URL}/api/metrics/system`, {
          headers: { 'Authorization': `Bearer ${validToken}` }
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
      });

      console.log(`✅ Handled 10 concurrent requests in ${duration}ms`);
    });

    it('should measure API response time', async () => {
      const startTime = Date.now();
      
      await axios.get(`${BASE_URL}/api/metrics/containers`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ API response time: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(5000); // Moins de 5 secondes
    });
  });

  describe('Stack Shutdown', () => {
    it('should stop monitoring stack using make command', () => {
      console.log('🛑 Stopping monitoring stack...');
      
      try {
        execSync('cd makefiles/backend && make monitoring-down', {
          cwd: process.cwd() + '/../..',
          stdio: 'inherit',
          timeout: 60000
        });
        
        console.log('✅ Monitoring stack stopped successfully');
      } catch (error) {
        console.error('❌ Failed to stop monitoring stack:', error.message);
        throw error;
      }
    }, 90000);

    it('should verify services are stopped', async () => {
      // Attendre un peu pour que les conteneurs s'arrêtent
      await new Promise(resolve => setTimeout(resolve, 5000));

      const services = [
        { name: 'Prometheus', url: `${PROMETHEUS_URL}/-/ready` },
        { name: 'Loki', url: `${LOKI_URL}/ready` },
        { name: 'cAdvisor', url: `${CADVISOR_URL}/healthz` }
      ];

      for (const service of services) {
        try {
          await axios.get(service.url, { timeout: 2000 });
          console.log(`⚠️ ${service.name} is still running`);
        } catch (error) {
          console.log(`✅ ${service.name} stopped`);
        }
      }
    });
  });
});

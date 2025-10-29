const axios = require('axios');

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://127.0.0.1:9090';

/**
 * Tests d'intégration Prometheus
 * Vérifie que Prometheus est accessible et fonctionne correctement
 */
describe('Prometheus Integration Tests', () => {
  
  describe('Prometheus Accessibility', () => {
    it('should be accessible on http://127.0.0.1:9090', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/-/healthy`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
    });

    it('should return ready status', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/-/ready`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Prometheus Query API', () => {
    it('should support instant queries via /api/v1/query', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: {
          query: 'up'
        },
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'success');
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('resultType');
      expect(response.data.data).toHaveProperty('result');
    });

    it('should return results for "up" metric', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: {
          query: 'up'
        }
      });

      expect(response.data.status).toBe('success');
      expect(Array.isArray(response.data.data.result)).toBe(true);
      expect(response.data.data.result.length).toBeGreaterThan(0);
    });

    it('should support range queries via /api/v1/query_range', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
        params: {
          query: 'up',
          start: oneHourAgo,
          end: now,
          step: '1m'
        },
        timeout: 10000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'success');
      expect(response.data.data).toHaveProperty('resultType', 'matrix');
    });
  });

  describe('Prometheus Targets', () => {
    it('should have cAdvisor as a target', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/targets`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'success');
      expect(response.data.data).toHaveProperty('activeTargets');
      
      const targets = response.data.data.activeTargets;
      const cadvisorTarget = targets.find(t => 
        t.labels && t.labels.job === 'cadvisor'
      );

      expect(cadvisorTarget).toBeDefined();
    });

    it('should have cAdvisor target in UP state', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/targets`);

      const targets = response.data.data.activeTargets;
      const cadvisorTarget = targets.find(t => 
        t.labels && t.labels.job === 'cadvisor'
      );

      if (cadvisorTarget) {
        expect(cadvisorTarget.health).toBe('up');
      }
    });

    it('should have prometheus self-monitoring target', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/targets`);

      const targets = response.data.data.activeTargets;
      const prometheusTarget = targets.find(t => 
        t.labels && t.labels.job === 'prometheus'
      );

      expect(prometheusTarget).toBeDefined();
      expect(prometheusTarget.health).toBe('up');
    });
  });

  describe('Container Metrics from cAdvisor', () => {
    it('should collect container_cpu_usage_seconds_total metric', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: {
          query: 'container_cpu_usage_seconds_total'
        }
      });

      expect(response.data.status).toBe('success');
      expect(response.data.data.result.length).toBeGreaterThan(0);
    });

    it('should collect container_memory_usage_bytes metric', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: {
          query: 'container_memory_usage_bytes'
        }
      });

      expect(response.data.status).toBe('success');
      expect(response.data.data.result.length).toBeGreaterThan(0);
    });

    it('should collect container_network_receive_bytes_total metric', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: {
          query: 'container_network_receive_bytes_total'
        }
      });

      expect(response.data.status).toBe('success');
      // Peut être vide si aucun conteneur n'a de réseau
      expect(Array.isArray(response.data.data.result)).toBe(true);
    });

    it('should filter metrics by container name', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: {
          query: 'container_cpu_usage_seconds_total{name!=""}'
        }
      });

      expect(response.data.status).toBe('success');
      
      // Vérifier que les résultats ont un label "name"
      if (response.data.data.result.length > 0) {
        const firstResult = response.data.data.result[0];
        expect(firstResult.metric).toHaveProperty('name');
        expect(firstResult.metric.name).not.toBe('');
      }
    });
  });

  describe('Prometheus Configuration', () => {
    it('should have correct scrape interval', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/status/config`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'success');
      
      const config = response.data.data.yaml;
      expect(config).toContain('scrape_interval');
    });

    it('should have external labels configured', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/status/config`);

      const config = response.data.data.yaml;
      expect(config).toContain('external_labels');
      expect(config).toContain('cluster');
      expect(config).toContain('jobbingtrack');
    });
  });

  describe('Prometheus Storage and Retention', () => {
    it('should report TSDB stats', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/status/tsdb`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'success');
      expect(response.data.data).toHaveProperty('seriesCountByMetricName');
    });
  });
});

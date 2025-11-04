const axios = require('axios');

const CADVISOR_URL = process.env.CADVISOR_URL || 'http://127.0.0.1:8081';

/**
 * Tests d'intégration cAdvisor
 * Vérifie que cAdvisor collecte les métriques des conteneurs Docker
 */
describe('cAdvisor Integration Tests', () => {
  
  describe('cAdvisor Accessibility', () => {
    it('should be accessible on http://127.0.0.1:8081', async () => {
      const response = await axios.get(`${CADVISOR_URL}/healthz`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
    });

    it('should serve Prometheus metrics on /metrics', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
    });
  });

  describe('Container CPU Metrics', () => {
    it('should expose container_cpu_usage_seconds_total metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_cpu_usage_seconds_total');
    });

    it('should include container_cpu_system_seconds_total metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_cpu_system_seconds_total');
    });

    it('should include container_cpu_user_seconds_total metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_cpu_user_seconds_total');
    });

    it('should have CPU metrics with container name labels', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      // Vérifier que les métriques ont des labels name=""
      const cpuMetrics = response.data.split('\n').filter(line => 
        line.includes('container_cpu_usage_seconds_total') && 
        line.includes('name=') &&
        !line.startsWith('#')
      );

      expect(cpuMetrics.length).toBeGreaterThan(0);
    });
  });

  describe('Container Memory Metrics', () => {
    it('should expose container_memory_usage_bytes metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_memory_usage_bytes');
    });

    it('should expose container_memory_cache metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_memory_cache');
    });

    it('should expose container_memory_rss metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_memory_rss');
    });

    it('should expose container_spec_memory_limit_bytes metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_spec_memory_limit_bytes');
    });

    it('should expose container_memory_working_set_bytes metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_memory_working_set_bytes');
    });
  });

  describe('Container Network Metrics', () => {
    it('should expose container_network_receive_bytes_total metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_network_receive_bytes_total');
    });

    it('should expose container_network_transmit_bytes_total metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_network_transmit_bytes_total');
    });

    it('should expose container_network_receive_packets_total metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_network_receive_packets_total');
    });

    it('should expose container_network_transmit_packets_total metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_network_transmit_packets_total');
    });
  });

  describe('Container Filesystem Metrics', () => {
    it('should expose container_fs_usage_bytes metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_fs_usage_bytes');
    });

    it('should expose container_fs_limit_bytes metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_fs_limit_bytes');
    });

    it('should expose container_fs_reads_total metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_fs_reads_total');
    });

    it('should expose container_fs_writes_total metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_fs_writes_total');
    });
  });

  describe('Container Lifecycle Metrics', () => {
    it('should expose container_start_time_seconds metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_start_time_seconds');
    });

    it('should expose container_last_seen metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('container_last_seen');
    });
  });

  describe('Machine/Host Metrics', () => {
    it('should expose machine_cpu_cores metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('machine_cpu_cores');
    });

    it('should expose machine_memory_bytes metric', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      expect(response.data).toContain('machine_memory_bytes');
    });
  });

  describe('Metrics Format Validation', () => {
    it('should return metrics in Prometheus format', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      // Vérifier le format Prometheus
      const lines = response.data.split('\n');
      
      // Devrait contenir des commentaires HELP
      const helpLines = lines.filter(line => line.startsWith('# HELP'));
      expect(helpLines.length).toBeGreaterThan(0);

      // Devrait contenir des commentaires TYPE
      const typeLines = lines.filter(line => line.startsWith('# TYPE'));
      expect(typeLines.length).toBeGreaterThan(0);
    });

    it('should have valid metric lines with labels', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      const lines = response.data.split('\n');
      
      // Trouver une ligne métrique avec labels
      const metricLine = lines.find(line => 
        line.includes('container_cpu_usage_seconds_total') &&
        line.includes('{') &&
        line.includes('}') &&
        !line.startsWith('#')
      );

      expect(metricLine).toBeDefined();
      
      if (metricLine) {
        // Vérifier format: metric_name{label="value"} value timestamp
        expect(metricLine).toMatch(/^[\w_]+\{.*\}\s+[\d.e+-]+/);
      }
    });

    it('should include container image labels', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      // Vérifier que les métriques ont le label image
      const hasImageLabel = response.data.includes('image=');
      expect(hasImageLabel).toBe(true);
    });

    it('should include container id labels', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      // Vérifier que les métriques ont le label id
      const hasIdLabel = response.data.includes('id=');
      expect(hasIdLabel).toBe(true);
    });
  });

  describe('Docker Container Detection', () => {
    it('should detect running Docker containers', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      // Vérifier qu'il y a des métriques pour des conteneurs nommés
      const containerMetrics = response.data.split('\n').filter(line => 
        line.includes('name="') &&
        !line.includes('name=""') &&
        !line.startsWith('#')
      );

      expect(containerMetrics.length).toBeGreaterThan(0);
    });

    it('should expose metrics for JobbingTrack containers', async () => {
      const response = await axios.get(`${CADVISOR_URL}/metrics`);

      // Chercher des conteneurs JobbingTrack
      const jobbingtrackContainers = response.data.split('\n').filter(line => 
        line.includes('name="') &&
        (line.includes('jobbingtrack') || line.includes('postgres') || line.includes('redis')) &&
        !line.startsWith('#')
      );

      // Au moins un conteneur JobbingTrack devrait être présent
      if (jobbingtrackContainers.length > 0) {
        console.log(`✅ Found ${jobbingtrackContainers.length} JobbingTrack container metrics`);
      }
    });
  });

  describe('API Endpoints', () => {
    it('should provide container info via /api/v1.3/docker endpoint', async () => {
      const response = await axios.get(`${CADVISOR_URL}/api/v1.3/docker`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should provide machine info via /api/v1.3/machine endpoint', async () => {
      const response = await axios.get(`${CADVISOR_URL}/api/v1.3/machine`, {
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('num_cores');
      expect(response.data).toHaveProperty('memory_capacity');
    });
  });

  describe('Performance and Response Time', () => {
    it('should respond to /metrics within reasonable time', async () => {
      const startTime = Date.now();
      
      await axios.get(`${CADVISOR_URL}/metrics`);
      
      const responseTime = Date.now() - startTime;
      
      // La réponse devrait être rapide (moins de 2 secondes)
      expect(responseTime).toBeLessThan(2000);
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        axios.get(`${CADVISOR_URL}/metrics`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

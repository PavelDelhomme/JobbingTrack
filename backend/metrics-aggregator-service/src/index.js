const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3008;

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
const LOKI_URL = process.env.LOKI_URL || 'http://loki:3100';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Middleware d'authentification JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// ============================================
// ROUTES MÉTRIQUES
// ============================================

// Health check (pas d'auth nécessaire)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    prometheus: PROMETHEUS_URL,
    loki: LOKI_URL
  });
});

// Métriques globales de la machine
app.get('/api/metrics/system', authenticateToken, async (req, res) => {
  try {
    const queries = {
      cpu_cores: 'machine_cpu_cores',
      memory_total: 'machine_memory_bytes',
      containers_running: 'count(container_last_seen{name!=""})'
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query },
        timeout: 5000
      });
      results[key] = response.data.data.result;
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Erreur métriques système:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Liste de tous les conteneurs avec leurs métriques
app.get('/api/metrics/containers', authenticateToken, async (req, res) => {
  try {
    const queries = {
      cpu: 'rate(container_cpu_usage_seconds_total{name!=""}[5m])',
      memory: 'container_memory_usage_bytes{name!=""}',
      network_rx: 'rate(container_network_receive_bytes_total{name!=""}[5m])',
      network_tx: 'rate(container_network_transmit_bytes_total{name!=""}[5m])'
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query },
        timeout: 5000
      });
      results[key] = response.data.data.result;
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Erreur métriques conteneurs:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Métriques d'un conteneur spécifique
app.get('/api/metrics/container/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    
    const queries = {
      cpu: `rate(container_cpu_usage_seconds_total{name="${name}"}[5m])`,
      memory_usage: `container_memory_usage_bytes{name="${name}"}`,
      memory_limit: `container_spec_memory_limit_bytes{name="${name}"}`,
      network_rx: `rate(container_network_receive_bytes_total{name="${name}"}[5m])`,
      network_tx: `rate(container_network_transmit_bytes_total{name="${name}"}[5m])`,
      fs_usage: `container_fs_usage_bytes{name="${name}"}`,
      fs_limit: `container_fs_limit_bytes{name="${name}"}`
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query },
        timeout: 5000
      });
      results[key] = response.data.data.result;
    }

    res.json({ success: true, container: name, data: results });
  } catch (error) {
    console.error(`Erreur métriques conteneur ${req.params.name}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Historique des métriques (range query)
app.get('/api/metrics/history', authenticateToken, async (req, res) => {
  try {
    const { query, start, end, step = '1m' } = req.query;
    
    if (!query || !start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants: query, start, end requis'
      });
    }

    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
      params: { query, start, end, step },
      timeout: 10000
    });

    res.json({ success: true, data: response.data.data.result });
  } catch (error) {
    console.error('Erreur historique métriques:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROUTES LOGS
// ============================================

// Logs d'un conteneur spécifique
app.get('/api/logs/container/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const { limit = 100, start, end } = req.query;

    // Query Loki LogQL
    const query = `{container="${name}"}`;
    
    const params = {
      query,
      limit: parseInt(limit),
      direction: 'backward'
    };

    if (start) params.start = start;
    if (end) params.end = end;

    const response = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
      params,
      timeout: 10000
    });

    res.json({ success: true, container: name, logs: response.data.data.result });
  } catch (error) {
    console.error(`Erreur logs conteneur ${req.params.name}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Logs de tous les services
app.get('/api/logs/all', authenticateToken, async (req, res) => {
  try {
    const { limit = 100, start, end } = req.query;

    const query = `{job="docker"}`;
    
    const params = {
      query,
      limit: parseInt(limit),
      direction: 'backward'
    };

    if (start) params.start = start;
    if (end) params.end = end;

    const response = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
      params,
      timeout: 10000
    });

    res.json({ success: true, logs: response.data.data.result });
  } catch (error) {
    console.error('Erreur logs globaux:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stream logs en temps réel (SSE)
app.get('/api/logs/stream/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const query = `{container="${name}"}`;

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const response = await axios.get(`${LOKI_URL}/loki/api/v1/tail`, {
      params: { query },
      responseType: 'stream'
    });

    response.data.pipe(res);

    req.on('close', () => {
      response.data.destroy();
    });
  } catch (error) {
    console.error(`Erreur stream logs ${req.params.name}:`, error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// Démarrage serveur
app.listen(PORT, () => {
  console.log(`✅ Metrics Aggregator API démarré sur port ${PORT}`);
  console.log(`📊 Prometheus: ${PROMETHEUS_URL}`);
  console.log(`📝 Loki: ${LOKI_URL}`);
});

module.exports = app; // Pour les tests

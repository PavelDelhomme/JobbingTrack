const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3015;

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
const LOKI_URL = process.env.LOKI_URL || 'http://loki:3100';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// Middleware d'authentification JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'];
  
  // Support API Key pour rétrocompatibilité
  if (apiKey === process.env.METRICS_API_KEY) {
    return next();
  }
  
  // Support JWT
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ============================================
// ROUTES MÉTRIQUES
// ============================================

// Récupérer les métriques globales de la machine
app.get('/api/metrics/system', authenticateToken, async (req, res) => {
  try {
    const queries = {
      cpu_cores: 'machine_cpu_cores',
      memory_total: 'machine_memory_bytes',
      containers_running: 'count(container_last_seen{name!=""})',
      cpu_usage: 'sum(rate(container_cpu_usage_seconds_total{name!=""}[5m])) * 100',
      memory_usage: 'sum(container_memory_usage_bytes{name!=""})'
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      try {
        const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
          params: { query },
          timeout: 5000
        });
        results[key] = response.data.data.result;
      } catch (error) {
        console.error(`Error fetching ${key}:`, error.message);
        results[key] = [];
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      data: results
    });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les métriques de tous les conteneurs
app.get('/api/metrics/containers', authenticateToken, async (req, res) => {
  try {
    const queries = {
      cpu: 'sum(rate(container_cpu_usage_seconds_total{name!=""}[5m])) by (name)',
      memory: 'container_memory_usage_bytes{name!=""}',
      network_rx: 'sum(rate(container_network_receive_bytes_total{name!=""}[5m])) by (name)',
      network_tx: 'sum(rate(container_network_transmit_bytes_total{name!=""}[5m])) by (name)'
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      try {
        const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
          params: { query },
          timeout: 5000
        });
        results[key] = response.data.data.result;
      } catch (error) {
        console.error(`Error fetching container ${key}:`, error.message);
        results[key] = [];
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      data: results
    });
  } catch (error) {
    console.error('Error fetching container metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les métriques d'un conteneur spécifique
app.get('/api/metrics/container/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const queries = {
      cpu: `rate(container_cpu_usage_seconds_total{name="${name}"}[5m]) * 100`,
      memory: `container_memory_usage_bytes{name="${name}"}`,
      memory_limit: `container_spec_memory_limit_bytes{name="${name}"}`,
      network_rx: `rate(container_network_receive_bytes_total{name="${name}"}[5m])`,
      network_tx: `rate(container_network_transmit_bytes_total{name="${name}"}[5m])`,
      fs_usage: `container_fs_usage_bytes{name="${name}"}`,
      fs_limit: `container_fs_limit_bytes{name="${name}"}`
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      try {
        const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
          params: { query },
          timeout: 5000
        });
        results[key] = response.data.data.result;
      } catch (error) {
        console.error(`Error fetching ${key} for ${name}:`, error.message);
        results[key] = [];
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      container: name,
      data: results
    });
  } catch (error) {
    console.error(`Error fetching metrics for ${req.params.name}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer l'historique des métriques (range query)
app.get('/api/metrics/history', authenticateToken, async (req, res) => {
  try {
    const { query, start, end, step = '15s' } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
      params: { query, start, end, step },
      timeout: 10000
    });

    res.json({
      timestamp: new Date().toISOString(),
      data: response.data.data.result
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROUTES LOGS
// ============================================

// Récupérer les logs d'un conteneur spécifique
app.get('/api/logs/container/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const { limit = 100, start, end } = req.query;

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

    res.json({
      timestamp: new Date().toISOString(),
      container: name,
      data: response.data.data.result
    });
  } catch (error) {
    console.error(`Error fetching logs for ${req.params.name}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les logs de tous les services
app.get('/api/logs/all', authenticateToken, async (req, res) => {
  try {
    const { limit = 100, start, end, service } = req.query;

    const query = service ? `{service="${service}"}` : `{job="docker"}`;
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

    res.json({
      timestamp: new Date().toISOString(),
      data: response.data.data.result
    });
  } catch (error) {
    console.error('Error fetching all logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stream logs en temps réel (Server-Sent Events)
app.get('/api/logs/stream/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const query = `{container="${name}"}`;

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const response = await axios.get(`${LOKI_URL}/loki/api/v1/tail`, {
      params: { query },
      responseType: 'stream',
      timeout: 0
    });

    response.data.pipe(res);

    req.on('close', () => {
      response.data.destroy();
      res.end();
    });
  } catch (error) {
    console.error(`Error streaming logs for ${req.params.name}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// ============================================
// ROUTES UTILITAIRES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    prometheus: PROMETHEUS_URL,
    loki: LOKI_URL
  });
});

// Générer un token JWT (pour tests/dev)
app.post('/auth/token', (req, res) => {
  const { username, password } = req.body;
  
  // En production, vérifier contre une vraie base de données
  if (username === 'admin' && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Metrics Aggregator API running on port ${PORT}`);
  console.log(`Prometheus: ${PROMETHEUS_URL}`);
  console.log(`Loki: ${LOKI_URL}`);
});

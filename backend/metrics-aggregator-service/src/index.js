const express = require('express');
const cors = require('cors');
const { authenticateToken } = require('./middlewares/auth.middleware');
const metricsRoutes = require('./routes/metrics.routes');
const logsRoutes = require('./routes/logs.routes');
const prometheusService = require('./services/prometheus.service');

const app = express();
const PORT = process.env.PORT || 3008;

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
const LOKI_URL = process.env.LOKI_URL || 'http://loki:3100';

// ============================================
// MIDDLEWARE GLOBAL
// ============================================

// CORS - Autoriser les requêtes depuis le frontend
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://frontend:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES PUBLIQUES (sans authentification)
// ============================================

/**
 * GET /health
 * Health check endpoint - accessible sans authentification
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'metrics-aggregator-api',
    version: '1.0.0',
    uptime: process.uptime(),
    prometheus: PROMETHEUS_URL,
    loki: LOKI_URL
  });
});

/**
 * GET /
 * Root endpoint - information sur l'API
 */
app.get('/', (req, res) => {
  res.json({
    service: 'JobbingTrack Metrics Aggregator API',
    version: '1.0.0',
    description: 'API sécurisée pour accéder aux métriques Prometheus et logs Loki',
    endpoints: {
      health: 'GET /health',
      metrics: {
        system: 'GET /api/metrics/system',
        containers: 'GET /api/metrics/containers',
        container: 'GET /api/metrics/container/:name',
        history: 'GET /api/metrics/history'
      },
      logs: {
        container: 'GET /api/logs/container/:name',
        all: 'GET /api/logs/all',
        search: 'GET /api/logs/search/:name',
        stream: 'GET /api/logs/stream/:name'
      }
    },
    authentication: 'JWT Bearer token required for /api/* routes'
  });
});

// ============================================
// ROUTES PUBLIQUES POUR LES MÉTRIQUES (développement)
// ============================================

// Routes publiques pour les métriques (sans authentification en mode dev)
if (process.env.NODE_ENV === 'development') {
  const dockerService = require('./services/docker.service');
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  // Route publique pour les métriques système
  app.get('/api/v1/metrics', async (req, res) => {
    try {
      // Essayer d'abord les métriques Prometheus (plus complètes)
      try {
        const prometheusMetrics = await prometheusService.getSystemMetrics();
        
        // Compter les conteneurs via Docker CLI (plus fiable)
        const stats = await dockerService.getAllContainersStats();
        const jobbingtrackContainers = stats.filter(c => c.name.startsWith('jobbingtrack-'));
        
        // Formater pour correspondre au format attendu par le frontend
        const formatted = {
          success: true,
          timestamp: prometheusMetrics.timestamp,
          system: {
            cpus: prometheusMetrics.data.cpu_cores,
            cpu_percent: prometheusMetrics.data.cpu_usage_percent,
            memory_total: prometheusMetrics.data.memory_total,
            memory_used: prometheusMetrics.data.memory_used,
            memory_percent: prometheusMetrics.data.memory_used_percent,
            containers: {
              total: stats.length,
              running: jobbingtrackContainers.length
            }
          }
        };
        
        return res.json(formatted);
      } catch (prometheusError) {
        console.warn('[Public Route] Prometheus non disponible, fallback vers Docker:', prometheusError.message);
      }
      
      // Fallback vers Docker si Prometheus n'est pas disponible
      const info = await dockerService.getSystemInfo();
      const formatted = dockerService.formatSystemInfoForAPI(info);
      res.json(formatted);
    } catch (error) {
      console.error('[Public Route] Erreur /api/v1/metrics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Route publique pour les services/conteneurs
  app.get('/api/v1/services', async (req, res) => {
    try {
      const stats = await dockerService.getAllContainersStats();
      const formatted = dockerService.formatStatsForAPI(stats);
      res.json(formatted);
    } catch (error) {
      console.error('[Public Route] Erreur /api/v1/services:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Route publique pour un conteneur spécifique
  app.get('/api/v1/container/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const stats = await dockerService.getContainerStats(name);
      res.json({ success: true, timestamp: new Date().toISOString(), container: stats });
    } catch (error) {
      console.error(`[Public Route] Erreur /api/v1/container/${req.params.name}:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Route pour récupérer les logs d'un service
  app.get('/api/v1/logs/:serviceName', async (req, res) => {
    try {
      const { serviceName } = req.params;
      const limit = parseInt(req.query.limit || '100');
      const containerName = `jobbingtrack-${serviceName}`;

      console.log(`[Logs] Récupération des logs pour ${containerName}`);

      // Récupérer les logs via Docker
      const { stdout } = await execAsync(`docker logs ${containerName} --tail ${limit} --timestamps 2>&1 || true`);
      
      // Parser les logs
      const logs = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Format: 2025-10-30T10:30:45.123456789Z message
          const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);
          if (timestampMatch) {
            const message = timestampMatch[2];
            let level = 'info';
            
            // Détecter le niveau de log
            if (message.match(/error|err|fatal|critical/i)) level = 'error';
            else if (message.match(/warn|warning/i)) level = 'warn';
            else if (message.match(/debug/i)) level = 'debug';
            
            return {
              timestamp: timestampMatch[1],
              level,
              message,
              service: serviceName
            };
          }
          
          return {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: line,
            service: serviceName
          };
        })
        .reverse(); // Plus récent en premier

      res.json({
        success: true,
        service: serviceName,
        container: containerName,
        count: logs.length,
        logs
      });
    } catch (error) {
      console.error(`[Logs] Erreur /api/v1/logs/${req.params.serviceName}:`, error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        logs: []
      });
    }
  });

  // Route pour tous les logs des services
  app.get('/api/v1/logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit || '50');
      
      // Récupérer tous les conteneurs
      const { stdout } = await execAsync('docker ps --format "{{.Names}}" | grep jobbingtrack-');
      const containers = stdout.split('\n').filter(name => name.trim());

      const allLogs = [];

      for (const containerName of containers) {
        try {
          const { stdout: logs } = await execAsync(`docker logs ${containerName} --tail ${limit} --timestamps 2>&1 || true`);
          const serviceName = containerName.replace('jobbingtrack-', '');

          logs.split('\n')
            .filter(line => line.trim())
            .forEach(line => {
              const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);
              if (timestampMatch) {
                const message = timestampMatch[2];
                let level = 'info';
                
                if (message.match(/error|err|fatal|critical/i)) level = 'error';
                else if (message.match(/warn|warning/i)) level = 'warn';
                else if (message.match(/debug/i)) level = 'debug';
                
                allLogs.push({
                  timestamp: timestampMatch[1],
                  level,
                  message,
                  service: serviceName,
                  container: containerName
                });
              }
            });
        } catch (err) {
          console.error(`[Logs] Erreur pour ${containerName}:`, err.message);
        }
      }

      // Trier par timestamp (plus récent en premier)
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({
        success: true,
        count: allLogs.length,
        containers: containers.length,
        logs: allLogs.slice(0, limit * 2) // Limiter le total
      });
    } catch (error) {
      console.error('[Logs] Erreur /api/v1/logs:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        logs: []
      });
    }
  });
}

// ============================================
// ROUTES PROTÉGÉES (avec authentification JWT)
// ============================================

// Appliquer le middleware d'authentification sur toutes les routes /api/*
app.use('/api/metrics', authenticateToken, metricsRoutes);
app.use('/api/logs', authenticateToken, logsRoutes);

// ============================================
// GESTION DES ERREURS
// ============================================

// Route 404 - Non trouvée
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    path: req.path,
    method: req.method
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   JobbingTrack Metrics Aggregator API                 ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📊 Prometheus: ${PROMETHEUS_URL}`);
    console.log(`📝 Loki: ${LOKI_URL}`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  Health:    http://localhost:${PORT}/health`);
    console.log(`  Metrics:   http://localhost:${PORT}/api/metrics/*`);
    console.log(`  Logs:      http://localhost:${PORT}/api/logs/*`);
    console.log('');
    console.log('🔐 Authentication: JWT Bearer token required for /api/* routes');
  });
}

module.exports = app; // Pour les tests

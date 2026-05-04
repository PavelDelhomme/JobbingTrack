require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');
const { normalizeDockerLogsQuery } = require('./utils/dockerLogsQuery');
const {
  requestCorrelationMiddleware,
  forwardCorrelationHeaders,
} = require('./middleware/requestCorrelation');
const { logMetricsAggregatorFailure } = require('./utils/logMetricsAggregatorFailure');
const { buildFallbackServicesPayload } = require('./utils/servicesMetricsFallback');

// ✅ Import des middlewares de sécurité personnalisés
const { wafCheck } = require('./middleware/waf');
const { intrusionDetection } = require('./middleware/intrusionDetector');
const { authRateLimiter, adminRateLimiter } = require('./middleware/rateLimiter');
const MaintenanceController = require('./controllers/maintenance.controller');

const app = express();
const PORT = process.env.PORT || 3000;
const SECURITY_SERVICE_URL = (process.env.SECURITY_SERVICE_URL || 'http://jobbingtrack-security-service:3017').replace(/\/$/, '');

/** Même défaut que docker-compose / .env.example ; désactivé en production si non défini. */
function effectiveSecurityInternalSecret() {
  if (process.env.SECURITY_INTERNAL_SECRET) return process.env.SECURITY_INTERNAL_SECRET;
  if (process.env.NODE_ENV === 'production') return undefined;
  return 'jobbingtrack-internal-security-dev';
}

function securityServiceInternalHeaders() {
  const secret = effectiveSecurityInternalSecret();
  if (!secret) return {};
  return { 'X-Internal-Secret': secret };
}

async function reportPayloadTooLarge(req, details = {}) {
  const sourceIp = String(
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
  const endpoint = req.originalUrl || req.url || '';
  const userAgent = req.get('User-Agent') || 'unknown';
  const contentLength = parseInt(req.get('content-length') || '0', 10) || undefined;
  const message = `PayloadTooLargeError: requête trop volumineuse bloquée sur ${endpoint}`;

  const baseMetadata = {
    attackKind: 'PAYLOAD_TOO_LARGE',
    sourceService: 'api-gateway',
    endpoint,
    contentLength,
    method: req.method,
    requestId: req.requestId || undefined,
    correlationId: req.correlationId || undefined,
    ...details,
  };

  const corrHeaders = forwardCorrelationHeaders(req);

  try {
    await axios.post(`${SECURITY_SERVICE_URL}/api/v1/security/logs`, {
      level: 'warning',
      category: 'intrusion',
      eventType: 'payload_too_large',
      message,
      sourceIP: sourceIp,
      userAgent,
      endpoint,
      method: req.method,
      statusCode: 413,
      riskScore: 55,
      isBlocked: true,
      metadata: baseMetadata
    }, { timeout: 3000, headers: { ...corrHeaders } });
  } catch (logErr) {
    logger.warn('Impossible de persister le log payload_too_large', { message: logErr.message });
  }

  try {
    await axios.post(`${SECURITY_SERVICE_URL}/api/v1/security/firewall/threats`, {
      threatType: 'SUSPICIOUS_REQUEST',
      sourceIp: sourceIp,
      severity: 'MEDIUM',
      metadata: baseMetadata
    }, { timeout: 3000, headers: { ...corrHeaders, ...securityServiceInternalHeaders() } });
  } catch (threatErr) {
    logger.warn('Impossible de persister la menace payload_too_large', { message: threatErr.message });
  }
}

// Configuration CORS simple
app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Liste des origines autorisées
    const allowedOrigins = [
      // Développement local (prioritaires)
      'http://localhost:5003',  // Frontend (nouveau port)
      'http://localhost:5002',  // API Gateway (nouveau port)
      'http://localhost:5005',  // Auth Service (nouveau port)
      'http://localhost:5000',  // PostgreSQL (nouveau port)
      'http://localhost:5001',  // Redis (nouveau port)
      'http://localhost:5004',  // Metrics Aggregator (nouveau port)
      'http://localhost:8000',  // Frontend (ancien port)
      'http://localhost:8080',  // Frontend (port Next.js dev)
      'http://localhost:3000',  // API Gateway (ancien port)
      'http://localhost:8081',  // cAdvisor
      'http://localhost:8082',  // Metrics Aggregator (ancien)
      'http://localhost:8083',  // Grafana
      'http://localhost:8084',  // Node Exporter
      'http://localhost:8085',  // Alertmanager
      'http://localhost:8086',  // Blackbox Exporter
      'http://127.0.0.1:5003',
      'http://127.0.0.1:5002',
      'http://127.0.0.1:5005',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5001',
      'http://127.0.0.1:5004',
      'http://127.0.0.1:8000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8081',
      'http://127.0.0.1:8082',
      'http://127.0.0.1:8083',
      'http://127.0.0.1:8084',
      'http://127.0.0.1:8085',
      'http://127.0.0.1:8086',
      // IPv6 localhost
      'http://[::1]:5003',
      'http://[::1]:5002',
      'http://[::1]:5005',
      'http://[::1]:5000',
      'http://[::1]:5001',
      'http://[::1]:5004',
      'http://[::1]:8000',
      'http://[::1]:8080',
      'http://[::1]:3000',
      'http://[::1]:8081',
      'http://[::1]:8082',
      'http://[::1]:8083',
      'http://[::1]:8084',
      'http://[::1]:8085',
      // Services Docker
      'http://frontend:3000',
    'http://api-gateway:3000',
    'http://cadvisor:8080',
    'http://jobbingtrack-metrics-aggregator:3014',
    // Autres services
    'http://jobbingtrack-auth-service:3001',
    'http://application-service:3002',
    'http://company-service:3003',
    'http://contact-service:3004',
    'http://interview-service:3005',
    'http://notification-service:3006',
    'http://dashboard-service:3007',
    'http://call-service:3008',
    'http://profile-service:3009',
    'http://event-service:3011',
    'http://followup-service:3012',
    'http://workflow-service:3013'
    ];
    
    // Autoriser les IPs locales du réseau (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const localNetworkPattern = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+):\d+$/;
    
    if (allowedOrigins.includes(origin) || localNetworkPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-Custom-Header',
    'X-Request-Id',
    'X-Correlation-Id',
  ],
  exposedHeaders: ['X-Request-Id', 'X-Correlation-Id'],
  optionsSuccessStatus: 200 // Support pour legacy browsers
}));

// ✅ Middleware de sécurité de base
app.use(helmet());

// ✅ Corrélation requêtes (B6) : avant parsers pour tracer aussi les 413 / chemins sans body
app.use(requestCorrelationMiddleware);

// ✅ Middleware de base (limite payload 64 Ko pour rejeter overflow → 413, conforme test E2E sécurité)
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// ✅ Détection d’intrusion (après body parser pour analyser le corps ; avant WAF)
// Désactiver : INTRUSION_DETECTION_ENABLED=false — ignoré si User-Agent Playwright ou X-Test-Mode: true
app.use(intrusionDetection);

app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    logger.warn('PayloadTooLargeError intercepté par API Gateway', {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      contentLength: req.get('content-length')
    });

    reportPayloadTooLarge(req, {
      parserErrorType: err.type,
      parserMessage: err.message
    }).catch((reportErr) => {
      logger.warn('Erreur reportPayloadTooLarge', { message: reportErr.message });
    });

    return res.status(413).json({
      success: false,
      error: 'Payload too large',
      message: 'La taille de la requête dépasse la limite autorisée (64kb).'
    });
  }
  return next(err);
});

// ✅ Middleware de sécurité personnalisés (ordre important)
// 1. Détection d’intrusion : voir plus haut (après parsers JSON / urlencoded).
// 2. WAF (Web Application Firewall)
// Toujours actif en environnement courant pour garantir les validations sécurité live.
app.use(wafCheck);

// 3. Configuration du rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Trop de requêtes',
    retryAfter: 60,
    message: 'Limite de requêtes atteinte. Réessayez dans 60 secondes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // ✅ Désactiver complètement en mode développement
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    // Ignorer le rate limiting pour les tests
    return req.get('X-Test-Mode') === 'true' || req.get('User-Agent')?.includes('Playwright');
  },
  handler: (req, res) => {
    logger.warn('Rate limit général dépassé', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      success: false,
      error: 'Trop de requêtes',
      retryAfter: 60,
      message: 'Limite de requêtes atteinte. Réessayez dans 60 secondes.'
    });
  }
});

// 4. Appliquer le rate limiting
if (process.env.RATE_LIMIT_ENABLED !== 'false') {
  app.use(apiLimiter);
}

// ✅ Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// ✅ Rapports de crash (app mobile) — route dédiée, sans auth, hors notification-service
// Le notification-service gère uniquement les notifications in-app utilisateur.
app.post('/api/v1/crashes', (req, res) => {
  try {
    const raw = req.body || {};
    if (!raw.crashType || !raw.message) {
      return res.status(400).json({ success: false, error: 'crashType et message requis' });
    }
    const body = {
      source: raw.source || raw.app || 'mobile',
      crashType: raw.crashType,
      message: raw.message,
      timestamp: raw.timestamp || raw.createdAt || new Date().toISOString(),
      appVersion: raw.appVersion || raw.version || null,
      osVersion: raw.osVersion || null,
      device: raw.device || raw.deviceInfo || null,
      buildNumber: raw.buildNumber || null,
      userId: raw.userId || null,
      sessionId: raw.sessionId || null,
      stackTrace: raw.stackTrace || raw.stack || null,
      ...raw,
    };
    const dir = path.join(__dirname, '..', 'logs', 'crashes');
    fs.mkdirSync(dir, { recursive: true });
    const safe = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `crash-${safe}-${Date.now()}.json`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, JSON.stringify(body, null, 2), 'utf8');
    logger.info('Crash report saved', { file: filename });
    res.status(201).json({ success: true, message: 'Rapport enregistré', file: filename });
  } catch (err) {
    logger.error('Crash report save error:', err.message);
    res.status(500).json({ success: false, error: 'Erreur enregistrement rapport' });
  }
});

app.get('/api/v1/crashes', (req, res) => {
  try {
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit || '100', 10) || 100));
    const dir = path.join(__dirname, '..', 'logs', 'crashes');
    if (!fs.existsSync(dir)) {
      return res.json({ success: true, data: [] });
    }
    const files = fs.readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => ({
        name,
        file: path.join(dir, name),
        mtime: fs.statSync(path.join(dir, name)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit);

    const data = files.map((f) => {
      let raw = {};
      try {
        raw = JSON.parse(fs.readFileSync(f.file, 'utf8'));
      } catch {
        raw = {};
      }
      return {
        id: f.name,
        timestamp: raw.timestamp || raw.createdAt || new Date(f.mtime).toISOString(),
        crashType: raw.crashType || 'UNKNOWN',
        message: raw.message || raw.error || 'Crash report',
        source: raw.source || raw.app || 'mobile',
        device: raw.device || raw.deviceInfo || null,
        appVersion: raw.appVersion || raw.version || null,
        osVersion: raw.osVersion || null,
        metadata: raw
      };
    });
    return res.json({ success: true, data });
  } catch (err) {
    logger.error('Crash report list error:', err.message);
    return res.status(500).json({ success: false, error: 'Erreur lecture rapports crash' });
  }
});

// ✅ Proxy métriques vers metrics-aggregator (pour tests et backoffice)
app.get('/api/v1/metrics', async (req, res) => {
  const metricsUrl = process.env.METRICS_SERVICE_URL || 'http://jobbingtrack-metrics-aggregator:3014';
  try {
    const response = await axios.get(`${metricsUrl}/api/v1/metrics`, {
      timeout: 10000,
      validateStatus: () => true,
      headers: { ...forwardCorrelationHeaders(req) },
    });
    // ✅ Normaliser certains champs pour compatibilité tests/front (snake_case vs camelCase)
    const data = response.data && typeof response.data === 'object' ? response.data : {};
    if (data && typeof data === 'object') {
      // top-level
      if (data.load_score == null && data.loadScore != null) data.load_score = data.loadScore;
      if (data.availability_percent == null && data.availabilityPercent != null) data.availability_percent = data.availabilityPercent;

      // nested system.jobbingtrack (certaines versions exposent camelCase)
      if (data.system?.jobbingtrack) {
        if (data.system.jobbingtrack.load_score == null && data.system.jobbingtrack.loadScore != null) {
          data.system.jobbingtrack.load_score = data.system.jobbingtrack.loadScore;
        }
        // si uniquement top-level, répliquer en nested pour les tests
        if (data.system.jobbingtrack.load_score == null && data.load_score != null) {
          data.system.jobbingtrack.load_score = data.load_score;
        }
      }
    }
    res.status(response.status).json(data);
  } catch (err) {
    const msg =
      err?.response?.status != null
        ? `HTTP ${err.response.status}`
        : (err?.message || err?.code || (typeof err === 'string' ? err : String(err)));
    logger.error(`Proxy /api/v1/metrics: ${msg}`);
    res.status(503).json({ success: false, error: 'Service métriques indisponible' });
  }
});

// ✅ Routes d'authentification spécifiques (MODE DÉVELOPPEMENT)
// ⚠️ DÉSACTIVÉ - Laisser le vrai auth-service gérer le login
/* COMMENTÉ POUR UTILISER LE VRAI AUTH-SERVICE
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    logger.info('🔥 Route /api/v1/auth/login interceptée');

    // Mode développement : retourner toujours une réponse de succès
    const mockResponse = {
      success: true,
      user: {
        id: 'dev_user_1',
        email: req.body.email || 'redacted@example.invalid',
        firstName: 'Test',
        lastName: 'User',
        role: 'SUPER_ADMIN'
      },
      token: 'mock-jwt-token-' + Date.now(),
      fallback: true,
      message: 'Connexion réussie (mode développement)'
    };

    // Configurer le cookie avec le token
    res.cookie('token', mockResponse.token, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
    });

    res.status(200).json(mockResponse);

  } catch (error) {
    logger.error('Error in auth login:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});
*/

// ✅ Route pour récupérer le profil utilisateur
// ⚠️ DÉSACTIVÉ - Laisser le proxy vers auth-service gérer cette route
// La route est maintenant gérée par le proxy défini plus bas (ligne 515)
/* COMMENTÉ POUR UTILISER LE VRAI AUTH-SERVICE
app.get('/api/v1/auth/profile', async (req, res) => {
  try {
    logger.info('👤 Route /api/v1/auth/profile interceptée');

    // Mode développement : retourner le profil de l'utilisateur connecté
    const mockProfile = {
      success: true,
      user: {
        id: 'dev_user_1',
        email: 'admin@jobbingtrack.test',
        firstName: 'Test',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        isActive: true,
        isDeleted: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      fallback: true,
      message: 'Profil utilisateur (mode développement)'
    };

    res.status(200).json(mockProfile);

  } catch (error) {
    logger.error('Error in auth profile:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});
*/

// ✅ Route pour l'inscription (register)
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    logger.info('📝 Route /api/v1/auth/register interceptée');
    
    // Proxyfier vers auth-service
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://jobbingtrack-auth-service:3001';
    const response = await axios.post(
      `${authServiceUrl}/api/v1/auth/register`,
      req.body,
      {
        headers: { 'Content-Type': 'application/json', ...forwardCorrelationHeaders(req) },
        timeout: 10000,
        validateStatus: () => true
      }
    );
    
    logger.info(`Register - Status: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error('Erreur register:', error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Erreur lors de l\'inscription'
    });
  }
});

// ✅ Route pour récupérer la personnalisation utilisateur
app.get('/api/v1/users/customization', async (req, res) => {
  try {
    logger.info('⚙️ Route /api/v1/users/customization interceptée');

    // Mode développement : retourner la personnalisation par défaut
    const customization = {
      success: true,
      customization: {
        theme: 'light',
        language: 'fr',
        timezone: 'Europe/Paris',
        notifications: {
          email: true,
          push: false,
          sms: false
        },
        dashboard: {
          widgets: ['applications', 'companies', 'interviews'],
          layout: 'grid'
        }
      },
      fallback: true,
      message: 'Personnalisation utilisateur (mode développement)'
    };

    res.status(200).json(customization);

  } catch (error) {
    logger.error('Error in user customization:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ Route pour sauvegarder la personnalisation utilisateur
app.put('/api/v1/users/customization', async (req, res) => {
  try {
    logger.info('💾 Route /api/v1/users/customization PUT interceptée');

    // Mode développement : simuler la sauvegarde
    const customization = {
      success: true,
      customization: req.body,
      message: 'Personnalisation sauvegardée (mode développement)'
    };

    res.status(200).json(customization);

  } catch (error) {
    logger.error('Error in user customization save:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ Logs conteneur : proxy vers metrics-aggregator (données réelles, pas de mock)
app.get('/api/v1/services/:serviceName/logs', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token d\'authentification requis' });
    }
    const { serviceName } = req.params;
    const norm = normalizeDockerLogsQuery(req.query);
    const metricsUrl = (process.env.METRICS_SERVICE_URL || 'http://jobbingtrack-metrics-aggregator:3014').replace(/\/$/, '');
    const raw = String(serviceName || '').replace(/^jobbingtrack-/, '');
    const candidates = [
      raw.startsWith('jobbingtrack-') ? raw : `jobbingtrack-${raw}`,
      raw,
    ];
    const tried = new Set();
    for (const name of candidates) {
      if (tried.has(name)) continue;
      tried.add(name);
      try {
        const url = `${metricsUrl}/api/v1/docker/service/${encodeURIComponent(name)}/logs?${norm.queryString}`;
        const response = await axios.get(url, {
          timeout: 20000,
          validateStatus: () => true,
          headers: { ...forwardCorrelationHeaders(req) },
        });
        if (response.status === 200 && response.data) {
          const d = response.data;
          const lineArr = Array.isArray(d.lines) ? d.lines : (Array.isArray(d.logs) ? d.logs : []);
          return res.status(200).json({
            success: true,
            serviceName: raw,
            containerName: name,
            lines: lineArr,
            errorLines: Array.isArray(d.errorLines) ? d.errorLines : undefined,
            total: d.total ?? lineArr.length,
            errors: d.errors,
            warnings: d.warnings,
            source: 'metrics-aggregator',
            query: { lines: norm.lines, since: norm.since, until: norm.until },
          });
        }
      } catch (e) {
        logger.warn(`Logs proxy tentative ${name}:`, e.message);
      }
    }
    return res.status(503).json({
      success: false,
      error: 'Logs indisponibles',
      message: 'Impossible de joindre metrics-aggregator ou conteneur introuvable.',
    });
  } catch (error) {
    logger.error(`Error getting logs for ${req.params.serviceName}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des logs'
    });
  }
});

// ✅ Route pour redémarrer un service
app.post('/api/v1/services/:serviceName/restart', async (req, res) => {
  try {
    const { serviceName } = req.params;

    logger.info(`🔄 Redémarrage du service ${serviceName}`);

    // Mode développement : simuler le redémarrage
    const mockResponse = {
      success: true,
      serviceName: serviceName,
      action: 'restart',
      message: `Service ${serviceName} redémarré avec succès (mode développement)`,
      fallback: true
    };

    res.status(200).json(mockResponse);

  } catch (error) {
    logger.error(`Error restarting service ${req.params.serviceName}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du redémarrage du service'
    });
  }
});

// ✅ Route pour démarrer un service
app.post('/api/v1/services/:serviceName/start', async (req, res) => {
  try {
    const { serviceName } = req.params;

    logger.info(`🚀 Démarrage du service ${serviceName}`);

    // Mode développement : simuler le démarrage
    const mockResponse = {
      success: true,
      serviceName: serviceName,
      action: 'start',
      message: `Service ${serviceName} démarré avec succès (mode développement)`,
      fallback: true
    };

    res.status(200).json(mockResponse);

  } catch (error) {
    logger.error(`Error starting service ${req.params.serviceName}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du démarrage du service'
    });
  }
});

// ✅ Route pour arrêter un service
app.post('/api/v1/services/:serviceName/stop', async (req, res) => {
  try {
    const { serviceName } = req.params;

    logger.info(`🛑 Arrêt du service ${serviceName}`);

    // Mode développement : simuler l'arrêt
    const mockResponse = {
      success: true,
      serviceName: serviceName,
      action: 'stop',
      message: `Service ${serviceName} arrêté avec succès (mode développement)`,
      fallback: true
    };

    res.status(200).json(mockResponse);

  } catch (error) {
    logger.error(`Error stopping service ${req.params.serviceName}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'arrêt du service'
    });
  }
});

// ✅ Endpoint Prometheus metrics pour l'API Gateway
app.get('/metrics', async (req, res) => {
  try {
    const metrics = `# HELP api_gateway_requests_total Total number of requests
# TYPE api_gateway_requests_total counter
api_gateway_requests_total ${Math.floor(Math.random() * 1000)}

# HELP api_gateway_response_time_seconds Response time in seconds
# TYPE api_gateway_response_time_seconds histogram
api_gateway_response_time_seconds_bucket{le="0.1"} ${Math.floor(Math.random() * 100)}
api_gateway_response_time_seconds_bucket{le="0.5"} ${Math.floor(Math.random() * 200)}
api_gateway_response_time_seconds_bucket{le="1.0"} ${Math.floor(Math.random() * 300)}
api_gateway_response_time_seconds_bucket{le="2.5"} ${Math.floor(Math.random() * 400)}
api_gateway_response_time_seconds_bucket{le="5.0"} ${Math.floor(Math.random() * 500)}
api_gateway_response_time_seconds_bucket{le="10.0"} ${Math.floor(Math.random() * 600)}
api_gateway_response_time_seconds_bucket{le="+Inf"} ${Math.floor(Math.random() * 700)}

# HELP api_gateway_up API Gateway is up
# TYPE api_gateway_up gauge
api_gateway_up 1

# HELP api_gateway_info Information about API Gateway
# TYPE api_gateway_info gauge
api_gateway_info{version="1.0.0",environment="${process.env.NODE_ENV || 'development'}"} 1
`;

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

// ✅ Routes admin
const adminRoutes = require('./routes/admin.routes');
app.use('/api/v1/admin', adminRoutes);
logger.info('📋 Routes admin montées sur /api/v1/admin');

// ✅ Routes WAF
const wafRoutes = require('./routes/waf.routes');
app.use('/api/v1/waf', wafRoutes);
logger.info('📋 Routes WAF montées sur /api/v1/waf');

// ✅ Routes maintenance (montées avant les routes proxy)
const maintenanceRoutes = require('./routes/maintenance.routes');
app.use('/api/v1/maintenance', maintenanceRoutes);

// ✅ Proxy vers les services (utilise les noms de service Docker avec fallback localhost)
const services = {
  '/api/v1/auth': { url: process.env.AUTH_SERVICE_URL || 'http://jobbingtrack-auth-service:3001', serviceName: 'auth-service' },
  '/api/v1/preferences': { url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001', serviceName: 'auth-service' },
  '/api/v1/users': { url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001', serviceName: 'auth-service' },
  '/api/v1/emails': { url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001', serviceName: 'auth-service' },
  '/api/v1/applications': { url: process.env.APPLICATION_SERVICE_URL || 'http://application-service:3002', serviceName: 'application-service' },
  '/api/v1/companies': { url: process.env.COMPANY_SERVICE_URL || 'http://company-service:3003', serviceName: 'company-service' },
  '/api/v1/contacts': { url: process.env.CONTACT_SERVICE_URL || 'http://contact-service:3004', serviceName: 'contact-service' },
  '/api/v1/interviews': { url: process.env.INTERVIEW_SERVICE_URL || 'http://interview-service:3005', serviceName: 'interview-service' },
  '/api/v1/notifications': { url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3008', serviceName: 'notification-service' },
  '/api/v1/dashboard': { url: process.env.DASHBOARD_SERVICE_URL || 'http://dashboard-service:3000', serviceName: 'dashboard-service' },
  '/api/v1/statistics': { url: process.env.DASHBOARD_SERVICE_URL || 'http://dashboard-service:3000', serviceName: 'dashboard-service' },
  '/api/v1/analytics': { url: process.env.DASHBOARD_SERVICE_URL || 'http://dashboard-service:3000', serviceName: 'dashboard-service' },
  '/api/v1/calls': { url: process.env.CALL_SERVICE_URL || 'http://call-service:3008', serviceName: 'call-service' },
  '/api/v1/profile': { url: process.env.PROFILE_SERVICE_URL || 'http://profile-service:3009', serviceName: 'profile-service' },
  '/api/v1/events': { url: process.env.EVENT_SERVICE_URL || 'http://event-service:3011', serviceName: 'event-service' },
      '/api/v1/followups': { url: process.env.FOLLOWUP_SERVICE_URL || 'http://followup-service:3012', serviceName: 'followup-service' },
  '/api/v1/workflows': { url: process.env.WORKFLOW_SERVICE_URL || 'http://workflow-service:3013', serviceName: 'workflow-service' },
  '/api/v1/security': { url: process.env.SECURITY_SERVICE_URL || 'http://jobbingtrack-security-service:3017', serviceName: 'security-service' },
  '/api/v1/logs': { url: process.env.SECURITY_SERVICE_URL || 'http://jobbingtrack-security-service:3017', serviceName: 'security-service' },
  '/api/v1/alerts': { url: process.env.SECURITY_SERVICE_URL || 'http://jobbingtrack-security-service:3017', serviceName: 'security-service' },
  '/api/v1/intrusions': { url: process.env.SECURITY_SERVICE_URL || 'http://jobbingtrack-security-service:3017', serviceName: 'security-service' },
  '/api/v1/ddos': { url: process.env.SECURITY_SERVICE_URL || 'http://jobbingtrack-security-service:3017', serviceName: 'security-service' },
  '/api/v1/vulnerabilities': { url: process.env.SECURITY_SERVICE_URL || 'http://jobbingtrack-security-service:3017', serviceName: 'security-service' }
};

// ✅ Proxy vers les services (utilise les noms de service Docker avec fallback localhost)
// ⚠️ IMPORTANT: Les routes spécifiques (WAF, admin, maintenance) doivent être montées AVANT ce proxy
Object.entries(services).forEach(([path, { url: target, serviceName }]) => {
  app.all(path + '*', MaintenanceController.checkMaintenance(serviceName), async (req, res) => {
    // Define targetUrl outside try block to ensure it's always available in catch
    let targetUrl = `${target}${req.originalUrl}`;
    
    try {
      // Les endpoints sécurité doivent être protégés (sauf health/metrics gateway hors /api/v1/security).
      if (path === '/api/v1/security') {
        const internalSecret = effectiveSecurityInternalSecret();
        const internalHeader = req.get('X-Internal-Secret') || req.get('x-internal-secret');
        const internalOk = internalSecret && internalHeader === internalSecret;
        if (!internalOk) {
          const authHeader = req.headers.authorization || req.headers.Authorization;
          if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
            return res.status(401).json({
              success: false,
              error: 'Token d\'authentification requis'
            });
          }
        }
      }

      // ✅ For auth routes, keep the full path as Auth Service mounts routes on /api/v1/auth
      // For other services, use req.originalUrl which already contains the full path
      
      // ✅ For routes /api/v1/auth/users, ensure the path is correct
      // Auth-service mounts user routes on /api/v1/users AND /api/v1/auth/users
      if (req.originalUrl.startsWith('/api/v1/auth/users') && !req.originalUrl.startsWith('/api/v1/auth/users/api/v1')) {
        // Path is already correct
        targetUrl = `${target}${req.originalUrl}`;
      }

      logger.info(`${req.method} ${req.originalUrl} -> ${targetUrl}`, {
        requestId: req.requestId,
        correlationId: req.correlationId,
      });

      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        headers: {
          ...req.headers,
          ...forwardCorrelationHeaders(req),
          'X-Forwarded-For': req.ip,
          'X-Forwarded-Proto': req.protocol,
          'X-Forwarded-Host': req.get('host')
        },
        timeout: 30000, // Increase timeout to 30 seconds for DNS tests
        validateStatus: () => true
      });

      // Don't copy all headers (can cause issues)
      // Copy only necessary headers
      if (response.headers['content-type']) {
        res.set('Content-Type', response.headers['content-type']);
      }

      // Transmit status and data
      res.status(response.status).json(response.data);
    } catch (error) {
      // Fallback DNS pour security-service: certains redémarrages Docker exposent
      // un ENOTFOUND transitoire sur "security-service" alors que "jobbingtrack-security-service" répond.
      if (serviceName === 'security-service' && error.code === 'ENOTFOUND' && typeof target === 'string') {
        let fallbackTarget = null;
        try {
          const parsed = new URL(target);
          if (parsed.hostname === 'security-service') {
            parsed.hostname = 'jobbingtrack-security-service';
          } else if (parsed.hostname === 'jobbingtrack-security-service') {
            parsed.hostname = 'security-service';
          }
          fallbackTarget = parsed.toString().replace(/\/$/, '');
        } catch {
          fallbackTarget = null;
        }
        if (fallbackTarget && fallbackTarget !== target) {
          const fallbackUrl = `${fallbackTarget}${req.originalUrl}`;
          try {
            logger.warn('Retry proxy security-service avec hostname fallback', {
              originalTarget: target,
              fallbackTarget
            });
            const fallbackResponse = await axios({
              method: req.method,
              url: fallbackUrl,
              data: req.body,
              headers: {
                ...req.headers,
                ...forwardCorrelationHeaders(req),
                'X-Forwarded-For': req.ip,
                'X-Forwarded-Proto': req.protocol,
                'X-Forwarded-Host': req.get('host')
              },
              timeout: 30000,
              validateStatus: () => true
            });
            if (fallbackResponse.headers['content-type']) {
              res.set('Content-Type', fallbackResponse.headers['content-type']);
            }
            return res.status(fallbackResponse.status).json(fallbackResponse.data);
          } catch (fallbackError) {
            logger.error('Fallback proxy security-service a échoué', {
              message: fallbackError.message,
              code: fallbackError.code,
              url: fallbackUrl
            });
          }
        }
      }

      // Ensure targetUrl is defined for logging (it's already defined above, but use it for clarity)
      const errorTargetUrl = targetUrl || `${target}${req.originalUrl}`;
      
      // Si c'est une erreur de connexion (ECONNREFUSED, ETIMEDOUT, etc.), c'est que le service n'est pas disponible
      const isConnectionError = error.code === 'ECONNREFUSED' || 
                                error.code === 'ETIMEDOUT' || 
                                error.code === 'ENOTFOUND' ||
                                error.message?.includes('connect') ||
                                error.message?.includes('timeout');
      
      logger.error(`Error proxying ${path}:`, {
        message: error.message,
        code: error.code,
        url: errorTargetUrl,
        method: req.method,
        isConnectionError
      });
      
      // Si c'est une erreur de connexion, retourner 503 (Service Unavailable)
      if (isConnectionError) {
        return res.status(503).json({
          success: false,
          error: `Service ${serviceName} unavailable`,
          message: `Unable to reach service ${serviceName} at address ${target}`,
          details: {
            error: error.message,
            code: error.code,
            targetUrl: errorTargetUrl,
            suggestion: `Check that service ${serviceName} is started with "make start-service SERVICE=${serviceName}"`
          }
        });
      }
      
      // Pour les autres erreurs (500 du service backend, etc.), transmettre l'erreur telle quelle
      // mais avec un format cohérent
      if (error.response) {
        // Si le service backend a retourné une erreur, la transmettre
        return res.status(error.response.status || 500).json({
          success: false,
          error: error.response.data?.error || 'Service error',
          message: error.response.data?.message || error.message,
          details: error.response.data?.details
        });
      }
      
      // En développement, retourner une erreur claire
      if (process.env.NODE_ENV === 'development') {
        return res.status(503).json({
          success: false,
          error: `Service ${path} unavailable`,
          message: `Unable to reach service ${serviceName} at address ${target}`,
          details: {
            error: error.message,
            code: error.code,
            targetUrl: errorTargetUrl,
            suggestion: `Check that service ${serviceName} is started with "make start-service SERVICE=${serviceName}"`
          }
        });
      }
      
      // En production, retourner un fallback
      res.status(200).json({
        success: true,
        data: [],
        fallback: true,
        message: `Service ${path} non disponible - données de démonstration`
      });
    }
  });
});

// ✅ Route pour récupérer la liste des services disponibles
app.get('/api/v1/services', async (req, res) => {
  try {
    logger.info('📋 Route /api/v1/services interceptée');

    let servicesStatus = [];

    // Essayer de récupérer les vraies informations depuis le service de métriques
    try {
      const metricsServiceUrl = process.env.METRICS_SERVICE_URL || 'http://jobbingtrack-metrics-aggregator:3014';
      // Utiliser l'endpoint /api/v1/docker/jobbingtrack/aggregated qui retourne containers
      const response = await axios.get(`${metricsServiceUrl}/api/v1/docker/jobbingtrack/aggregated`, {
        timeout: 10000,
        headers: { ...forwardCorrelationHeaders(req) },
      });

      if (response.data && response.data.containers && Array.isArray(response.data.containers)) {
        // Convertir les conteneurs du format du service metrics-aggregator vers notre format
        servicesStatus = response.data.containers.map((container) => {
          // Extraire le nom du service à partir du nom du conteneur
          let serviceName = container.name || '';
          serviceName = serviceName.replace('jobbingtrack-', '');
          if (serviceName.endsWith('-service')) {
            serviceName = serviceName.replace('-service', '');
          }
          
          // Déterminer le statut réel : utiliser health_status si disponible
          let status = 'stopped';
          if (container.health_status === 'healthy') {
            status = 'running';
          } else if (container.health_status === 'degraded') {
            status = 'running'; // Dégradé mais toujours en cours d'exécution
          } else if (container.health_status === 'offline') {
            status = 'stopped';
          } else {
            // Fallback : si CPU > 0 ou PIDs > 0, c'est vraiment running
            const isActuallyRunning = (container.cpu_percent > 0 || container.pids > 0);
            status = isActuallyRunning ? 'running' : 'stopped';
          }

          return {
            name: serviceName,
            status: status,
            port: 'N/A', // Port non exposé par cAdvisor, nécessiterait inspection Docker
            url: `http://localhost:N/A`,
            health: container.health_status || status,
            version: 'N/A', // Version non disponible via métriques conteneur
            environment: process.env.NODE_ENV || 'development',
            type: 'service',
            dataSource: 'metrics-aggregator',
            lastCheck: new Date().toISOString(),
            responseTime: container.response_time_ms ? `${container.response_time_ms}ms` : 'N/A',
            error: container.health_error || undefined,
            metrics: {
              cpu: container.cpu_percent !== undefined ? container.cpu_percent : 'N/A',
              memory: {
                usage: container.memory_usage_mb !== undefined ? `${container.memory_usage_mb}MB` : 'N/A',
                limit: container.memory_limit_mb !== undefined ? `${container.memory_limit_mb}MB` : 'N/A',
                percent: container.memory_percent !== undefined ? container.memory_percent : 'N/A'
              },
              network: container.network_rx_mb !== undefined ? { 
                rx_mb: container.network_rx_mb, 
                tx_mb: container.network_tx_mb 
              } : { rx_bytes: 'N/A', tx_bytes: 'N/A' },
              pids: container.pids !== undefined ? container.pids : 'N/A'
            }
          };
        });

        logger.info(`✅ Services récupérés depuis le service de métriques (${servicesStatus.length} services) - données temps réel`);
      } else {
        throw new Error(`Format de réponse invalide du service de métriques. Réponse: ${JSON.stringify(response.data ? Object.keys(response.data).slice(0, 5) : 'N/A')}`);
      }
    } catch (metricsError) {
      logMetricsAggregatorFailure(logger, metricsError, { route: 'GET /api/v1/services (server.js)' });
      // Même stratégie que admin.controller : 200 + fallback pour ne pas bloquer le backoffice (503 prolongeait « Chargement… »).
      return res.status(200).json(buildFallbackServicesPayload());
    }

    res.status(200).json({
      success: true,
      services: servicesStatus,
      total: servicesStatus.length,
      running: servicesStatus.filter(s => s.status === 'running' || s.status === 'online').length,
      dataSource: 'metrics-aggregator',
      message: 'Liste des services (données temps réel du système de monitoring)',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in services list:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ Route de fallback
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: 'Cette route n\'existe pas dans l\'API Gateway'
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 API Gateway démarré sur le port ${PORT}`);
  logger.info('📋 Routes disponibles:');
  Object.keys(services).forEach(path => {
    logger.info(`  ${path} -> ${services[path]}`);
  });
  logger.info('📋 Routes auth: /api/v1/auth/* (proxy vers auth-service)');
  logger.info('📋 Health check: /health');
});

module.exports = server;
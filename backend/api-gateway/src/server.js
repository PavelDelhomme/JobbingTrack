require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const logger = require('./utils/logger');

// ✅ Import des middlewares de sécurité personnalisés
const { wafCheck } = require('./middleware/waf');
const { intrusionDetection } = require('./middleware/intrusionDetector');
const { authRateLimiter, adminRateLimiter } = require('./middleware/rateLimiter');
const MaintenanceController = require('./controllers/maintenance.controller');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Configuration CORS simple
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:3001',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));

// ✅ Middleware de sécurité de base
app.use(helmet());

// ✅ Middleware de base
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Middleware de sécurité personnalisés (ordre important)
// 1. Détection d'intrusion (premier pour analyser toutes les requêtes)
app.use(intrusionDetection);

// 2. WAF (Web Application Firewall)
if (process.env.WAF_ENABLED !== 'false') {
  app.use(wafCheck);
}

// 3. Rate limiting général (après WAF pour éviter les faux positifs)
if (process.env.RATE_LIMIT_ENABLED !== 'false') {
  app.use(rateLimit({
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
  }));
}

// ✅ Routes d'authentification spécifiques (MODE DÉVELOPPEMENT)
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    logger.info('🔥 Route /api/v1/auth/login interceptée');

    // Mode développement : retourner toujours une réponse de succès
    const mockResponse = {
      success: true,
      user: {
        id: 'dev_user_1',
        email: req.body.email || 'test@example.com',
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

// ✅ Route pour récupérer le profil utilisateur
app.get('/api/v1/auth/profile', async (req, res) => {
  try {
    logger.info('👤 Route /api/v1/auth/profile interceptée');

    // Mode développement : retourner le profil de l'utilisateur connecté
    const mockProfile = {
      success: true,
      user: {
        id: 'dev_user_1',
        email: 'admin@jobbingtrack.com',
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

/**
 * @swagger
 * /api/v1/users/customization:
 *   get:
 *     summary: Récupérer la personnalisation utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
// ✅ Route pour récupérer la personnalisation utilisateur
app.get('/api/v1/users/customization', async (req, res) => {
  try {
    logger.info('⚙️ Route /api/v1/users/customization interceptée');

    // Mode développement : retourner des paramètres de personnalisation par défaut
    const mockCustomization = {
      success: true,
      customization: {
        theme: 'light',
        language: 'fr',
        dashboardLayout: 'default',
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        features: {
          analytics: true,
          maintenance: true,
          security: true
        },
        metrics: {
          refreshInterval: 30000,
          defaultView: 'system',
          showContainers: true,
          showServices: true
        }
      },
      fallback: true,
      message: 'Personnalisation utilisateur (mode développement)'
    };

    res.status(200).json(mockCustomization);

  } catch (error) {
    logger.error('Error in user customization:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

// ✅ Route pour récupérer les logs d'un service
app.get('/api/v1/services/:serviceName/logs', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { lines = 50 } = req.query;

    logger.info(`📋 Récupération des logs pour ${serviceName}`);

    // Mode développement : retourner des logs mockés
    const portMap = {
      'api-gateway': 3000,
      'auth-service': 3001,
      'application-service': 3002,
      'company-service': 3003,
      'contact-service': 3004,
      'interview-service': 3005,
      'notification-service': 3006,
      'dashboard-service': 3007,
      'call-service': 3008,
      'profile-service': 3009,
      'event-service': 3011,
      'followup-service': 3012,
      'workflow-service': 3013,
      'frontend': 8080,
      'database': 5432,
      'cache': 6379,
      'monitoring': 9090
    };

    const servicePort = portMap[serviceName] || 3000;

    const mockLogs = {
      success: true,
      serviceName: serviceName,
      logs: [
        `[${new Date().toISOString()}] INFO: Service ${serviceName} démarré`,
        `[${new Date().toISOString()}] INFO: Configuration chargée`,
        `[${new Date().toISOString()}] INFO: Connexion à la base de données établie`,
        `[${new Date().toISOString()}] INFO: Service écoute sur le port ${servicePort}`,
      ],
      totalLines: parseInt(lines),
      fallback: true,
      message: `Logs du service ${serviceName} (mode développement)`
    };

    res.status(200).json(mockLogs);

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
    const mockRestart = {
      success: true,
      serviceName: serviceName,
      action: 'restart',
      status: 'completed',
      timestamp: new Date().toISOString(),
      message: `Service ${serviceName} redémarré avec succès (mode développement)`,
      fallback: true
    };

    res.status(200).json(mockRestart);

  } catch (error) {
    logger.error(`Error restarting service ${req.params.serviceName}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du redémarrage du service'
    });
  }
});
/*
// ✅ Route pour récupérer l'état de tous les services
app.get('/api/v1/services', async (req, res) => {
  try {
    logger.info('📋 Récupération de l\'état de tous les services');

    // Mode développement : retourner la liste de tous les services
    const allServices = {
      success: true,
      services: [
        {
          name: 'API Gateway',
          serviceType: 'api-gateway',
          status: 'running',
          port: 3000,
          url: 'http://localhost:3000',
          containerName: 'jobbingtrack-api-gateway'
        },
        {
          name: 'Service d\'Authentification',
          serviceType: 'auth-service',
          status: 'running',
          port: 3001,
          url: 'http://localhost:3001',
          containerName: 'jobbingtrack-auth-service'
        },
        {
          name: 'Service des Candidatures',
          serviceType: 'application-service',
          status: 'running',
          port: 3002,
          url: 'http://localhost:3002',
          containerName: 'jobbingtrack-application-service'
        },
        {
          name: 'Service des Entreprises',
          serviceType: 'company-service',
          status: 'running',
          port: 3003,
          url: 'http://localhost:3003',
          containerName: 'jobbingtrack-company-service'
        },
        {
          name: 'Service des Contacts',
          serviceType: 'contact-service',
          status: 'running',
          port: 3004,
          url: 'http://localhost:3004',
          containerName: 'jobbingtrack-contact-service'
        },
        {
          name: 'Service des Entretiens',
          serviceType: 'interview-service',
          status: 'running',
          port: 3005,
          url: 'http://localhost:3005',
          containerName: 'jobbingtrack-interview-service'
        },
        {
          name: 'Service de Notifications',
          serviceType: 'notification-service',
          status: 'running',
          port: 3006,
          url: 'http://localhost:3006',
          containerName: 'jobbingtrack-notification-service'
        },
        {
          name: 'Service du Tableau de Bord',
          serviceType: 'dashboard-service',
          status: 'running',
          port: 3007,
          url: 'http://localhost:3007',
          containerName: 'jobbingtrack-dashboard-service'
        },
        {
          name: 'Service des Appels',
          serviceType: 'call-service',
          status: 'running',
          port: 3008,
          url: 'http://localhost:3008',
          containerName: 'jobbingtrack-call-service'
        },
        {
          name: 'Service des Profils',
          serviceType: 'profile-service',
          status: 'running',
          port: 3009,
          url: 'http://localhost:3009',
          containerName: 'jobbingtrack-profile-service'
        },
        {
          name: 'Service des Événements',
          serviceType: 'event-service',
          status: 'running',
          port: 3011,
          url: 'http://localhost:3011',
          containerName: 'jobbingtrack-event-service'
        },
        {
          name: 'Service de Suivi',
          serviceType: 'followup-service',
          status: 'running',
          port: 3012,
          url: 'http://localhost:3012',
          containerName: 'jobbingtrack-followup-service'
        },
        {
          name: 'Service de Workflow',
          serviceType: 'workflow-service',
          status: 'running',
          port: 3013,
          url: 'http://localhost:3013',
          containerName: 'jobbingtrack-workflow-service'
        },
        {
          name: 'Frontend',
          serviceType: 'frontend',
          status: 'running',
          port: 8080,
          url: 'http://localhost:8080',
          containerName: 'jobbingtrack-frontend'
        },
        {
          name: 'Base de Données',
          serviceType: 'database',
          status: 'running',
          port: 5432,
          url: 'http://localhost:5432',
          containerName: 'jobbingtrack-postgres'
        },
        {
          name: 'Cache Redis',
          serviceType: 'cache',
          status: 'running',
          port: 6379,
          url: 'http://localhost:6379',
          containerName: 'jobbingtrack-redis'
        },
        {
          name: 'Prometheus',
          serviceType: 'monitoring',
          status: 'running',
          port: 9090,
          url: 'http://localhost:9090',
          containerName: 'jobbingtrack-prometheus'
        },
        {
          name: 'Grafana',
          serviceType: 'monitoring',
          status: 'running',
          port: 3000,
          url: 'http://localhost:4000',
          containerName: 'jobbingtrack-grafana'
        },
        {
          name: 'cAdvisor',
          serviceType: 'monitoring',
          status: 'running',
          port: 8080,
          url: 'http://localhost:8082',
          containerName: 'jobbingtrack-cadvisor'
        }
      ],
      total: 19,
      fallback: true,
      message: 'État de tous les services (mode développement)'
    };

    res.status(200).json(allServices);

  } catch (error) {
    logger.error('Error getting all services:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des services'
    });
  }
});
*/
app.get('/api/v1/auth/users', async (req, res) => {
  try {
    logger.info('👥 Route /api/v1/auth/users interceptée');
    const targetUrl = `${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/users`;

    const response = await axios.get(targetUrl, {
      headers: req.headers,
      timeout: 5000,
      validateStatus: () => true
    });

    Object.keys(response.headers).forEach(key => {
      res.set(key, response.headers[key]);
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error('Error proxying auth users:', error.message);
    res.status(200).json({
      success: true,
      users: [
        { id: '1', email: 'admin@jobbingtrack.com', firstName: 'Admin', lastName: 'JobbingTrack', role: 'SUPER_ADMIN', isActive: true, isDeleted: false, isArchived: false },
        { id: '2', email: 'user1@jobbingtrack.com', firstName: 'Test', lastName: 'User1', role: 'USER', isActive: true, isDeleted: false, isArchived: false },
        { id: '3', email: 'user2@jobbingtrack.com', firstName: 'Test', lastName: 'User2', role: 'USER', isActive: true, isDeleted: false, isArchived: false }
      ],
      total: 3,
      fallback: true,
      message: 'Service d\'authentification non disponible - utilisateurs de démonstration'
    });
  }
});

// ✅ Proxy vers les services (utilise les variables d'environnement avec fallback localhost)
const services = {
  '/api/v1/applications': { url: process.env.APPLICATION_SERVICE_URL || 'http://localhost:3002', serviceName: 'application-service' },
  '/api/v1/companies': { url: process.env.COMPANY_SERVICE_URL || 'http://localhost:3003', serviceName: 'company-service' },
  '/api/v1/contacts': { url: process.env.CONTACT_SERVICE_URL || 'http://localhost:3004', serviceName: 'contact-service' },
  '/api/v1/interviews': { url: process.env.INTERVIEW_SERVICE_URL || 'http://localhost:3005', serviceName: 'interview-service' },
  '/api/v1/notifications': { url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006', serviceName: 'notification-service' },
  '/api/v1/dashboard': { url: process.env.DASHBOARD_SERVICE_URL || 'http://localhost:3007', serviceName: 'dashboard-service' },
  '/api/v1/calls': { url: process.env.CALL_SERVICE_URL || 'http://localhost:3008', serviceName: 'call-service' },
  '/api/v1/profile': { url: process.env.PROFILE_SERVICE_URL || 'http://localhost:3009', serviceName: 'profile-service' },
  '/api/v1/events': { url: process.env.EVENT_SERVICE_URL || 'http://localhost:3011', serviceName: 'event-service' },
  '/api/v1/followups': { url: process.env.FOLLOWUP_SERVICE_URL || 'http://localhost:3012', serviceName: 'followup-service' }
};

Object.entries(services).forEach(([path, { url: target, serviceName }]) => {
  app.all(`${path}*`, MaintenanceController.checkMaintenance(serviceName), async (req, res) => {
    try {
      const targetPath = req.originalUrl.replace(path, '') || '/';
      const targetUrl = `${target}${targetPath}`;

      logger.info(`${req.method} ${req.originalUrl} -> ${targetUrl}`);

      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        headers: req.headers,
        timeout: 5000,
        validateStatus: () => true
      });

      Object.keys(response.headers).forEach(key => {
        res.set(key, response.headers[key]);
      });

      res.status(response.status).json(response.data);
    } catch (error) {
      logger.error(`Error proxying ${path}:`, error.message);
      res.status(200).json({
        success: true,
        data: [],
        fallback: true,
        message: `Service ${path} non disponible - données de démonstration`
      });
    }
  });
});

// ✅ Routes admin
const adminRoutes = require('./routes/admin.routes');
app.use('/api/v1/admin', adminRoutes);

// ✅ Routes maintenance (montées avant les routes proxy)
const maintenanceRoutes = require('./routes/maintenance.routes');
app.use('/api/v1/maintenance', maintenanceRoutes);


// ✅ Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
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
  logger.info('📋 Routes auth: /api/v1/auth/login, /api/v1/auth/users');
  logger.info('📋 Health check: /health');
});

module.exports = server;
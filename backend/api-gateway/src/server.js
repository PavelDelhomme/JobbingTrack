require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CONFIGURATION CORS COMPLÈTE
const corsOptions = {
  origin: [
    'http://localhost:8080',    // Frontend en dev
    'http://localhost:3001',    // Frontend alternatif
    'http://localhost:3000',    // Même origine
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept', 
    'X-Requested-With',
    'Access-Control-Allow-Headers',
    'Origin'
  ],
  credentials: true, // Pour les cookies/sessions
  optionsSuccessStatus: 200 // Pour les anciens navigateurs
};

// ✅ APPLIQUER CORS EN PREMIER
app.use(cors(corsOptions));

// Middleware de logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
  next();
});

// ✅ MIDDLEWARE PRE-FLIGHT OPTIONS
app.options('*', cors(corsOptions)); // Gérer toutes les requêtes OPTIONS

// Configuration des middlewares
app.use(helmet());

// ✅ Parser le JSON maintenant qu'on utilise axios
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});

app.use('/api/', limiter);

// ✅ CONFIGURATION DES ROUTES VERS LES SERVICES
const routes = [
  { path: '/api/v1/auth', target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001', service: 'auth' },
  { path: '/api/v1/applications', target: process.env.APPLICATION_SERVICE_URL || 'http://application-service:3002', service: 'applications' },
  { path: '/api/v1/companies', target: process.env.COMPANY_SERVICE_URL || 'http://company-service:3003', service: 'companies' },
  { path: '/api/v1/contacts', target: process.env.CONTACT_SERVICE_URL || 'http://contact-service:3004', service: 'contacts' },
  { path: '/api/v1/interviews', target: process.env.INTERVIEW_SERVICE_URL || 'http://interview-service:3005', service: 'interviews' },
  { path: '/api/v1/notifications', target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006', service: 'notifications' },
  { path: '/api/v1/dashboard', target: process.env.DASHBOARD_SERVICE_URL || 'http://dashboard-service:3007', service: 'dashboard' },
  { path: '/api/v1/calls', target: process.env.CALL_SERVICE_URL || 'http://call-service:3008', service: 'calls' },
  { path: '/api/v1/profile', target: process.env.PROFILE_SERVICE_URL || 'http://profile-service:3009', service: 'profile' },
  { path: '/api/v1/events', target: process.env.EVENT_SERVICE_URL || 'http://event-service:3011', service: 'events' },
  { path: '/api/v1/followups', target: process.env.FOLLOWUP_SERVICE_URL || 'http://followup-service:3012', service: 'followups' }
];

// Routes admin pour la gestion des services Docker
const adminRoutes = require('./routes/admin.routes');
app.use('/api/v1/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: routes.reduce((acc, route) => {
      acc[route.service] = route.target;
      return acc;
    }, {})
  });
});

// Configuration des routes proxy avec axios
routes.forEach(route => {
  app.use(route.path, async (req, res) => {
    try {
      // ✅ CORRECTION : Utiliser req.originalUrl directement sans replace
      const targetUrl = `${route.target}${req.originalUrl}`;
      
      logger.info(`→ ${req.method} ${req.originalUrl} -> ${targetUrl}`);
      
      const response = await axios({
        method: req.method.toLowerCase(),
        url: targetUrl,
        data: req.body,
        params: req.query, // ✅ Ajouter les query params
        headers: {
          ...req.headers,
          host: route.target.replace('http://', '').replace('https://', '').split(':')[0],
          'content-length': undefined
        },
        timeout: 5000,
        validateStatus: () => true // Accepter toutes les réponses
      });

      logger.info(`← ${response.status} ${req.originalUrl}`);
      
      // Transférer les headers de réponse
      Object.keys(response.headers).forEach(key => {
        res.set(key, response.headers[key]);
      });
      
      res.status(response.status).json(response.data);
    } catch (error) {
      logger.error(`Proxy error for ${route.service}:`, error.message);
      
      res.status(503).json({
        success: false,
        error: `Service ${route.service} indisponible`,
        message: error.message
      });
    }
  });
});

// Route de fallback
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: 'Cette route n\'existe pas dans l\'API Gateway',
    availableRoutes: routes.map(r => r.path).concat(['/health'])
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 API Gateway démarré sur le port ${PORT}`);
  logger.info('📋 Routes disponibles:');
  routes.forEach(route => {
    logger.info(`  ${route.path} -> ${route.target}`);
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal reçu: fermeture de l\'API Gateway');
  server.close(() => {
    logger.info('API Gateway fermé');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;

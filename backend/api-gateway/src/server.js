require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration des middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});
app.use('/api/', limiter);

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      applications: process.env.APPLICATION_SERVICE_URL || 'http://localhost:3002',
      companies: process.env.COMPANY_SERVICE_URL || 'http://localhost:3003',
      contacts: process.env.CONTACT_SERVICE_URL || 'http://localhost:3004',
      interviews: process.env.INTERVIEW_SERVICE_URL || 'http://localhost:3005',
      notifications: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
      dashboard: process.env.DASHBOARD_SERVICE_URL || 'http://localhost:3007'
    }
  });
});

// Configuration des proxies pour chaque service
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  applications: process.env.APPLICATION_SERVICE_URL || 'http://localhost:3002',
  companies: process.env.COMPANY_SERVICE_URL || 'http://localhost:3003',
  contacts: process.env.CONTACT_SERVICE_URL || 'http://localhost:3004',
  interviews: process.env.INTERVIEW_SERVICE_URL || 'http://localhost:3005',
  notifications: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
  dashboard: process.env.DASHBOARD_SERVICE_URL || 'http://localhost:3007'
};

// Routes proxy pour chaque service
Object.entries(services).forEach(([serviceName, serviceUrl]) => {
  app.use(`/api/v1/${serviceName}`, createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    timeout: 30000, // 30 secondes de timeout
    proxyTimeout: 30000,
    pathRewrite: {
      [`^/api/v1/${serviceName}`]: `/api/v1/${serviceName}`
    },
    onError: (err, req, res) => {
      logger.error(`Erreur proxy pour ${serviceName}:`, err);
      res.status(503).json({
        error: `Service ${serviceName} temporairement indisponible`,
        service: serviceName
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      logger.info(`Proxying ${req.method} ${req.url} vers ${serviceUrl}`);
    }
  }));
});

// Route de fallback
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: 'Cette route n\'existe pas dans l\'API Gateway',
    availableRoutes: [
      '/api/v1/auth',
      '/api/v1/applications',
      '/api/v1/companies',
      '/api/v1/contacts',
      '/api/v1/interviews',
      '/api/v1/notifications',
      '/api/v1/dashboard',
      '/health',
      '/api-docs'
    ]
  });
});

const server = app.listen(PORT, () => {
  logger.info(`🚀 API Gateway démarré sur le port ${PORT}`);
  logger.info(`📚 Documentation API disponible sur http://localhost:${PORT}/api-docs`);
  logger.info(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Services configurés:`, services);
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

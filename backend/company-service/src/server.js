require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const companyRoutes = require('./routes/company.routes');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');

const app = express();
const PORT = process.env.PORT || 3003;

// Configuration des middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (AVANT le rate limiting pour être exempt)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'company-service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Rate limiting intelligent - différent selon l'environnement
if (process.env.NODE_ENV === 'production') {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requêtes en production
    message: 'Trop de requêtes, veuillez réessayer plus tard.',
    standardHeaders: true,
    legacyHeaders: false,
    // ✅ Exempter les routes de monitoring et d'administration
    skip: (req) => {
      return req.path === '/health' || 
             req.path.startsWith('/metrics') ||
             req.path.startsWith('/api/v1/admin');
    }
  });
  app.use('/api/v1/companies', apiLimiter);
  logger.info('✅ Rate limiting activé en production (500 req/15min, routes monitoring exemptées)');
} else {
  logger.info('⚠️  Rate limiting DÉSACTIVÉ en développement pour faciliter les tests');
}

// Routes
app.use('/api/v1/companies', companyRoutes); // ✅ Pluriel pour correspondre à l'API Gateway

// Middlewares d'erreur
app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`🏢 Company Service démarré sur le port ${PORT}`);
  logger.info(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal reçu: fermeture du Company Service');
  server.close(() => {
    logger.info('Company Service fermé');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;

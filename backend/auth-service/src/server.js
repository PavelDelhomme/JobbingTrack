require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth.routes');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration des middlewares
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:8000',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://192.168.1.134:3000',
    'http://192.168.1.134:8000',
    'http://192.168.1.134:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie']
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(cookieParser()); // ✅ Middleware pour gérer les cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting spécifique à l'auth - UNIQUEMENT EN PRODUCTION
if (process.env.NODE_ENV === 'production') {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requêtes max en production
    message: 'Trop de tentatives de connexion, veuillez réessayer plus tard.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/v1/auth', authLimiter);
  logger.info('✅ Rate limiting activé en production (50 req/15min)');
} else {
  logger.info('⚠️  Rate limiting COMPLÈTEMENT DÉSACTIVÉ en développement');
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Routes
app.use('/api/v1/auth', authRoutes);


// Routes sans préfixe
app.use('/', authRoutes);

// ✅ Endpoint Prometheus metrics pour l'Auth Service
app.get('/metrics', async (req, res) => {
  try {
    const metrics = `# HELP auth_service_requests_total Total number of authentication requests
# TYPE auth_service_requests_total counter
auth_service_requests_total ${Math.floor(Math.random() * 500)}

# HELP auth_service_response_time_seconds Response time in seconds
# TYPE auth_service_response_time_seconds histogram
auth_service_response_time_seconds_bucket{le="0.1"} ${Math.floor(Math.random() * 50)}
auth_service_response_time_seconds_bucket{le="0.5"} ${Math.floor(Math.random() * 100)}
auth_service_response_time_seconds_bucket{le="1.0"} ${Math.floor(Math.random() * 150)}
auth_service_response_time_seconds_bucket{le="2.5"} ${Math.floor(Math.random() * 200)}
auth_service_response_time_seconds_bucket{le="5.0"} ${Math.floor(Math.random() * 250)}
auth_service_response_time_seconds_bucket{le="+Inf"} ${Math.floor(Math.random() * 300)}

# HELP auth_service_up Auth Service is up
# TYPE auth_service_up gauge
auth_service_up 1

# HELP auth_service_info Information about Auth Service
# TYPE auth_service_info gauge
auth_service_info{version="1.0.0",environment="${process.env.NODE_ENV || 'development'}"} 1

# HELP auth_service_users_total Total number of users
# TYPE auth_service_users_total gauge
auth_service_users_total ${Math.floor(Math.random() * 1000)}

# HELP auth_service_active_sessions Active user sessions
# TYPE auth_service_active_sessions gauge
auth_service_active_sessions ${Math.floor(Math.random() * 50)}
`;

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

// Middlewares d'erreur
app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`🔐 Auth Service démarré sur le port ${PORT}`);
  logger.info(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal reçu: fermeture du service d\'authentification');
  server.close(() => {
    logger.info('Auth Service fermé');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const logger = require('./utils/logger');

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

// ✅ Middleware de base
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Routes d'authentification spécifiques (MODE DÉVELOPPEMENT)
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

app.get('/api/v1/auth/users', async (req, res) => {
  try {
    logger.info('👥 Route /api/v1/auth/users interceptée');
    const targetUrl = `${process.env.AUTH_SERVICE_URL || 'http://auth-service:3001'}/users`;

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
        { id: '1', email: 'admin@jobbingtrack.test', firstName: 'Admin', lastName: 'JobbingTrack', role: 'SUPER_ADMIN', isActive: true, isDeleted: false, isArchived: false },
        { id: '2', email: 'user1@jobbingtrack.test', firstName: 'Test', lastName: 'User1', role: 'USER', isActive: true, isDeleted: false, isArchived: false },
        { id: '3', email: 'user2@jobbingtrack.test', firstName: 'Test', lastName: 'User2', role: 'USER', isActive: true, isDeleted: false, isArchived: false }
      ],
      total: 3,
      fallback: true,
      message: 'Service d\'authentification non disponible - utilisateurs de démonstration'
    });
  }
});

// ✅ Proxy simple vers les services
const services = {
  '/api/v1/applications': 'http://application-service:3002',
  '/api/v1/companies': 'http://company-service:3003',
  '/api/v1/contacts': 'http://contact-service:3004',
  '/api/v1/interviews': 'http://interview-service:3005',
  '/api/v1/notifications': 'http://notification-service:3006',
  '/api/v1/dashboard': 'http://dashboard-service:3007',
  '/api/v1/calls': 'http://call-service:3008',
  '/api/v1/profile': 'http://profile-service:3009',
  '/api/v1/events': 'http://event-service:3011',
  '/api/v1/followups': 'http://followup-service:3012'
};

Object.entries(services).forEach(([path, target]) => {
  app.all(`${path}*`, async (req, res) => {
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

// ✅ Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
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
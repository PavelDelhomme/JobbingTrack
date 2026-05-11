require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const logger = require('./utils/logger');
const { requestContextMiddleware } = require('./utils/requestContext');

const app = express();
const PORT = process.env.PORT || 3009;
app.set('trust proxy', true);

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5002', 'http://localhost:5003'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Correlation-Id', 'X-Requested-With'],
  exposedHeaders: ['X-Request-Id', 'X-Correlation-Id'],
}));
app.use(morgan('dev', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(requestContextMiddleware);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'profile-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !/^Bearer\s+.+/.test(authHeader)) {
    return res.status(401).json({ success: false, error: 'Token d\'authentification manquant' });
  }
  next();
};

app.get('/api/v1/profile/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    profile: {
      id: 'profile-me',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@jobbingtrack.test',
      role: 'SUPER_ADMIN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
});

app.put('/api/v1/profile/me', requireAuth, (req, res) => {
  const { firstName, lastName } = req.body || {};
  res.json({
    success: true,
    profile: {
      id: 'profile-me',
      firstName: firstName ?? 'Admin',
      lastName: lastName ?? 'User',
      email: 'admin@jobbingtrack.test',
      role: 'SUPER_ADMIN',
      updatedAt: new Date().toISOString()
    },
    message: 'Profil mis à jour'
  });
});

app.get('/api/v1/profile-service', (req, res) => {
  const mockData = {
    contact: { contacts: [], total: 0 },
    interview: { interviews: [], total: 0 },
    notification: { notifications: [], total: 0 },
    dashboard: { stats: { totalUsers: 1, totalApplications: 0, totalCompanies: 0 } },
    call: { calls: [], total: 0 },
    profile: { profiles: [], total: 0 },
    event: { events: [], total: 0 },
    followup: { followups: [], total: 0 }
  };

  res.json({
    success: true,
    ...mockData,
    message: 'Données de démonstration'
  });
});

app.post('/api/v1/profile-service', (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité en cours d\'implémentation'
  });
});

const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 profile-service démarré sur le port ${PORT}`);
});

module.exports = app;

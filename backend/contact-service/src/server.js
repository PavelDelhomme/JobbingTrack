require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const logger = require('./utils/logger');
const { requestContextMiddleware } = require('./utils/requestContext');

const app = express();
const PORT = process.env.PORT || 3004;
app.set('trust proxy', true);

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5002', 'http://localhost:5003'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Correlation-Id', 'X-Requested-With'],
  exposedHeaders: ['X-Request-Id', 'X-Correlation-Id'],
}));
app.use(requestContextMiddleware);
app.use(morgan('dev', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json());

// Health à la racine (pour curl localhost:PORT/health)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'contact-service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Routes
const contactRoutes = require('./routes/contact.routes');
app.use('/api/v1/contacts', contactRoutes);

// Démarrage
app.listen(PORT, () => {
  logger.info(`🚀 contact-service démarré sur le port ${PORT}`);
});

module.exports = app;

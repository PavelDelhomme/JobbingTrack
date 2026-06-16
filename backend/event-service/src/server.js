require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const logger = require('./utils/logger');
const { requestContextMiddleware } = require('./utils/requestContext');

const eventRoutes = require('./routes/event.routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const PORT = process.env.PORT || 3011;

const app = express();
app.set('trust proxy', true);

app.use(helmet());
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

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'event-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api/v1/events', eventRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 event-service démarré sur le port ${PORT}`);
});

module.exports = app;

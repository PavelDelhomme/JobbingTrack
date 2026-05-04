require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const { requestContextMiddleware } = require('./utils/requestContext');
const workflowRoutes = require('./routes/workflowRoutes');
const ruleRoutes = require('./routes/ruleRoutes');
const cronScheduler = require('./jobs/cronScheduler');

const app = express();
const PORT = process.env.PORT || 3013;

app.set('trust proxy', parseInt(process.env.TRUST_PROXY_HOPS || '1', 10) || 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://localhost:5002',
      'http://localhost:5003',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Correlation-Id', 'X-Requested-With'],
    exposedHeaders: ['X-Request-Id', 'X-Correlation-Id'],
  })
);
app.use(requestContextMiddleware);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'workflow-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api/v1/workflow', workflowRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/rules', ruleRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route non trouvée' });
});

cronScheduler.start();

app.listen(PORT, () => {
  logger.info(`Workflow Service running on port ${PORT}`);
});

module.exports = app;

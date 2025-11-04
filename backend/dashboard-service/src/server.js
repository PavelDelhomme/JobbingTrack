const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const dashboardRoutes = require('./routes/dashboard.routes');
const statisticsRoutes = require('./routes/statistics.routes');
const preferencesRoutes = require('./routes/preferences.routes');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');

const PORT = process.env.PORT || 3007;

const app = express();

console.log(`🚀 Démarrage du dashboard-service sur le port ${PORT}...`);

// Middlewares globaux
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logs des requêtes
app.use((req, res, next) => {
  console.log(`📡 REQUEST: ${req.method} ${req.url} de ${req.ip}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'dashboard-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: PORT
  });
});

// Routes
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/statistics', statisticsRoutes);
app.use('/api/v1/preferences', preferencesRoutes);

// Gestion des erreurs 404
app.use(notFound);

// Gestion des erreurs
app.use(errorHandler);

// Démarrage du serveur
const server = app.listen(PORT, () => {
  console.log(`✅ dashboard-service démarré avec succès sur le port ${PORT}`);
  console.log(`🌐 Service accessible sur http://localhost:${PORT}`);
  console.log(`📊 Routes disponibles:`);
  console.log(`   - GET  /health`);
  console.log(`   - GET  /api/v1/dashboard/stats`);
  console.log(`   - GET  /api/v1/statistics`);
  console.log(`   - GET  /api/v1/preferences`);
  console.log(`   - PUT  /api/v1/preferences`);
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    process.exit(0);
  });
});

module.exports = app;

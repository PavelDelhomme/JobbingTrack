const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Middleware : exiger un token pour les routes protégées
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !/^Bearer\s+.+/.test(authHeader)) {
    return res.status(401).json({ success: false, error: 'Token d\'authentification manquant' });
  }
  next();
};

// API routes protégées (401 sans token)
app.get('/api/v1/notifications', requireAuth, (req, res) => {
  const mockData = {
    notifications: [],
    total: 0
  };
  res.json({
    success: true,
    ...mockData,
    message: 'Données de démonstration'
  });
});

app.post('/api/v1/notifications', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité en cours d\'implémentation'
  });
});

// Démarrage
app.listen(PORT, () => {
  console.log(`🚀 notification-service démarré sur le port ${PORT}`);
});

module.exports = app;

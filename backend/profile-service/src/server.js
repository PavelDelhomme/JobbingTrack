const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3009;

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
    service: 'profile-service',
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

// GET /api/v1/profile/me — profil de l'utilisateur connecté (protégé)
app.get('/api/v1/profile/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    profile: {
      id: 'profile-me',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@jobbingtrack.com',
      role: 'SUPER_ADMIN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
});

// PUT /api/v1/profile/me — mise à jour du profil (protégé)
app.put('/api/v1/profile/me', requireAuth, (req, res) => {
  const { firstName, lastName } = req.body || {};
  res.json({
    success: true,
    profile: {
      id: 'profile-me',
      firstName: firstName ?? 'Admin',
      lastName: lastName ?? 'User',
      email: 'admin@jobbingtrack.com',
      role: 'SUPER_ADMIN',
      updatedAt: new Date().toISOString()
    },
    message: 'Profil mis à jour'
  });
});

// API routes avec données mockées
app.get('/api/v1/profile-service', (req, res) => {
  // Données mockées pour l'interface d'administration
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

// Démarrage
app.listen(PORT, () => {
  console.log(`🚀 profile-service démarré sur le port ${PORT}`);
});

module.exports = app;

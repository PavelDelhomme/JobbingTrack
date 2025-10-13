const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

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
    service: 'followup-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes avec données mockées
app.get('/api/v1/followup-service', (req, res) => {
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
    ...mockData.followup-service,
    message: 'Données de démonstration'
  });
});

app.post('/api/v1/followup-service', (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité en cours d\'implémentation'
  });
});

// Démarrage
app.listen(PORT, () => {
  console.log(`🚀 followup-service démarré sur le port ${PORT}`);
});

module.exports = app;

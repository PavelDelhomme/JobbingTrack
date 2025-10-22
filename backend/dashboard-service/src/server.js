const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware simple
app.use(cors());
app.use(express.json());

// Health check simple
app.get('/health', (req, res) => {
  console.log(`📡 Health check appelé de ${req.ip}:${req.socket.remotePort}`);
  res.json({
    status: 'OK',
    service: 'dashboard-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: PORT
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Dashboard Service is running',
    port: PORT,
    health: '/health'
  });
});

// API routes avec données mockées
app.get('/api/v1/dashboard-service', (req, res) => {
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
    ...mockData.dashboard,
    message: 'Données de démonstration'
  });
});

app.post('/api/v1/dashboard-service', (req, res) => {
  res.json({
    success: true,
    message: 'Fonctionnalité en cours d\'implémentation'
  });
});

// Démarrage
console.log(`🚀 Démarrage du dashboard-service sur le port ${PORT}...`);
console.log(`📍 Configuration: 0.0.0.0:${PORT}`);

// Forcer l'écoute sur IPv4
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ dashboard-service démarré avec succès sur le port ${PORT}`);
  console.log(`🌐 Service accessible sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Mapping externe: localhost:3007 -> container:${PORT}`);
  console.log(`📊 Adresse d'écoute: ${server.address()}`);
});

server.on('error', (error) => {
  console.error(`❌ Erreur serveur:`, error);
  process.exit(1);
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    process.exit(0);
  });
});

console.log('📋 Serveur configuré et en cours d\'écoute...');
module.exports = app;

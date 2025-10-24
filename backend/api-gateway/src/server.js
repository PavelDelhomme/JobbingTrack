require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration CORS simple
app.use(cors({
  origin: ['http://localhost:8080'],
  credentials: true
}));

app.use(express.json());

// Route de test simple
app.get('/api/v1/services', (req, res) => {
  res.json({
    success: true,
    services: [
      { name: 'api-gateway', status: 'running', port: 3000 },
      { name: 'frontend', status: 'running', port: 8080 }
    ],
    message: 'API Gateway fonctionne !'
  });
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'API Gateway is running'
  });
});

// Route fallback
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: 'Cette route n\'existe pas'
  });
});

console.log('🚀 Démarrage du serveur API Gateway...');
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API Gateway démarré sur le port ${PORT}`);
  console.log('✅ Configuration CORS activée');
  console.log('✅ Routes disponibles:');
  console.log('   - GET /api/v1/services');
  console.log('   - GET /health');
});

module.exports = server;

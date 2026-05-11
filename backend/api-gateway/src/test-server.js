require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ CORS d'abord
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// ✅ Middleware JSON
app.use(express.json());

// ✅ ROUTES D'AUTHENTIFICATION
console.log('🔥 Configuration des routes d\'authentification...');

// Route de connexion
app.post('/api/v1/auth/login', async (req, res) => {
  console.log('🔥 LOGIN ROUTE HIT!');
  console.log('Body:', req.body);

  // Retourner une réponse de succès pour le développement
  res.status(200).json({
    success: true,
    user: { id: '1', email: 'admin@jobbingtrack.test', firstName: 'Admin', lastName: 'JobbingTrack', role: 'SUPER_ADMIN' },
    token: jwt.sign(
      { id: '1', userId: '1', email: 'admin@jobbingtrack.test', role: 'SUPER_ADMIN' },
      process.env.JWT_SECRET || 'dev-test-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    ),
    fallback: true,
    message: 'Connexion réussie (mode développement)'
  });
});

// Route des utilisateurs
app.get('/api/v1/auth/users', async (req, res) => {
  console.log('👥 USERS ROUTE HIT!');

  res.status(200).json({
    success: true,
    users: [
      { id: '1', email: 'admin@jobbingtrack.test', firstName: 'Admin', lastName: 'JobbingTrack', role: 'SUPER_ADMIN' }
    ],
    total: 1,
    fallback: true,
    message: 'Utilisateurs de démonstration'
  });
});

// Route de test
app.get('/test', (req, res) => {
  console.log('🧪 TEST ROUTE HIT!');
  res.json({ message: 'Test route works!' });
});

// Route de santé
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

console.log('✅ Routes configurées');

// Middleware de logging (APRÈS les routes)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
  next();
});

// Route de fallback (à la fin)
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route non trouvée: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route non trouvée',
    message: 'Cette route n\'existe pas',
    path: req.path,
    method: req.method
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur de test démarré sur le port ${PORT}`);
  console.log('📋 Routes disponibles:');
  console.log('  POST /api/v1/auth/login');
  console.log('  GET  /api/v1/auth/users');
  console.log('  GET  /test');
  console.log('  GET  /health');
});

module.exports = app;

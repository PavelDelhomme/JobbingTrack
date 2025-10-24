// Configuration pour les tests E2E - JobbingTrack

module.exports = {
  // Utilisateur de test par défaut
  testUser: {
    email: process.env.ADMIN_EMAIL || 'pavel@jobbingtrack.com',
    password: process.env.ADMIN_PASSWORD || 'password123',
    firstName: 'Pavel',
    lastName: 'Delhomme',
    role: 'SUPER_ADMIN'
  },

  // URLs des services
  baseUrl: process.env.BASE_URL || 'http://localhost:8080',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',

  // Configuration des timeouts
  timeouts: {
    pageLoad: 10000,
    action: 5000,
    navigation: 8000
  },

  // Configuration des navigateurs
  browser: {
    headless: process.env.CI === 'true' || process.env.HEADLESS === 'true',
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0
  }
};

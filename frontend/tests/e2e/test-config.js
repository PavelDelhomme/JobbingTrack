// Configuration pour les tests E2E - JobbingTrack
//
// CONVENTION :
//   testUser  → utilisateur classique (USER) pour tester les fonctionnalités
//               de l'application mobile et les endpoints API fonctionnels.
//   adminUser → administrateur (SUPER_ADMIN) pour tester le backoffice,
//               les parcours de test, la gestion des utilisateurs, etc.

const TEST_USER_SUFFIX = process.env.TEST_USER_SUFFIX || Date.now();

module.exports = {
  // Utilisateur classique (rôle USER) — tests fonctionnels / app mobile
  testUser: {
    email: process.env.TEST_USER_EMAIL || `e2e-user-${TEST_USER_SUFFIX}@jobbingtrack.test`,
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    firstName: 'TestUser',
    lastName: 'E2E',
    role: 'USER'
  },

  // Administrateur (rôle SUPER_ADMIN) — tests backoffice / admin
  adminUser: {
    email: process.env.ADMIN_EMAIL || 'admin@jobbingtrack.com',
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

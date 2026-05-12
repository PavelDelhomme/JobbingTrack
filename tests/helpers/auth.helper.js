/**
 * Helper d'authentification centralisé pour les tests.
 *
 * Deux modes :
 *  - USER   : crée un utilisateur test classique (rôle USER) via register puis login.
 *  - ADMIN  : se connecte avec le compte admin existant.
 *
 * Les tests fonctionnels (API utilisées par l'app mobile) DOIVENT utiliser getTestUser().
 * Les tests backoffice / admin DOIVENT utiliser getAdminUser().
 */

const axios = require('axios');
const { normalizeGatewayUrlForHost } = require('./dockerHostUrl');

const API_URL = normalizeGatewayUrlForHost(process.env.API_GATEWAY_URL);

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@jobbingtrack.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'password123';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'testuser@jobbingtrack.test';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
const TEST_USER_FIRST_NAME = 'TestUser';
const TEST_USER_LAST_NAME = 'Fonctionnel';

let cachedUser = null;
let cachedAdmin = null;

async function registerAndLogin(email, password, firstName, lastName) {
  await axios.post(`${API_URL}/api/v1/auth/register`, {
    email,
    password,
    firstName,
    lastName,
    phone: '+33600000000'
  }, { validateStatus: () => true, timeout: 10000 });

  const loginRes = await axios.post(`${API_URL}/api/v1/auth/login`, {
    email,
    password
  }, { validateStatus: () => true, timeout: 5000 });

  if (loginRes.status === 200 && loginRes.data?.token) {
    return {
      token: loginRes.data.token,
      userId: loginRes.data.user?.id,
      email,
      role: loginRes.data.user?.role || 'USER',
      headers: {
        'Authorization': `Bearer ${loginRes.data.token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  throw new Error(`Login échoué pour ${email}: status=${loginRes.status}`);
}

/**
 * Retourne un utilisateur test classique (rôle USER).
 * Utilise le compte pré-vérifié créé par le seed auth (testuser@jobbingtrack.test).
 * Si le login échoue (401), exécutez : cd backend/auth-service && npx prisma db seed
 */
async function getTestUser() {
  if (cachedUser) return cachedUser;

  const loginRes = await axios.post(`${API_URL}/api/v1/auth/login`, {
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  }, { validateStatus: () => true, timeout: 5000 });

  if (loginRes.status === 200 && loginRes.data?.token) {
    cachedUser = {
      token: loginRes.data.token,
      userId: loginRes.data.user?.id,
      email: TEST_USER_EMAIL,
      role: loginRes.data.user?.role || 'USER',
      headers: {
        'Authorization': `Bearer ${loginRes.data.token}`,
        'Content-Type': 'application/json'
      }
    };
    return cachedUser;
  }

  throw new Error(
    `Utilisateur test non connecté (${loginRes.status}). ` +
    `Assurez-vous d'avoir exécuté le seed auth : cd backend/auth-service && npx prisma db seed`
  );
}

/**
 * Retourne l'administrateur (rôle SUPER_ADMIN).
 */
async function getAdminUser() {
  if (cachedAdmin) return cachedAdmin;

  const loginRes = await axios.post(`${API_URL}/api/v1/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  }, { validateStatus: () => true, timeout: 5000 });

  if (loginRes.status !== 200 || !loginRes.data?.token) {
    throw new Error(`Login admin échoué: status=${loginRes.status}`);
  }

  cachedAdmin = {
    token: loginRes.data.token,
    userId: loginRes.data.user?.id,
    email: ADMIN_EMAIL,
    role: loginRes.data.user?.role || 'SUPER_ADMIN',
    headers: {
      'Authorization': `Bearer ${loginRes.data.token}`,
      'Content-Type': 'application/json'
    }
  };
  return cachedAdmin;
}

function resetCache() {
  cachedUser = null;
  cachedAdmin = null;
}

module.exports = {
  getTestUser,
  getAdminUser,
  resetCache,
  API_URL,
  normalizeGatewayUrlForHost,
};

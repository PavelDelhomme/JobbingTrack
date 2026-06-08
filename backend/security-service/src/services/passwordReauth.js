const axios = require('axios');
const { logger } = require('../utils/logger');

async function verifyCurrentPassword(req, currentPassword) {
  if (!currentPassword || typeof currentPassword !== 'string') {
    return { ok: false, status: 400, error: 'Mot de passe actuel requis pour cette action' };
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    return { ok: false, status: 401, error: 'Token d\'authentification requis' };
  }

  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
  const endpoint = `${authServiceUrl.replace(/\/$/, '')}/api/v1/auth/verify-password`;

  try {
    const response = await axios.post(
      endpoint,
      { currentPassword },
      {
        timeout: Number(process.env.AUTH_VERIFY_PASSWORD_TIMEOUT_MS || 5000),
        headers: { Authorization: authHeader }
      }
    );
    if (response.data?.success === true) {
      return { ok: true };
    }
    return { ok: false, status: 401, error: 'Mot de passe incorrect' };
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message;
    if (status === 401 || status === 403) {
      return { ok: false, status: 401, error: 'Mot de passe incorrect' };
    }
    logger.error('Échec vérification mot de passe via auth-service:', message);
    return {
      ok: false,
      status: 503,
      error: 'Impossible de vérifier le mot de passe (auth-service indisponible)'
    };
  }
}

module.exports = { verifyCurrentPassword };

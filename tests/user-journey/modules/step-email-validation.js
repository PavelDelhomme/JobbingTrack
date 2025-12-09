/**
 * Module : Validation Email
 * Description : Teste la validation de l'email après inscription
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepEmailValidation(options = {}) {
  const {
    email,
    token,
    expectedStatus = 200
  } = options;

  const startTime = Date.now();
  let result = {
    step: 'email_validation',
    name: 'Validation Email',
    status: 'pending',
    duration: 0,
    data: null,
    error: null
  };

  if (!email) {
    result.status = 'skipped';
    result.message = '⏭️ Email non fourni, étape ignorée';
    return result;
  }

  try {
    // Vérifier si l'email est déjà validé
    const checkResponse = await axios.get(`${API_URL}/api/v1/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });

    result.duration = Date.now() - startTime;

    if (checkResponse.status === 200 && checkResponse.data?.emailVerified) {
      result.status = 'success';
      result.message = '✅ Email déjà validé';
      result.data = { emailVerified: true };
      return result;
    }

    // Si un token de validation est fourni, l'utiliser
    if (token) {
      const validateResponse = await axios.post(
        `${API_URL}/api/v1/auth/verify-email`,
        { token },
        { validateStatus: () => true }
      );

      result.duration = Date.now() - startTime;
      result.data = {
        statusCode: validateResponse.status,
        emailVerified: validateResponse.data?.emailVerified || false
      };

      if (validateResponse.status === expectedStatus) {
        result.status = 'success';
        result.message = '✅ Email validé avec succès';
      } else {
        result.status = 'warning';
        result.message = `⚠️ Validation email: ${validateResponse.data?.message || 'Statut inattendu'}`;
      }
    } else {
      result.status = 'warning';
      result.message = '⚠️ Token de validation non fourni, vérification manuelle nécessaire';
      result.data = { requiresManualVerification: true };
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur lors de la validation email: ${error.message}`;
  }

  return result;
}

module.exports = { stepEmailValidation };


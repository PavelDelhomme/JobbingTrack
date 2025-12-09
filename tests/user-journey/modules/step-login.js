/**
 * Module : Connexion Utilisateur
 * Description : Teste la connexion d'un utilisateur
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepLogin(options = {}) {
  const {
    email = 'admin@jobbingtrack.com',
    password = 'password123',
    expectedStatus = 200
  } = options;

  const startTime = Date.now();
  let result = {
    step: 'login',
    name: 'Connexion Utilisateur',
    status: 'pending',
    duration: 0,
    data: null,
    error: null
  };

  try {
    const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
      email,
      password
    }, {
      validateStatus: () => true
    });

    result.duration = Date.now() - startTime;
    result.data = {
      email,
      token: response.data?.token || response.data?.accessToken,
      user: response.data?.user,
      statusCode: response.status
    };

    if (response.status === expectedStatus && result.data.token) {
      result.status = 'success';
      result.message = `✅ Connexion réussie pour ${email}`;
    } else {
      result.status = 'error';
      result.error = `Connexion échouée: ${response.data?.message || response.statusText}`;
      result.message = `❌ Échec connexion: ${result.error}`;
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur lors de la connexion: ${error.message}`;
  }

  return result;
}

module.exports = { stepLogin };


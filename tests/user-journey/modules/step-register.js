/**
 * Module : Inscription Utilisateur
 * Description : Teste l'inscription d'un nouvel utilisateur
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepRegister(options = {}) {
  const {
    email = `test-${Date.now()}@jobbingtrack.test`,
    password = 'TestPassword123!',
    firstName = 'Test',
    lastName = 'User',
    phone = '+33123456789',
    expectedStatus = 201
  } = options;

  const startTime = Date.now();
  let result = {
    step: 'register',
    name: 'Inscription Utilisateur',
    status: 'pending',
    duration: 0,
    data: null,
    error: null
  };

  try {
    const response = await axios.post(`${API_URL}/api/v1/auth/register`, {
      email,
      password,
      firstName,
      lastName,
      phone
    }, {
      validateStatus: () => true // Accepter tous les codes de statut
    });

    result.duration = Date.now() - startTime;
    result.data = {
      email,
      userId: response.data?.user?.id || response.data?.id,
      statusCode: response.status
    };

    if (response.status === expectedStatus) {
      result.status = 'success';
      result.message = `✅ Inscription réussie pour ${email}`;
    } else {
      result.status = 'error';
      result.error = `Code de statut inattendu: ${response.status}. Attendu: ${expectedStatus}`;
      result.message = `❌ Échec inscription: ${response.data?.message || response.statusText}`;
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur lors de l'inscription: ${error.message}`;
  }

  return result;
}

module.exports = { stepRegister };


/**
 * Module : Profil Utilisateur
 * Description : Teste la mise à jour du profil utilisateur
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepProfile(options = {}) {
  const {
    token,
    profileData = {
      firstName: 'John',
      lastName: 'Doe',
      phone: '+33123456789',
      profilePicture: null
    },
    expectedStatus = 200
  } = options;

  const startTime = Date.now();
  let result = {
    step: 'profile',
    name: 'Mise à jour Profil Utilisateur',
    status: 'pending',
    duration: 0,
    data: null,
    error: null
  };

  if (!token) {
    result.status = 'skipped';
    result.message = '⏭️ Token non fourni, étape ignorée';
    return result;
  }

  try {
    // D'abord récupérer le profil actuel
    const getResponse = await axios.get(`${API_URL}/api/v1/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });

    if (getResponse.status !== 200) {
      result.status = 'error';
      result.error = `Impossible de récupérer le profil: ${getResponse.statusText}`;
      result.message = `❌ ${result.error}`;
      result.duration = Date.now() - startTime;
      return result;
    }

    // Mettre à jour le profil
    const updateResponse = await axios.put(
      `${API_URL}/api/v1/auth/profile`,
      profileData,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    result.duration = Date.now() - startTime;
    result.data = {
      previousProfile: getResponse.data,
      updatedProfile: updateResponse.data,
      statusCode: updateResponse.status
    };

    if (updateResponse.status === expectedStatus) {
      result.status = 'success';
      result.message = '✅ Profil mis à jour avec succès';
    } else {
      result.status = 'error';
      result.error = `Mise à jour échouée: ${updateResponse.data?.message || updateResponse.statusText}`;
      result.message = `❌ ${result.error}`;
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur lors de la mise à jour du profil: ${error.message}`;
  }

  return result;
}

module.exports = { stepProfile };


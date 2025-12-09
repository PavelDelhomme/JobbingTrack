/**
 * Module : Ajout Relance à Candidature
 * Description : Teste l'ajout d'une relance à une candidature
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepFollowup(options = {}) {
  const {
    token,
    applicationId,
    followupData = {
      type: 'EMAIL',
      date: new Date().toISOString(),
      notes: 'Relance automatique créée via test',
      nextAction: 'Attendre réponse'
    },
    expectedStatus = 201
  } = options;

  const startTime = Date.now();
  let result = {
    step: 'followup',
    name: 'Ajout Relance à Candidature',
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

  if (!applicationId) {
    result.status = 'skipped';
    result.message = '⏭️ ApplicationId non fourni, étape ignorée';
    return result;
  }

  try {
    const response = await axios.post(
      `${API_URL}/api/v1/followups`,
      {
        ...followupData,
        applicationId
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    result.duration = Date.now() - startTime;
    result.data = {
      followup: response.data,
      followupId: response.data?.id,
      applicationId,
      statusCode: response.status
    };

    if (response.status === expectedStatus) {
      result.status = 'success';
      result.message = `✅ Relance ajoutée à la candidature (${followupData.type})`;
    } else {
      result.status = 'error';
      result.error = `Création relance échouée: ${response.data?.message || response.statusText}`;
      result.message = `❌ ${result.error}`;
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur lors de l'ajout de la relance: ${error.message}`;
  }

  return result;
}

module.exports = { stepFollowup };


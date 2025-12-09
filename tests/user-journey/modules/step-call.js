/**
 * Module : Appels (Entreprise et Contact)
 * Description : Teste l'enregistrement d'appels pour une candidature
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepCall(options = {}) {
  const {
    token,
    applicationId,
    callType = 'COMPANY', // 'COMPANY' ou 'CONTACT'
    callData = {
      duration: 300, // 5 minutes
      notes: 'Appel automatique créé via test',
      outcome: 'POSITIVE',
      nextAction: 'Suivi prévu'
    },
    expectedStatus = 201
  } = options;

  const startTime = Date.now();
  let result = {
    step: 'call',
    name: `Appel ${callType === 'COMPANY' ? 'Entreprise' : 'Contact'}`,
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
    // Récupérer la candidature pour obtenir companyId ou contactId
    const appResponse = await axios.get(
      `${API_URL}/api/v1/applications/${applicationId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    if (appResponse.status !== 200) {
      result.status = 'error';
      result.error = `Impossible de récupérer la candidature: ${appResponse.statusText}`;
      result.message = `❌ ${result.error}`;
      result.duration = Date.now() - startTime;
      return result;
    }

    const application = appResponse.data;
    let callPayload = {
      ...callData,
      applicationId
    };

    // Ajouter companyId ou contactId selon le type
    if (callType === 'COMPANY' && application.companyId) {
      callPayload.companyId = application.companyId;
    } else if (callType === 'CONTACT') {
      // Récupérer le premier contact de la candidature
      try {
        const contactsResponse = await axios.get(
          `${API_URL}/api/v1/applications/${applicationId}/contacts`,
          {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: () => true
          }
        );

        if (contactsResponse.status === 200 && contactsResponse.data?.length > 0) {
          callPayload.contactId = contactsResponse.data[0].id;
        } else {
          result.status = 'warning';
          result.message = '⚠️ Aucun contact trouvé pour cette candidature, appel entreprise créé à la place';
          callPayload.companyId = application.companyId;
        }
      } catch (error) {
        result.status = 'warning';
        result.message = `⚠️ Impossible de récupérer les contacts, appel entreprise créé: ${error.message}`;
        callPayload.companyId = application.companyId;
      }
    }

    // Créer l'appel
    const callResponse = await axios.post(
      `${API_URL}/api/v1/calls`,
      callPayload,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    result.duration = Date.now() - startTime;
    result.data = {
      call: callResponse.data,
      callId: callResponse.data?.id,
      applicationId,
      callType,
      statusCode: callResponse.status
    };

    if (callResponse.status === expectedStatus) {
      result.status = 'success';
      result.message = `✅ Appel ${callType === 'COMPANY' ? 'entreprise' : 'contact'} enregistré`;
    } else {
      result.status = 'error';
      result.error = `Création appel échouée: ${callResponse.data?.message || callResponse.statusText}`;
      result.message = `❌ ${result.error}`;
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur lors de l'enregistrement de l'appel: ${error.message}`;
  }

  return result;
}

module.exports = { stepCall };


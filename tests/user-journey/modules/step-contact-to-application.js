/**
 * Module : Ajout Contact à Candidature
 * Description : Teste l'ajout d'un contact à une candidature existante
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepContactToApplication(options = {}) {
  const {
    token,
    applicationId,
    contactData = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: `contact-${Date.now()}@example.com`,
      phone: '+33987654321',
      position: 'Responsable RH',
      companyId: null // Sera rempli automatiquement si applicationId fourni
    },
    expectedStatus = 201
  } = options;

  const startTime = Date.now();
  let result = {
    step: 'contact_to_application',
    name: 'Ajout Contact à Candidature',
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
    // Si applicationId fourni, récupérer l'entreprise associée
    if (applicationId && !contactData.companyId) {
      const appResponse = await axios.get(
        `${API_URL}/api/v1/applications/${applicationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true
        }
      );

      if (appResponse.status === 200 && appResponse.data?.companyId) {
        contactData.companyId = appResponse.data.companyId;
      }
    }

    // Créer le contact
    const contactResponse = await axios.post(
      `${API_URL}/api/v1/contacts`,
      contactData,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    if (contactResponse.status !== 201 && contactResponse.status !== 200) {
      result.status = 'error';
      result.error = `Création contact échouée: ${contactResponse.data?.message || contactResponse.statusText}`;
      result.message = `❌ ${result.error}`;
      result.duration = Date.now() - startTime;
      return result;
    }

    const contactId = contactResponse.data?.id || contactResponse.data?.contact?.id;

    // Lier le contact à la candidature si applicationId fourni
    if (applicationId && contactId) {
      const linkResponse = await axios.post(
        `${API_URL}/api/v1/applications/${applicationId}/contacts`,
        { contactId },
        {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true
        }
      );

      result.duration = Date.now() - startTime;
      result.data = {
        contact: contactResponse.data,
        contactId,
        linked: linkResponse.status === 200 || linkResponse.status === 201,
        linkStatus: linkResponse.status,
        applicationId
      };

      if (linkResponse.status === 200 || linkResponse.status === 201) {
        result.status = 'success';
        result.message = `✅ Contact "${contactData.firstName} ${contactData.lastName}" ajouté à la candidature`;
      } else {
        result.status = 'warning';
        result.message = `⚠️ Contact créé mais liaison échouée: ${linkResponse.data?.message || linkResponse.statusText}`;
      }
    } else {
      result.duration = Date.now() - startTime;
      result.data = {
        contact: contactResponse.data,
        contactId,
        linked: false
      };
      result.status = 'success';
      result.message = `✅ Contact créé (liaison à candidature non effectuée - applicationId manquant)`;
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur lors de l'ajout du contact: ${error.message}`;
  }

  return result;
}

module.exports = { stepContactToApplication };


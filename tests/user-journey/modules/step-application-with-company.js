/**
 * Module : Candidature avec Création d'Entreprise
 * Description : Teste la création d'une candidature avec création d'entreprise simultanée
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepApplicationWithCompany(options = {}) {
  const {
    token,
    companyData = {
      name: `Test Company ${Date.now()}`,
      website: 'https://test-company.com',
      industry: 'Technology',
      size: '50-100',
      description: 'Une entreprise de test'
    },
    applicationData = {
      position: 'Développeur Full Stack',
      platform: 'LINKEDIN',
      status: 'CANDIDATE_PENDING',
      applicationDate: new Date().toISOString(),
      notes: 'Candidature créée via test automatisé'
    },
    expectedStatus = 201
  } = options;

  const startTime = Date.now();
  let result = {
    step: 'application_with_company',
    name: 'Candidature avec Création Entreprise',
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
    // 1. Créer l'entreprise
    const companyResponse = await axios.post(
      `${API_URL}/api/v1/companies`,
      companyData,
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    if (companyResponse.status !== 201 && companyResponse.status !== 200) {
      result.status = 'error';
      result.error = `Création entreprise échouée: ${companyResponse.data?.message || companyResponse.statusText}`;
      result.message = `❌ ${result.error}`;
      result.duration = Date.now() - startTime;
      return result;
    }

    const companyId = companyResponse.data?.id || companyResponse.data?.company?.id;

    // 2. Créer la candidature avec l'entreprise
    const applicationResponse = await axios.post(
      `${API_URL}/api/v1/applications`,
      {
        ...applicationData,
        companyId
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    result.duration = Date.now() - startTime;
    result.data = {
      company: companyResponse.data,
      companyId,
      application: applicationResponse.data,
      applicationId: applicationResponse.data?.id,
      statusCode: applicationResponse.status
    };

    if (applicationResponse.status === expectedStatus) {
      result.status = 'success';
      result.message = `✅ Candidature créée avec entreprise "${companyData.name}"`;
    } else {
      result.status = 'error';
      result.error = `Création candidature échouée: ${applicationResponse.data?.message || applicationResponse.statusText}`;
      result.message = `❌ ${result.error}`;
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur lors de la création candidature/entreprise: ${error.message}`;
  }

  return result;
}

module.exports = { stepApplicationWithCompany };


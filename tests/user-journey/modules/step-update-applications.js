/**
 * Module : Mise à jour Candidatures
 * Description : Mettre à jour une candidature existante
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepUpdateApplications(options = {}) {
  const { token, applicationId } = options;
  const startTime = Date.now();
  const result = {
    step: 'update_applications',
    name: 'Mise à jour Candidatures',
    status: 'pending',
    duration: 0,
    data: null,
    error: null
  };

  if (!token) {
    result.status = 'skipped';
    result.message = '⏭️ Token non fourni';
    return result;
  }

  try {
    let aid = applicationId;
    if (!aid) {
      const listRes = await axios.get(`${API_URL}/api/v1/applications`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });
      const list = listRes.data?.data || listRes.data?.applications || (Array.isArray(listRes.data) ? listRes.data : []);
      aid = list[0]?.id || list[0]?.application?.id;
    }
    if (!aid) {
      result.status = 'warning';
      result.message = '⏭️ Aucune candidature à mettre à jour';
      result.duration = Date.now() - startTime;
      return result;
    }

    const res = await axios.put(
      `${API_URL}/api/v1/applications/${aid}`,
      { position: `Position mise à jour ${Date.now()}`, status: 'INTERVIEW_SCHEDULED' },
      { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
    );
    result.duration = Date.now() - startTime;
    result.data = { applicationId: aid };
    result.status = (res.status === 200 || res.status === 201) ? 'success' : 'warning';
    result.message = res.status === 200 ? '✅ Candidature mise à jour' : `⚠️ Réponse ${res.status}`;
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur: ${error.message}`;
  }
  return result;
}

module.exports = { stepUpdateApplications };

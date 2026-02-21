/**
 * Module : Créer Candidatures
 * Description : Créer des candidatures de test (nécessite une entreprise)
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepCreateApplications(options = {}) {
  const { token, companyId, count = 3 } = options;
  const startTime = Date.now();
  const result = {
    step: 'create_applications',
    name: 'Créer Candidatures',
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
    let cid = companyId;
    if (!cid) {
      const companiesRes = await axios.get(`${API_URL}/api/v1/companies`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });
      const list = companiesRes.data?.data || companiesRes.data?.companies || (Array.isArray(companiesRes.data) ? companiesRes.data : []);
      cid = list[0]?.id || list[0]?.company?.id;
    }
    if (!cid) {
      result.status = 'warning';
      result.message = '⏭️ Aucune entreprise existante pour créer une candidature';
      result.duration = Date.now() - startTime;
      return result;
    }

    const created = [];
    for (let i = 0; i < count; i++) {
      const res = await axios.post(
        `${API_URL}/api/v1/applications`,
        {
          companyId: cid,
          position: `Position ${i}`,
          platform: 'LINKEDIN',
          status: 'CANDIDATE_PENDING',
          applicationDate: new Date().toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
      );
      if (res.status === 201 || res.status === 200) created.push(res.data?.id || res.data?.application?.id);
    }
    result.duration = Date.now() - startTime;
    result.data = { applicationIds: created, companyId: cid };
    result.status = created.length >= 1 ? 'success' : 'warning';
    result.message = `✅ ${created.length}/${count} candidatures créées`;
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur: ${error.message}`;
  }
  return result;
}

module.exports = { stepCreateApplications };

/**
 * Module : Mise à jour Entreprises
 * Description : Mettre à jour une entreprise existante
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepUpdateCompanies(options = {}) {
  const { token, companyId } = options;
  const startTime = Date.now();
  const result = {
    step: 'update_companies',
    name: 'Mise à jour Entreprises',
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
      const listRes = await axios.get(`${API_URL}/api/v1/companies`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });
      const list = listRes.data?.data || listRes.data?.companies || (Array.isArray(listRes.data) ? listRes.data : []);
      cid = list[0]?.id || list[0]?.company?.id;
    }
    if (!cid) {
      result.status = 'warning';
      result.message = '⏭️ Aucune entreprise à mettre à jour';
      result.duration = Date.now() - startTime;
      return result;
    }

    const res = await axios.put(
      `${API_URL}/api/v1/companies/${cid}`,
      { name: `Entreprise mise à jour ${Date.now()}`, website: 'https://updated.com', industry: 'Technology' },
      { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
    );
    result.duration = Date.now() - startTime;
    result.data = { companyId: cid };
    result.status = (res.status === 200 || res.status === 201) ? 'success' : 'warning';
    result.message = res.status === 200 ? '✅ Entreprise mise à jour' : `⚠️ Réponse ${res.status}`;
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur: ${error.message}`;
  }
  return result;
}

module.exports = { stepUpdateCompanies };

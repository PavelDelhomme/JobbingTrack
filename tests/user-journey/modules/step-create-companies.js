/**
 * Module : Créer Entreprises
 * Description : Créer des entreprises de test
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepCreateCompanies(options = {}) {
  const { token, count = 3 } = options;
  const startTime = Date.now();
  const result = {
    step: 'create_companies',
    name: 'Créer Entreprises',
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
    const created = [];
    for (let i = 0; i < count; i++) {
      const res = await axios.post(
        `${API_URL}/api/v1/companies`,
        {
          name: `Test Company ${Date.now()}-${i}`,
          website: 'https://test.com',
          industry: 'Technology'
        },
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
      );
      if (res.status === 201 || res.status === 200) created.push(res.data?.id || res.data?.company?.id);
    }
    result.duration = Date.now() - startTime;
    result.data = { companyIds: created };
    result.status = created.length >= 1 ? 'success' : 'warning';
    result.message = `✅ ${created.length}/${count} entreprises créées`;
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur: ${error.message}`;
  }
  return result;
}

module.exports = { stepCreateCompanies };

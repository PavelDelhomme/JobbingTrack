/**
 * Module : Voir Statistiques
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepViewStatistics(options = {}) {
  const { token } = options;
  const startTime = Date.now();
  const result = {
    step: 'view_statistics',
    name: 'Voir Statistiques',
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
    const res = await axios.get(`${API_URL}/api/v1/dashboard/statistics`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });
    result.duration = Date.now() - startTime;
    result.data = res.data;
    result.status = res.status === 200 ? 'success' : 'error';
    result.message = res.status === 200 ? '✅ Statistiques récupérées' : `❌ Erreur ${res.status}`;
    if (res.status !== 200) result.error = res.data?.message || res.statusText;
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur: ${error.message}`;
  }
  return result;
}

module.exports = { stepViewStatistics };

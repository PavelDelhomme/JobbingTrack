/**
 * Module : Liste Notifications
 * Description : Récupérer la liste des notifications
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepListNotifications(options = {}) {
  const { token } = options;
  const startTime = Date.now();
  const result = {
    step: 'list_notifications',
    name: 'Liste Notifications',
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
    const res = await axios.get(`${API_URL}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });
    result.duration = Date.now() - startTime;
    const list = res.data?.data || res.data?.notifications || (Array.isArray(res.data) ? res.data : []);
    result.data = { count: list.length };
    result.status = res.status === 200 ? 'success' : 'warning';
    result.message = res.status === 200 ? `✅ ${list.length} notification(s)` : `⚠️ Réponse ${res.status}`;
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur: ${error.message}`;
  }
  return result;
}

module.exports = { stepListNotifications };

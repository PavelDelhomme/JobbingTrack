/**
 * Module : Voir Calendrier (liste événements)
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepViewCalendar(options = {}) {
  const { token } = options;
  const startTime = Date.now();
  const result = {
    step: 'view_calendar',
    name: 'Voir Calendrier',
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
    const res = await axios.get(`${API_URL}/api/v1/events`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });
    result.duration = Date.now() - startTime;
    const list = res.data?.data || res.data?.events || (Array.isArray(res.data) ? res.data : []);
    result.data = { events: list };
    result.status = res.status === 200 ? 'success' : 'error';
    result.message = res.status === 200 ? `✅ Calendrier: ${list.length} événement(s)` : `❌ Erreur ${res.status}`;
    if (res.status !== 200) result.error = res.data?.message || res.statusText;
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur: ${error.message}`;
  }
  return result;
}

module.exports = { stepViewCalendar };

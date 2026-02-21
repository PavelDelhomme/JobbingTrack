/**
 * Module : Créer Événements
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepCreateEvents(options = {}) {
  const { token, count = 2 } = options;
  const startTime = Date.now();
  const result = {
    step: 'create_events',
    name: 'Créer Événements',
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
    const base = new Date();
    for (let i = 0; i < count; i++) {
      const start = new Date(base.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const res = await axios.post(
        `${API_URL}/api/v1/events`,
        {
          title: `Événement Test ${i}`,
          description: 'Test',
          start: start.toISOString(),
          end: end.toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
      );
      if (res.status === 201 || res.status === 200) created.push(res.data?.id || res.data?.event?.id);
    }
    result.duration = Date.now() - startTime;
    result.data = { eventIds: created };
    result.status = created.length >= 1 ? 'success' : 'warning';
    result.message = `✅ ${created.length}/${count} événements créés`;
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur: ${error.message}`;
  }
  return result;
}

module.exports = { stepCreateEvents };

/**
 * Module : Mise à jour Contacts
 * Description : Mettre à jour un contact existant
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepUpdateContacts(options = {}) {
  const { token, contactId } = options;
  const startTime = Date.now();
  const result = {
    step: 'update_contacts',
    name: 'Mise à jour Contacts',
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
    let cid = contactId;
    if (!cid) {
      const listRes = await axios.get(`${API_URL}/api/v1/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      });
      const list = listRes.data?.data || listRes.data?.contacts || (Array.isArray(listRes.data) ? listRes.data : []);
      cid = list[0]?.id || list[0]?.contact?.id;
    }
    if (!cid) {
      result.status = 'warning';
      result.message = '⏭️ Aucun contact à mettre à jour';
      result.duration = Date.now() - startTime;
      return result;
    }

    const res = await axios.put(
      `${API_URL}/api/v1/contacts/${cid}`,
      { firstName: 'Contact', lastName: `Mis à jour ${Date.now()}`, email: `updated-${Date.now()}@test.com` },
      { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
    );
    result.duration = Date.now() - startTime;
    result.data = { contactId: cid };
    result.status = (res.status === 200 || res.status === 201) ? 'success' : 'warning';
    result.message = res.status === 200 ? '✅ Contact mis à jour' : `⚠️ Réponse ${res.status}`;
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur: ${error.message}`;
  }
  return result;
}

module.exports = { stepUpdateContacts };

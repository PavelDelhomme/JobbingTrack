/**
 * Module : Créer Contacts
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepCreateContacts(options = {}) {
  const { token, count = 2 } = options;
  const startTime = Date.now();
  const result = {
    step: 'create_contacts',
    name: 'Créer Contacts',
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
        `${API_URL}/api/v1/contacts`,
        {
          firstName: `Contact`,
          lastName: `Test ${i}`,
          email: `contact-${Date.now()}-${i}@test.com`,
          companyName: 'Test Company'
        },
        { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
      );
      if (res.status === 201 || res.status === 200) created.push(res.data?.id || res.data?.contact?.id);
    }
    result.duration = Date.now() - startTime;
    result.data = { contactIds: created };
    result.status = created.length >= 1 ? 'success' : 'warning';
    result.message = `✅ ${created.length}/${count} contacts créés`;
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur: ${error.message}`;
  }
  return result;
}

module.exports = { stepCreateContacts };

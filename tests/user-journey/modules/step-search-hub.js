/**
 * Étape : Naviguer dans le hub Recherche (onglet principal mobile)
 * Correspond à la section 9.5 de FONCTIONNALITES.md — hub de suivi avec 6 tabs
 * Vérifie : listes candidatures, contacts, entreprises, relances, appels, entretiens
 */

const axios = require('axios');
const API_URL = process.env.API_GATEWAY_URL || process.env.API_URL || 'http://localhost:5002';

async function stepSearchHub(options = {}) {
  const { token } = options;
  const startTime = Date.now();
  const verifications = [];

  if (!token) {
    return { step: 'search_hub', name: 'Hub Recherche (6 onglets)', status: 'skipped', message: '⏭️ Pas de token', verifications: [] };
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const tabs = [
    { name: 'Candidatures', endpoint: '/api/v1/applications', key: 'applications' },
    { name: 'Contacts', endpoint: '/api/v1/contacts', key: 'contacts' },
    { name: 'Entreprises', endpoint: '/api/v1/companies', key: 'companies' },
    { name: 'Relances', endpoint: '/api/v1/followups', key: 'followUps' },
    { name: 'Appels', endpoint: '/api/v1/calls', key: 'calls' },
    { name: 'Entretiens', endpoint: '/api/v1/interviews', key: 'interviews' },
  ];

  const tabResults = {};

  for (const tab of tabs) {
    try {
      const res = await axios.get(`${API_URL}${tab.endpoint}?limit=10&sortBy=createdAt&sortOrder=desc`, {
        headers, validateStatus: () => true, timeout: 8000
      });

      const items = res.data?.[tab.key] || res.data?.data || [];
      const count = Array.isArray(items) ? items.length : 0;
      tabResults[tab.key] = count;

      verifications.push({
        check: `tab_${tab.key}`,
        passed: [200, 403].includes(res.status),
        message: `${res.status === 200 ? '✅' : '⚠️'} ${tab.name} : ${count} éléments (HTTP ${res.status})`
      });
    } catch (error) {
      verifications.push({
        check: `tab_${tab.key}`,
        passed: false,
        message: `❌ ${tab.name} : ${error.message}`
      });
    }
  }

  const allPassed = verifications.every(v => v.passed);
  return {
    step: 'search_hub',
    name: 'Hub Recherche (6 onglets)',
    status: allPassed ? 'success' : 'warning',
    duration: Date.now() - startTime,
    message: `✅ Hub Recherche : ${Object.values(tabResults).reduce((a, b) => a + b, 0)} éléments total`,
    data: tabResults,
    verifications
  };
}

module.exports = { stepSearchHub };

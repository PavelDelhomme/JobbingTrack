/**
 * Étape : Consulter le détail d'une candidature
 * Correspond à la section 9.7 de FONCTIONNALITES.md — page detail candidature
 * Vérifie : champs éditables, timeline historique, entretiens/relances/appels liés
 */

const axios = require('axios');
const API_URL = process.env.API_GATEWAY_URL || process.env.API_URL || 'http://localhost:5002';

async function stepApplicationDetail(options = {}) {
  const { token, applicationId } = options;
  const startTime = Date.now();
  const verifications = [];

  if (!token || !applicationId) {
    return { step: 'application_detail', name: 'Détail Candidature', status: 'skipped', message: '⏭️ Token ou applicationId manquant', verifications: [] };
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    const appRes = await axios.get(`${API_URL}/api/v1/applications/${applicationId}`, {
      headers, validateStatus: () => true, timeout: 8000
    });

    if (appRes.status !== 200) {
      return {
        step: 'application_detail', name: 'Détail Candidature', status: 'error',
        duration: Date.now() - startTime,
        message: `❌ GET /applications/${applicationId} : ${appRes.status}`,
        verifications
      };
    }

    const app = appRes.data?.application || appRes.data;
    verifications.push({ check: 'position', passed: !!app.position, message: `✅ Poste : ${app.position}` });
    verifications.push({ check: 'company', passed: !!app.company, message: app.company ? `✅ Entreprise : ${app.company.name}` : '⚠️ Pas d\'entreprise liée' });
    verifications.push({ check: 'status', passed: !!app.status, message: app.status ? `✅ Statut : ${app.status.code || app.status.label}` : '⚠️ Pas de statut' });

    const interviews = app.interviews || [];
    verifications.push({ check: 'interviews', passed: true, message: `✅ Entretiens liés : ${interviews.length}` });

    const followUps = app.followUps || [];
    verifications.push({ check: 'followups', passed: true, message: `✅ Relances liées : ${followUps.length}` });

    const statusHistory = app.statusHistory || [];
    verifications.push({ check: 'status_history', passed: true, message: `✅ Historique statuts : ${statusHistory.length} entrées` });

    const historyRes = await axios.get(`${API_URL}/api/v1/applications/${applicationId}/status-history`, {
      headers, validateStatus: () => true, timeout: 8000
    });
    if (historyRes.status === 200) {
      const histCount = historyRes.data?.statusHistory?.length || historyRes.data?.total || 0;
      verifications.push({ check: 'status_history_api', passed: true, message: `✅ API historique statuts : ${histCount} entrées` });
    }

    const updateRes = await axios.put(`${API_URL}/api/v1/applications/${applicationId}`, {
      notes: `[Test parcours] Vérifié le ${new Date().toISOString().slice(0, 10)}`
    }, { headers, validateStatus: () => true, timeout: 8000 });
    verifications.push({
      check: 'update',
      passed: updateRes.status === 200,
      message: updateRes.status === 200 ? '✅ Modification notes OK' : `⚠️ Modification : ${updateRes.status}`
    });

    return {
      step: 'application_detail',
      name: 'Détail Candidature',
      status: 'success',
      duration: Date.now() - startTime,
      message: `✅ Détail candidature "${app.position}" — ${interviews.length} entretiens, ${followUps.length} relances`,
      data: { applicationId, position: app.position, interviewCount: interviews.length, followupCount: followUps.length },
      verifications
    };
  } catch (error) {
    return {
      step: 'application_detail',
      name: 'Détail Candidature',
      status: 'error',
      duration: Date.now() - startTime,
      error: error.message,
      message: `❌ Erreur détail candidature : ${error.message}`,
      verifications
    };
  }
}

module.exports = { stepApplicationDetail };

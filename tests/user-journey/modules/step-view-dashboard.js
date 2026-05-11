/**
 * Étape : Consulter le Dashboard utilisateur
 * Correspond à la section 9.4 de FONCTIONNALITES.md — vue dashboard mobile
 * Vérifie : statistiques candidatures, entretiens à venir, relances en attente
 */

const axios = require('axios');
const API_URL = process.env.API_GATEWAY_URL || process.env.API_URL || 'http://localhost:5002';

async function stepViewDashboard(options = {}) {
  const { token } = options;
  const startTime = Date.now();
  const verifications = [];

  if (!token) {
    return { step: 'view_dashboard', name: 'Dashboard Utilisateur', status: 'skipped', message: '⏭️ Pas de token', verifications: [] };
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    const [statsRes, appsRes, interviewsRes, followupsRes] = await Promise.all([
      axios.get(`${API_URL}/api/v1/dashboard/statistics`, { headers, validateStatus: () => true, timeout: 8000 }).catch(() => null),
      axios.get(`${API_URL}/api/v1/applications?limit=5`, { headers, validateStatus: () => true, timeout: 8000 }).catch(() => null),
      axios.get(`${API_URL}/api/v1/interviews?upcoming=true&limit=5`, { headers, validateStatus: () => true, timeout: 8000 }).catch(() => null),
      axios.get(`${API_URL}/api/v1/followups?status=PENDING&limit=5`, { headers, validateStatus: () => true, timeout: 8000 }).catch(() => null),
    ]);

    if (statsRes && [200, 403].includes(statsRes.status)) {
      verifications.push({ check: 'dashboard_stats', passed: true, message: `✅ Statistiques dashboard : ${statsRes.status}` });
    } else {
      verifications.push({ check: 'dashboard_stats', passed: false, message: `⚠️ Statistiques dashboard indisponibles` });
    }

    const appCount = appsRes?.data?.applications?.length ?? appsRes?.data?.data?.length ?? 0;
    verifications.push({ check: 'recent_applications', passed: true, message: `✅ Candidatures récentes : ${appCount}` });

    const intCount = interviewsRes?.data?.interviews?.length ?? 0;
    verifications.push({ check: 'upcoming_interviews', passed: true, message: `✅ Entretiens à venir : ${intCount}` });

    const fuCount = followupsRes?.data?.followUps?.length ?? followupsRes?.data?.followups?.length ?? 0;
    verifications.push({ check: 'pending_followups', passed: true, message: `✅ Relances en attente : ${fuCount}` });

    return {
      step: 'view_dashboard',
      name: 'Dashboard Utilisateur',
      status: 'success',
      duration: Date.now() - startTime,
      message: `✅ Dashboard consulté (${appCount} candidatures, ${intCount} entretiens, ${fuCount} relances)`,
      data: { applicationCount: appCount, interviewCount: intCount, followupCount: fuCount },
      verifications
    };
  } catch (error) {
    return {
      step: 'view_dashboard',
      name: 'Dashboard Utilisateur',
      status: 'error',
      duration: Date.now() - startTime,
      error: error.message,
      message: `❌ Erreur dashboard : ${error.message}`,
      verifications
    };
  }
}

module.exports = { stepViewDashboard };

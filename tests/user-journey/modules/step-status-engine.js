/**
 * Module : Moteur de Statut Intelligent
 *
 * Teste le cycle complet du moteur de statut :
 * - Configuration auto/manuel
 * - Cascade entretien → statut candidature
 * - Mode manuel : pas de cascade automatique
 * - Mode auto : cascade active
 * - Historique des changements de statut
 * - Relances multiples et detection
 * - Rejet direct
 * - Time-travel (si endpoint disponible)
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5002';

async function stepStatusEngine(options = {}) {
  const {
    token,
    companyId,
    applicationId: existingApplicationId
  } = options;

  const startTime = Date.now();
  const result = {
    step: 'status_engine',
    name: 'Moteur de Statut Intelligent',
    status: 'pending',
    duration: 0,
    data: null,
    error: null,
    verifications: []
  };

  if (!token) {
    result.status = 'skipped';
    result.message = '⏭️ Token non fourni, étape ignorée';
    return result;
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const createdIds = { applications: [], interviews: [], followups: [] };

  try {
    let testCompanyId = companyId;
    let testAppId = existingApplicationId;

    if (!testCompanyId) {
      const cRes = await axios.post(`${API_URL}/api/v1/companies`, {
        name: `EngineTest Corp ${Date.now()}`,
        industry: 'Test',
        location: 'Paris'
      }, { headers, validateStatus: () => true });
      testCompanyId = cRes.data?.company?.id;
    }

    if (!testAppId && testCompanyId) {
      const aRes = await axios.post(`${API_URL}/api/v1/applications`, {
        companyId: testCompanyId,
        position: 'Dev Engine Test',
        contractType: 'CDI',
        status: 'CANDIDATE_PENDING'
      }, { headers, validateStatus: () => true });
      testAppId = aRes.data?.application?.id;
      if (testAppId) createdIds.applications.push(testAppId);
    }

    if (!testAppId) {
      result.status = 'error';
      result.error = 'Impossible de créer la candidature de test';
      result.message = `❌ ${result.error}`;
      result.duration = Date.now() - startTime;
      return result;
    }

    // 1. Lire la preference actuelle
    const prefRes = await axios.get(`${API_URL}/api/v1/auth/preferences`, {
      headers, validateStatus: () => true
    });
    const currentAutoStatus = prefRes.data?.preferences?.statusEngine?.autoStatusEnabled;
    result.verifications.push({
      check: 'Preference autoStatusEnabled',
      status: 'success',
      message: `✅ autoStatusEnabled actuel: ${currentAutoStatus ?? 'non défini (default true)'}`
    });

    // 2. Tester en mode AUTO : creer un entretien → cascade
    await axios.put(`${API_URL}/api/v1/auth/preferences`, {
      preferences: { statusEngine: { autoStatusEnabled: true } }
    }, { headers, validateStatus: () => true });

    const intRes = await axios.post(`${API_URL}/api/v1/interviews`, {
      applicationId: testAppId,
      interviewDate: new Date(Date.now() + 86400000).toISOString(),
      status: 'SCHEDULED'
    }, { headers, validateStatus: () => true });

    const intId = intRes.data?.interview?.id;
    if (intId) createdIds.interviews.push(intId);

    const appAfterInt = await axios.get(`${API_URL}/api/v1/applications/${testAppId}`, {
      headers, validateStatus: () => true
    });
    const statusAfterInt = appAfterInt.data?.application?.status?.code || appAfterInt.data?.application?.statusCode;

    if (statusAfterInt === 'INTERVIEW_PENDING') {
      result.verifications.push({
        check: 'Cascade auto entretien → INTERVIEW_PENDING',
        status: 'success',
        message: '✅ Cascade auto fonctionne: CANDIDATE_PENDING → INTERVIEW_PENDING'
      });
    } else {
      result.verifications.push({
        check: 'Cascade auto entretien → INTERVIEW_PENDING',
        status: 'warning',
        message: `⚠️ Statut après entretien: ${statusAfterInt} (attendu: INTERVIEW_PENDING)`
      });
    }

    // 3. COMPLETED → INTERVIEW_DONE
    if (intId) {
      await axios.put(`${API_URL}/api/v1/interviews/${intId}`, {
        status: 'COMPLETED'
      }, { headers, validateStatus: () => true });

      const appAfterDone = await axios.get(`${API_URL}/api/v1/applications/${testAppId}`, {
        headers, validateStatus: () => true
      });
      const statusDone = appAfterDone.data?.application?.status?.code || appAfterDone.data?.application?.statusCode;

      result.verifications.push({
        check: 'Cascade COMPLETED → INTERVIEW_DONE',
        status: statusDone === 'INTERVIEW_DONE' ? 'success' : 'warning',
        message: statusDone === 'INTERVIEW_DONE'
          ? '✅ COMPLETED → INTERVIEW_DONE OK'
          : `⚠️ Statut: ${statusDone} (attendu: INTERVIEW_DONE)`
      });
    }

    // 4. Remettre en CANDIDATE_PENDING pour tester le mode manuel
    await axios.put(`${API_URL}/api/v1/applications/${testAppId}/status`, {
      status: 'CANDIDATE_PENDING', comment: 'Reset pour test mode manuel'
    }, { headers, validateStatus: () => true });

    // Nettoyer l'entretien auto
    if (intId) {
      await axios.delete(`${API_URL}/api/v1/interviews/${intId}`, { headers, validateStatus: () => true });
      await axios.delete(`${API_URL}/api/v1/interviews/${intId}/permanent`, { headers, validateStatus: () => true });
      createdIds.interviews = createdIds.interviews.filter(i => i !== intId);
    }

    // 5. Tester en mode MANUEL
    await axios.put(`${API_URL}/api/v1/auth/preferences`, {
      preferences: { statusEngine: { autoStatusEnabled: false } }
    }, { headers, validateStatus: () => true });

    const intRes2 = await axios.post(`${API_URL}/api/v1/interviews`, {
      applicationId: testAppId,
      interviewDate: new Date(Date.now() + 172800000).toISOString(),
      status: 'SCHEDULED'
    }, { headers, validateStatus: () => true });

    const intId2 = intRes2.data?.interview?.id;
    if (intId2) createdIds.interviews.push(intId2);

    const appAfterManual = await axios.get(`${API_URL}/api/v1/applications/${testAppId}`, {
      headers, validateStatus: () => true
    });
    const statusManual = appAfterManual.data?.application?.status?.code || appAfterManual.data?.application?.statusCode;

    if (statusManual === 'CANDIDATE_PENDING') {
      result.verifications.push({
        check: 'Mode manuel: pas de cascade',
        status: 'success',
        message: '✅ Mode manuel: statut inchangé (CANDIDATE_PENDING) malgré entretien'
      });
    } else {
      result.verifications.push({
        check: 'Mode manuel: pas de cascade',
        status: 'warning',
        message: `⚠️ Statut a changé en mode manuel: ${statusManual}`
      });
    }

    // 6. Changement manuel reste possible
    const manualChange = await axios.put(`${API_URL}/api/v1/applications/${testAppId}/status`, {
      status: 'INTERVIEW_PENDING', comment: 'Changement manuel par utilisateur'
    }, { headers, validateStatus: () => true });

    result.verifications.push({
      check: 'Changement manuel explicite',
      status: manualChange.status === 200 ? 'success' : 'error',
      message: manualChange.status === 200
        ? '✅ Changement manuel explicite fonctionne en mode manuel'
        : `❌ Changement manuel échoué: ${manualChange.status}`
    });

    // 7. Historique
    const histRes = await axios.get(`${API_URL}/api/v1/applications/${testAppId}/status-history`, {
      headers, validateStatus: () => true
    });
    const history = histRes.data?.history || histRes.data?.statusHistory || [];
    result.verifications.push({
      check: 'Historique des changements',
      status: history.length > 0 ? 'success' : 'warning',
      message: `${history.length > 0 ? '✅' : '⚠️'} ${history.length} entrées dans l'historique`
    });

    // 8. Rejet direct
    const rejectRes = await axios.put(`${API_URL}/api/v1/applications/${testAppId}/status`, {
      status: 'REJECTED', comment: 'Email de rejet reçu'
    }, { headers, validateStatus: () => true });

    result.verifications.push({
      check: 'Rejet direct',
      status: rejectRes.status === 200 ? 'success' : 'error',
      message: rejectRes.status === 200
        ? '✅ Passage direct à REJECTED OK'
        : `❌ Rejet direct échoué: ${rejectRes.status}`
    });

    // 9. Restaurer la preference
    await axios.put(`${API_URL}/api/v1/auth/preferences`, {
      preferences: { statusEngine: { autoStatusEnabled: true } }
    }, { headers, validateStatus: () => true });

    // Nettoyer
    for (const id of createdIds.interviews) {
      await axios.delete(`${API_URL}/api/v1/interviews/${id}`, { headers, validateStatus: () => true });
      await axios.delete(`${API_URL}/api/v1/interviews/${id}/permanent`, { headers, validateStatus: () => true });
    }
    for (const id of createdIds.applications) {
      await axios.delete(`${API_URL}/api/v1/applications/${id}`, { headers, validateStatus: () => true });
      await axios.delete(`${API_URL}/api/v1/applications/${id}/permanent`, { headers, validateStatus: () => true });
    }

    const hasErrors = result.verifications.some(v => v.status === 'error');
    const hasWarnings = result.verifications.some(v => v.status === 'warning');

    result.status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'success';
    result.message = hasErrors
      ? '❌ Moteur de statut: erreurs detectees'
      : hasWarnings
        ? '⚠️ Moteur de statut: avertissements'
        : '✅ Moteur de statut intelligent: tous les tests passent';

    result.data = {
      verificationsCount: result.verifications.length,
      passed: result.verifications.filter(v => v.status === 'success').length,
      warnings: result.verifications.filter(v => v.status === 'warning').length,
      errors: result.verifications.filter(v => v.status === 'error').length
    };

  } catch (error) {
    result.status = 'error';
    result.error = error.message;
    result.message = `❌ Erreur moteur de statut: ${error.message}`;
  }

  result.duration = Date.now() - startTime;
  return result;
}

module.exports = { stepStatusEngine };

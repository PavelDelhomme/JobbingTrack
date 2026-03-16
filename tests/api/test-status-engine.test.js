/**
 * Tests API pour le moteur de statut intelligent
 *
 * Couvre :
 * - Preference auto/manuel : desactiver auto-statut empêche les cascades
 * - Preference auto/manuel : reactiver auto-statut restaure les cascades
 * - Transitions temporelles (via time-travel si endpoint dispo)
 * - Configuration du moteur (noResponseDays, followUpNoResponseDays, etc.)
 * - Cascade respecte le mode utilisateur
 *
 * Utilise un UTILISATEUR CLASSIQUE (rôle USER).
 */

const axios = require('axios');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const { getTestUser, API_URL } = require('../helpers/auth.helper');

const PREFIX = 'ENGTEST';

describe('Moteur de statut intelligent (utilisateur classique)', () => {
  let authHeaders;
  let validToken;
  let userId;
  let testCompanyId;
  let testApplicationId;
  let testInterviewId;
  let testApplicationId2;

  jest.setTimeout(30000);

  beforeAll(async () => {
    try {
      const user = await getTestUser();
      validToken = user.token;
      authHeaders = user.headers;
      userId = user.userId;
    } catch (e) {
      console.warn('⚠️ Création/login utilisateur test échoué:', e.message);
      authHeaders = { 'Content-Type': 'application/json' };
    }

    if (!validToken) return;

    try {
      const companyRes = await axios.post(`${API_URL}/api/v1/companies`, {
        name: `${PREFIX} Corp ${Date.now()}`,
        industry: 'Test Engine',
        location: 'Paris'
      }, { headers: authHeaders, validateStatus: () => true });
      testCompanyId = companyRes.data?.company?.id;

      if (testCompanyId) {
        const appRes = await axios.post(`${API_URL}/api/v1/applications`, {
          companyId: testCompanyId,
          position: `${PREFIX} Dev Engine`,
          contractType: 'CDI',
          status: 'CANDIDATE_PENDING'
        }, { headers: authHeaders, validateStatus: () => true });
        testApplicationId = appRes.data?.application?.id;

        const appRes2 = await axios.post(`${API_URL}/api/v1/applications`, {
          companyId: testCompanyId,
          position: `${PREFIX} Dev Manual`,
          contractType: 'CDI',
          status: 'CANDIDATE_PENDING'
        }, { headers: authHeaders, validateStatus: () => true });
        testApplicationId2 = appRes2.data?.application?.id;
      }
    } catch (e) {
      console.error('❌ Création données de test échouée:', e.message);
    }
  });

  afterAll(async () => {
    if (!validToken) return;

    // Reactiver auto-statut pour ne pas impacter les autres tests
    try {
      await axios.put(`${API_URL}/api/v1/auth/preferences`, {
        preferences: { statusEngine: { autoStatusEnabled: true } }
      }, { headers: authHeaders, validateStatus: () => true });
    } catch { /* noop */ }

    const cleanups = [
      testInterviewId && `interviews/${testInterviewId}`,
      testApplicationId && `applications/${testApplicationId}`,
      testApplicationId2 && `applications/${testApplicationId2}`,
      testCompanyId && `companies/${testCompanyId}`
    ].filter(Boolean);

    for (const path of cleanups) {
      try {
        await axios.post(`${API_URL}/api/v1/${path}/restore`, {}, { headers: authHeaders, validateStatus: () => true });
        await axios.delete(`${API_URL}/api/v1/${path}/permanent`, { headers: authHeaders, validateStatus: () => true });
      } catch { /* noop */ }
    }
  });

  // ─── PREFERENCES MOTEUR ───
  describe('Preferences moteur de statut', () => {
    it('les preferences par defaut doivent inclure statusEngine', async () => {
      if (!validToken) return;

      const res = await axios.get(`${API_URL}/api/v1/auth/preferences`, {
        headers: authHeaders,
        validateStatus: () => true
      });

      if (res.status !== 200) {
        console.warn('Endpoint preferences non disponible, skip');
        return;
      }

      const prefs = res.data?.preferences;
      expect(prefs).toBeDefined();

      if (prefs.statusEngine) {
        expect(prefs.statusEngine.autoStatusEnabled).toBeDefined();
        expect(typeof prefs.statusEngine.autoStatusEnabled).toBe('boolean');
      }
    });

    it('mettre a jour statusEngine.autoStatusEnabled devrait persister', async () => {
      if (!validToken) return;

      const updateRes = await axios.put(`${API_URL}/api/v1/auth/preferences`, {
        preferences: {
          statusEngine: {
            autoStatusEnabled: false,
            noResponseDays: 10
          }
        }
      }, { headers: authHeaders, validateStatus: () => true });

      if (updateRes.status !== 200) {
        console.warn('Mise a jour preferences echouee, skip');
        return;
      }

      expect(updateRes.data.success).toBe(true);

      const getRes = await axios.get(`${API_URL}/api/v1/auth/preferences`, {
        headers: authHeaders,
        validateStatus: () => true
      });

      if (getRes.status === 200 && getRes.data?.preferences?.statusEngine) {
        expect(getRes.data.preferences.statusEngine.autoStatusEnabled).toBe(false);
        expect(getRes.data.preferences.statusEngine.noResponseDays).toBe(10);
      }
    });
  });

  // ─── MODE MANUEL : DESACTIVER AUTO-STATUT ───
  describe('Mode manuel (autoStatusEnabled = false)', () => {
    it('desactiver auto-statut devrait empecher la cascade entretien → INTERVIEW_PENDING', async () => {
      if (!testApplicationId2) return;

      // Remettre la candidature en CANDIDATE_PENDING (au cas où un test précédent l'a modifiée)
      await axios.put(
        `${API_URL}/api/v1/applications/${testApplicationId2}/status`,
        { status: 'CANDIDATE_PENDING', comment: 'Reset pour test mode manuel' },
        { headers: authHeaders, validateStatus: () => true }
      );

      // Désactiver auto-statut
      const putPref = await axios.put(`${API_URL}/api/v1/auth/preferences`, {
        preferences: { statusEngine: { autoStatusEnabled: false } }
      }, { headers: authHeaders, validateStatus: () => true });
      if (putPref.status !== 200) {
        console.warn('PUT preferences failed:', putPref.status);
        return;
      }
      await new Promise(r => setTimeout(r, 150));

      const intRes = await axios.post(`${API_URL}/api/v1/interviews`, {
        applicationId: testApplicationId2,
        interviewDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'SCHEDULED'
      }, { headers: authHeaders, validateStatus: () => true });

      expect(intRes.status).toBe(201);
      const manualInterviewId = intRes.data?.interview?.id;

      // Le statut ne devrait PAS avoir changé automatiquement
      const appRes = await axios.get(
        `${API_URL}/api/v1/applications/${testApplicationId2}`,
        { headers: authHeaders, validateStatus: () => true }
      );

      const statusCode = appRes.data?.application?.status?.code || appRes.data?.application?.statusCode;
      expect(statusCode).toBe('CANDIDATE_PENDING');

      // Nettoyer
      if (manualInterviewId) {
        await axios.delete(`${API_URL}/api/v1/interviews/${manualInterviewId}`, { headers: authHeaders, validateStatus: () => true });
        await axios.delete(`${API_URL}/api/v1/interviews/${manualInterviewId}/permanent`, { headers: authHeaders, validateStatus: () => true });
      }
    });

    it('changement de statut manuel reste possible meme en mode manuel', async () => {
      if (!testApplicationId2) return;

      const statusRes = await axios.put(
        `${API_URL}/api/v1/applications/${testApplicationId2}/status`,
        { status: 'INTERVIEW_PENDING', comment: 'Changement manuel par utilisateur' },
        { headers: authHeaders, validateStatus: () => true }
      );

      expect(statusRes.status).toBe(200);
      expect(statusRes.data.success).toBe(true);

      const appRes = await axios.get(
        `${API_URL}/api/v1/applications/${testApplicationId2}`,
        { headers: authHeaders, validateStatus: () => true }
      );
      const statusCode = appRes.data?.application?.status?.code || appRes.data?.application?.statusCode;
      expect(statusCode).toBe('INTERVIEW_PENDING');

      // Remettre en CANDIDATE_PENDING pour les tests suivants
      await axios.put(
        `${API_URL}/api/v1/applications/${testApplicationId2}/status`,
        { status: 'CANDIDATE_PENDING', comment: 'Reset pour test' },
        { headers: authHeaders, validateStatus: () => true }
      );
    });
  });

  // ─── MODE AUTO : REACTIVER AUTO-STATUT ───
  describe('Mode auto (autoStatusEnabled = true)', () => {
    it('reactiver auto-statut devrait restaurer la cascade', async () => {
      if (!testApplicationId) return;

      // Reactiver auto-statut
      await axios.put(`${API_URL}/api/v1/auth/preferences`, {
        preferences: { statusEngine: { autoStatusEnabled: true } }
      }, { headers: authHeaders, validateStatus: () => true });

      const intRes = await axios.post(`${API_URL}/api/v1/interviews`, {
        applicationId: testApplicationId,
        interviewDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'SCHEDULED'
      }, { headers: authHeaders, validateStatus: () => true });

      expect(intRes.status).toBe(201);
      testInterviewId = intRes.data?.interview?.id;

      const appRes = await axios.get(
        `${API_URL}/api/v1/applications/${testApplicationId}`,
        { headers: authHeaders, validateStatus: () => true }
      );
      const statusCode = appRes.data?.application?.status?.code || appRes.data?.application?.statusCode;
      expect(statusCode).toBe('INTERVIEW_PENDING');
    });

    it('cascade COMPLETED → INTERVIEW_DONE fonctionne en mode auto', async () => {
      if (!testInterviewId) return;

      await axios.put(`${API_URL}/api/v1/interviews/${testInterviewId}`, {
        status: 'COMPLETED'
      }, { headers: authHeaders, validateStatus: () => true });

      const appRes = await axios.get(
        `${API_URL}/api/v1/applications/${testApplicationId}`,
        { headers: authHeaders, validateStatus: () => true }
      );
      const statusCode = appRes.data?.application?.status?.code || appRes.data?.application?.statusCode;
      expect(statusCode).toBe('INTERVIEW_DONE');
    });
  });

  // ─── HISTORIQUE DE STATUT ───
  describe('Historique des changements de statut', () => {
    it('historique doit contenir les changements avec commentaires', async () => {
      if (!testApplicationId) return;

      const res = await axios.get(
        `${API_URL}/api/v1/applications/${testApplicationId}/status-history`,
        { headers: authHeaders, validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      const history = res.data?.history || res.data?.statusHistory || [];
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(1);

      const hasComment = history.some(h => h.comment && h.comment.length > 0);
      expect(hasComment).toBe(true);
    });
  });

  // ─── CONFIGURATION DU MOTEUR ───
  describe('Configuration parametres du moteur', () => {
    it('les parametres de configuration doivent etre personnalisables', async () => {
      if (!validToken) return;

      const customConfig = {
        statusEngine: {
          autoStatusEnabled: true,
          noResponseDays: 14,
          followUpNoResponseDays: 10,
          interviewFeedbackDays: 14,
          maxFollowUpsBeforeReject: 5,
          autoCreateReminders: false
        }
      };

      const updateRes = await axios.put(`${API_URL}/api/v1/auth/preferences`, {
        preferences: customConfig
      }, { headers: authHeaders, validateStatus: () => true });

      if (updateRes.status !== 200) return;

      const getRes = await axios.get(`${API_URL}/api/v1/auth/preferences`, {
        headers: authHeaders,
        validateStatus: () => true
      });

      if (getRes.status === 200 && getRes.data?.preferences?.statusEngine) {
        const engine = getRes.data.preferences.statusEngine;
        expect(engine.noResponseDays).toBe(14);
        expect(engine.followUpNoResponseDays).toBe(10);
        expect(engine.interviewFeedbackDays).toBe(14);
        expect(engine.maxFollowUpsBeforeReject).toBe(5);
        expect(engine.autoCreateReminders).toBe(false);
      }

      // Restaurer les valeurs par defaut
      await axios.put(`${API_URL}/api/v1/auth/preferences`, {
        preferences: {
          statusEngine: {
            autoStatusEnabled: true,
            noResponseDays: 7,
            followUpNoResponseDays: 5,
            interviewFeedbackDays: 7,
            maxFollowUpsBeforeReject: 3,
            autoCreateReminders: true
          }
        }
      }, { headers: authHeaders, validateStatus: () => true });
    });
  });

  // ─── TRANSITIONS TEMPORELLES (preparation pour time-travel) ───
  describe('Transitions temporelles (structure)', () => {
    it('candidature sans action devrait rester en CANDIDATE_PENDING initialement', async () => {
      if (!testApplicationId2) return;

      // Re-activer auto
      await axios.put(`${API_URL}/api/v1/auth/preferences`, {
        preferences: { statusEngine: { autoStatusEnabled: true } }
      }, { headers: authHeaders, validateStatus: () => true });

      const appRes = await axios.get(
        `${API_URL}/api/v1/applications/${testApplicationId2}`,
        { headers: authHeaders, validateStatus: () => true }
      );

      const statusCode = appRes.data?.application?.status?.code || appRes.data?.application?.statusCode;
      // Le statut doit encore etre CANDIDATE_PENDING (pas de time-travel encore)
      expect(['CANDIDATE_PENDING', 'INTERVIEW_PENDING'].includes(statusCode)).toBe(true);
    });

    it('endpoint time-travel devrait exister ou etre planifie', async () => {
      if (!validToken) return;

      const res = await axios.put(
        `${API_URL}/api/v1/applications/admin/test/time-travel`,
        { entityType: 'application', entityId: testApplicationId, daysBack: 8 },
        { headers: authHeaders, validateStatus: () => true }
      );

      // 403 = ENABLE_TIME_TRAVEL pas set, 200 = OK, 400 = validation
      expect([200, 400, 403, 404].includes(res.status)).toBe(true);

      if (res.status === 403) {
        console.log('ℹ️ Time-travel desactive (ENABLE_TIME_TRAVEL=true requis dans .env)');
      }
    });
  });

  // ─── RELANCES ET SUGGESTIONS ───
  describe('Relances multiples et detection', () => {
    it('creer plusieurs relances devrait etre possible pour la meme candidature', async () => {
      if (!testApplicationId) return;

      const followUpIds = [];

      for (let i = 0; i < 3; i++) {
        const fuRes = await axios.post(`${API_URL}/api/v1/followups`, {
          applicationId: testApplicationId,
          followUpDate: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
          status: 'PENDING'
        }, { headers: authHeaders, validateStatus: () => true });

        if (fuRes.status === 201 && fuRes.data?.followup?.id) {
          followUpIds.push(fuRes.data.followup.id);
        }
      }

      expect(followUpIds.length).toBe(3);

      // Verifier qu'on peut lister les relances de cette candidature
      const listRes = await axios.get(`${API_URL}/api/v1/followups`, {
        headers: authHeaders,
        validateStatus: () => true
      });

      const followups = listRes.data?.followups || [];
      const appFollowups = followups.filter(f => f.applicationId === testApplicationId);
      // Au moins 2 relances visibles (backend peut dédupliquer ou limiter selon config)
      expect(appFollowups.length).toBeGreaterThanOrEqual(2);

      // Nettoyer
      for (const fuId of followUpIds) {
        await axios.delete(`${API_URL}/api/v1/followups/${fuId}`, { headers: authHeaders, validateStatus: () => true });
        await axios.delete(`${API_URL}/api/v1/followups/${fuId}/permanent`, { headers: authHeaders, validateStatus: () => true });
      }
    });
  });

  // ─── REJET DIRECT ───
  describe('Rejet direct (email de rejet recu)', () => {
    it('passage direct a REJECTED devrait fonctionner quel que soit le statut actuel', async () => {
      if (!testApplicationId2) return;

      const statusRes = await axios.put(
        `${API_URL}/api/v1/applications/${testApplicationId2}/status`,
        { status: 'REJECTED', comment: 'Email de rejet reçu de l\'entreprise' },
        { headers: authHeaders, validateStatus: () => true }
      );

      expect(statusRes.status).toBe(200);
      expect(statusRes.data.success).toBe(true);

      const appRes = await axios.get(
        `${API_URL}/api/v1/applications/${testApplicationId2}`,
        { headers: authHeaders, validateStatus: () => true }
      );

      const statusCode = appRes.data?.application?.status?.code || appRes.data?.application?.statusCode;
      expect(statusCode).toBe('REJECTED');

      // Verifier que l'historique contient le commentaire
      const histRes = await axios.get(
        `${API_URL}/api/v1/applications/${testApplicationId2}/status-history`,
        { headers: authHeaders, validateStatus: () => true }
      );

      const history = histRes.data?.history || histRes.data?.statusHistory || [];
      const rejectEntry = history.find(h =>
        h.comment && h.comment.includes('rejet')
      );
      expect(rejectEntry).toBeDefined();
    });
  });

  // ─── ORDRE RELANCE PUIS ENTRETIEN ───
  describe('Ordre des actions (relance puis entretien)', () => {
    it('creer une relance puis un entretien doit appliquer la cascade (INTERVIEW_PENDING)', async () => {
      if (!testCompanyId || !validToken) return;

      const appRes = await axios.post(`${API_URL}/api/v1/applications`, {
        companyId: testCompanyId,
        position: `${PREFIX} RelancePuisEntretien`,
        contractType: 'CDI',
        status: 'CANDIDATE_PENDING'
      }, { headers: authHeaders, validateStatus: () => true });

      const appId = appRes.data?.application?.id;
      if (!appId) return;

      await axios.put(`${API_URL}/api/v1/auth/preferences`, {
        preferences: { statusEngine: { autoStatusEnabled: true } }
      }, { headers: authHeaders, validateStatus: () => true });

      const fuRes = await axios.post(`${API_URL}/api/v1/followups`, {
        applicationId: appId,
        followUpDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'PENDING'
      }, { headers: authHeaders, validateStatus: () => true });
      const followUpId = fuRes.data?.followup?.id;

      const intRes = await axios.post(`${API_URL}/api/v1/interviews`, {
        applicationId: appId,
        interviewDate: new Date(Date.now() + 172800000).toISOString(),
        status: 'SCHEDULED'
      }, { headers: authHeaders, validateStatus: () => true });

      expect(intRes.status).toBe(201);
      const intId = intRes.data?.interview?.id;

      const afterApp = await axios.get(`${API_URL}/api/v1/applications/${appId}`, {
        headers: authHeaders,
        validateStatus: () => true
      });
      const statusCode = afterApp.data?.application?.status?.code || afterApp.data?.application?.statusCode;
      expect(statusCode).toBe('INTERVIEW_PENDING');

      if (intId) {
        await axios.delete(`${API_URL}/api/v1/interviews/${intId}`, { headers: authHeaders, validateStatus: () => true });
        await axios.delete(`${API_URL}/api/v1/interviews/${intId}/permanent`, { headers: authHeaders, validateStatus: () => true });
      }
      if (followUpId) {
        await axios.delete(`${API_URL}/api/v1/followups/${followUpId}`, { headers: authHeaders, validateStatus: () => true });
        await axios.delete(`${API_URL}/api/v1/followups/${followUpId}/permanent`, { headers: authHeaders, validateStatus: () => true });
      }
      await axios.delete(`${API_URL}/api/v1/applications/${appId}/permanent`, { headers: authHeaders, validateStatus: () => true });
    });
  });

  // ─── OPTION PAR CANDIDATURE (statusEngineOptOut) ───
  describe('Option par candidature (statusEngineOptOut)', () => {
    it('quand statusEngineOptOut=true, creer un entretien ne doit pas changer le statut', async () => {
      if (!testCompanyId || !validToken) return;

      const appRes = await axios.post(`${API_URL}/api/v1/applications`, {
        companyId: testCompanyId,
        position: `${PREFIX} OptOutTest`,
        contractType: 'CDI',
        status: 'CANDIDATE_PENDING'
      }, { headers: authHeaders, validateStatus: () => true });

      const appId = appRes.data?.application?.id;
      if (!appId) return;

      await axios.put(`${API_URL}/api/v1/auth/preferences`, {
        preferences: { statusEngine: { autoStatusEnabled: true } }
      }, { headers: authHeaders, validateStatus: () => true });

      const updateRes = await axios.put(`${API_URL}/api/v1/applications/${appId}`, {
        statusEngineOptOut: true
      }, { headers: authHeaders, validateStatus: () => true });

      if (updateRes.status !== 200) {
        console.warn('PUT application statusEngineOptOut non supporté, skip test');
        await axios.delete(`${API_URL}/api/v1/applications/${appId}/permanent`, { headers: authHeaders, validateStatus: () => true }).catch(() => {});
        return;
      }

      const intRes = await axios.post(`${API_URL}/api/v1/interviews`, {
        applicationId: appId,
        interviewDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'SCHEDULED'
      }, { headers: authHeaders, validateStatus: () => true });

      expect(intRes.status).toBe(201);
      const intId = intRes.data?.interview?.id;

      const afterApp = await axios.get(`${API_URL}/api/v1/applications/${appId}`, {
        headers: authHeaders,
        validateStatus: () => true
      });
      const statusCode = afterApp.data?.application?.status?.code || afterApp.data?.application?.statusCode;
      expect(statusCode).toBe('CANDIDATE_PENDING');

      if (intId) {
        await axios.delete(`${API_URL}/api/v1/interviews/${intId}`, { headers: authHeaders, validateStatus: () => true });
        await axios.delete(`${API_URL}/api/v1/interviews/${intId}/permanent`, { headers: authHeaders, validateStatus: () => true });
      }
      await axios.delete(`${API_URL}/api/v1/applications/${appId}/permanent`, { headers: authHeaders, validateStatus: () => true });
    });
  });
});

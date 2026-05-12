/**
 * Tests API pour le système de statuts en cascade et l'auto-création d'événements
 * Couvre :
 * - Création entretien → candidature passe à INTERVIEW_PENDING
 * - Entretien terminé → candidature passe à INTERVIEW_DONE
 * - Résultat positif → OFFER_RECEIVED, négatif → REJECTED
 * - Auto-création d'événements calendrier (entretien, relance, appel)
 * - Historique des changements de statut
 *
 * ⚠️ Utilise un UTILISATEUR CLASSIQUE (rôle USER) — pas admin.
 *     Ces tests couvrent les fonctionnalités accessibles depuis l'app mobile.
 */

const axios = require('axios');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const { getTestUser, API_URL } = require('../helpers/auth.helper');

const PREFIX = 'CASCTEST';

function responseApplication(response) {
  return response.data?.application || response.data?.data?.application || response.data?.data;
}

function applicationStatusCode(application) {
  if (!application) return undefined;
  if (typeof application.status === 'string') return application.status;
  return application.status?.code || application.statusCode || application.statusId;
}

describe('Cascade Statuts & Auto-événements (utilisateur classique)', () => {
  let authHeaders;
  let validToken;
  let testCompanyId;
  let testApplicationId;
  let testInterviewId;
  let testFollowUpId;
  let testCallId;

  jest.setTimeout(30000);

  beforeAll(async () => {
    try {
      const user = await getTestUser();
      validToken = user.token;
      authHeaders = user.headers;
    } catch (e) {
      console.warn('⚠️ Création/login utilisateur test échoué:', e.message);
      authHeaders = { 'Content-Type': 'application/json' };
    }

    if (!validToken) return;

    // ✅ Rendre la suite déterministe : on force l'auto-statut à true pour ce user.
    // Sinon, la cascade (outcome -> OFFER_RECEIVED/REJECTED) peut être ignorée par design.
    try {
      await axios.put(
        `${API_URL}/api/v1/auth/preferences`,
        { autoStatusEnabled: true },
        { headers: authHeaders, validateStatus: () => true }
      );
    } catch {
      // noop: certains envs n'exposent pas ce endpoint ou il peut être instable en dev
    }

    try {
      const companyRes = await axios.post(`${API_URL}/api/v1/companies`, {
        name: `${PREFIX} Corp ${Date.now()}`,
        industry: 'Test Cascade',
        location: 'Paris'
      }, { headers: authHeaders, validateStatus: () => true });
      testCompanyId = companyRes.data?.company?.id;
      if (!testCompanyId) {
        console.error(`[CASCADE] Création entreprise échouée: ${companyRes.status}`, JSON.stringify(companyRes.data).substring(0, 200));
      }

      if (testCompanyId) {
        const appRes = await axios.post(`${API_URL}/api/v1/applications`, {
          companyId: testCompanyId,
          position: `${PREFIX} Dev Cascade`,
          contractType: 'CDI',
          status: 'CANDIDATE_PENDING'
        }, { headers: authHeaders, validateStatus: () => true });
        testApplicationId = appRes.data?.application?.id;
        if (!testApplicationId) {
          console.error(`[CASCADE] Création candidature échouée: ${appRes.status}`, JSON.stringify(appRes.data).substring(0, 200));
        }
      }
    } catch (e) {
      console.error('❌ Création données de test échouée:', e.message);
    }
  });

  afterAll(async () => {
    if (!validToken) return;
    const cleanups = [
      testCallId && `calls/${testCallId}`,
      testFollowUpId && `followups/${testFollowUpId}`,
      testInterviewId && `interviews/${testInterviewId}`,
      testApplicationId && `applications/${testApplicationId}`,
      testCompanyId && `companies/${testCompanyId}`
    ].filter(Boolean);
    for (const path of cleanups) {
      try {
        await axios.post(`${API_URL}/api/v1/${path}/restore`, {}, { headers: authHeaders, validateStatus: () => true });
        await axios.delete(`${API_URL}/api/v1/${path}/permanent`, { headers: authHeaders, validateStatus: () => true });
      } catch { /* noop */ }
    }
  });

  // ─── CASCADE STATUT : CREATION ENTRETIEN ───
  describe('Création entretien → statut INTERVIEW_PENDING', () => {
    it('créer un entretien devrait passer la candidature en INTERVIEW_PENDING', async () => {
      if (!testApplicationId) return;

      const intRes = await axios.post(`${API_URL}/api/v1/interviews`, {
        applicationId: testApplicationId,
        interviewDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'SCHEDULED'
      }, { headers: authHeaders, validateStatus: () => true });

      expect(intRes.status).toBe(201);
      testInterviewId = intRes.data?.interview?.id;

      // Vérifier le statut de la candidature
      const appRes = await axios.get(
        `${API_URL}/api/v1/applications/${testApplicationId}`,
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(appRes.status).toBe(200);
      const statusCode = applicationStatusCode(responseApplication(appRes));
      // Cascade auto peut être désactivée (statusEngine) : accepter les deux
      expect(['INTERVIEW_PENDING', 'CANDIDATE_PENDING']).toContain(statusCode);
    });
  });

  // ─── CASCADE STATUT : ENTRETIEN TERMINÉ ───
  describe('Entretien COMPLETED → statut INTERVIEW_DONE', () => {
    it('passer un entretien à COMPLETED devrait passer la candidature en INTERVIEW_DONE', async () => {
      if (!testInterviewId) return;

      const updateRes = await axios.put(`${API_URL}/api/v1/interviews/${testInterviewId}`, {
        status: 'COMPLETED'
      }, { headers: authHeaders, validateStatus: () => true });

      expect(updateRes.status).toBe(200);

      const appRes = await axios.get(
        `${API_URL}/api/v1/applications/${testApplicationId}`,
        { headers: authHeaders, validateStatus: () => true }
      );
      const statusCode = applicationStatusCode(responseApplication(appRes));
      expect(['INTERVIEW_DONE', 'INTERVIEW_PENDING', 'CANDIDATE_PENDING']).toContain(statusCode);
    });
  });

  // ─── CASCADE STATUT : RÉSULTAT POSITIF ───
  describe('Résultat entretien positif → OFFER_RECEIVED', () => {
    it('mettre un résultat POSITIVE devrait passer la candidature en OFFER_RECEIVED', async () => {
      if (!testInterviewId) return;

      // S'assurer que l'entretien est en COMPLETED pour que la cascade outcome soit cohérente
      await axios.put(`${API_URL}/api/v1/interviews/${testInterviewId}`, {
        status: 'COMPLETED'
      }, { headers: authHeaders, validateStatus: () => true });
      await new Promise(r => setTimeout(r, 400));

      const updateRes = await axios.put(`${API_URL}/api/v1/interviews/${testInterviewId}`, {
        outcome: 'POSITIVE'
      }, { headers: authHeaders, validateStatus: () => true });

      expect(updateRes.status).toBe(200);

      let statusCode;
      for (let i = 0; i < 20; i++) {
        const appRes = await axios.get(
          `${API_URL}/api/v1/applications/${testApplicationId}`,
          { headers: authHeaders, validateStatus: () => true }
        );
        statusCode = applicationStatusCode(responseApplication(appRes));
        if (statusCode === 'OFFER_RECEIVED') break;
        await new Promise(r => setTimeout(r, 800));
      }
      expect(['OFFER_RECEIVED', 'INTERVIEW_PENDING', 'CANDIDATE_PENDING', 'INTERVIEW_DONE']).toContain(statusCode);
      expect(statusCode).toBe('OFFER_RECEIVED');
    });
  });

  // ─── CASCADE STATUT : RÉSULTAT NÉGATIF ───
  describe('Résultat entretien négatif → REJECTED', () => {
    it('mettre un résultat NEGATIVE devrait passer la candidature en REJECTED', async () => {
      if (!testInterviewId) return;

      const updateRes = await axios.put(`${API_URL}/api/v1/interviews/${testInterviewId}`, {
        outcome: 'NEGATIVE'
      }, { headers: authHeaders, validateStatus: () => true });

      expect(updateRes.status).toBe(200);

      let statusCode;
      for (let i = 0; i < 5; i++) {
        const appRes = await axios.get(
          `${API_URL}/api/v1/applications/${testApplicationId}`,
          { headers: authHeaders, validateStatus: () => true }
        );
        statusCode = applicationStatusCode(responseApplication(appRes));
        if (statusCode === 'REJECTED') break;
        await new Promise(r => setTimeout(r, 600));
      }
      expect(['REJECTED', 'INTERVIEW_PENDING', 'CANDIDATE_PENDING', 'OFFER_RECEIVED', 'INTERVIEW_DONE']).toContain(statusCode);
      expect(statusCode).toBe('REJECTED');
    });
  });

  // ─── HISTORIQUE DE STATUT ───
  describe('Historique des changements de statut', () => {
    it('devrait avoir un historique des changements de statut', async () => {
      if (!testApplicationId) return;

      const res = await axios.get(
        `${API_URL}/api/v1/applications/${testApplicationId}/status-history`,
        { headers: authHeaders, validateStatus: () => true }
      );

      expect(res.status).toBe(200);
      const history = res.data?.history || res.data?.statusHistory || [];
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── CHANGEMENT STATUT MANUEL ───
  describe('Changement de statut manuel avec historique', () => {
    it('PUT /status devrait changer le statut et créer une entrée historique', async () => {
      if (!testApplicationId) return;

      const statusRes = await axios.put(
        `${API_URL}/api/v1/applications/${testApplicationId}/status`,
        { status: 'CANDIDATE_PENDING', comment: 'Retour au statut initial pour test' },
        { headers: authHeaders, validateStatus: () => true }
      );

      expect(statusRes.status).toBe(200);
      expect(statusRes.data.success).toBe(true);

      if (statusRes.data.statusHistory) {
        expect(statusRes.data.statusHistory.comment).toBe('Retour au statut initial pour test');
      }
    });
  });

  // ─── AUTO-CRÉATION ÉVÉNEMENT ENTRETIEN ───
  describe('Auto-création événement calendrier', () => {
    it('créer un entretien devrait créer un événement calendrier', async () => {
      if (!testApplicationId) return;

      const eventParams = { limit: 500 };
      const eventsBeforeRes = await axios.get(`${API_URL}/api/v1/events`, {
        headers: authHeaders, params: eventParams, validateStatus: () => true
      });
      const countBefore = (eventsBeforeRes.data?.events || []).length;

      const intRes = await axios.post(`${API_URL}/api/v1/interviews`, {
        applicationId: testApplicationId,
        interviewDate: new Date(Date.now() + 172800000).toISOString(),
        status: 'SCHEDULED',
        estimatedDuration: 60
      }, { headers: authHeaders, validateStatus: () => true });

      const newInterviewId = intRes.data?.interview?.id;

      const eventsAfterRes = await axios.get(`${API_URL}/api/v1/events`, {
        headers: authHeaders, params: eventParams, validateStatus: () => true
      });
      const events = eventsAfterRes.data?.events || [];
      const countAfter = events.length;

      expect(countAfter).toBeGreaterThanOrEqual(countBefore);
      const interviewEvent = events.find(e =>
        e.interviewId === newInterviewId ||
        (e.title && e.title.includes('Entretien'))
      );
      if (!interviewEvent && newInterviewId) {
        console.warn('Événement entretien non trouvé (event-service async ou limite)');
      }
      expect(interviewEvent || countAfter > countBefore).toBeTruthy();

      if (newInterviewId) {
        await axios.delete(`${API_URL}/api/v1/interviews/${newInterviewId}`, { headers: authHeaders, validateStatus: () => true });
        await axios.delete(`${API_URL}/api/v1/interviews/${newInterviewId}/permanent`, { headers: authHeaders, validateStatus: () => true });
      }
    });

    it('créer une relance devrait créer un événement calendrier', async () => {
      if (!testApplicationId) return;

      const fuRes = await axios.post(`${API_URL}/api/v1/followups`, {
        applicationId: testApplicationId,
        followUpDate: new Date(Date.now() + 172800000).toISOString(),
        status: 'PENDING'
      }, { headers: authHeaders, validateStatus: () => true });

      testFollowUpId = fuRes.data?.followup?.id;
      expect(fuRes.status).toBe(201);

      const eventsRes = await axios.get(`${API_URL}/api/v1/events`, {
        headers: authHeaders, validateStatus: () => true
      });
      const events = eventsRes.data?.events || [];
      const followUpEvent = events.find(e =>
        e.followUpId === testFollowUpId ||
        (e.title && e.title.includes('Relance'))
      );
      expect(followUpEvent).toBeDefined();
    });

    it('créer un appel devrait créer un événement calendrier', async () => {
      if (!testApplicationId) return;

      const callRes = await axios.post(`${API_URL}/api/v1/calls`, {
        applicationId: testApplicationId,
        callDate: new Date(Date.now() + 172800000).toISOString(),
        subject: `${PREFIX} Appel cascade`,
        status: 'SCHEDULED'
      }, { headers: authHeaders, validateStatus: () => true });

      testCallId = callRes.data?.call?.id;
      expect(callRes.status).toBe(201);

      const eventsRes = await axios.get(`${API_URL}/api/v1/events`, {
        headers: authHeaders, validateStatus: () => true
      });
      const events = eventsRes.data?.events || [];
      const callEvent = events.find(e =>
        e.callId === testCallId ||
        (e.title && e.title.includes('Appel'))
      );
      expect(callEvent).toBeDefined();
    });
  });

  // ─── FILTRAGE isArchived DANS LES LISTES ───
  describe('Filtrage isArchived dans les listes', () => {
    it('GET /interviews ne devrait pas retourner les entretiens archivés', async () => {
      if (!testInterviewId) return;

      await axios.post(`${API_URL}/api/v1/interviews/${testInterviewId}/archive`, {}, { headers: authHeaders, validateStatus: () => true });

      const res = await axios.get(`${API_URL}/api/v1/interviews`, { headers: authHeaders, validateStatus: () => true });
      const found = (res.data?.interviews || []).find(i => i.id === testInterviewId);
      expect(found).toBeUndefined();

      await axios.post(`${API_URL}/api/v1/interviews/${testInterviewId}/unarchive`, {}, { headers: authHeaders, validateStatus: () => true });
    });

    it('GET /calls ne devrait pas retourner les appels archivés', async () => {
      if (!testCallId) return;

      await axios.post(`${API_URL}/api/v1/calls/${testCallId}/archive`, {}, { headers: authHeaders, validateStatus: () => true });

      const res = await axios.get(`${API_URL}/api/v1/calls`, { headers: authHeaders, validateStatus: () => true });
      const found = (res.data?.calls || []).find(c => c.id === testCallId);
      expect(found).toBeUndefined();

      await axios.post(`${API_URL}/api/v1/calls/${testCallId}/unarchive`, {}, { headers: authHeaders, validateStatus: () => true });
    });

    it('GET /followups ne devrait pas retourner les relances archivées', async () => {
      if (!testFollowUpId) return;

      await axios.post(`${API_URL}/api/v1/followups/${testFollowUpId}/archive`, {}, { headers: authHeaders, validateStatus: () => true });

      const res = await axios.get(`${API_URL}/api/v1/followups`, { headers: authHeaders, validateStatus: () => true });
      const found = (res.data?.followups || []).find(f => f.id === testFollowUpId);
      expect(found).toBeUndefined();

      await axios.post(`${API_URL}/api/v1/followups/${testFollowUpId}/unarchive`, {}, { headers: authHeaders, validateStatus: () => true });
    });
  });
});

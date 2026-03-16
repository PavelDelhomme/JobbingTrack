/**
 * Tests API pour le système d'archivage et corbeille
 * Couvre : archive, unarchive, trash, restore, permanent delete, empty trash
 * Cascade : archiver candidature → archive entretiens/relances/appels/événements
 *
 * ⚠️ Utilise un UTILISATEUR CLASSIQUE (rôle USER) — pas admin.
 *     Ces tests couvrent les fonctionnalités accessibles depuis l'app mobile.
 */

const axios = require('axios');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const { getTestUser, API_URL } = require('../helpers/auth.helper');

const PREFIX = 'ARCHTEST';

describe('Archivage & Corbeille (utilisateur classique)', () => {
  let authHeaders;
  let validToken;
  let testCompanyId;
  let testApplicationId;
  let testInterviewId;
  let testFollowUpId;
  let testCallId;
  let testContactId;

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

    try {
      const companyRes = await axios.post(`${API_URL}/api/v1/companies`, {
        name: `${PREFIX} Corp ${Date.now()}`,
        industry: 'Test',
        location: 'Paris'
      }, { headers: authHeaders, validateStatus: () => true });
      testCompanyId = companyRes.data?.company?.id;
      if (!testCompanyId) {
        console.error(`[ARCH] Création entreprise échouée: ${companyRes.status}`, JSON.stringify(companyRes.data).substring(0, 200));
      }

      const contactRes = await axios.post(`${API_URL}/api/v1/contacts`, {
        firstName: PREFIX,
        lastName: `Contact${Date.now()}`,
        email: `archtest-${Date.now()}@test.local`
      }, { headers: authHeaders, validateStatus: () => true });
      testContactId = contactRes.data?.contact?.id;
      if (!testContactId) {
        console.error(`[ARCH] Création contact échouée: ${contactRes.status}`, JSON.stringify(contactRes.data).substring(0, 200));
      }

      if (testCompanyId) {
        const appRes = await axios.post(`${API_URL}/api/v1/applications`, {
          companyId: testCompanyId,
          position: `${PREFIX} Dev`,
          contractType: 'CDI',
          status: 'CANDIDATE_PENDING'
        }, { headers: authHeaders, validateStatus: () => true });
        testApplicationId = appRes.data?.application?.id;
        if (!testApplicationId) {
          console.error(`[ARCH] Création candidature échouée: ${appRes.status}`, JSON.stringify(appRes.data).substring(0, 200));
        }
      }

      if (testApplicationId) {
        const intRes = await axios.post(`${API_URL}/api/v1/interviews`, {
          applicationId: testApplicationId,
          interviewDate: new Date(Date.now() + 86400000).toISOString(),
          status: 'SCHEDULED'
        }, { headers: authHeaders, validateStatus: () => true });
        testInterviewId = intRes.data?.interview?.id;
        if (!testInterviewId) {
          console.error(`[ARCH] Création entretien échouée: ${intRes.status}`, JSON.stringify(intRes.data).substring(0, 200));
        }

        const fuRes = await axios.post(`${API_URL}/api/v1/followups`, {
          applicationId: testApplicationId,
          followUpDate: new Date(Date.now() + 86400000).toISOString(),
          status: 'PENDING'
        }, { headers: authHeaders, validateStatus: () => true });
        testFollowUpId = fuRes.data?.followup?.id;
        if (!testFollowUpId) {
          console.error(`[ARCH] Création relance échouée: ${fuRes.status}`, JSON.stringify(fuRes.data).substring(0, 200));
        }

        const callRes = await axios.post(`${API_URL}/api/v1/calls`, {
          applicationId: testApplicationId,
          callDate: new Date(Date.now() + 86400000).toISOString(),
          subject: `${PREFIX} Appel test`,
          status: 'SCHEDULED'
        }, { headers: authHeaders, validateStatus: () => true });
        testCallId = callRes.data?.call?.id;
        if (!testCallId) {
          console.error(`[ARCH] Création appel échouée: ${callRes.status}`, JSON.stringify(callRes.data).substring(0, 200));
        }
      }
    } catch (e) {
      console.error('❌ Création données de test échouée:', e.message);
    }
  });

  afterAll(async () => {
    if (!validToken) return;
    const ids = [
      { endpoint: 'calls', id: testCallId },
      { endpoint: 'followups', id: testFollowUpId },
      { endpoint: 'interviews', id: testInterviewId },
      { endpoint: 'applications', id: testApplicationId },
      { endpoint: 'contacts', id: testContactId },
      { endpoint: 'companies', id: testCompanyId }
    ];
    for (const { endpoint, id } of ids) {
      if (!id) continue;
      try {
        await axios.post(`${API_URL}/api/v1/${endpoint}/${id}/restore`, {}, { headers: authHeaders, validateStatus: () => true });
        await axios.delete(`${API_URL}/api/v1/${endpoint}/${id}/permanent`, { headers: authHeaders, validateStatus: () => true });
      } catch { /* noop */ }
    }
  });

  // ─── ARCHIVAGE ENTRETIEN ───
  describe('Archivage Entretien', () => {
    it('POST /:id/archive devrait archiver un entretien', async () => {
      if (!testInterviewId) return;
      const res = await axios.post(
        `${API_URL}/api/v1/interviews/${testInterviewId}/archive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('GET /archived devrait lister les entretiens archivés', async () => {
      if (!testInterviewId) return;
      const res = await axios.get(
        `${API_URL}/api/v1/interviews/archived`,
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.items)).toBe(true);
      const found = res.data.items.find(i => i.id === testInterviewId);
      expect(found).toBeDefined();
      expect(found.isArchived).toBe(true);
    });

    it('GET / ne devrait PAS retourner un entretien archivé', async () => {
      if (!testInterviewId) return;
      const res = await axios.get(
        `${API_URL}/api/v1/interviews`,
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(200);
      const interviews = res.data.interviews || [];
      const found = interviews.find(i => i.id === testInterviewId);
      expect(found).toBeUndefined();
    });

    it('POST /:id/unarchive devrait désarchiver un entretien', async () => {
      if (!testInterviewId) return;
      const res = await axios.post(
        `${API_URL}/api/v1/interviews/${testInterviewId}/unarchive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });
  });

  // ─── ARCHIVAGE APPEL ───
  describe('Archivage Appel', () => {
    it('devrait archiver puis désarchiver un appel', async () => {
      if (!testCallId) return;
      const archRes = await axios.post(
        `${API_URL}/api/v1/calls/${testCallId}/archive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(archRes.status).toBe(200);
      expect(archRes.data.success).toBe(true);

      const listRes = await axios.get(
        `${API_URL}/api/v1/calls/archived`,
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(listRes.data.items.some(i => i.id === testCallId)).toBe(true);

      const unarchRes = await axios.post(
        `${API_URL}/api/v1/calls/${testCallId}/unarchive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(unarchRes.status).toBe(200);
    });
  });

  // ─── ARCHIVAGE RELANCE ───
  describe('Archivage Relance', () => {
    it('devrait archiver puis désarchiver une relance', async () => {
      if (!testFollowUpId) return;
      const archRes = await axios.post(
        `${API_URL}/api/v1/followups/${testFollowUpId}/archive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(archRes.status).toBe(200);

      const listRes = await axios.get(
        `${API_URL}/api/v1/followups/archived`,
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(listRes.data.items.some(i => i.id === testFollowUpId)).toBe(true);

      const unarchRes = await axios.post(
        `${API_URL}/api/v1/followups/${testFollowUpId}/unarchive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(unarchRes.status).toBe(200);
    });
  });

  // ─── ARCHIVAGE ENTREPRISE ───
  describe('Archivage Entreprise', () => {
    it('devrait archiver puis désarchiver une entreprise', async () => {
      if (!testCompanyId) return;
      const archRes = await axios.post(
        `${API_URL}/api/v1/companies/${testCompanyId}/archive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(archRes.status).toBe(200);

      const listRes = await axios.get(
        `${API_URL}/api/v1/companies/archived`,
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(listRes.data.items.some(i => i.id === testCompanyId)).toBe(true);

      const unarchRes = await axios.post(
        `${API_URL}/api/v1/companies/${testCompanyId}/unarchive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(unarchRes.status).toBe(200);
    });
  });

  // ─── ARCHIVAGE CONTACT ───
  describe('Archivage Contact', () => {
    it('devrait archiver puis désarchiver un contact', async () => {
      if (!testContactId) return;
      const archRes = await axios.post(
        `${API_URL}/api/v1/contacts/${testContactId}/archive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(archRes.status).toBe(200);

      const listRes = await axios.get(
        `${API_URL}/api/v1/contacts/archived`,
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(listRes.data.items.some(i => i.id === testContactId)).toBe(true);

      const unarchRes = await axios.post(
        `${API_URL}/api/v1/contacts/${testContactId}/unarchive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(unarchRes.status).toBe(200);
    });
  });

  // ─── CORBEILLE (SOFT DELETE + RESTORE) ───
  describe('Corbeille (soft delete)', () => {
    it('DELETE devrait soft-delete un entretien', async () => {
      if (!testInterviewId) return;
      const res = await axios.delete(
        `${API_URL}/api/v1/interviews/${testInterviewId}`,
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('GET /trash devrait lister les entretiens supprimés', async () => {
      if (!testInterviewId) return;
      const res = await axios.get(
        `${API_URL}/api/v1/interviews/trash`,
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.items)).toBe(true);
      const found = res.data.items.find(i => i.id === testInterviewId);
      expect(found).toBeDefined();
    });

    it('POST /:id/restore devrait restaurer un entretien', async () => {
      if (!testInterviewId) return;
      const res = await axios.post(
        `${API_URL}/api/v1/interviews/${testInterviewId}/restore`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('GET / devrait retourner l\'entretien restauré', async () => {
      if (!testInterviewId) return;
      const res = await axios.get(
        `${API_URL}/api/v1/interviews/${testInterviewId}`,
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(200);
      expect(res.data.interview).toBeDefined();
    });
  });

  // ─── CORBEILLE CANDIDATURE AVEC CASCADE ───
  describe('Corbeille Candidature avec cascade', () => {
    it('DELETE candidature devrait soft-delete la candidature et ses éléments liés', async () => {
      if (!testApplicationId) return;
      const res = await axios.delete(
        `${API_URL}/api/v1/applications/${testApplicationId}`,
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('les entretiens/relances/appels liés ne devraient plus apparaître dans les listes', async () => {
      if (!testApplicationId) return;

      const [intRes, fuRes, callRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/interviews`, { headers: authHeaders, validateStatus: () => true }),
        axios.get(`${API_URL}/api/v1/followups`, { headers: authHeaders, validateStatus: () => true }),
        axios.get(`${API_URL}/api/v1/calls`, { headers: authHeaders, validateStatus: () => true })
      ]);

      const interviews = intRes.data?.interviews || [];
      const followups = fuRes.data?.followups || [];
      const calls = callRes.data?.calls || [];

      expect(interviews.find(i => i.id === testInterviewId)).toBeUndefined();
      expect(followups.find(f => f.id === testFollowUpId)).toBeUndefined();
      expect(calls.find(c => c.id === testCallId)).toBeUndefined();
    });

    it('la candidature devrait apparaître dans la corbeille', async () => {
      if (!testApplicationId) return;
      const res = await axios.get(
        `${API_URL}/api/v1/applications/trash`,
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(200);
      const found = res.data.items?.find(i => i.id === testApplicationId);
      expect(found).toBeDefined();
    });

    it('POST /restore devrait restaurer la candidature', async () => {
      if (!testApplicationId) return;
      const res = await axios.post(
        `${API_URL}/api/v1/applications/${testApplicationId}/restore`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });
  });

  // ─── CASCADE ARCHIVAGE CANDIDATURE ───
  describe('Cascade archivage candidature (isArchived)', () => {
    it('archiver une candidature devrait archiver les éléments liés', async () => {
      if (!testApplicationId) return;

      // D'abord restaurer les éléments liés
      for (const id of [testInterviewId, testFollowUpId, testCallId]) {
        if (id) {
          await axios.post(`${API_URL}/api/v1/interviews/${id}/restore`, {}, { headers: authHeaders, validateStatus: () => true });
          await axios.post(`${API_URL}/api/v1/followups/${id}/restore`, {}, { headers: authHeaders, validateStatus: () => true });
          await axios.post(`${API_URL}/api/v1/calls/${id}/restore`, {}, { headers: authHeaders, validateStatus: () => true });
        }
      }

      const archRes = await axios.post(
        `${API_URL}/api/v1/applications/${testApplicationId}/archive`,
        { reason: 'Test cascade' },
        { headers: authHeaders, validateStatus: () => true }
      );
      expect(archRes.status).toBe(200);

      // Vérifier que les éléments liés sont archivés
      if (testInterviewId) {
        const intArch = await axios.get(`${API_URL}/api/v1/interviews/archived`, { headers: authHeaders, validateStatus: () => true });
        const found = intArch.data.items?.find(i => i.id === testInterviewId);
        expect(found).toBeDefined();
      }
    });

    it('désarchiver une candidature devrait désarchiver les éléments liés', async () => {
      if (!testApplicationId) return;
      const unarchRes = await axios.post(
        `${API_URL}/api/v1/applications/${testApplicationId}/unarchive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(unarchRes.status).toBe(200);

      if (testInterviewId) {
        await new Promise(r => setTimeout(r, 300));
        const intRes = await axios.get(`${API_URL}/api/v1/interviews`, { headers: authHeaders, validateStatus: () => true });
        const found = intRes.data.interviews?.find(i => i.id === testInterviewId);
        expect(found).toBeDefined();
      }
    });
  });

  // ─── ERREURS / CAS LIMITES ───
  describe('Cas limites', () => {
    it('archiver un ID inexistant devrait retourner 404', async () => {
      const res = await axios.post(
        `${API_URL}/api/v1/interviews/id-inexistant-12345/archive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(404);
    });

    it('désarchiver un élément non archivé devrait retourner 404', async () => {
      if (!testInterviewId) return;
      const res = await axios.post(
        `${API_URL}/api/v1/interviews/${testInterviewId}/unarchive`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(404);
    });

    it('restaurer un élément non supprimé devrait retourner 404', async () => {
      if (!testInterviewId) return;
      const res = await axios.post(
        `${API_URL}/api/v1/interviews/${testInterviewId}/restore`,
        {}, { headers: authHeaders, validateStatus: () => true }
      );
      expect(res.status).toBe(404);
    });
  });
});

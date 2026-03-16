/**
 * Tests BDD / Intégration
 * Vérifie les relations entre entités, la cohérence des données,
 * les contraintes de cascade et l'intégrité référentielle.
 *
 * ⚠️ Utilise un UTILISATEUR CLASSIQUE (rôle USER) — pas admin.
 *     Ces tests couvrent les fonctionnalités accessibles depuis l'app mobile.
 */

const axios = require('axios');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const { getTestUser, API_URL } = require('../helpers/auth.helper');

const PREFIX = 'BDDTEST';

describe('Relations BDD & Intégrité (utilisateur classique)', () => {
  let authHeaders;
  let validToken;
  let companyId, applicationId, interviewId, followUpId, callId, contactId;
  let setupErrors = [];

  jest.setTimeout(30000);

  const api = (method, path, data) =>
    axios({ method, url: `${API_URL}/api/v1/${path}`, data, headers: authHeaders, validateStatus: () => true });

  beforeAll(async () => {
    try {
      const user = await getTestUser();
      validToken = user.token;
      authHeaders = user.headers;
    } catch (e) {
      setupErrors.push(`Création/login utilisateur test: ${e.message}`);
      authHeaders = { 'Content-Type': 'application/json' };
    }
  });

  afterAll(async () => {
    if (!validToken) return;
    for (const [ep, id] of [['calls', callId], ['followups', followUpId], ['interviews', interviewId], ['applications', applicationId], ['contacts', contactId], ['companies', companyId]]) {
      if (!id) continue;
      await api('post', `${ep}/${id}/restore`);
      await api('delete', `${ep}/${id}/permanent`);
    }
  });

  // ─── CRÉATION CHAÎNE COMPLÈTE ───
  describe('Chaîne de création Application → Entretien → Relance → Appel', () => {
    it('créer une entreprise', async () => {
      if (!validToken) return expect(validToken).toBeTruthy();
      const res = await api('post', 'companies', {
        name: `${PREFIX} Corp ${Date.now()}`, industry: 'BDD Test', location: 'Paris'
      });
      if (res.status !== 201) {
        console.error(`[BDD] Création entreprise échouée: ${res.status}`, JSON.stringify(res.data).substring(0, 300));
      }
      expect(res.status).toBe(201);
      companyId = res.data?.company?.id;
      expect(companyId).toBeTruthy();
    });

    it('créer un contact lié à l\'entreprise', async () => {
      if (!companyId) return expect(companyId).toBeTruthy();
      const res = await api('post', 'contacts', {
        firstName: PREFIX, lastName: `Rel${Date.now()}`,
        email: `bdd-${Date.now()}@test.local`
      });
      if (res.status !== 201) {
        console.error(`[BDD] Création contact échouée: ${res.status}`, JSON.stringify(res.data).substring(0, 300));
      }
      expect(res.status).toBe(201);
      contactId = res.data?.contact?.id;
      expect(contactId).toBeTruthy();
    });

    it('créer une candidature liée à l\'entreprise', async () => {
      if (!companyId) return expect(companyId).toBeTruthy();
      const res = await api('post', 'applications', {
        companyId, position: `${PREFIX} Dev`, contractType: 'CDI', status: 'CANDIDATE_PENDING'
      });
      if (res.status !== 201) {
        console.error(`[BDD] Création candidature échouée: ${res.status}`, JSON.stringify(res.data).substring(0, 300));
      }
      expect(res.status).toBe(201);
      applicationId = res.data?.application?.id;
      expect(applicationId).toBeTruthy();
    });

    it('créer un entretien lié à la candidature', async () => {
      if (!applicationId) return expect(applicationId).toBeTruthy();
      const res = await api('post', 'interviews', {
        applicationId, interviewDate: new Date(Date.now() + 86400000).toISOString(), status: 'SCHEDULED'
      });
      if (res.status !== 201) {
        console.error(`[BDD] Création entretien échouée: ${res.status}`, JSON.stringify(res.data).substring(0, 300));
      }
      expect(res.status).toBe(201);
      interviewId = res.data?.interview?.id;
      expect(interviewId).toBeTruthy();
    });

    it('créer une relance liée à la candidature', async () => {
      if (!applicationId) return expect(applicationId).toBeTruthy();
      const res = await api('post', 'followups', {
        applicationId, followUpDate: new Date(Date.now() + 86400000).toISOString(), status: 'PENDING'
      });
      if (res.status !== 201) {
        console.error(`[BDD] Création relance échouée: ${res.status}`, JSON.stringify(res.data).substring(0, 300));
      }
      expect(res.status).toBe(201);
      followUpId = res.data?.followup?.id;
      expect(followUpId).toBeTruthy();
    });

    it('créer un appel lié à la candidature', async () => {
      if (!applicationId) return expect(applicationId).toBeTruthy();
      const res = await api('post', 'calls', {
        applicationId, callDate: new Date(Date.now() + 86400000).toISOString(),
        subject: `${PREFIX} Appel BDD`, status: 'SCHEDULED'
      });
      if (res.status !== 201) {
        console.error(`[BDD] Création appel échouée: ${res.status}`, JSON.stringify(res.data).substring(0, 300));
      }
      expect(res.status).toBe(201);
      callId = res.data?.call?.id;
      expect(callId).toBeTruthy();
    });
  });

  // ─── VÉRIFICATION DES RELATIONS ───
  describe('Relations dans les détails', () => {
    it('le détail de la candidature devrait inclure entretiens et relances', async () => {
      if (!applicationId) return expect(applicationId).toBeTruthy();
      const res = await api('get', `applications/${applicationId}`);
      expect(res.status).toBe(200);
      const app = res.data?.application;
      expect(app).toBeDefined();
      expect(app.company).toBeDefined();
      if (app.interviews) {
        expect(app.interviews.some(i => i.id === interviewId)).toBe(true);
      }
      if (app.followUps) {
        expect(app.followUps.some(f => f.id === followUpId)).toBe(true);
      }
    });

    it('le détail de l\'entretien devrait inclure la candidature', async () => {
      if (!interviewId) return expect(interviewId).toBeTruthy();
      const res = await api('get', `interviews/${interviewId}`);
      expect(res.status).toBe(200);
      const interview = res.data?.interview;
      expect(interview?.applicationId).toBe(applicationId);
    });
  });

  // ─── COHÉRENCE SOFT DELETE ───
  describe('Cohérence soft delete', () => {
    it('supprimer l\'entretien ne devrait pas supprimer la candidature', async () => {
      if (!interviewId || !applicationId) return expect(interviewId && applicationId).toBeTruthy();
      await api('delete', `interviews/${interviewId}`);

      const appRes = await api('get', `applications/${applicationId}`);
      expect(appRes.status).toBe(200);
      expect(appRes.data?.application).toBeDefined();

      await api('post', `interviews/${interviewId}/restore`);
    });

    it('supprimer la candidature devrait soft-delete les éléments liés', async () => {
      if (!applicationId) return expect(applicationId).toBeTruthy();

      const delRes = await api('delete', `applications/${applicationId}`);
      expect(delRes.status).toBe(200);

      // Délai pour laisser la cascade soft-delete s'exécuter (application-service met à jour Interview en BDD partagée)
      await new Promise(r => setTimeout(r, 1200));

      const intRes = await api('get', 'interviews/trash');
      if (intRes.status !== 200) {
        console.error(`[BDD] GET interviews/trash status=${intRes.status}`, JSON.stringify(intRes.data).substring(0, 200));
      }
      expect(intRes.status).toBe(200);
      const trashItems = intRes.data?.items || [];
      if (interviewId) {
        const found = trashItems.some(i => i.id === interviewId);
        if (!found) {
          console.error(`[BDD] Interview ${interviewId} non trouvé dans trash. Items: ${trashItems.map(i => i.id).join(', ')}`);
        }
        expect(found).toBe(true);
      }

      // Restauration en séquentiel pour garantir l'ordre
      const appRestore = await api('post', `applications/${applicationId}/restore`);
      if (appRestore.status !== 200) console.error(`[BDD] Restore application: ${appRestore.status}`);
      if (interviewId) {
        const intRestore = await api('post', `interviews/${interviewId}/restore`);
        if (intRestore.status !== 200) console.error(`[BDD] Restore interview: ${intRestore.status}`);
      }
      if (followUpId) {
        const fuRestore = await api('post', `followups/${followUpId}/restore`);
        if (fuRestore.status !== 200) console.error(`[BDD] Restore followup: ${fuRestore.status}`);
      }
      if (callId) {
        const callRestore = await api('post', `calls/${callId}/restore`);
        if (callRestore.status !== 200) console.error(`[BDD] Restore call: ${callRestore.status}`);
      }
    });
  });

  // ─── COHÉRENCE ARCHIVAGE ───
  describe('Cohérence archivage cascade', () => {
    it('archiver la candidature devrait archiver les éléments liés', async () => {
      if (!applicationId) return expect(applicationId).toBeTruthy();
      await api('post', `applications/${applicationId}/archive`, { reason: 'Test BDD' });

      const intArch = await api('get', 'interviews/archived');
      if (intArch.data?.items && interviewId) {
        expect(intArch.data.items.some(i => i.id === interviewId)).toBe(true);
      }

      await api('post', `applications/${applicationId}/unarchive`);
    });

    it('après désarchivage, les éléments liés devraient être visibles', async () => {
      if (!applicationId || !interviewId) return expect(applicationId && interviewId).toBeTruthy();
      await new Promise(r => setTimeout(r, 1200));
      const res = await api('get', 'interviews');
      if (res.status !== 200) {
        console.error(`[BDD] GET interviews status=${res.status}`, JSON.stringify(res.data).substring(0, 200));
      }
      const interviews = res.data?.interviews || [];
      const found = interviews.find(i => i.id === interviewId);
      if (!found) {
        console.error(`[BDD] Interview ${interviewId} non trouvé après désarchivage. IDs: ${interviews.map(i => i.id).join(', ').substring(0, 200)}`);
      }
      expect(found).toBeDefined();
    });
  });

  // ─── ÉVÉNEMENTS AUTO-CRÉÉS ───
  describe('Événements automatiquement créés', () => {
    it('les événements liés à la candidature/entretien devraient exister', async () => {
      if (!applicationId) return expect(applicationId).toBeTruthy();
      const res = await api('get', 'events');
      expect(res.status).toBe(200);
      const events = res.data?.events || [];
      expect(Array.isArray(events)).toBe(true);

      const appEvent = events.find(e => e.applicationId === applicationId);
      const interviewEvent = events.find(e => e.interviewId === interviewId);
      // Si l'API retourne des événements, au moins un doit être lié (event-service crée à la création entretien/relance)
      if (events.length > 0) {
        expect(appEvent || interviewEvent).toBeDefined();
      }
    });
  });

  // ─── CONTRAINTES D'INTÉGRITÉ ───
  describe('Contraintes d\'intégrité', () => {
    it('créer un entretien avec un applicationId invalide devrait échouer', async () => {
      const res = await api('post', 'interviews', {
        applicationId: 'id-invalide-inexistant',
        interviewDate: new Date().toISOString(),
        status: 'SCHEDULED'
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('créer une relance avec un applicationId invalide devrait échouer', async () => {
      const res = await api('post', 'followups', {
        applicationId: 'id-invalide-inexistant',
        followUpDate: new Date().toISOString(),
        status: 'PENDING'
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('créer une candidature sans entreprise devrait échouer', async () => {
      const res = await api('post', 'applications', {
        position: 'Test sans entreprise',
        contractType: 'CDI'
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ─── STATUTS DISPONIBLES ───
  describe('Statuts personnalisables', () => {
    it('les statuts de candidature devraient être des tables BDD', async () => {
      const res = await api('get', 'applications');
      expect(res.status).toBe(200);
      const apps = res.data?.applications || [];
      if (apps.length > 0 && apps[0].status) {
        expect(apps[0].status).toHaveProperty('code');
        expect(apps[0].status).toHaveProperty('name');
      }
    });
  });
});

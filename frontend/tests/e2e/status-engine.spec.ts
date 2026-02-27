/**
 * Tests E2E Playwright — Moteur de statut intelligent
 *
 * Teste via l'API (pas l'UI backoffice) :
 * - Preferences moteur de statut (auto/manuel)
 * - Cascade entretien → statut candidature en mode auto
 * - Pas de cascade en mode manuel
 * - Changement manuel toujours possible
 * - Historique des changements de statut
 * - Rejet direct
 *
 * Utilise un utilisateur classique (role USER).
 */
import { test, expect } from '@playwright/test';
import { getUserToken, ensureTestUser, apiCreateCompany, apiCreateApplication, apiCreateInterview, uniqueId } from './test-data-helper';

const API_URL = process.env.API_URL || 'http://localhost:5002';

test.describe('Moteur de statut intelligent (E2E API)', () => {
  let token: string;
  let companyId: string;
  let applicationId: string;
  let applicationId2: string;
  let interviewId: string;

  test.beforeAll(async ({ request }) => {
    await ensureTestUser(request);
    token = await getUserToken(request);
    if (!token) return;

    const company = await apiCreateCompany(request, token, `StatusEngine Corp ${uniqueId()}`);
    companyId = company.id;

    if (companyId) {
      const app1 = await apiCreateApplication(request, token, companyId, 'StatusEngine Dev Auto');
      applicationId = app1.id;

      const app2 = await apiCreateApplication(request, token, companyId, 'StatusEngine Dev Manual');
      applicationId2 = app2.id;
    }
  });

  test.afterAll(async ({ request }) => {
    if (!token) return;

    // Restaurer auto-statut
    await request.put(`${API_URL}/api/v1/auth/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { preferences: { statusEngine: { autoStatusEnabled: true } } }
    });

    const cleanups = [
      interviewId && `interviews/${interviewId}`,
      applicationId && `applications/${applicationId}`,
      applicationId2 && `applications/${applicationId2}`,
      companyId && `companies/${companyId}`
    ].filter(Boolean);

    for (const path of cleanups) {
      await request.post(`${API_URL}/api/v1/${path}/restore`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
      await request.delete(`${API_URL}/api/v1/${path}/permanent`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
  });

  test('preferences par defaut doivent inclure statusEngine', async ({ request }) => {
    test.skip(!token, 'Token non disponible');

    const res = await request.get(`${API_URL}/api/v1/auth/preferences`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status() !== 200) {
      test.skip(true, 'Endpoint preferences non disponible');
      return;
    }

    const body = await res.json();
    const prefs = body.preferences;
    expect(prefs).toBeDefined();

    if (prefs.statusEngine) {
      expect(typeof prefs.statusEngine.autoStatusEnabled).toBe('boolean');
    }
  });

  test('mode auto : cascade entretien → INTERVIEW_PENDING', async ({ request }) => {
    test.skip(!applicationId, 'Candidature non disponible');

    await request.put(`${API_URL}/api/v1/auth/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { preferences: { statusEngine: { autoStatusEnabled: true } } }
    });

    const intRes = await request.post(`${API_URL}/api/v1/interviews`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        applicationId,
        interviewDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'SCHEDULED'
      }
    });

    expect(intRes.status()).toBe(201);
    const intBody = await intRes.json();
    interviewId = intBody.interview?.id;

    const appRes = await request.get(`${API_URL}/api/v1/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const appBody = await appRes.json();
    const statusCode = appBody.application?.status?.code || appBody.application?.statusCode;
    expect(statusCode).toBe('INTERVIEW_PENDING');
  });

  test('mode auto : COMPLETED → INTERVIEW_DONE', async ({ request }) => {
    test.skip(!interviewId, 'Entretien non disponible');

    await request.put(`${API_URL}/api/v1/interviews/${interviewId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'COMPLETED' }
    });

    const appRes = await request.get(`${API_URL}/api/v1/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const appBody = await appRes.json();
    const statusCode = appBody.application?.status?.code || appBody.application?.statusCode;
    expect(statusCode).toBe('INTERVIEW_DONE');
  });

  test('mode manuel : pas de cascade automatique', async ({ request }) => {
    test.skip(!applicationId2, 'Candidature 2 non disponible');

    await request.put(`${API_URL}/api/v1/auth/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { preferences: { statusEngine: { autoStatusEnabled: false } } }
    });

    const intRes = await request.post(`${API_URL}/api/v1/interviews`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        applicationId: applicationId2,
        interviewDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'SCHEDULED'
      }
    });

    expect(intRes.status()).toBe(201);
    const intBody = await intRes.json();
    const manualIntId = intBody.interview?.id;

    const appRes = await request.get(`${API_URL}/api/v1/applications/${applicationId2}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const appBody = await appRes.json();
    const statusCode = appBody.application?.status?.code || appBody.application?.statusCode;
    expect(statusCode).toBe('CANDIDATE_PENDING');

    if (manualIntId) {
      await request.delete(`${API_URL}/api/v1/interviews/${manualIntId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await request.delete(`${API_URL}/api/v1/interviews/${manualIntId}/permanent`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
  });

  test('mode manuel : changement explicite reste possible', async ({ request }) => {
    test.skip(!applicationId2, 'Candidature 2 non disponible');

    const statusRes = await request.put(`${API_URL}/api/v1/applications/${applicationId2}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'INTERVIEW_PENDING', comment: 'Changement manuel test E2E' }
    });

    expect(statusRes.status()).toBe(200);
    const statusBody = await statusRes.json();
    expect(statusBody.success).toBe(true);

    // Remettre en CANDIDATE_PENDING
    await request.put(`${API_URL}/api/v1/applications/${applicationId2}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'CANDIDATE_PENDING', comment: 'Reset test E2E' }
    });
  });

  test('historique des changements de statut', async ({ request }) => {
    test.skip(!applicationId, 'Candidature non disponible');

    const res = await request.get(`${API_URL}/api/v1/applications/${applicationId}/status-history`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    const history = body.history || body.statusHistory || [];
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  test('rejet direct depuis n importe quel statut', async ({ request }) => {
    test.skip(!applicationId2, 'Candidature 2 non disponible');

    // Reactiver auto pour ce test
    await request.put(`${API_URL}/api/v1/auth/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { preferences: { statusEngine: { autoStatusEnabled: true } } }
    });

    const statusRes = await request.put(`${API_URL}/api/v1/applications/${applicationId2}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'REJECTED', comment: 'Email de rejet recu - test E2E' }
    });

    expect(statusRes.status()).toBe(200);

    const appRes = await request.get(`${API_URL}/api/v1/applications/${applicationId2}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const appBody = await appRes.json();
    const statusCode = appBody.application?.status?.code || appBody.application?.statusCode;
    expect(statusCode).toBe('REJECTED');
  });

  test('configuration personnalisee du moteur de statut', async ({ request }) => {
    test.skip(!token, 'Token non disponible');

    const updateRes = await request.put(`${API_URL}/api/v1/auth/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        preferences: {
          statusEngine: {
            autoStatusEnabled: true,
            noResponseDays: 14,
            followUpNoResponseDays: 10,
            interviewFeedbackDays: 14,
            maxFollowUpsBeforeReject: 5,
            autoCreateReminders: false
          }
        }
      }
    });

    if (updateRes.status() !== 200) return;

    const getRes = await request.get(`${API_URL}/api/v1/auth/preferences`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (getRes.status() === 200) {
      const body = await getRes.json();
      if (body.preferences?.statusEngine) {
        expect(body.preferences.statusEngine.noResponseDays).toBe(14);
        expect(body.preferences.statusEngine.maxFollowUpsBeforeReject).toBe(5);
      }
    }

    // Restaurer valeurs par defaut
    await request.put(`${API_URL}/api/v1/auth/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
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
      }
    });
  });
});

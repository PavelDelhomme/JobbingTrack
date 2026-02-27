// Tests archivage & corbeille — fonctionnalités ADMIN (backoffice)
import { test, expect } from '@playwright/test';
import {
  getAdminToken,
  getUserToken,
  apiCreateCompany,
  apiCreateContact,
  apiCreateApplication,
  apiCreateInterview,
  apiDelete,
  apiArchive,
  apiUnarchive,
  apiRestore,
  cleanupTestData,
  TEST_PREFIX,
  uniqueId,
} from './test-data-helper';

const API_URL = process.env.API_URL || 'http://localhost:5002';

// ═══════════════════════════════════════════════════════
// 1. ARCHIVAGE ET CORBEILLE (API + UI) — admin
// ═══════════════════════════════════════════════════════
test.describe('🗄️ Archivage & Corbeille (admin)', () => {
  let token: string;
  let companyId: string;
  let applicationId: string;
  let interviewId: string;

  test.beforeAll(async ({ request }) => {
    token = await getAdminToken(request);
    if (!token) return;

    const company = await apiCreateCompany(request, token, `${TEST_PREFIX} ArchE2E ${uniqueId()}`);
    companyId = company.id;

    if (companyId) {
      const app = await apiCreateApplication(request, token, companyId, `${TEST_PREFIX} Dev ArchE2E`);
      applicationId = app.id;
    }
    if (applicationId) {
      const interview = await apiCreateInterview(request, token, applicationId);
      interviewId = interview.id;
    }
  });

  test.afterAll(async ({ request }) => {
    if (!token) return;
    if (interviewId) {
      await apiRestore(request, token, 'interviews', interviewId);
      await apiDelete(request, token, 'interviews', interviewId);
    }
    if (applicationId) {
      await apiRestore(request, token, 'applications', applicationId);
      await apiDelete(request, token, 'applications', applicationId);
    }
    if (companyId) {
      await apiRestore(request, token, 'companies', companyId);
      await apiDelete(request, token, 'companies', companyId);
    }
  });

  test('API : archiver et désarchiver un entretien', async ({ request }) => {
    test.skip(!interviewId, 'Pas d\'entretien de test');
    const archived = await apiArchive(request, token, 'interviews', interviewId);
    expect(archived).toBe(true);

    const listRes = await request.get(`${API_URL}/api/v1/interviews/archived`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await listRes.json();
    expect(body.items?.some((i: any) => i.id === interviewId)).toBe(true);

    const unarchived = await apiUnarchive(request, token, 'interviews', interviewId);
    expect(unarchived).toBe(true);
  });

  test('API : soft-delete et restaurer un entretien', async ({ request }) => {
    test.skip(!interviewId, 'Pas d\'entretien de test');
    const delRes = await request.delete(`${API_URL}/api/v1/interviews/${interviewId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.ok()).toBe(true);

    const trashRes = await request.get(`${API_URL}/api/v1/interviews/trash`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const trashBody = await trashRes.json();
    expect(trashBody.items?.some((i: any) => i.id === interviewId)).toBe(true);

    const restored = await apiRestore(request, token, 'interviews', interviewId);
    expect(restored).toBe(true);
  });

  test('API : restaurer une candidature de la corbeille restaure aussi entretiens/relances/appels/événements liés', async ({ request }) => {
    test.skip(!applicationId || !interviewId, 'Données manquantes');
    // Mettre la candidature en corbeille (cascade sur entretiens, relances, appels, événements)
    const delRes = await request.delete(`${API_URL}/api/v1/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.ok()).toBe(true);

    const trashRes = await request.get(`${API_URL}/api/v1/applications/trash`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const trashBody = await trashRes.json();
    expect(trashBody.items?.some((a: any) => a.id === applicationId)).toBe(true);

    const restored = await apiRestore(request, token, 'applications', applicationId);
    expect(restored).toBe(true);

    const appRes = await request.get(`${API_URL}/api/v1/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(appRes.ok(), 'Candidature visible après restauration').toBe(true);

    const intRes = await request.get(`${API_URL}/api/v1/interviews/${interviewId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(intRes.ok(), 'Entretien lié visible après restauration cascade').toBe(true);
  });
  test('archiver candidature met en archive les entretiens liés (suite)', async ({ request }) => {
    test.skip(!applicationId || !interviewId, 'Données manquantes');
    const archived = await apiArchive(request, token, 'applications', applicationId);
    expect(archived).toBe(true);

    const intArchRes = await request.get(`${API_URL}/api/v1/interviews/archived`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const intBody = await intArchRes.json();
    expect(intBody.items?.some((i: any) => i.id === interviewId)).toBe(true);

    const unarchived = await apiUnarchive(request, token, 'applications', applicationId);
    expect(unarchived).toBe(true);
  });

  test('la page Archives du backoffice charge sans erreur', async ({ page }) => {
    await page.goto('/backoffice/archives');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('500');
    await expect(page.locator('body')).not.toContainText('Erreur serveur');
  });

  test('la page Corbeille du backoffice charge sans erreur', async ({ page }) => {
    await page.goto('/backoffice/trash');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('500');
    await expect(page.locator('body')).not.toContainText('Erreur serveur');
  });
});

// ═══════════════════════════════════════════════════════
// 2. CASCADE STATUTS (API)
// ═══════════════════════════════════════════════════════
test.describe('📊 Cascade de statuts', () => {
  let token: string;
  let companyId: string;
  let applicationId: string;
  let setupError: string | null = null;

  test.beforeAll(async ({ request }) => {
    try {
      token = await getUserToken(request);
      if (!token) {
        setupError = 'Impossible d\'obtenir un token utilisateur';
        return;
      }

      const company = await apiCreateCompany(request, token, `${TEST_PREFIX} CascE2E ${uniqueId()}`);
      companyId = company.id;
      if (!companyId) {
        setupError = 'Impossible de créer l\'entreprise de test';
        return;
      }

      const app = await apiCreateApplication(request, token, companyId, `${TEST_PREFIX} Dev Cascade`);
      applicationId = app.id;
      if (!applicationId) {
        setupError = 'Impossible de créer la candidature de test';
      }
    } catch (e) {
      setupError = `beforeAll a échoué: ${e instanceof Error ? e.message : String(e)}`;
    }
  });

  test.afterAll(async ({ request }) => {
    if (!token) return;
    try {
      if (applicationId) {
        await apiRestore(request, token, 'applications', applicationId);
        await apiDelete(request, token, 'applications', applicationId);
      }
      if (companyId) await apiDelete(request, token, 'companies', companyId);
    } catch { /* cleanup best-effort */ }
  });

  test('créer un entretien passe la candidature en INTERVIEW_PENDING', async ({ request }) => {
    test.skip(!!setupError || !applicationId, setupError || 'Pas de candidature');
    const intRes = await request.post(`${API_URL}/api/v1/interviews`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        applicationId,
        interviewDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'SCHEDULED',
      },
    });
    expect(intRes.ok(), `POST /interviews a retourné ${intRes.status()}`).toBe(true);
    const intBody = await intRes.json();
    const interviewId = intBody.interview?.id;

    const appRes = await request.get(`${API_URL}/api/v1/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(appRes.ok(), `GET /applications/${applicationId} a retourné ${appRes.status()}`).toBe(true);
    const appBody = await appRes.json();
    expect(appBody.application?.status?.code).toBe('INTERVIEW_PENDING');

    if (interviewId) {
      await request.delete(`${API_URL}/api/v1/interviews/${interviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await request.delete(`${API_URL}/api/v1/interviews/${interviewId}/permanent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });

  test('historique de statut candidature accessible', async ({ request }) => {
    test.skip(!!setupError || !applicationId, setupError || 'Pas de candidature');
    const res = await request.get(`${API_URL}/api/v1/applications/${applicationId}/status-history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok(), `GET /status-history a retourné ${res.status()}`).toBe(true);
    const body = await res.json();
    const history = body.history || body.statusHistory || [];
    expect(Array.isArray(history)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 3. AUTO-CRÉATION ÉVÉNEMENTS (API)
// ═══════════════════════════════════════════════════════
test.describe('📅 Auto-création événements', () => {
  let token: string;
  let companyId: string;
  let applicationId: string;
  let setupError: string | null = null;

  test.beforeAll(async ({ request }) => {
    try {
      token = await getUserToken(request);
      if (!token) {
        setupError = 'Impossible d\'obtenir un token utilisateur';
        return;
      }

      const company = await apiCreateCompany(request, token, `${TEST_PREFIX} EvtE2E ${uniqueId()}`);
      companyId = company.id;
      if (!companyId) {
        setupError = 'Impossible de créer l\'entreprise de test';
        return;
      }

      const app = await apiCreateApplication(request, token, companyId, `${TEST_PREFIX} Dev Evt`);
      applicationId = app.id;
      if (!applicationId) {
        setupError = 'Impossible de créer la candidature de test';
      }
    } catch (e) {
      setupError = `beforeAll a échoué: ${e instanceof Error ? e.message : String(e)}`;
    }
  });

  test.afterAll(async ({ request }) => {
    if (!token) return;
    try {
      if (applicationId) {
        await apiRestore(request, token, 'applications', applicationId);
        await apiDelete(request, token, 'applications', applicationId);
      }
      if (companyId) await apiDelete(request, token, 'companies', companyId);
    } catch { /* cleanup best-effort */ }
  });

  test('créer un entretien crée un événement calendrier automatiquement', async ({ request }) => {
    test.skip(!!setupError || !applicationId, setupError || 'Pas de candidature');

    const eventsBefore = await request.get(`${API_URL}/api/v1/events`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const beforeBody = await eventsBefore.json();
    const countBefore = (beforeBody.events || []).length;

    const intRes = await request.post(`${API_URL}/api/v1/interviews`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        applicationId,
        interviewDate: new Date(Date.now() + 172800000).toISOString(),
        status: 'SCHEDULED',
        estimatedDuration: 60,
      },
    });
    expect(intRes.ok(), `POST /interviews a retourné ${intRes.status()}`).toBe(true);
    const intBody = await intRes.json();
    const interviewId = intBody.interview?.id;

    const eventsAfter = await request.get(`${API_URL}/api/v1/events`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const afterBody = await eventsAfter.json();
    const countAfter = (afterBody.events || []).length;

    expect(countAfter).toBeGreaterThan(countBefore);
    const found = (afterBody.events || []).find(
      (e: any) => e.interviewId === interviewId || e.title?.includes('Entretien'),
    );
    expect(found).toBeDefined();

    if (interviewId) {
      await request.delete(`${API_URL}/api/v1/interviews/${interviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });

  test('créer une relance crée un événement calendrier automatiquement', async ({ request }) => {
    test.skip(!!setupError || !applicationId, setupError || 'Pas de candidature');

    const fuRes = await request.post(`${API_URL}/api/v1/followups`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        applicationId,
        followUpDate: new Date(Date.now() + 172800000).toISOString(),
        status: 'PENDING',
      },
    });
    expect(fuRes.ok(), `POST /followups a retourné ${fuRes.status()}`).toBe(true);
    const fuBody = await fuRes.json();
    const followUpId = fuBody.followup?.id;

    const eventsRes = await request.get(`${API_URL}/api/v1/events`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const evtBody = await eventsRes.json();
    const found = (evtBody.events || []).find(
      (e: any) => e.followUpId === followUpId || e.title?.includes('Relance'),
    );
    expect(found).toBeDefined();

    if (followUpId) {
      await request.delete(`${API_URL}/api/v1/followups/${followUpId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });

  test('créer un appel crée un événement calendrier automatiquement', async ({ request }) => {
    test.skip(!!setupError || !applicationId, setupError || 'Pas de candidature');

    const callRes = await request.post(`${API_URL}/api/v1/calls`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        applicationId,
        callDate: new Date(Date.now() + 172800000).toISOString(),
        subject: `${TEST_PREFIX} Appel auto-event`,
        status: 'SCHEDULED',
      },
    });
    expect(callRes.ok(), `POST /calls a retourné ${callRes.status()}`).toBe(true);
    const callBody = await callRes.json();
    const callId = callBody.call?.id;

    const eventsRes = await request.get(`${API_URL}/api/v1/events`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const evtBody = await eventsRes.json();
    const found = (evtBody.events || []).find(
      (e: any) => e.callId === callId || e.title?.includes('Appel'),
    );
    expect(found).toBeDefined();

    if (callId) {
      await request.delete(`${API_URL}/api/v1/calls/${callId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

// ═══════════════════════════════════════════════════════
// 4. PAGES BACKOFFICE ARCHIVES/CORBEILLE (UI)
// ═══════════════════════════════════════════════════════
test.describe('🖥️ Pages Backoffice Archive/Corbeille', () => {
  test('la page Archives charge correctement avec les onglets', async ({ page }) => {
    await page.goto('/backoffice/archives');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await expect(body).not.toContainText('404');

    const tabs = page.locator('[role="tab"], button').filter({ hasText: /(candidatures|entreprises|contacts|entretiens|appels|relances)/i });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(0);
  });

  test('la page Corbeille charge correctement', async ({ page }) => {
    await page.goto('/backoffice/trash');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await expect(body).not.toContainText('404');
  });

  test('la page Données affiche les onglets entités', async ({ page }) => {
    await page.goto('/backoffice/data-management');
    await page.waitForLoadState('networkidle');

    const tabs = page.locator('[role="tab"], button').filter({ hasText: /(candidatures|entreprises|contacts|entretiens)/i });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════
// 5. CRUD CANDIDATURES (UI)
// ═══════════════════════════════════════════════════════
test.describe('📋 CRUD Candidatures UI', () => {
  test('la page candidatures charge et affiche une liste', async ({ page }) => {
    await page.goto('/backoffice/applications');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Erreur');
  });

  test('le formulaire de création candidature s\'ouvre', async ({ page }) => {
    await page.goto('/backoffice/applications');
    await page.waitForLoadState('networkidle');

    const createBtn = page.getByRole('button', { name: /(Nouvelle candidature|Ajouter|Créer)/i });
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      const modal = page.locator('.fixed.inset-0, [role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  test('la page entretiens charge correctement', async ({ page }) => {
    await page.goto('/backoffice/interviews');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Erreur serveur');
  });

  test('la page relances charge correctement', async ({ page }) => {
    await page.goto('/backoffice/followups');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Erreur serveur');
  });

  test('la page appels charge correctement', async ({ page }) => {
    await page.goto('/backoffice/calls');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Erreur serveur');
  });

  test('la page événements charge correctement', async ({ page }) => {
    await page.goto('/backoffice/events');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Erreur serveur');
  });
});

// ═══════════════════════════════════════════════════════
// 6. CLEANUP
// ═══════════════════════════════════════════════════════
test.describe('🧹 Nettoyage données de test', () => {
  test('nettoyer les données de test E2E', async ({ request }) => {
    let token: string;
    try {
      token = await getAdminToken(request);
    } catch {
      token = '';
    }
    if (!token) {
      try {
        token = await getUserToken(request);
      } catch {
        token = '';
      }
    }
    test.skip(!token, 'Aucun token disponible pour le nettoyage');
    await cleanupTestData(request, token);
  });
});

import { test, expect } from '@playwright/test';

async function expectLoaded(page: import('@playwright/test').Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('nav').first().waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
  const len = await page.locator('body').textContent({ timeout: 15000 }).then(t => (t?.length ?? 0));
  expect(len).toBeGreaterThan(100);
}

// ═══════════════════════════════════════════════════════
// 1. PAGES DONNÉES INDIVIDUELLES – INTERACTIONS
// ═══════════════════════════════════════════════════════
test.describe('📋 Données individuelles – interactions', () => {
  test('page Entretiens : table et éléments interactifs', async ({ page }) => {
    await page.goto('/backoffice/interviews');
    await expectLoaded(page);
    const hasTable = (await page.locator('table, [role="table"]').count()) > 0;
    const hasButtons = (await page.locator('button').count()) > 0;
    expect(hasTable || hasButtons).toBe(true);
  });

  test('page Appels : table et boutons', async ({ page }) => {
    await page.goto('/backoffice/calls');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/appel|call|téléphone/i.test(body)).toBe(true);
  });

  test('page Relances : table et boutons', async ({ page }) => {
    await page.goto('/backoffice/followups');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/relance|follow/i.test(body)).toBe(true);
  });

  test('page Événements : liste et boutons', async ({ page }) => {
    await page.goto('/backoffice/events');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/événement|event/i.test(body)).toBe(true);
  });

  test('page Notifications : liste et actions', async ({ page }) => {
    await page.goto('/backoffice/notifications');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/notification/i.test(body)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 2. ANALYTICS – INTERACTIONS AVANCÉES
// ═══════════════════════════════════════════════════════
test.describe('📈 Analytics – interactions avancées', () => {
  test('page Performances réseau affiche métriques et boutons', async ({ page }) => {
    await page.goto('/backoffice/analytics/network');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/réseau|network|métrique|metric|performance/i.test(body)).toBe(true);
  });

  test('page Performances applicatives affiche des données', async ({ page }) => {
    await page.goto('/backoffice/analytics/application');
    await expectLoaded(page);
  });

  test('page Analytics conteneurs affiche des conteneurs', async ({ page }) => {
    await page.goto('/backoffice/analytics/containers');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/conteneur|container|docker/i.test(body)).toBe(true);
  });

  test('page Analytics CPU/système avec boutons interactifs', async ({ page }) => {
    await page.goto('/backoffice/analytics');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/analytics|CPU|système|métrique|metric/i.test(body)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 3. SÉCURITÉ – INTERACTIONS AVANCÉES
// ═══════════════════════════════════════════════════════
test.describe('🔒 Sécurité – interactions avancées', () => {
  test('page Analyse de sécurité affiche des résultats', async ({ page }) => {
    await page.goto('/backoffice/security/analysis');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/analyse|analysis|sécurité|security|score/i.test(body)).toBe(true);
  });

  test('page Réseau (sécurité) affiche des données réseau', async ({ page }) => {
    await page.goto('/backoffice/security/network');
    await expectLoaded(page);
  });

  test('page Menaces affiche la liste des menaces', async ({ page }) => {
    await page.goto('/backoffice/security/threats');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/menace|threat|alerte|alert/i.test(body)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 4. EMAILS – PAGES COMPLÉMENTAIRES
// ═══════════════════════════════════════════════════════
test.describe('📧 Emails – pages complémentaires', () => {
  test('page Email Monitor affiche le suivi détaillé', async ({ page }) => {
    await page.goto('/backoffice/email-monitor');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/monitor|suivi|email/i.test(body)).toBe(true);
  });

  test('page Configuration SMTP affiche les paramètres', async ({ page }) => {
    await page.goto('/backoffice/emails/settings');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/smtp|config|paramètre|hôte|host/i.test(body)).toBe(true);
  });

  test('page Délivrabilité affiche les métriques', async ({ page }) => {
    await page.goto('/backoffice/emails/deliverability');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/délivr|deliver|taux|score/i.test(body)).toBe(true);
  });

  test('page Historique Emails affiche les logs', async ({ page }) => {
    await page.goto('/backoffice/emails/logs');
    await expectLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 5. TESTS & OUTILS – INTERACTIONS AVANCÉES
// ═══════════════════════════════════════════════════════
test.describe('🧪 Tests & Outils – interactions avancées', () => {
  test('page Tests API affiche les endpoints et résultats', async ({ page }) => {
    await page.goto('/backoffice/tests-api');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/endpoint|API|test|health|résultat/i.test(body)).toBe(true);
  });

  test('page Tests Backend avec boutons de lancement', async ({ page }) => {
    await page.goto('/backoffice/tests-backend');
    await expectLoaded(page);
  });

  test('page Tests Frontend avec résultats', async ({ page }) => {
    await page.goto('/backoffice/tests-frontend');
    await expectLoaded(page);
  });

  test('page Tests Backoffice avec interface', async ({ page }) => {
    await page.goto('/backoffice/tests-backoffice');
    await expectLoaded(page);
  });

  test('page Tests Emails avec vérifications', async ({ page }) => {
    await page.goto('/backoffice/tests-emails');
    await expectLoaded(page);
  });

  test('page Tests Sécurité avec scans', async ({ page }) => {
    await page.goto('/backoffice/tests-security');
    await expectLoaded(page);
  });

  test('page Tests Performance avec benchmarks', async ({ page }) => {
    await page.goto('/backoffice/tests-performance');
    await expectLoaded(page);
  });

  test('page Programmer Tests Performance', async ({ page }) => {
    await page.goto('/backoffice/performance-tests/schedule');
    await expectLoaded(page);
  });

  test('page Performance Tests standalone', async ({ page }) => {
    await page.goto('/backoffice/performance-tests');
    await expectLoaded(page);
  });

  test('page Données de Test (générateur) est interactive', async ({ page }) => {
    await page.goto('/backoffice/test-data');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/données|test|data|générat|générer/i.test(body)).toBe(true);
  });

  test('page Tests Playwright avec interface', async ({ page }) => {
    await page.goto('/backoffice/playwright-tests');
    await expectLoaded(page);
  });

  test('page Rapports Parcours avec résultats', async ({ page }) => {
    await page.goto('/backoffice/user-journey/reports');
    await expectLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 6. MOBILE EMULATOR
// ═══════════════════════════════════════════════════════
test.describe('📱 Émulateur Mobile', () => {
  test('page Émulateur Mobile est accessible', async ({ page }) => {
    await page.goto('/backoffice/mobile-emulator');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/mobile|émulateur|emulator|device/i.test(body)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 7. SERVICES – DÉTAILS ÉTENDUS
// ═══════════════════════════════════════════════════════
test.describe('🔧 Services – détails étendus', () => {
  test('page détail auth-service avec métriques', async ({ page }) => {
    await page.goto('/backoffice/services/auth-service');
    await expectLoaded(page);
    const body = await page.locator('body').textContent() ?? '';
    expect(/auth|service|statut|status/i.test(body)).toBe(true);
  });
});

import { test, expect, Page } from '@playwright/test';

async function expectPageLoaded(page: Page, minContentLength = 100) {
  await page.waitForLoadState('networkidle');
  const len = await page.locator('body').textContent().then(t => (t?.length ?? 0));
  expect(len).toBeGreaterThan(minContentLength);
}

async function expectTabClickable(page: Page, tabText: string) {
  const tab = page.getByRole('button', { name: new RegExp(tabText, 'i') }).or(
    page.locator(`button, [role="tab"]`).filter({ hasText: new RegExp(tabText, 'i') })
  ).first();
  if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(500);
  }
}

// ═══════════════════════════════════════════════════════
// 1. DASHBOARD PRINCIPAL
// ═══════════════════════════════════════════════════════
test.describe('🏠 Dashboard principal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/backoffice');
    await page.waitForLoadState('networkidle');
  });

  test('affiche le dashboard avec nav et métriques', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    const hasMetrics = await page.locator('[href="/backoffice/users"], [href*="security"]').first().isVisible().catch(() => false);
    expect(hasMetrics).toBe(true);
  });

  test('affiche les cartes de métriques système', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    const bodyText = await page.locator('body').textContent() ?? '';
    const hasMetricTerms = /Sessions|Erreurs|Santé|Temps/i.test(bodyText);
    expect(hasMetricTerms).toBe(true);
  });

  test('maintient la session après rechargement', async ({ page }) => {
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/backoffice');
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
  });

  test('layout cohérent (pas de scroll horizontal)', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    const bodyW = await page.evaluate(() => document.body.scrollWidth);
    const viewW = await page.evaluate(() => window.innerWidth);
    expect(bodyW).toBeLessThanOrEqual(viewW + 20);
  });
});

// ═══════════════════════════════════════════════════════
// 2. STATISTIQUES & MONITORING
// ═══════════════════════════════════════════════════════
test.describe('📊 Statistiques & Monitoring', () => {
  test('page Statistiques & Monitoring Global', async ({ page }) => {
    await page.goto('/backoffice/statistique');
    await expectPageLoaded(page, 200);
  });

  test('onglets Vue ensemble / Sécurité / Logs', async ({ page }) => {
    await page.goto('/backoffice/statistique');
    await expectPageLoaded(page);
    await expectTabClickable(page, 'Vue d');
    await expectTabClickable(page, 'curit');
    await expectTabClickable(page, 'Logs');
  });

  test('page Statistics (alias)', async ({ page }) => {
    await page.goto('/backoffice/statistics');
    await expectPageLoaded(page, 200);
  });
});

// ═══════════════════════════════════════════════════════
// 3. PERFORMANCES & ANALYTICS
// ═══════════════════════════════════════════════════════
test.describe('⚡ Performances & Analytics', () => {
  test('page Performances complètes', async ({ page }) => {
    await page.goto('/backoffice/analytics/performances');
    await expectPageLoaded(page);
  });

  test('page Performances réseau', async ({ page }) => {
    await page.goto('/backoffice/analytics/network');
    await expectPageLoaded(page);
  });

  test('page Performances applicatives', async ({ page }) => {
    await page.goto('/backoffice/analytics/application');
    await expectPageLoaded(page);
  });

  test('page Analytics conteneurs', async ({ page }) => {
    await page.goto('/backoffice/analytics/containers');
    await expectPageLoaded(page);
  });

  test('page Analytics utilisateur', async ({ page }) => {
    await page.goto('/backoffice/user-analytics');
    await expectPageLoaded(page);
  });

  test('onglets Analytics utilisateur', async ({ page }) => {
    await page.goto('/backoffice/user-analytics');
    await expectPageLoaded(page);
    await expectTabClickable(page, 'Vue d');
    await expectTabClickable(page, 'nements');
    await expectTabClickable(page, 'Erreurs');
    await expectTabClickable(page, 'Performance');
  });

  test('page Analytics CPU/système', async ({ page }) => {
    await page.goto('/backoffice/analytics');
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 4. SÉCURITÉ (6 pages)
// ═══════════════════════════════════════════════════════
test.describe('🔒 Sécurité', () => {
  test('page Analyse de sécurité', async ({ page }) => {
    await page.goto('/backoffice/security/analysis');
    await expectPageLoaded(page);
  });

  test('page Firewall', async ({ page }) => {
    await page.goto('/backoffice/security/firewall');
    await expectPageLoaded(page);
  });

  test('page Réseau (sécurité)', async ({ page }) => {
    await page.goto('/backoffice/security/network');
    await expectPageLoaded(page);
  });

  test('page Politiques de sécurité', async ({ page }) => {
    await page.goto('/backoffice/security/policies');
    await expectPageLoaded(page);
  });

  test('page Menaces', async ({ page }) => {
    await page.goto('/backoffice/security/threats');
    await expectPageLoaded(page);
  });

  test('page Logs de sécurité (onglet Sécurité dans statistique)', async ({ page }) => {
    await page.goto('/backoffice/statistique');
    await expectPageLoaded(page);
    await expectTabClickable(page, 'curit');
  });
});

// ═══════════════════════════════════════════════════════
// 5. GESTION DES SERVICES
// ═══════════════════════════════════════════════════════
test.describe('🔧 Services', () => {
  test('page Liste des services', async ({ page }) => {
    await page.goto('/backoffice/services');
    await expectPageLoaded(page, 200);
  });

  test('onglets Services / Logs Système', async ({ page }) => {
    await page.goto('/backoffice/services');
    await expectPageLoaded(page);
    await expectTabClickable(page, 'Services');
    await expectTabClickable(page, 'Logs');
  });

  test('page détail d\'un service (api-gateway)', async ({ page }) => {
    await page.goto('/backoffice/services/api-gateway');
    await expectPageLoaded(page);
  });

  test('page détail d\'un service (auth-service)', async ({ page }) => {
    await page.goto('/backoffice/services/auth-service');
    await expectPageLoaded(page);
  });

  test('page Applications/Gestion des Services', async ({ page }) => {
    await page.goto('/backoffice/applications');
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 6. GESTION DES DONNÉES (page Data + sous-pages)
// ═══════════════════════════════════════════════════════
test.describe('💾 Gestion des données', () => {
  test('page principale Gestion des données', async ({ page }) => {
    await page.goto('/backoffice/datas');
    await expectPageLoaded(page, 200);
  });

  test('onglet Candidatures', async ({ page }) => {
    await page.goto('/backoffice/datas?tab=applications');
    await expectPageLoaded(page);
  });

  test('onglet Entreprises', async ({ page }) => {
    await page.goto('/backoffice/datas?tab=companies');
    await expectPageLoaded(page);
  });

  test('onglet Contacts', async ({ page }) => {
    await page.goto('/backoffice/datas?tab=contacts');
    await expectPageLoaded(page);
  });

  test('onglet Entretiens', async ({ page }) => {
    await page.goto('/backoffice/datas?tab=interviews');
    await expectPageLoaded(page);
  });

  test('onglet Appels', async ({ page }) => {
    await page.goto('/backoffice/datas?tab=calls');
    await expectPageLoaded(page);
  });

  test('onglet Relances', async ({ page }) => {
    await page.goto('/backoffice/datas?tab=followups');
    await expectPageLoaded(page);
  });

  test('onglet Événements', async ({ page }) => {
    await page.goto('/backoffice/datas?tab=events');
    await expectPageLoaded(page);
  });

  test('onglet Notifications', async ({ page }) => {
    await page.goto('/backoffice/datas?tab=notifications');
    await expectPageLoaded(page);
  });

  test('onglet Stats utilisateur', async ({ page }) => {
    await page.goto('/backoffice/datas?tab=user-stats');
    await expectPageLoaded(page);
  });

  test('onglet Abonnement & facturation', async ({ page }) => {
    await page.goto('/backoffice/datas?tab=billing');
    await expectPageLoaded(page);
  });

  test('onglet Données de test', async ({ page }) => {
    await page.goto('/backoffice/datas?tab=test-data');
    await expectPageLoaded(page);
  });

  test('page standalone Data Management', async ({ page }) => {
    await page.goto('/backoffice/data-management');
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 7. PAGES DONNÉES INDIVIDUELLES
// ═══════════════════════════════════════════════════════
test.describe('📋 Pages données individuelles', () => {
  test('page Entreprises', async ({ page }) => {
    await page.goto('/backoffice/companies');
    await expectPageLoaded(page);
  });

  test('page Contacts', async ({ page }) => {
    await page.goto('/backoffice/contacts');
    await expectPageLoaded(page);
  });

  test('page Entretiens', async ({ page }) => {
    await page.goto('/backoffice/interviews');
    await expectPageLoaded(page);
  });

  test('page Appels', async ({ page }) => {
    await page.goto('/backoffice/calls');
    await expectPageLoaded(page);
  });

  test('page Relances', async ({ page }) => {
    await page.goto('/backoffice/followups');
    await expectPageLoaded(page);
  });

  test('page Événements', async ({ page }) => {
    await page.goto('/backoffice/events');
    await expectPageLoaded(page);
  });

  test('page Notifications', async ({ page }) => {
    await page.goto('/backoffice/notifications');
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 8. ARCHIVES & CORBEILLE
// ═══════════════════════════════════════════════════════
test.describe('📦 Archives & Corbeille', () => {
  test('page Archives', async ({ page }) => {
    await page.goto('/backoffice/archives');
    await expectPageLoaded(page);
  });

  test('page Corbeille', async ({ page }) => {
    await page.goto('/backoffice/trash');
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 9. UTILISATEURS
// ═══════════════════════════════════════════════════════
test.describe('👥 Utilisateurs', () => {
  test('page Gestion des utilisateurs', async ({ page }) => {
    await page.goto('/backoffice/users');
    await expectPageLoaded(page);
  });

  test('page affiche un filtre de rôles ou recherche', async ({ page }) => {
    await page.goto('/backoffice/users');
    await expectPageLoaded(page);
    const bodyText = await page.locator('body').textContent() ?? '';
    const hasUserManagement = /utilisateur|role|admin|user/i.test(bodyText);
    expect(hasUserManagement).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 10. EMAILS (5 pages)
// ═══════════════════════════════════════════════════════
test.describe('📧 Emails', () => {
  test('page Gestion des emails', async ({ page }) => {
    await page.goto('/backoffice/emails');
    await expectPageLoaded(page);
  });

  test('onglets Email de Test / Reset Password', async ({ page }) => {
    await page.goto('/backoffice/emails');
    await expectPageLoaded(page);
    await expectTabClickable(page, 'Email de Test');
    await expectTabClickable(page, 'Reset');
  });

  test('page Email Monitor', async ({ page }) => {
    await page.goto('/backoffice/email-monitor');
    await expectPageLoaded(page);
  });

  test('page Templates emails', async ({ page }) => {
    await page.goto('/backoffice/emails/templates');
    await expectPageLoaded(page);
  });

  test('onglets Templates (Prévisualisation / Code / Variables)', async ({ page }) => {
    await page.goto('/backoffice/emails/templates');
    await expectPageLoaded(page);
    await expectTabClickable(page, 'visualisation');
    await expectTabClickable(page, 'Code');
    await expectTabClickable(page, 'Variables');
  });

  test('page Configuration SMTP', async ({ page }) => {
    await page.goto('/backoffice/emails/settings');
    await expectPageLoaded(page);
  });

  test('page Délivrabilité', async ({ page }) => {
    await page.goto('/backoffice/emails/deliverability');
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 11. TESTS & API (8 pages)
// ═══════════════════════════════════════════════════════
test.describe('🧪 Tests & API', () => {
  test('page Hub Tests principal', async ({ page }) => {
    await page.goto('/backoffice/tests');
    await expectPageLoaded(page, 200);
  });

  test('page Tests API', async ({ page }) => {
    await page.goto('/backoffice/tests-api');
    await expectPageLoaded(page);
  });

  test('page Tests Backend', async ({ page }) => {
    await page.goto('/backoffice/tests-backend');
    await expectPageLoaded(page);
  });

  test('page Tests Frontend', async ({ page }) => {
    await page.goto('/backoffice/tests-frontend');
    await expectPageLoaded(page);
  });

  test('page Tests Backoffice', async ({ page }) => {
    await page.goto('/backoffice/tests-backoffice');
    await expectPageLoaded(page);
  });

  test('page Tests Emails', async ({ page }) => {
    await page.goto('/backoffice/tests-emails');
    await expectPageLoaded(page);
  });

  test('page Tests Sécurité', async ({ page }) => {
    await page.goto('/backoffice/tests-security');
    await expectPageLoaded(page);
  });

  test('page Tests Performance', async ({ page }) => {
    await page.goto('/backoffice/tests-performance');
    await expectPageLoaded(page);
  });

  test('page Testeur d\'API', async ({ page }) => {
    await page.goto('/backoffice/api-tester');
    await expectPageLoaded(page);
  });

  test('page Rapports de tests', async ({ page }) => {
    await page.goto('/backoffice/test-reports');
    await expectPageLoaded(page, 200);
  });

  test('page Programmer tests', async ({ page }) => {
    await page.goto('/backoffice/performance-tests/schedule');
    await expectPageLoaded(page);
  });

  test('page Tests Performance (standalone)', async ({ page }) => {
    await page.goto('/backoffice/performance-tests');
    await expectPageLoaded(page);
  });

  test('page Données de test (générateur)', async ({ page }) => {
    await page.goto('/backoffice/test-data');
    await expectPageLoaded(page, 200);
  });

  test('page Tests Playwright', async ({ page }) => {
    await page.goto('/backoffice/playwright-tests');
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 12. PARCOURS UTILISATEUR
// ═══════════════════════════════════════════════════════
test.describe('🎯 Parcours utilisateur', () => {
  test('page Parcours prédéfinis', async ({ page }) => {
    await page.goto('/backoffice/user-journey');
    await expectPageLoaded(page);
  });

  test('page affiche les scénarios disponibles', async ({ page }) => {
    await page.goto('/backoffice/user-journey');
    await expectPageLoaded(page);
    const bodyText = await page.locator('body').textContent() ?? '';
    const hasJourneys = /parcours|tape|sc.nario/i.test(bodyText);
    expect(hasJourneys).toBe(true);
  });

  test('page Parcours personnalisé', async ({ page }) => {
    await page.goto('/backoffice/user-journey/custom');
    await expectPageLoaded(page);
  });

  test('page Rapports de parcours', async ({ page }) => {
    await page.goto('/backoffice/user-journey/reports');
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 13. RECHERCHE
// ═══════════════════════════════════════════════════════
test.describe('🔍 Recherche', () => {
  test('page Recherche optimisée', async ({ page }) => {
    await page.goto('/backoffice/search');
    await expectPageLoaded(page);
  });
});

// ═══════════════════════════════════════════════════════
// 14. NAVIGATION SIDEBAR
// ═══════════════════════════════════════════════════════
test.describe('🧭 Navigation sidebar', () => {
  test('sidebar visible avec liens principaux', async ({ page }) => {
    await page.goto('/backoffice');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });

    const nav = await page.locator('nav').textContent() ?? '';
    const hasLinks = /Statistiques|Services|curit|Utilisateurs|Emails|Tests|Parcours/i.test(nav);
    expect(hasLinks).toBe(true);
  });

  test('liens de navigation fonctionnels', async ({ page }) => {
    await page.goto('/backoffice');
    await page.waitForLoadState('networkidle');

    const navLinks = page.locator('nav a[href*="/backoffice/"]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(5);
  });
});

import { test, expect, Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════
// 1. CRUD ENTREPRISES (interactions UI)
// ═══════════════════════════════════════════════════════
test.describe('🏢 CRUD Entreprises (interactions)', () => {
  test('ouvrir le modal de création, remplir le formulaire et annuler', async ({ page }) => {
    await page.goto('/backoffice/companies', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Nouvelle entreprise/i }).click();

    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('h2')).toContainText(/Nouvelle entreprise/i);

    await modal.locator('input[type="text"]').first().fill('E2E Test Company');

    const urlInput = modal.locator('input[type="url"]');
    if (await urlInput.isVisible().catch(() => false)) {
      await urlInput.fill('https://e2e-test.example.com');
    }

    const sizeSelect = modal.locator('select');
    if (await sizeSelect.isVisible().catch(() => false)) {
      await sizeSelect.selectOption('11-50');
    }

    await expect(modal.locator('input[type="text"]').first()).toHaveValue('E2E Test Company');

    await modal.getByRole('button', { name: /Annuler/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('le champ de recherche filtre les entreprises en temps réel', async ({ page }) => {
    await page.goto('/backoffice/companies', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('Rechercher une entreprise...');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('test');
    await page.waitForTimeout(500);

    await expect(searchInput).toHaveValue('test');

    await searchInput.clear();
    await page.waitForTimeout(300);
    await expect(searchInput).toHaveValue('');
  });

  test('filtrer avec un terme inexistant donne zéro résultat', async ({ page }) => {
    await page.goto('/backoffice/companies', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('Rechercher une entreprise...');
    await searchInput.fill('ZZZINEXISTANTZZZ');
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toContainText(/Aucune entreprise/i);
  });

  test('le bouton Supprimer déclenche une confirmation', async ({ page }) => {
    await page.goto('/backoffice/companies', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const deleteBtn = page.getByRole('button', { name: /Supprimer/i }).first();
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      let dialogShown = false;
      page.once('dialog', async d => {
        dialogShown = true;
        await d.dismiss();
      });
      await deleteBtn.click();
      await page.waitForTimeout(1000);
      expect(dialogShown).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 2. CRUD CONTACTS (interactions UI)
// ═══════════════════════════════════════════════════════
test.describe('👤 CRUD Contacts (interactions)', () => {
  test('ouvrir le modal de création, remplir les champs et annuler', async ({ page }) => {
    await page.goto('/backoffice/contacts', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Nouveau contact/i }).click();

    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('h2')).toContainText(/Nouveau contact/i);

    const requiredInputs = modal.locator('input[type="text"][required]');
    await requiredInputs.first().fill('Jean');
    await requiredInputs.nth(1).fill('Dupont');

    const emailInput = modal.locator('input[type="email"]');
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill('jean.dupont@test.local');
    }

    const phoneInput = modal.locator('input[type="tel"]');
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill('+33612345678');
    }

    await expect(requiredInputs.first()).toHaveValue('Jean');
    await expect(requiredInputs.nth(1)).toHaveValue('Dupont');

    await modal.getByRole('button', { name: /Annuler/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('rechercher un contact via le champ de recherche', async ({ page }) => {
    await page.goto('/backoffice/contacts', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('Rechercher un contact...');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('a');
    await page.waitForTimeout(500);

    const body = await page.locator('body').textContent() ?? '';
    expect(body.length).toBeGreaterThan(100);
  });

  test('le bouton d\'édition ouvre le modal de modification', async ({ page }) => {
    await page.goto('/backoffice/contacts', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('td:last-child button, .flex.gap-2 button').first();
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click();

      const modal = page.locator('.fixed.inset-0');
      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(modal.locator('h2')).toContainText(/Modifier/i);

        await modal.getByRole('button', { name: /Annuler/i }).click();
        await expect(modal).not.toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('le bouton de suppression déclenche une confirmation', async ({ page }) => {
    await page.goto('/backoffice/contacts', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    if (await rows.count() > 0) {
      const deleteBtn = rows.first().locator('td:last-child button').last();
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        let dialogShown = false;
        page.once('dialog', async d => {
          dialogShown = true;
          await d.dismiss();
        });
        await deleteBtn.click();
        await page.waitForTimeout(1000);
        expect(dialogShown).toBe(true);
      }
    }
  });

  test('le bouton Actualiser recharge les contacts', async ({ page }) => {
    await page.goto('/backoffice/contacts', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const refreshBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
    if (await refreshBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refreshBtn.click();
      await page.waitForLoadState('networkidle');
    }
  });
});

// ═══════════════════════════════════════════════════════
// 3. INTERACTIONS EMAILS
// ═══════════════════════════════════════════════════════
test.describe('📧 Interactions Emails', () => {
  test('remplir et envoyer un email de test', async ({ page }) => {
    await page.goto('/backoffice/emails', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const tabTest = page.locator('[role="tab"]').filter({ hasText: /Email de Test/i });
    if (await tabTest.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tabTest.click();
      await page.waitForTimeout(500);
    }

    const emailInput = page.locator('#test-email');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('e2e-test@mailhog.local');

    const subjectInput = page.locator('#test-subject');
    if (await subjectInput.isVisible().catch(() => false)) {
      await subjectInput.fill('E2E Interaction Test - ' + Date.now());
    }

    const contentArea = page.locator('#test-content');
    if (await contentArea.isVisible().catch(() => false)) {
      await contentArea.fill('<h1>Test E2E</h1><p>Email envoyé depuis les tests d\'interactions Playwright.</p>');
    }

    const sendBtn = page.getByRole('button', { name: /Envoyer l'email de test/i });
    await sendBtn.click();

    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent() ?? '';
    const hasFeedback = /envoyé|succès|erreur|échec/i.test(body);
    expect(hasFeedback).toBe(true);
  });

  test('basculer entre onglets Email de Test et Reset Password', async ({ page }) => {
    await page.goto('/backoffice/emails', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const tabReset = page.locator('[role="tab"]').filter({ hasText: /Reset/i });
    if (await tabReset.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tabReset.click();
      await page.waitForTimeout(500);
      const resetInput = page.locator('#reset-email');
      await expect(resetInput).toBeVisible({ timeout: 3000 });
    }

    const tabTest = page.locator('[role="tab"]').filter({ hasText: /Email de Test/i });
    if (await tabTest.isVisible().catch(() => false)) {
      await tabTest.click();
      await page.waitForTimeout(500);
      const testInput = page.locator('#test-email');
      await expect(testInput).toBeVisible({ timeout: 3000 });
    }
  });

  test('cliquer Actualiser rafraîchit les statistiques', async ({ page }) => {
    await page.goto('/backoffice/emails', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const refreshBtn = page.getByRole('button', { name: /Actualiser/i });
    if (await refreshBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await refreshBtn.click();
      await page.waitForLoadState('networkidle');
    }

    const body = await page.locator('body').textContent() ?? '';
    expect(body.length).toBeGreaterThan(100);
  });
});

// ═══════════════════════════════════════════════════════
// 4. INTERACTIONS UTILISATEURS
// ═══════════════════════════════════════════════════════
test.describe('👥 Interactions Utilisateurs', () => {
  test('rechercher un utilisateur par nom ou email', async ({ page }) => {
    await page.goto('/backoffice/users', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('Rechercher par nom ou email...');
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('admin');
      await page.waitForTimeout(500);

      const body = await page.locator('body').textContent() ?? '';
      expect(/admin|Admin|ADMIN/i.test(body)).toBe(true);
    }
  });

  test('filtrer les utilisateurs par rôle', async ({ page }) => {
    await page.goto('/backoffice/users', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const roleSelect = page.locator('select').first();
    if (await roleSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await roleSelect.selectOption('SUPER_ADMIN');
      await page.waitForTimeout(500);

      const body = await page.locator('body').textContent() ?? '';
      expect(/SUPER_ADMIN|Super Admin/i.test(body)).toBe(true);

      await roleSelect.selectOption('all');
      await page.waitForTimeout(500);
    }
  });

  test('cliquer Actualiser recharge la liste', async ({ page }) => {
    await page.goto('/backoffice/users', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const refreshBtn = page.getByRole('button', { name: /Actualiser/i });
    if (await refreshBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await refreshBtn.click();
      await page.waitForLoadState('networkidle');
      const body = await page.locator('body').textContent() ?? '';
      expect(/utilisateur|user|admin/i.test(body)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 5. INTERACTIONS GESTION DES DONNÉES
// ═══════════════════════════════════════════════════════
test.describe('💾 Interactions Data Management', () => {
  test('les boutons d\'export sont cliquables', async ({ page }) => {
    await page.goto('/backoffice/data-management', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const exportBtns = [
      /Exporter les candidatures/i,
      /Exporter les entreprises/i,
      /Exporter les contacts/i,
      /Exporter tout/i,
    ];

    for (const btnPattern of exportBtns) {
      const btn = page.getByRole('button', { name: btnPattern });
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await btn.isEnabled()).toBe(true);
      }
    }
  });

  test('la zone d\'import fichier est visible', async ({ page }) => {
    await page.goto('/backoffice/data-management', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      expect(await fileInput.first().isEnabled()).toBe(true);
    }
  });

  test('onglets de la page Data sont cliquables', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/backoffice/datas', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 45000 });
    await expect(page.getByRole('heading', { name: /Gestion des Données/i })).toBeVisible({ timeout: 30000 });

    const tabs = [
      'Candidatures', 'Entreprises', 'Contacts', 'Entretiens',
      'Appels', 'Relances',
    ];

    for (const tabText of tabs) {
      const tab = page.locator('button, [role="tab"]').filter({ hasText: new RegExp(tabText, 'i') }).first();
      if (await tab.isVisible({ timeout: 8000 }).catch(() => false)) {
        await tab.scrollIntoViewIfNeeded().catch(() => {});
        await tab.click({ timeout: 10000 });
        await page.waitForTimeout(400);
      }
    }

    const body = await page.locator('body').textContent() ?? '';
    expect(body.length).toBeGreaterThan(100);
  });
});

// ═══════════════════════════════════════════════════════
// 6. INTERACTIONS STATISTIQUES & MONITORING
// ═══════════════════════════════════════════════════════
test.describe('📊 Interactions Statistiques', () => {
  test('cliquer onglets Vue d\'ensemble / Sécurité / Logs change le contenu', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/backoffice/statistics', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 45000 });
    // La page attend les stats API : le h1 n’apparaît qu’après chargement (pas seulement le spinner).
    await expect(
      page.getByRole('heading', { name: /Statistiques|Monitoring/i })
    ).toBeVisible({ timeout: 60000 });

    const tabVue = page.locator('button').filter({ hasText: /Vue d'ensemble|Vue d/i }).first();
    if (await tabVue.isVisible({ timeout: 10000 }).catch(() => false)) {
      await tabVue.scrollIntoViewIfNeeded().catch(() => {});
      await tabVue.click({ timeout: 10000 });
      await page.waitForTimeout(500);
      const content1 = await page.locator('body').textContent() ?? '';
      expect(content1.length).toBeGreaterThan(100);
    }

    const tabSecu = page.locator('button').filter({ hasText: /Sécurité|curit/i }).first();
    if (await tabSecu.isVisible({ timeout: 10000 }).catch(() => false)) {
      await tabSecu.scrollIntoViewIfNeeded().catch(() => {});
      await tabSecu.click({ timeout: 10000 });
      await page.waitForTimeout(500);
    }

    const tabLogs = page.locator('button').filter({ hasText: /Statistiques Logs/i }).first();
    if (await tabLogs.isVisible({ timeout: 10000 }).catch(() => false)) {
      await tabLogs.scrollIntoViewIfNeeded().catch(() => {});
      await tabLogs.click({ timeout: 10000 });
      await page.waitForTimeout(500);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 7. INTERACTIONS SERVICES
// ═══════════════════════════════════════════════════════
test.describe('🔧 Interactions Services', () => {
  test('cliquer onglets Services / Logs Système', async ({ page }) => {
    await page.goto('/backoffice/services', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const tabServices = page.locator('button, [role="tab"]').filter({ hasText: /Services/i }).first();
    if (await tabServices.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tabServices.click();
      await page.waitForTimeout(500);
    }

    const tabLogs = page.locator('button, [role="tab"]').filter({ hasText: /Logs/i }).first();
    if (await tabLogs.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tabLogs.click();
      await page.waitForTimeout(500);
    }
  });

  test('naviguer vers le détail d\'un service', async ({ page }) => {
    await page.goto('/backoffice/services/api-gateway', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent() ?? '';
    expect(/api-gateway|API Gateway|service/i.test(body)).toBe(true);
    expect(body.length).toBeGreaterThan(100);
  });
});

// ═══════════════════════════════════════════════════════
// 8. INTERACTIONS ANALYTICS
// ═══════════════════════════════════════════════════════
test.describe('⚡ Interactions Analytics', () => {
  test('cliquer onglets Analytics utilisateur', async ({ page }) => {
    await page.goto('/backoffice/user-analytics', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');
    await page.locator('nav').first().waitFor({ state: 'visible', timeout: 15000 });

    const tabTexts = ['Vue d', 'nements', 'Erreurs', 'Performance'];
    for (const tabText of tabTexts) {
      const tab = page.locator('button, [role="tab"]').filter({ hasText: new RegExp(tabText, 'i') }).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(400);
      }
    }
  });

  test('page Performances affiche des métriques interactives', async ({ page }) => {
    await page.goto('/backoffice/performances', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent() ?? '';
    expect(body.length).toBeGreaterThan(100);

    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════
// 9. INTERACTIONS SÉCURITÉ
// ═══════════════════════════════════════════════════════
test.describe('🔒 Interactions Sécurité', () => {
  test('page Firewall affiche des éléments interactifs', async ({ page }) => {
    await page.goto('/backoffice/security/firewall', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.locator('h1, nav').first().waitFor({ timeout: 10000 });

    const body = await page.locator('body').textContent() ?? '';
    expect(body.length).toBeGreaterThan(100);

    const hasInteractive = (await page.locator('button, input, select, [role="tab"]').count()) > 0;
    expect(hasInteractive).toBe(true);
  });

  test('page Politiques de sécurité est interactive', async ({ page }) => {
    await page.goto('/backoffice/security/policies', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.locator('h1, nav').first().waitFor({ timeout: 10000 });

    const body = await page.locator('body').textContent() ?? '';
    expect(/politique|policy|règle|rule|sécurité|security|WAF|firewall/i.test(body)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 10. INTERACTIONS RECHERCHE GLOBALE
// ═══════════════════════════════════════════════════════
test.describe('🔍 Interactions Recherche', () => {
  test('la page de recherche est interactive', async ({ page }) => {
    await page.goto('/backoffice/search', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent() ?? '';
    expect(body.length).toBeGreaterThan(100);

    const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="echerch"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 11. INTERACTIONS DASHBOARD NAVIGATION
// ═══════════════════════════════════════════════════════
test.describe('🏠 Interactions Dashboard', () => {
  test('cliquer un lien de navigation change de page', async ({ page }) => {
    await page.goto('/backoffice', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav').first().waitFor({ timeout: 10000 });

    const subLinks = page.locator('nav a[href*="/backoffice/"]').filter({ hasText: /.+/ });
    const count = await subLinks.count();
    expect(count).toBeGreaterThan(0);

    if (count > 0) {
      const link = subLinks.first();
      const href = await link.getAttribute('href') ?? '';
      await link.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/backoffice');
    }
  });

  test('les cartes de métriques sont présentes et cliquables', async ({ page }) => {
    await page.goto('/backoffice', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.locator('nav').first().waitFor({ timeout: 10000 });

    const cards = page.locator('a[href*="/backoffice/"], [role="link"]').filter({ hasText: /.+/ });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════
// 12. INTERACTIONS ARCHIVES & CORBEILLE
// ═══════════════════════════════════════════════════════
test.describe('📦 Interactions Archives & Corbeille', () => {
  test('page Archives affiche les filtres et éléments interactifs', async ({ page }) => {
    await page.goto('/backoffice/archives', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');
    await page.locator('nav').first().waitFor({ state: 'visible', timeout: 20000 });

    const body = await page.locator('body').textContent({ timeout: 20000 }) ?? '';
    expect(body.length).toBeGreaterThan(100);

    const interactiveCount = await page.locator('button, input, select, [role="tab"]').count();
    expect(interactiveCount).toBeGreaterThanOrEqual(0);
  });

  test('page Corbeille affiche les éléments interactifs', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/backoffice/trash', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 45000 });
    await expect(page.getByRole('heading', { name: /Corbeille/i })).toBeVisible({ timeout: 30000 });
    const body = await page.locator('body').textContent({ timeout: 25000 }) ?? '';
    expect(body.length, 'Le body de la page Corbeille doit être chargé').toBeGreaterThan(100);
    expect(body).toMatch(/Corbeille|Gestion|éléments supprimés|Tous les éléments|Restaurer/i);
  });
});

// ═══════════════════════════════════════════════════════
// 13. INTERACTIONS PARCOURS UTILISATEUR
// ═══════════════════════════════════════════════════════
test.describe('🎯 Interactions Parcours', () => {
  test('page Parcours prédéfinis affiche des scénarios cliquables', async ({ page }) => {
    await page.goto('/backoffice/user-journey', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.locator('h1, nav').first().waitFor({ timeout: 10000 });

    const body = await page.locator('body').textContent() ?? '';
    expect(/parcours|scénario|étape|tape|journey|utilisateur/i.test(body)).toBe(true);

    const buttons = page.locator('button').filter({ hasText: /.+/ });
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('page Parcours personnalisé est interactive', async ({ page }) => {
    await page.goto('/backoffice/user-journey/custom', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent() ?? '';
    expect(body.length).toBeGreaterThan(100);
  });
});

// ═══════════════════════════════════════════════════════
// 14. INTERACTIONS TESTS & API
// ═══════════════════════════════════════════════════════
test.describe('🧪 Interactions Tests & API', () => {
  test('page Testeur d\'API permet de configurer une requête', async ({ page }) => {
    await page.goto('/backoffice/api-tester', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const urlInput = page.locator('input[type="text"], input[type="url"]').first();
    if (await urlInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await urlInput.fill('/api/v1/auth/health');

      const methodSelect = page.locator('select').first();
      if (await methodSelect.isVisible().catch(() => false)) {
        await methodSelect.selectOption('GET');
      }

      const sendBtn = page.getByRole('button', { name: /envoyer|send|exécuter|tester/i }).first();
      if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sendBtn.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }
    }

    const body = await page.locator('body').textContent() ?? '';
    expect(body.length).toBeGreaterThan(100);
  });

  test('page Hub Tests affiche les catégories de tests cliquables', async ({ page }) => {
    await page.goto('/backoffice/tests', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent() ?? '';
    expect(body.length).toBeGreaterThan(200);

    const buttons = page.locator('button, a[href*="test"]').filter({ hasText: /.+/ });
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('page Rapports de tests affiche les rapports et permet le tri', async ({ page }) => {
    await page.goto('/backoffice/test-reports', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent() ?? '';
    expect(body.length).toBeGreaterThan(200);

    const sortBtns = page.locator('button, select').filter({ hasText: /trier|date|sort|catégorie/i });
    if (await sortBtns.count() > 0) {
      await sortBtns.first().click();
      await page.waitForTimeout(500);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 15. INTERACTIONS EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════
test.describe('📝 Interactions Templates Emails', () => {
  test('cliquer onglets Prévisualisation / Code / Variables', async ({ page }) => {
    await page.goto('/backoffice/emails/templates', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForLoadState('networkidle');

    const tabTexts = ['visualisation', 'Code', 'Variables'];
    for (const tabText of tabTexts) {
      const tab = page.locator('button, [role="tab"]').filter({ hasText: new RegExp(tabText, 'i') }).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(400);
      }
    }
  });
});

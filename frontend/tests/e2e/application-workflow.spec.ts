// Tests workflow backoffice — utilise un administrateur (SUPER_ADMIN)
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './test-data-helper';

test.describe('🔄 Workflow Complet - Gestion des Candidatures (admin)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/b4ck0ff1ce');
    await page.waitForLoadState('domcontentloaded');
  });

  test('devrait permettre un workflow complet de recrutement', async ({ page }) => {
    // Étape 1: Créer une entreprise
    await page.locator('text=Entreprises').click();
    await page.locator('button').filter({ hasText: /Créer|Ajouter/ }).click();

    await page.fill('input[name="name"]', 'TechStart Solutions');
    await page.fill('input[name="industry"]', 'Technologie');
    await page.fill('input[name="website"]', 'https://techstart.com');
    await page.fill('textarea[name="description"]', 'Startup innovante en développement web');
    await page.locator('button[type="submit"]').click();

    // Vérifier que l'entreprise est créée
    await expect(page.locator('text=TechStart Solutions')).toBeVisible();

    // Étape 2: Ajouter un contact à l'entreprise
    await page.locator('text=Contacts').click();
    await page.locator('button').filter({ hasText: /Créer|Ajouter/ }).click();

    await page.fill('input[name="firstName"]', 'Jean');
    await page.fill('input[name="lastName"]', 'Dupont');
    await page.fill('input[name="email"]', 'redacted@example.invalid');
    await page.fill('input[name="position"]', 'CTO');
    await page.locator('select[name="companyId"]').selectOption({ label: 'TechStart Solutions' });
    await page.locator('button[type="submit"]').click();

    // Étape 3: Créer une candidature
    await page.locator('text=Applications').click();
    await page.locator('button').filter({ hasText: /Créer|Ajouter/ }).click();

    await page.fill('input[name="position"]', 'Développeur Full Stack Senior');
    await page.fill('input[name="salary"]', '45000-55000');
    await page.fill('input[name="location"]', 'Paris, France');
    await page.fill('textarea[name="description"]', 'Nous recherchons un développeur expérimenté...');
    await page.fill('textarea[name="requirements"]', 'React, Node.js, 5+ ans expérience');
    await page.locator('select[name="companyId"]').selectOption({ label: 'TechStart Solutions' });
    await page.locator('select[name="status"]').selectOption('ACTIVE');
    await page.locator('button[type="submit"]').click();

    // Étape 4: Planifier un entretien
    await page.locator('text=Entretiens').click();
    await page.locator('button').filter({ hasText: /Créer|Ajouter/ }).click();

    await page.fill('input[name="title"]', 'Entretien technique - Dev Full Stack');
    await page.fill('input[name="date"]', '2025-01-15');
    await page.fill('input[name="time"]', '14:00');
    await page.fill('textarea[name="notes"]', 'Discussion technique approfondie');
    await page.locator('select[name="applicationId"]').selectOption({ label: 'Développeur Full Stack Senior' });
    await page.locator('select[name="interviewerId"]').selectOption({ label: 'Jean Dupont' });
    await page.locator('button[type="submit"]').click();

    // Étape 5: Ajouter un suivi après l'entretien
    await page.locator('text=Suivis').click();
    await page.locator('button').filter({ hasText: /Créer|Ajouter/ }).click();

    await page.fill('textarea[name="notes"]', 'Candidat très compétent, bonne expérience React');
    await page.fill('input[name="nextSteps"]', 'Proposition d\'embauche à préparer');
    await page.locator('select[name="status"]').selectOption('INTERVIEW_COMPLETED');
    await page.locator('button[type="submit"]').click();

    // Étape 6: Finaliser l'embauche
    await page.locator('text=Applications').click();
    await page.locator('button').filter({ hasText: /Modifier|Éditer/ }).first().click();
    await page.locator('select[name="status"]').selectOption('HIRED');
    await page.locator('button[type="submit"]').click();

    // Vérification finale : le statut a changé
    await expect(page.locator('text=EMBAUCHÉ')).toBeVisible();
  });

  test('devrait permettre la gestion complète du pipeline de recrutement', async ({ page }) => {
    await page.locator('text=Applications').click();

    // Vérifier les différents statuts
    await expect(page.locator('text=ACTIVE')).toBeVisible();
    await expect(page.locator('text=INTERVIEW')).toBeVisible();
    await expect(page.locator('text=REJECTED')).toBeVisible();
    await expect(page.locator('text=HIRED')).toBeVisible();

    // Tester le filtrage par statut
    await page.locator('select[name="statusFilter"]').selectOption('ACTIVE');
    await expect(page.locator('.application-card')).toHaveCount(5); // Simulation

    // Tester la recherche par entreprise
    await page.fill('input[name="companySearch"]', 'TechStart');
    await expect(page.locator('text=TechStart Solutions')).toBeVisible();

    // Tester le tri par date
    await page.locator('select[name="sortBy"]').selectOption('createdAt');
    await page.locator('button[name="sortOrder"]').click(); // Inverser l'ordre
  });

  test('devrait gérer les refus et archivages correctement', async ({ page }) => {
    await page.locator('text=Applications').click();

    // Sélectionner une candidature à refuser
    await page.locator('.application-card').first().locator('input[type="checkbox"]').check();
    await page.locator('button').filter({ hasText: /Actions|Bulk/ }).click();
    await page.locator('button').filter({ hasText: /Refuser/ }).click();

    // Confirmer le refus
    await page.locator('button').filter({ hasText: /Confirmer/ }).click();

    // Vérifier que le statut a changé
    await expect(page.locator('text=REFUSÉ')).toBeVisible();

    // Archiver la candidature refusée
    await page.locator('.application-card').first().locator('button').filter({ hasText: /Archiver/ }).click();
    await page.locator('button').filter({ hasText: /Confirmer/ }).click();

    // Vérifier qu'elle apparaît dans les archives
    await page.locator('text=Archives').click();
    await expect(page.locator('text=TechStart Solutions')).toBeVisible();
  });

  test('devrait permettre la gestion des relances et communications', async ({ page }) => {
    await page.locator('text=Suivis').click();

    // Créer une relance automatique
    await page.locator('button').filter({ hasText: /Relance/ }).click();
    await page.fill('textarea[name="message"]', 'Bonjour, nous souhaitons planifier un entretien...');
    await page.locator('input[name="scheduleDate"]').fill('2025-01-20');
    await page.locator('button[type="submit"]').click();

    // Vérifier que la relance est programmée
    await expect(page.locator('text=Relance programmée')).toBeVisible();

    // Tester l'envoi manuel d'email
    await page.locator('button').filter({ hasText: /Email/ }).click();
    await page.fill('input[name="subject"]', 'Suivi de votre candidature');
    await page.fill('textarea[name="body"]', 'Cher candidat...');
    await page.locator('button').filter({ hasText: /Envoyer/ }).click();

    // Vérifier la confirmation d'envoi
    await expect(page.locator('text=Email envoyé')).toBeVisible();
  });

  test('devrait fournir des métriques et rapports détaillés', async ({ page }) => {
    await page.locator('text=Analytics').click();

    // Vérifier la présence des métriques principales
    await expect(page.locator('text=Total Candidatures')).toBeVisible();
    await expect(page.locator('text=Taux de Conversion')).toBeVisible();
    await expect(page.locator('text=Temps Moyen Recrutement')).toBeVisible();

    // Tester les filtres de période
    await page.locator('select[name="period"]').selectOption('last30days');
    await expect(page.locator('.chart-container')).toBeVisible();

    // Exporter le rapport
    await page.locator('button').filter({ hasText: /Exporter/ }).click();
    await page.locator('select[name="format"]').selectOption('pdf');
    await page.locator('button[type="submit"]').click();

    // Vérifier le téléchargement
    await expect(page.locator('text=Rapport généré')).toBeVisible();
  });
});

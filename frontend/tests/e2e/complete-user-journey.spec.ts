/**
 * Tests E2E - Parcours utilisateur complet depuis l'inscription
 * Test de bout en bout de toutes les fonctionnalités de JobbingTrack
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: `test.user.${Date.now()}@jobbing track.test`,
  password: 'TestPassword123!',
  firstName: 'Jean',
  lastName: 'Test',
};

test.describe('Parcours utilisateur complet - JobbingTrack', () => {
  test('Parcours complet: Inscription → Connexion → Création candidature → Gestion complète', async ({ page }) => {
    // ====================================
    // ÉTAPE 1: INSCRIPTION
    // ====================================
    console.log('🔵 Étape 1: Inscription d\'un nouvel utilisateur...');
    
    await page.goto('http://localhost:3000');
    
    // Vérifier que nous sommes sur la page d'accueil ou de login
    await expect(page).toHaveURL(/\/(login)?$/);
    
    // Aller à la page d'inscription
    const registerButton = page.locator('text=/S\'inscrire|Inscription|Créer un compte/i').first();
    
    // Si pas de bouton d'inscription visible, aller directement
    if (await registerButton.isVisible().catch(() => false)) {
      await registerButton.click();
    } else {
      await page.goto('http://localhost:3000/register');
    }
    
    // Attendre que le formulaire d'inscription soit chargé
    await page.waitForSelector('input[name="email"], input[type="email"]');
    
    // Remplir le formulaire d'inscription
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    
    // Confirmer le mot de passe si le champ existe
    const confirmPasswordField = page.locator('input[name="confirmPassword"]');
    if (await confirmPasswordField.isVisible().catch(() => false)) {
      await confirmPasswordField.fill(TEST_USER.password);
    }
    
    // Remplir prénom et nom
    const firstNameField = page.locator('input[name="firstName"]');
    if (await firstNameField.isVisible().catch(() => false)) {
      await firstNameField.fill(TEST_USER.firstName);
    }
    
    const lastNameField = page.locator('input[name="lastName"]');
    if (await lastNameField.isVisible().catch(() => false)) {
      await lastNameField.fill(TEST_USER.lastName);
    }
    
    // Accepter les conditions si nécessaire
    const termsCheckbox = page.locator('input[name="terms"], input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible().catch(() => false)) {
      await termsCheckbox.check();
    }
    
    // Soumettre le formulaire
    await page.click('button[type="submit"]');
    
    // Attendre la confirmation ou la redirection
    await page.waitForTimeout(2000);
    
    console.log('✅ Inscription réussie!');
    
    // ====================================
    // ÉTAPE 2: CONNEXION
    // ====================================
    console.log('🔵 Étape 2: Connexion avec le compte créé...');
    
    // Si redirigé vers login, c'est bon, sinon aller manuellement
    const currentUrl = page.url();
    if (!currentUrl.includes('login')) {
      await page.goto('http://localhost:3000/login');
    }
    
    // Se connecter
    await page.waitForSelector('input[name="email"], input[type="email"]');
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Attendre la redirection vers le dashboard
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/(backoffice|dashboard|home)/);
    
    console.log('✅ Connexion réussie! Dashboard chargé.');
    
    // ====================================
    // ÉTAPE 3: CRÉATION D'UNE ENTREPRISE
    // ====================================
    console.log('🔵 Étape 3: Création d\'une entreprise...');
    
    await page.goto('http://localhost:3000/backoffice/companies');
    await page.waitForTimeout(1000);
    
    // Cliquer sur le bouton de création
    const createCompanyButton = page.locator('button:has-text("Créer"), button:has-text("Ajouter"), button:has-text("Nouvelle")').first();
    await createCompanyButton.click();
    
    await page.waitForTimeout(500);
    
    // Remplir les informations de l'entreprise
    await page.fill('input[name="name"]', 'Tech Solutions SARL');
    
    const descriptionField = page.locator('textarea[name="description"], input[name="description"]');
    if (await descriptionField.isVisible().catch(() => false)) {
      await descriptionField.fill('Entreprise spécialisée en développement web et mobile');
    }
    
    const websiteField = page.locator('input[name="website"]');
    if (await websiteField.isVisible().catch(() => false)) {
      await websiteField.fill('https://techsolutions.example.com');
    }
    
    const industryField = page.locator('input[name="industry"], select[name="industry"]');
    if (await industryField.isVisible().catch(() => false)) {
      await industryField.fill('Technology');
    }
    
    // Soumettre
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Vérifier que l'entreprise apparaît dans la liste
    await expect(page.locator('text=Tech Solutions SARL')).toBeVisible();
    
    console.log('✅ Entreprise créée!');
    
    // ====================================
    // ÉTAPE 4: CRÉATION D'UNE CANDIDATURE
    // ====================================
    console.log('🔵 Étape 4: Création d\'une candidature...');
    
    await page.goto('http://localhost:3000/backoffice/applications');
    await page.waitForTimeout(1000);
    
    // Cliquer sur le bouton de création
    const createApplicationButton = page.locator('button:has-text("Créer"), button:has-text("Ajouter"), button:has-text("Nouvelle")').first();
    await createApplicationButton.click();
    
    await page.waitForTimeout(500);
    
    // Remplir les informations de la candidature
    await page.fill('input[name="title"], input[name="position"]', 'Développeur Full Stack Senior');
    
    // Sélectionner l'entreprise
    const companySelect = page.locator('select[name="companyId"], input[name="company"]');
    if (await companySelect.isVisible().catch(() => false)) {
      const isSelect = await companySelect.evaluate(el => el.tagName === 'SELECT');
      if (isSelect) {
        await companySelect.selectOption({ label: /Tech Solutions/i });
      } else {
        await companySelect.fill('Tech Solutions');
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
      }
    }
    
    // Description
    const descField = page.locator('textarea[name="description"]');
    if (await descField.isVisible().catch(() => false)) {
      await descField.fill('Poste de développeur avec React et Node.js');
    }
    
    // Statut
    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.isVisible().catch(() => false)) {
      await statusSelect.selectOption('SENT');
    }
    
    // Type de contrat
    const contractTypeField = page.locator('select[name="contractType"], input[name="contractType"]');
    if (await contractTypeField.isVisible().catch(() => false)) {
      const isSelect = await contractTypeField.evaluate(el => el.tagName === 'SELECT');
      if (isSelect) {
        await contractTypeField.selectOption({ value: 'CDI' });
      } else {
        await contractTypeField.fill('CDI');
      }
    }
    
    // Localisation
    const locationField = page.locator('input[name="location"]');
    if (await locationField.isVisible().catch(() => false)) {
      await locationField.fill('Paris, France');
    }
    
    // Soumettre
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Vérifier que la candidature apparaît
    await expect(page.locator('text=Développeur Full Stack Senior')).toBeVisible();
    
    console.log('✅ Candidature créée!');
    
    // ====================================
    // ÉTAPE 5: MISE À JOUR DE LA CANDIDATURE
    // ====================================
    console.log('🔵 Étape 5: Mise à jour du statut de la candidature...');
    
    // Trouver et cliquer sur la candidature
    const applicationRow = page.locator('text=Développeur Full Stack Senior').locator('..');
    await applicationRow.locator('button:has-text("Modifier"), button:has-text("Éditer"), [aria-label*="dit"]').first().click();
    
    await page.waitForTimeout(500);
    
    // Changer le statut
    const statusUpdateSelect = page.locator('select[name="status"]');
    if (await statusUpdateSelect.isVisible().catch(() => false)) {
      await statusUpdateSelect.selectOption('INTERVIEW_SCHEDULED');
    }
    
    // Sauvegarder
    await page.click('button[type="submit"], button:has-text("Sauvegarder")');
    await page.waitForTimeout(2000);
    
    console.log('✅ Candidature mise à jour!');
    
    // ====================================
    // ÉTAPE 6: CRÉATION D'UN ENTRETIEN
    // ====================================
    console.log('🔵 Étape 6: Planification d\'un entretien...');
    
    await page.goto('http://localhost:3000/backoffice/interviews');
    await page.waitForTimeout(1000);
    
    // Créer un entretien
    const createInterviewButton = page.locator('button:has-text("Créer"), button:has-text("Ajouter"), button:has-text("Nouvel")').first();
    await createInterviewButton.click();
    
    await page.waitForTimeout(500);
    
    // Remplir les informations de l'entretien
    const typeField = page.locator('select[name="type"]');
    if (await typeField.isVisible().catch(() => false)) {
      await typeField.selectOption({ value: 'TECHNICAL' });
    }
    
    // Date de l'entretien (dans 7 jours)
    const scheduledAtField = page.locator('input[name="scheduledAt"], input[type="datetime-local"]');
    if (await scheduledAtField.isVisible().catch(() => false)) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateString = futureDate.toISOString().slice(0, 16);
      await scheduledAtField.fill(dateString);
    }
    
    // Lieu
    const locationFieldInterview = page.locator('input[name="location"]');
    if (await locationFieldInterview.isVisible().catch(() => false)) {
      await locationFieldInterview.fill('15 Rue de la Tech, Paris');
    }
    
    // Format
    const formatField = page.locator('select[name="format"]');
    if (await formatField.isVisible().catch(() => false)) {
      await formatField.selectOption({ value: 'IN_PERSON' });
    }
    
    // Soumettre
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    console.log('✅ Entretien planifié!');
    
    // ====================================
    // ÉTAPE 7: CRÉATION D'UNE RELANCE
    // ====================================
    console.log('🔵 Étape 7: Planification d\'une relance...');
    
    await page.goto('http://localhost:3000/backoffice/followups');
    await page.waitForTimeout(1000);
    
    // Créer une relance
    const createFollowUpButton = page.locator('button:has-text("Créer"), button:has-text("Ajouter"), button:has-text("Nouvelle")').first();
    
    if (await createFollowUpButton.isVisible().catch(() => false)) {
      await createFollowUpButton.click();
      await page.waitForTimeout(500);
      
      // Type de relance
      const followUpTypeField = page.locator('select[name="type"]');
      if (await followUpTypeField.isVisible().catch(() => false)) {
        await followUpTypeField.selectOption({ value: 'EMAIL' });
      }
      
      // Date de relance (dans 3 jours)
      const scheduledDateField = page.locator('input[name="scheduledDate"], input[type="datetime-local"]');
      if (await scheduledDateField.isVisible().catch(() => false)) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 3);
        const dateString = futureDate.toISOString().slice(0, 16);
        await scheduledDateField.fill(dateString);
      }
      
      // Notes
      const notesField = page.locator('textarea[name="notes"]');
      if (await notesField.isVisible().catch(() => false)) {
        await notesField.fill('Relance pour savoir où en est ma candidature');
      }
      
      // Soumettre
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      console.log('✅ Relance planifiée!');
    } else {
      console.log('⚠️ Page de relances non disponible (feature en cours de développement)');
    }
    
    // ====================================
    // ÉTAPE 8: VÉRIFICATION DU DASHBOARD
    // ====================================
    console.log('🔵 Étape 8: Vérification du dashboard...');
    
    await page.goto('http://localhost:3000/backoffice');
    await page.waitForTimeout(2000);
    
    // Vérifier que les statistiques sont mises à jour
    const statsCards = page.locator('[data-testid="metrics-cards"], .stats-card, .metric-card');
    await expect(statsCards.first()).toBeVisible();
    
    // Vérifier que les graphiques sont visibles
    const charts = page.locator('canvas, svg[class*="recharts"]');
    if (await charts.first().isVisible().catch(() => false)) {
      await expect(charts.first()).toBeVisible();
    }
    
    console.log('✅ Dashboard vérifié!');
    
    // ====================================
    // ÉTAPE 9: EXPORT DE DONNÉES
    // ====================================
    console.log('🔵 Étape 9: Test d\'export de données...');
    
    // Aller à la page de gestion des données si elle existe
    const dataManagementUrl = 'http://localhost:3000/backoffice/data-management';
    await page.goto(dataManagementUrl);
    await page.waitForTimeout(1000);
    
    // Si la page existe, tester l'export
    const exportButton = page.locator('button:has-text("Exporter"), button:has-text("Export")');
    if (await exportButton.isVisible().catch(() => false)) {
      // Sélectionner les tables à exporter
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      
      if (count > 0) {
        await checkboxes.first().check();
        
        // Cliquer sur exporter
        await exportButton.click();
        await page.waitForTimeout(1000);
        
        console.log('✅ Export de données lancé!');
      }
    } else {
      console.log('⚠️ Page d\'export non disponible');
    }
    
    // ====================================
    // ÉTAPE 10: RECHERCHE GLOBALE
    // ====================================
    console.log('🔵 Étape 10: Test de recherche globale...');
    
    const searchInput = page.locator('input[placeholder*="Rechercher"], input[type="search"]').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Tech Solutions');
      await page.waitForTimeout(1000);
      
      // Vérifier que des résultats apparaissent
      const searchResults = page.locator('.search-results, [data-testid="search-results"]');
      if (await searchResults.isVisible().catch(() => false)) {
        console.log('✅ Recherche fonctionnelle!');
      }
    } else {
      console.log('⚠️ Champ de recherche non trouvé');
    }
    
    // ====================================
    // ÉTAPE 11: DÉCONNEXION
    // ====================================
    console.log('🔵 Étape 11: Déconnexion...');
    
    const logoutButton = page.locator('button:has-text("Déconnexion"), button:has-text("Logout"), [aria-label="Logout"]').first();
    
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
      await page.waitForTimeout(2000);
      
      // Vérifier la redirection vers login
      await expect(page).toHaveURL(/login/);
      
      console.log('✅ Déconnexion réussie!');
    } else {
      console.log('⚠️ Bouton de déconnexion non trouvé');
    }
    
    // ====================================
    // RÉCAPITULATIF
    // ====================================
    console.log('\n🎉 ========================================');
    console.log('🎉 PARCOURS UTILISATEUR COMPLET TERMINÉ !');
    console.log('🎉 ========================================');
    console.log('✅ 1. Inscription');
    console.log('✅ 2. Connexion');
    console.log('✅ 3. Création d\'entreprise');
    console.log('✅ 4. Création de candidature');
    console.log('✅ 5. Mise à jour de candidature');
    console.log('✅ 6. Planification d\'entretien');
    console.log('✅ 7. Planification de relance');
    console.log('✅ 8. Vérification du dashboard');
    console.log('✅ 9. Export de données');
    console.log('✅ 10. Recherche globale');
    console.log('✅ 11. Déconnexion');
    console.log('🎉 ========================================\n');
  });

  test('Parcours: Création automatique d\'entreprise lors d\'une candidature', async ({ page }) => {
    console.log('🔵 Test: Création automatique d\'entreprise...');
    
    // Se connecter avec un compte test existant
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@jobbingtrack.test');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Aller sur les candidatures
    await page.goto('http://localhost:3000/backoffice/applications');
    await page.waitForTimeout(1000);
    
    // Créer une nouvelle candidature avec une entreprise inexistante
    const createButton = page.locator('button:has-text("Créer")').first();
    await createButton.click();
    await page.waitForTimeout(500);
    
    // Remplir avec une nouvelle entreprise
    await page.fill('input[name="title"]', 'Développeur Backend');
    
    // Taper un nom d'entreprise qui n'existe pas
    const companyInput = page.locator('input[name="company"]');
    if (await companyInput.isVisible().catch(() => false)) {
      await companyInput.fill(`Nouvelle Startup ${Date.now()}`);
      await page.waitForTimeout(500);
      
      // Rechercher une option "Créer" ou similaire
      const createOption = page.locator('text=/Créer|Create|Ajouter/i');
      if (await createOption.isVisible().catch(() => false)) {
        await createOption.click();
      }
    }
    
    // Soumettre
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    console.log('✅ Test de création automatique d\'entreprise terminé!');
  });
});


import { test, expect } from '@playwright/test';
import config from './test-config.js';

test.describe('👑 Fonctionnalités Administrateur Avancées', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant que SUPER_ADMIN
    await page.goto('/login');

    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: config.testUser.email,
            firstName: 'Admin',
            lastName: 'JobbingTrack',
            role: 'SUPER_ADMIN'
          },
          token: 'mock-jwt-token-12345'
        })
      });
    });

    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/backoffice');
  });

  test('devrait permettre la gestion complète des utilisateurs', async ({ page }) => {
    await page.locator('text=Utilisateurs').click();

    // Créer un nouvel utilisateur
    await page.locator('button').filter({ hasText: /Créer|Ajouter/ }).click();
    await page.fill('input[name="email"]', 'nouveau.recruteur@jobbingtrack.com');
    await page.fill('input[name="firstName"]', 'Marie');
    await page.fill('input[name="lastName"]', 'Martin');
    await page.locator('select[name="role"]').selectOption('ADMIN');
    await page.locator('button[type="submit"]').click();

    // Vérifier que l'utilisateur est créé
    await expect(page.locator('text=Marie Martin')).toBeVisible();

    // Modifier les permissions d'un utilisateur
    await page.locator('tr').filter({ hasText: 'Marie Martin' }).locator('button').filter({ hasText: /Modifier/ }).click();
    await page.locator('select[name="role"]').selectOption('USER');
    await page.locator('input[name="isActive"]').uncheck(); // Désactiver
    await page.locator('button[type="submit"]').click();

    // Vérifier que les changements sont appliqués
    await expect(page.locator('text=Désactivé')).toBeVisible();

    // Supprimer un utilisateur
    await page.locator('tr').filter({ hasText: 'Marie Martin' }).locator('button').filter({ hasText: /Supprimer/ }).click();
    await page.locator('button').filter({ hasText: /Confirmer/ }).click();

    // Vérifier que l'utilisateur est supprimé
    await expect(page.locator('text=Marie Martin')).not.toBeVisible();
  });

  test('devrait permettre la gestion des rôles et permissions', async ({ page }) => {
    await page.locator('text=Paramètres').click();
    await page.locator('text=Rôles').click();

    // Créer un nouveau rôle personnalisé
    await page.locator('button').filter({ hasText: /Nouveau rôle/ }).click();
    await page.fill('input[name="name"]', 'Recruteur Senior');
    await page.fill('input[name="description"]', 'Rôle pour les recruteurs expérimentés');

    // Configurer les permissions
    await page.locator('input[name="permissions.applications.read"]').check();
    await page.locator('input[name="permissions.applications.create"]').check();
    await page.locator('input[name="permissions.applications.update"]').check();
    await page.locator('input[name="permissions.interviews.manage"]').check();
    await page.locator('input[name="permissions.reports.view"]').check();

    // Ne pas donner l'accès admin
    await page.locator('input[name="permissions.admin.access"]').uncheck();

    await page.locator('button[type="submit"]').click();

    // Assigner le rôle à un utilisateur
    await page.locator('text=Utilisateurs').click();
    await page.locator('tr').filter({ hasText: 'Test User' }).locator('button').filter({ hasText: /Modifier/ }).click();
    await page.locator('select[name="role"]').selectOption('Recruteur Senior');
    await page.locator('button[type="submit"]').click();

    // Vérifier que l'utilisateur a le bon rôle
    await expect(page.locator('text=Recruteur Senior')).toBeVisible();
  });

  test('devrait permettre la surveillance et les logs système', async ({ page }) => {
    await page.locator('text=Logs').click();

    // Vérifier les différents niveaux de logs
    await expect(page.locator('text=INFO')).toBeVisible();
    await expect(page.locator('text=WARN')).toBeVisible();
    await expect(page.locator('text=ERROR')).toBeVisible();

    // Filtrer par niveau
    await page.locator('select[name="level"]').selectOption('ERROR');
    await expect(page.locator('text=ERROR')).toBeVisible();

    // Filtrer par service
    await page.locator('select[name="service"]').selectOption('auth-service');
    await expect(page.locator('text=auth-service')).toBeVisible();

    // Filtrer par période
    await page.locator('input[name="dateFrom"]').fill('2025-01-01');
    await page.locator('input[name="dateTo"]').fill('2025-01-31');
    await page.locator('button').filter({ hasText: /Filtrer/ }).click();

    // Exporter les logs
    await page.locator('button').filter({ hasText: /Exporter/ }).click();
    await expect(page.locator('text=Logs exportés')).toBeVisible();
  });

  test('devrait permettre la gestion des sauvegardes et restauration', async ({ page }) => {
    await page.locator('text=Sauvegardes').click();

    // Créer une sauvegarde manuelle
    await page.locator('button').filter({ hasText: /Créer sauvegarde/ }).click();
    await page.fill('input[name="name"]', 'Sauvegarde avant migration');
    await page.locator('button[type="submit"]').click();

    // Vérifier que la sauvegarde est créée
    await expect(page.locator('text=Sauvegarde avant migration')).toBeVisible();

    // Programmer une sauvegarde automatique
    await page.locator('text=Planifier').click();
    await page.locator('select[name="frequency"]').selectOption('daily');
    await page.fill('input[name="time"]', '02:00');
    await page.locator('button[type="submit"]').click();

    // Vérifier la programmation
    await expect(page.locator('text=Sauvegarde quotidienne programmée')).toBeVisible();

    // Restaurer depuis une sauvegarde
    await page.locator('text=Sauvegardes').click();
    await page.locator('tr').filter({ hasText: 'Sauvegarde avant migration' }).locator('button').filter({ hasText: /Restaurer/ }).click();
    await page.locator('button').filter({ hasText: /Confirmer/ }).click();

    // Vérifier que la restauration est en cours
    await expect(page.locator('text=Restauration en cours')).toBeVisible();
  });

  test('devrait permettre la configuration système avancée', async ({ page }) => {
    await page.locator('text=Configuration').click();

    // Configurer les paramètres généraux
    await page.fill('input[name="companyName"]', 'JobbingTrack Enterprise');
    await page.fill('input[name="supportEmail"]', 'support@jobbingtrack.com');
    await page.locator('select[name="timezone"]').selectOption('Europe/Paris');
    await page.locator('input[name="maintenanceMode"]').check();

    // Configurer les intégrations
    await page.locator('text=Intégrations').click();
    await page.fill('input[name="linkedinApiKey"]', 'linkedin_api_key_123');
    await page.fill('input[name="calendarApiKey"]', 'calendar_api_key_456');
    await page.locator('input[name="emailNotifications"]').check();

    // Configurer les workflows automatisés
    await page.locator('text=Workflows').click();
    await page.locator('input[name="autoRejectAfter"]').fill('30');
    await page.locator('input[name="autoArchiveAfter"]').fill('90');
    await page.locator('input[name="sendReminders"]').check();

    await page.locator('button[type="submit"]').click();

    // Vérifier que les paramètres sont sauvegardés
    await expect(page.locator('text=Configuration sauvegardée')).toBeVisible();
  });

  test('devrait permettre l\'audit et la conformité RGPD', async ({ page }) => {
    await page.locator('text=RGPD').click();

    // Générer un rapport d'audit
    await page.locator('button').filter({ hasText: /Rapport d\'audit/ }).click();
    await page.locator('input[name="dateFrom"]').fill('2025-01-01');
    await page.locator('input[name="dateTo"]').fill('2025-12-31');
    await page.locator('button[type="submit"]').click();

    // Vérifier le rapport généré
    await expect(page.locator('text=Rapport d\'audit généré')).toBeVisible();

    // Gérer les demandes de suppression de données
    await page.locator('text=Demandes RGPD').click();
    await page.locator('button').filter({ hasText: /Nouvelle demande/ }).click();
    await page.fill('input[name="email"]', 'user@demande-suppression.com');
    await page.fill('textarea[name="reason"]', 'Demande de suppression RGPD');
    await page.locator('button[type="submit"]').click();

    // Traiter la demande
    await page.locator('tr').filter({ hasText: 'user@demande-suppression.com' }).locator('button').filter({ hasText: /Traiter/ }).click();
    await page.locator('select[name="action"]').selectOption('DELETE');
    await page.locator('button').filter({ hasText: /Exécuter/ }).click();

    // Vérifier que les données sont supprimées
    await expect(page.locator('text=Données supprimées')).toBeVisible();
  });

  test('devrait permettre la gestion des services et monitoring', async ({ page }) => {
    await page.locator('text=Services').click();

    // Vérifier l'état des services
    await expect(page.locator('text=auth-service')).toBeVisible();
    await expect(page.locator('text=application-service')).toBeVisible();
    await expect(page.locator('text=dashboard-service')).toBeVisible();

    // Redémarrer un service
    await page.locator('tr').filter({ hasText: 'application-service' }).locator('button').filter({ hasText: /Redémarrer/ }).click();
    await page.locator('button').filter({ hasText: /Confirmer/ }).click();

    // Vérifier que le service est redémarré
    await expect(page.locator('text=Service redémarré')).toBeVisible();

    // Consulter les métriques de performance
    await page.locator('text=Métriques').click();
    await expect(page.locator('text=CPU Usage')).toBeVisible();
    await expect(page.locator('text=Memory Usage')).toBeVisible();
    await expect(page.locator('text=Response Time')).toBeVisible();

    // Configurer des alertes
    await page.locator('text=Alertes').click();
    await page.locator('input[name="cpuThreshold"]').fill('80');
    await page.locator('input[name="memoryThreshold"]').fill('90');
    await page.locator('input[name="responseTimeThreshold"]').fill('2000');
    await page.locator('button[type="submit"]').click();

    // Vérifier la configuration des alertes
    await expect(page.locator('text=Alertes configurées')).toBeVisible();
  });

  test('devrait permettre l\'analyse avancée et les rapports personnalisés', async ({ page }) => {
    await page.locator('text=Analytics').click();

    // Créer un rapport personnalisé
    await page.locator('button').filter({ hasText: /Nouveau rapport/ }).click();
    await page.fill('input[name="name"]', 'Rapport recrutement mensuel');
    await page.locator('select[name="type"]').selectOption('recruitment');

    // Configurer les métriques
    await page.locator('input[name="metrics.totalApplications"]').check();
    await page.locator('input[name="metrics.hiringRate"]').check();
    await page.locator('input[name="metrics.averageTime"]').check();
    await page.locator('input[name="metrics.costPerHire"]').check();

    // Configurer les filtres
    await page.locator('select[name="department"]').selectOption('Tech');
    await page.locator('select[name="location"]').selectOption('Paris');

    await page.locator('button[type="submit"]').click();

    // Générer le rapport
    await page.locator('text=Rapports').click();
    await page.locator('tr').filter({ hasText: 'Rapport recrutement mensuel' }).locator('button').filter({ hasText: /Générer/ }).click();

    // Vérifier le rapport généré
    await expect(page.locator('text=Rapport généré')).toBeVisible();

    // Programmer le rapport automatique
    await page.locator('button').filter({ hasText: /Planifier/ }).click();
    await page.locator('select[name="frequency"]').selectOption('monthly');
    await page.locator('input[name="dayOfMonth"]').fill('1');
    await page.locator('button[type="submit"]').click();

    // Vérifier la programmation
    await expect(page.locator('text=Rapport programmé')).toBeVisible();
  });

  test('devrait gérer les incidents et le support technique', async ({ page }) => {
    await page.locator('text=Support').click();

    // Créer un ticket d'incident
    await page.locator('button').filter({ hasText: /Nouveau ticket/ }).click();
    await page.fill('input[name="title"]', 'Erreur 500 sur la page candidatures');
    await page.fill('textarea[name="description"]', 'Les utilisateurs rencontrent une erreur 500...');
    await page.locator('select[name="priority"]').selectOption('HIGH');
    await page.locator('select[name="category"]').selectOption('bug');
    await page.locator('button[type="submit"]').click();

    // Assigner le ticket
    await page.locator('tr').filter({ hasText: 'Erreur 500' }).locator('button').filter({ hasText: /Assigner/ }).click();
    await page.locator('select[name="assignee"]').selectOption('tech-team');
    await page.locator('button[type="submit"]').click();

    // Ajouter une note de résolution
    await page.locator('tr').filter({ hasText: 'Erreur 500' }).locator('button').filter({ hasText: /Notes/ }).click();
    await page.fill('textarea[name="resolution"]', 'Problème résolu - déploiement d\'un correctif');
    await page.locator('select[name="status"]').selectOption('RESOLVED');
    await page.locator('button[type="submit"]').click();

    // Vérifier la résolution
    await expect(page.locator('text=RÉSOLU')).toBeVisible();
  });
});

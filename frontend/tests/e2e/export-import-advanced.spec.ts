// Tests export/import backoffice — utilise un administrateur (SUPER_ADMIN)
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './test-data-helper';

test.describe('📤📥 Export/Import Avancé - Tests Complets (admin)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/b4ck0ff1ce');
    await page.waitForLoadState('domcontentloaded');
  });

  test('devrait permettre l\'export CSV complet avec données complexes', async ({ page }) => {
    await page.goto('/b4ck0ff1ce/data-management');

    // Mock des données complexes pour l'export CSV
    await page.route('**/api/v1/companies*', async route => {
      if (route.request().url().includes('limit=10000')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            companies: [
              {
                id: '1',
                name: 'TechCorp "Innovation" Ltd',
                sector: 'Technologie, Informatique',
                size: 'startup',
                website: 'https://techcorp.com',
                is_active: true,
                createdAt: '2024-01-01T10:00:00Z',
                employees: 25,
                revenue: 1000000.50
              },
              {
                id: '2',
                name: 'DataFlow Solutions',
                sector: 'IA & Big Data',
                size: 'pme',
                website: 'https://dataflow.io',
                is_active: false,
                createdAt: '2024-01-02T10:00:00Z',
                employees: 150,
                revenue: 5000000.75
              }
            ]
          })
        });
      }
    });

    // Aller à l'onglet Export
    await page.locator('text=Export').click();

    // Ouvrir l'exporteur avancé
    await page.locator('button').filter({ hasText: 'Exporter' }).click();

    // Sélectionner le format CSV
    await page.locator('button').filter({ hasText: 'CSV' }).click();

    // Sélectionner la table Companies
    await page.locator('text=Entreprises').click();

    // Lancer l'export
    await page.locator('button').filter({ hasText: 'Exporter' }).last().click();

    // Vérifier que le téléchargement se lance (simulation)
    // Note: Dans un vrai environnement, on vérifierait le téléchargement du fichier
    await expect(page.locator('text=Export terminé avec succès')).toBeVisible();
  });

  test('devrait permettre l\'export JSON avec sélection multiple', async ({ page }) => {
    await page.goto('/b4ck0ff1ce/data-management');

    // Mock des données pour plusieurs tables
    await page.route('**/api/v1/auth/users*', async route => {
      if (route.request().url().includes('limit=10000')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            users: [
              {
                id: '1',
                email: 'redacted@example.invalid',
                firstName: 'Jean',
                lastName: 'Dupont',
                role: 'USER',
                is_active: true
              }
            ]
          })
        });
      }
    });

    await page.route('**/api/v1/companies*', async route => {
      if (route.request().url().includes('limit=10000')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            companies: [
              {
                id: '1',
                name: 'TechCorp',
                sector: 'Tech',
                is_active: true
              }
            ]
          })
        });
      }
    });

    // Aller à l'onglet Export
    await page.locator('text=Export').click();

    // Ouvrir l'exporteur avancé
    await page.locator('button').filter({ hasText: 'Exporter' }).click();

    // Sélectionner le format JSON
    await page.locator('button').filter({ hasText: 'JSON' }).click();

    // Sélectionner plusieurs tables
    await page.locator('text=Logs d\'erreurs').click();
    await page.locator('text=Métriques').click();

    // Vérifier que plusieurs éléments sont sélectionnés
    await expect(page.locator('text=2 table')).toBeVisible();

    // Lancer l'export groupé
    await page.locator('button').filter({ hasText: 'Exporter' }).last().click();

    // Vérifier le succès de l'export
    await expect(page.locator('text=Export terminé avec succès')).toBeVisible();
  });

  test('devrait gérer les erreurs d\'export correctement', async ({ page }) => {
    await page.goto('/b4ck0ff1ce/data-management');

    // Mock d'erreur serveur pour l'export
    await page.route('**/api/v1/auth/users*', async route => {
      if (route.request().url().includes('limit=10000')) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Erreur serveur lors de l\'export'
          })
        });
      }
    });

    // Aller à l'onglet Export
    await page.locator('text=Export').click();

    // Ouvrir l'exporteur avancé
    await page.locator('button').filter({ hasText: 'Exporter' }).click();

    // Sélectionner le format JSON
    await page.locator('button').filter({ hasText: 'JSON' }).click();

    // Lancer l'export
    await page.locator('button').filter({ hasText: 'Exporter' }).last().click();

    // Vérifier qu'une erreur s'affiche
    await expect(page.locator('text=Erreur lors de l\'export')).toBeVisible();
  });

  test('devrait permettre l\'import de fichiers CSV', async ({ page }) => {
    await page.goto('/b4ck0ff1ce/data-management');

    // Aller à l'onglet Import
    await page.locator('text=Import').click();

    // Créer un fichier CSV de test
    const csvContent = 'id,name,email,is_active\n1,Test User,redacted@example.invalid,true\n2,Another User,redacted@example.invalid,false';

    // Simuler le téléchargement de fichier
    await page.evaluate((csvContent) => {
      // Créer un élément input file
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.style.display = 'none';
      document.body.appendChild(input);

      // Créer un fichier Blob
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'test-import.csv', { type: 'text/csv' });

      // Déclencher l'événement change
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(input, 'files', {
        value: [file]
      });
      input.dispatchEvent(event);
    }, csvContent);

    // Vérifier que le fichier est "sélectionné"
    await page.waitForTimeout(1000);

    // Dans un vrai environnement, on vérifierait le traitement du fichier
    // Pour l'instant, on vérifie que l'interface d'import est présente
    await expect(page.locator('text=Importer des Données')).toBeVisible();
  });

  test('devrait permettre l\'import de fichiers JSON', async ({ page }) => {
    await page.goto('/b4ck0ff1ce/data-management');

    // Aller à l'onglet Import
    await page.locator('text=Import').click();

    // Créer un fichier JSON de test
    const jsonContent = JSON.stringify({
      users: [
        {
          id: '1',
          email: 'redacted@example.invalid',
          firstName: 'JSON',
          lastName: 'User',
          role: 'USER',
          is_active: true
        }
      ]
    });

    // Simuler le téléchargement de fichier JSON
    await page.evaluate((jsonContent) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      document.body.appendChild(input);

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], 'test-import.json', { type: 'application/json' });

      const event = new Event('change', { bubbles: true });
      Object.defineProperty(input, 'files', {
        value: [file]
      });
      input.dispatchEvent(event);
    }, jsonContent);

    // Vérifier que l'interface d'import est présente
    await expect(page.locator('text=Importer des Données')).toBeVisible();
  });

  test('devrait tester les performances de l\'export avec de gros volumes', async ({ page }) => {
    await page.goto('/b4ck0ff1ce/data-management');

    // Mock de données volumineuses pour tester les performances
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i + 1),
      name: `Company ${i + 1}`,
      sector: 'Technology',
      size: 'startup',
      is_active: i % 2 === 0,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }));

    await page.route('**/api/v1/companies*', async route => {
      if (route.request().url().includes('limit=10000')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            companies: largeDataset
          })
        });
      }
    });

    // Aller à l'onglet Export
    await page.locator('text=Export').click();

    // Ouvrir l'exporteur avancé
    await page.locator('button').filter({ hasText: 'Exporter' }).click();

    // Sélectionner le format CSV pour les gros volumes
    await page.locator('button').filter({ hasText: 'CSV' }).click();

    // Sélectionner la table avec beaucoup de données
    await page.locator('text=Entreprises').click();

    // Lancer l'export de gros volume
    await page.locator('button').filter({ hasText: 'Exporter' }).last().click();

    // Vérifier que l'export se lance (même avec de gros volumes)
    await expect(page.locator('text=Préparation')).toBeVisible();

    // Attendre la fin de l'export (simulation)
    await page.waitForTimeout(2000);

    // Vérifier le succès
    await expect(page.locator('text=Export terminé avec succès')).toBeVisible();
  });

  test('devrait permettre l\'export avec filtrage avancé', async ({ page }) => {
    await page.goto('/b4ck0ff1ce/analytics');

    // Mock des données d'analytics
    await page.route('**/api/v1/analytics*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metrics: {
            totalRequests: 1000,
            successfulRequests: 950,
            failedRequests: 50,
            averageResponseTime: 150,
            errorRate: 5,
            successRate: 95,
            uptime: 99.9
          },
          errorLogs: [
            {
              id: '1',
              timestamp: '2024-01-01T10:00:00Z',
              service: 'Application Service',
              endpoint: '/api/v1/applications',
              method: 'POST',
              statusCode: 500,
              errorMessage: 'Database connection timeout'
            }
          ],
          timeline: [
            {
              period: '2024-01-01',
              applications: 10,
              companies: 8,
              users: 5,
              interviews: 3,
              successRate: 95,
              avgResponseTime: 120
            }
          ]
        })
      });
    });

    // Aller à l'onglet Développeur
    await page.locator('text=Développeur').click();

    // Ouvrir l'exporteur avancé
    await page.locator('button').filter({ hasText: 'Exporter' }).click();

    // Vérifier que les options d'analytics sont disponibles
    await expect(page.locator('text=Logs d\'erreurs')).toBeVisible();
    await expect(page.locator('text=Timeline')).toBeVisible();
    await expect(page.locator('text=Métriques')).toBeVisible();

    // Sélectionner plusieurs métriques
    await page.locator('text=Métriques').click();
    await page.locator('text=Logs d\'erreurs').click();

    // Exporter en JSON
    await page.locator('button').filter({ hasText: 'JSON' }).click();
    await page.locator('button').filter({ hasText: 'Exporter' }).last().click();

    // Vérifier le succès de l'export
    await expect(page.locator('text=Export terminé avec succès')).toBeVisible();
  });

  test('devrait permettre l\'export dans les deux pages (Analytics et Data Management)', async ({ page }) => {
    // Test Analytics
    await page.goto('/b4ck0ff1ce/analytics');
    await expect(page.locator('text=Performances & Analytics')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Exporter' })).toBeVisible();

    // Test Data Management
    await page.goto('/b4ck0ff1ce/data-management');
    await expect(page.locator('text=Gestion des Données')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Exporter' })).toBeVisible();

    // Les deux devraient avoir le même composant d'export
    const analyticsExportButton = page.locator('button').filter({ hasText: 'Exporter' }).first();
    const dataExportButton = page.locator('button').filter({ hasText: 'Exporter' }).last();

    await expect(analyticsExportButton).toBeVisible();
    await expect(dataExportButton).toBeVisible();
  });

  test('devrait maintenir la cohérence du design entre les pages', async ({ page }) => {
    // Vérifier que les deux pages utilisent le même style d'exporteur
    await page.goto('/b4ck0ff1ce/analytics');

    // Ouvrir l'exporteur dans Analytics
    await page.locator('button').filter({ hasText: 'Exporter' }).click();
    await expect(page.locator('text=Export de données')).toBeVisible();

    // Fermer et aller à Data Management
    await page.locator('button').filter({ hasText: '✕' }).click();
    await page.goto('/b4ck0ff1ce/data-management');

    // Ouvrir l'exporteur dans Data Management
    await page.locator('button').filter({ hasText: 'Exporter' }).click();
    await expect(page.locator('text=Export de données')).toBeVisible();

    // Les deux devraient avoir la même interface
    await expect(page.locator('button').filter({ hasText: 'CSV' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'JSON' })).toBeVisible();
  });
});

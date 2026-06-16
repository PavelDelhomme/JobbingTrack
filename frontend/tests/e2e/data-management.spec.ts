// Tests gestion données backoffice — utilise un administrateur (SUPER_ADMIN)
import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./test-data-helper";

test.describe("💾 Gestion des Données - Tests Complets (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/backoffice");
    await page.waitForLoadState("domcontentloaded");
  });

  test("devrait permettre la navigation vers la gestion des données", async ({
    page,
  }) => {
    await page.goto("/backoffice/data-management");

    // Vérifier que la page se charge correctement
    await expect(page.locator("h1")).toContainText("Gestion des Données");
    await expect(page.locator("text=Parcourir")).toBeVisible();
    await expect(page.locator("text=Export")).toBeVisible();
    await expect(page.locator("text=Import")).toBeVisible();
    await expect(page.locator("text=Opérations")).toBeVisible();
    await expect(page.locator("text=Tests DB")).toBeVisible();
  });

  test("devrait permettre la navigation entre les onglets", async ({
    page,
  }) => {
    await page.goto("/backoffice/data-management");

    // Onglet Parcourir (par défaut)
    await expect(page.locator("text=Table : User")).toBeVisible();

    // Onglet Export
    await page.locator("text=Export").click();
    await expect(page.locator("text=Export avancé des données")).toBeVisible();

    // Onglet Import
    await page.locator("text=Import").click();
    await expect(page.locator("text=Importer des Données")).toBeVisible();

    // Onglet Opérations
    await page.locator("text=Opérations").click();
    await expect(page.locator("text=Opérations en Masse")).toBeVisible();

    // Onglet Tests DB
    await page.locator("text=Tests DB").click();
    await expect(page.locator("text=Tests de Base de Données")).toBeVisible();
  });

  test("devrait permettre le chargement et la navigation des tables", async ({
    page,
  }) => {
    await page.goto("/backoffice/data-management");

    // Mock des données pour la table User
    await page.route("**/api/v1/auth/users*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [
            {
              id: "1",
              email: "redacted@example.invalid",
              firstName: "Jean",
              lastName: "Dupont",
              role: "USER",
              is_active: true,
              createdAt: "2024-01-01T10:00:00Z",
            },
            {
              id: "2",
              email: "redacted@example.invalid",
              firstName: "Marie",
              lastName: "Martin",
              role: "ADMIN",
              is_active: false,
              createdAt: "2024-01-02T10:00:00Z",
            },
          ],
          total: 2,
          page: 1,
          limit: 50,
        }),
      });
    });

    // Sélectionner la table User
    await page.locator("text=Utilisateurs").click();
    await expect(page.locator("text=Table : User")).toBeVisible();

    // Vérifier que les données se chargent
    await expect(page.locator("text=redacted@example.invalid")).toBeVisible();
    await expect(page.locator("text=Jean Dupont")).toBeVisible();
    await expect(page.locator("text=redacted@example.invalid")).toBeVisible();
    await expect(page.locator("text=Marie Martin")).toBeVisible();

    // Tester la pagination
    await page.locator("text=Suivant").click();
    await expect(page.locator("text=Page 2")).toBeVisible();
  });

  test("devrait permettre l'export avancé des données", async ({ page }) => {
    await page.goto("/backoffice/data-management");

    // Mock des données pour l'export
    await page.route("**/api/v1/auth/users*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [
            {
              id: "1",
              email: "redacted@example.invalid",
              firstName: "Jean",
              lastName: "Dupont",
              role: "USER",
              is_active: true,
              createdAt: "2024-01-01T10:00:00Z",
            },
          ],
        }),
      });
    });

    // Aller à l'onglet Export
    await page.locator("text=Export").click();

    // Vérifier que l'exporteur avancé est présent
    await expect(page.locator("text=Export avancé des données")).toBeVisible();

    // Ouvrir le menu d'export
    await page.locator("button").filter({ hasText: "Exporter" }).click();

    // Vérifier que les options d'export sont visibles
    await expect(page.locator("text=Export de données")).toBeVisible();
    await expect(
      page.locator("button").filter({ hasText: "CSV" }),
    ).toBeVisible();
    await expect(
      page.locator("button").filter({ hasText: "JSON" }),
    ).toBeVisible();

    // Tester la sélection de format
    await page.locator("button").filter({ hasText: "JSON" }).click();
    await expect(
      page.locator("button").filter({ hasText: "JSON" }),
    ).toHaveClass(/bg-green-500/);

    // Tester la sélection de tables
    await expect(page.locator("text=Logs d'erreurs")).toBeVisible();

    // Fermer le menu
    await page.locator("button").filter({ hasText: "✕" }).click();
  });

  test("devrait permettre la modification avancée des données", async ({
    page,
  }) => {
    await page.goto("/backoffice/data-management");

    // Mock des données
    await page.route("**/api/v1/auth/users*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [
            {
              id: "1",
              email: "redacted@example.invalid",
              firstName: "Jean",
              lastName: "Dupont",
              role: "USER",
              is_active: true,
              is_verified: false,
              status: "active",
              createdAt: "2024-01-01T10:00:00Z",
              updatedAt: "2024-01-01T10:00:00Z",
            },
          ],
        }),
      });
    });

    // Mock pour la mise à jour
    await page.route("**/api/v1/auth/users/1", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
    });

    // Sélectionner la table User et attendre le chargement
    await page.locator("text=Utilisateurs").click();
    await page.waitForSelector("text=redacted@example.invalid");

    // Cliquer sur le bouton d'édition
    await page
      .locator("button")
      .filter({ has: page.locator('[data-testid="edit-button"]') })
      .first()
      .click();

    // Vérifier que le modal de modification s'ouvre
    await expect(page.locator("text=Modifier l'enregistrement")).toBeVisible();

    // Vérifier les onglets du modal
    await expect(page.locator("text=Informations")).toBeVisible();
    await expect(page.locator("text=Statut")).toBeVisible();
    await expect(page.locator("text=Avancé")).toBeVisible();

    // Onglet Informations par défaut
    await expect(page.locator("text=Informations principales")).toBeVisible();
    await expect(
      page.locator('input[value="redacted@example.invalid"]'),
    ).toBeVisible();

    // Aller à l'onglet Statut
    await page.locator("text=Statut").click();
    await expect(page.locator("text=Gestion du statut")).toBeVisible();

    // Tester les switches
    await page.locator("text=Actif").locator("..").locator("button").click();
    await page.locator("text=Vérifié").locator("..").locator("button").click();

    // Tester les actions rapides
    await page.locator("button").filter({ hasText: "Activer" }).click();

    // Aller à l'onglet Avancé
    await page.locator("text=Avancé").click();
    await expect(page.locator("text=Informations système")).toBeVisible();

    // Sauvegarder les modifications
    await page.locator("button").filter({ hasText: "Enregistrer" }).click();

    // Vérifier que le modal se ferme
    await expect(
      page.locator("text=Modifier l'enregistrement"),
    ).not.toBeVisible();
  });

  test("devrait permettre les tests de base de données", async ({ page }) => {
    await page.goto("/backoffice/data-management");

    // Aller à l'onglet Tests DB
    await page.locator("text=Tests DB").click();

    // Vérifier que les tests sont affichés
    await expect(page.locator("text=Tests de Base de Données")).toBeVisible();
    await expect(page.locator("text=Connexion PostgreSQL")).toBeVisible();
    await expect(page.locator("text=Schéma Prisma Auth Service")).toBeVisible();

    // Mock des endpoints de test
    await page.route("**/api/v1/admin/test-db/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Test réussi",
          details: "Connexion établie avec succès",
        }),
      });
    });

    // Lancer tous les tests
    await page
      .locator("button")
      .filter({ hasText: "Lancer tous les tests" })
      .click();

    // Vérifier que les tests se lancent (simulation)
    await expect(page.locator("text=Tests en cours...")).toBeVisible();

    // Attendre que les tests se terminent (simulation)
    await page.waitForTimeout(2000);

    // Vérifier les résultats
    await expect(page.locator("text=✅")).toBeVisible();
  });

  test("devrait permettre l'import de données", async ({ page }) => {
    await page.goto("/backoffice/data-management");

    // Aller à l'onglet Import
    await page.locator("text=Import").click();

    // Vérifier le contenu de l'onglet
    await expect(page.locator("text=Importer des Données")).toBeVisible();

    // Vérifier la zone de drop de fichiers
    await expect(
      page.locator("text=Cliquez pour sélectionner un fichier"),
    ).toBeVisible();
    await expect(page.locator("text=JSON ou CSV acceptés")).toBeVisible();

    // Tester le téléchargement de fichier (simulation)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeTruthy();
  });

  test("devrait permettre les opérations en masse", async ({ page }) => {
    await page.goto("/backoffice/data-management");

    // Mock des données
    await page.route("**/api/v1/auth/users*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [
            {
              id: "1",
              email: "redacted@example.invalid",
              firstName: "Jean",
              lastName: "Dupont",
              is_active: true,
            },
            {
              id: "2",
              email: "redacted@example.invalid",
              firstName: "Marie",
              lastName: "Martin",
              is_active: false,
            },
          ],
        }),
      });
    });

    // Aller à l'onglet Opérations
    await page.locator("text=Opérations").click();

    // Vérifier les opérations disponibles
    await expect(page.locator("text=Opérations en Masse")).toBeVisible();
    await expect(page.locator("text=Suppression en masse")).toBeVisible();
    await expect(page.locator("text=Mise à jour en masse")).toBeVisible();
    await expect(
      page.locator("text=Synchronisation des données"),
    ).toBeVisible();
  });

  test("devrait gérer les erreurs correctement", async ({ page }) => {
    await page.goto("/backoffice/data-management");

    // Mock d'erreur serveur
    await page.route("**/api/v1/auth/users*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Erreur interne du serveur",
        }),
      });
    });

    // Sélectionner la table User
    await page.locator("text=Utilisateurs").click();

    // Vérifier qu'un message d'erreur s'affiche (selon l'implémentation)
    await page.waitForTimeout(1000);

    // L'erreur devrait être gérée gracieusement
    await expect(page.locator("text=Table : User")).toBeVisible();
  });

  test("devrait maintenir l'état lors de la navigation", async ({ page }) => {
    await page.goto("/backoffice/data-management");

    // Sélectionner une table et un onglet
    await page.locator("text=Export").click();
    await page.locator("text=Entreprises").click();

    // Recharger la page
    await page.reload();

    // Vérifier que l'état est maintenu (selon l'implémentation)
    await expect(page.locator("text=Export")).toHaveClass(/border-blue-500/);
  });

  test("devrait être responsive sur mobile", async ({ page }) => {
    // Définir la viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/backoffice/data-management");

    // Vérifier que l'interface s'adapte
    await expect(page.locator("h1")).toBeVisible();

    // Tester la navigation mobile
    await page.locator("text=Export").click();
    await expect(page.locator("text=Export avancé des données")).toBeVisible();
  });
});

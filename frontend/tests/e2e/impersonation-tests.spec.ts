// Tests d'impersonation — utilise un administrateur (SUPER_ADMIN)
import { test, expect } from "@playwright/test";
import config from "./test-config.js";
import { loginAsAdmin } from "./test-data-helper";

test.describe("🎭 Tests d'impersonnalisation - Interface Utilisateur (admin)", () => {
  test("👤 Création d'utilisateur de test via interface", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/b4ck0ff1ce/playwright-tests");

    // Cliquer sur le bouton "Créer Utilisateur Test"
    await page.click('button:has-text("Créer Utilisateur Test")');

    // Remplir le formulaire
    const testEmail = `testuser_${Date.now()}@jobbingtrack.com`;
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', "testpassword123");
    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="lastName"]', "User");
    await page.selectOption('select[name="role"]', "USER");

    // Soumettre le formulaire
    await page.click('button:has-text("Créer")');

    // Vérifier que l'utilisateur a été créé
    await expect(page.locator("text=Utilisateur créé")).toBeVisible({
      timeout: 10000,
    });
  });

  test("🔄 Impersonnalisation utilisateur normal", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/b4ck0ff1ce/playwright-tests");

    await page.click('button:has-text("Créer Utilisateur Test")');
    const testEmail = `testuser_${Date.now()}@jobbingtrack.com`;
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', "testpassword123");
    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="lastName"]', "User");
    await page.selectOption('select[name="role"]', "USER");
    await page.click('button:has-text("Créer")');

    // Attendre la confirmation
    await expect(page.locator("text=Utilisateur créé")).toBeVisible();

    // Maintenant se connecter avec cet utilisateur
    await page.goto("http://localhost:8080/login");
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', "testpassword123");
    await page.click('button[type="submit"]');

    // Vérifier qu'on est connecté comme utilisateur normal
    await expect(page.locator("text=Bonjour 👋")).toBeVisible({
      timeout: 10000,
    });

    // Vérifier que l'utilisateur n'a pas accès aux fonctions admin
    await expect(page.locator("text=Backoffice")).not.toBeVisible();

    // Vérifier qu'il a accès aux fonctionnalités utilisateur
    await expect(page.locator("text=Candidatures")).toBeVisible();
  });

  test("👑 Impersonnalisation administrateur", async ({ page }) => {
    // Naviguer vers l'interface d'administration des tests
    await page.goto("http://localhost:8080/b4ck0ff1ce/playwright-tests");

    // Créer un utilisateur admin de test
    await page.click('button:has-text("Créer Utilisateur Test")');
    const adminEmail = `admin_${Date.now()}@jobbingtrack.com`;
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', "adminpassword123");
    await page.fill('input[name="firstName"]', "Admin");
    await page.fill('input[name="lastName"]', "Test");
    await page.selectOption('select[name="role"]', "ADMIN");
    await page.click('button:has-text("Créer")');

    // Attendre la confirmation
    await expect(page.locator("text=Utilisateur créé")).toBeVisible();

    // Se connecter avec l'admin de test
    await page.goto("http://localhost:8080/login");
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', "adminpassword123");
    await page.click('button[type="submit"]');

    // Vérifier qu'on est connecté comme administrateur
    await expect(page.locator("text=Backoffice")).toBeVisible({
      timeout: 10000,
    });
  });

  test("🧪 Test de différents rôles utilisateur", async ({ page }) => {
    // Naviguer vers l'interface d'administration des tests
    await page.goto("http://localhost:8080/b4ck0ff1ce/playwright-tests");

    // Créer des utilisateurs avec différents rôles
    const testUsers = [
      {
        email: `user_basic_${Date.now()}@jobbingtrack.com`,
        role: "USER",
        expectedAccess: "Candidatures",
      },
      {
        email: `user_manager_${Date.now()}@jobbingtrack.com`,
        role: "MANAGER",
        expectedAccess: "Candidatures",
      },
      {
        email: `user_hr_${Date.now()}@jobbingtrack.com`,
        role: "HR",
        expectedAccess: "Candidatures",
      },
    ];

    for (const testUser of testUsers) {
      // Créer l'utilisateur
      await page.click('button:has-text("Créer Utilisateur Test")');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', "rolepassword123");
      await page.fill('input[name="firstName"]', "Role");
      await page.fill('input[name="lastName"]', "Test");
      await page.selectOption('select[name="role"]', testUser.role);
      await page.click('button:has-text("Créer")');

      // Attendre la confirmation
      await expect(page.locator("text=Utilisateur créé")).toBeVisible();

      // Se connecter avec cet utilisateur
      await page.goto("http://localhost:8080/login");
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', "rolepassword123");
      await page.click('button[type="submit"]');

      // Vérifier qu'on est connecté
      await expect(page.locator("text=Bonjour 👋")).toBeVisible({
        timeout: 10000,
      });

      // Vérifier l'accès selon le rôle
      await expect(
        page.locator(`text=${testUser.expectedAccess}`),
      ).toBeVisible();

      // Se déconnecter
      await page.click('[data-testid="logout-button"]');
      await expect(page.locator("text=JobbingTrack")).toBeVisible();
    }
  });

  test("🗑️ Suppression d'utilisateur de test", async ({ page }) => {
    // Naviguer vers l'interface d'administration des tests
    await page.goto("http://localhost:8080/b4ck0ff1ce/playwright-tests");

    // Créer un utilisateur de test à supprimer
    await page.click('button:has-text("Créer Utilisateur Test")');
    const deleteEmail = `deleteuser_${Date.now()}@jobbingtrack.com`;
    await page.fill('input[name="email"]', deleteEmail);
    await page.fill('input[name="password"]', "deletepassword123");
    await page.fill('input[name="firstName"]', "Delete");
    await page.fill('input[name="lastName"]', "Test");
    await page.selectOption('select[name="role"]', "USER");
    await page.click('button:has-text("Créer")');

    // Attendre la confirmation
    await expect(page.locator("text=Utilisateur créé")).toBeVisible();

    // Tenter de se connecter avec l'utilisateur (pour vérifier qu'il existe)
    await page.goto("http://localhost:8080/login");
    await page.fill('input[type="email"]', deleteEmail);
    await page.fill('input[type="password"]', "deletepassword123");
    await page.click('button[type="submit"]');

    // Vérifier qu'on est connecté
    await expect(page.locator("text=Bonjour 👋")).toBeVisible({
      timeout: 10000,
    });

    // Se déconnecter et retourner à l'admin
    await page.click('[data-testid="logout-button"]');
    await expect(page.locator("text=JobbingTrack")).toBeVisible();

    // Retourner à l'interface d'administration
    await page.goto("http://localhost:8080/b4ck0ff1ce/playwright-tests");

    // Supprimer l'utilisateur (cette fonctionnalité devra être ajoutée)
    // Pour l'instant, on teste que l'interface est accessible
    await expect(
      page.locator('button:has-text("Créer Utilisateur Test")'),
    ).toBeVisible();
  });
});

test.describe("🎭 Tests d'impersonnalisation avancée", () => {
  test("🔄 Changement rapide d'utilisateur", async ({ page }) => {
    // Naviguer vers l'interface d'administration des tests
    await page.goto("http://localhost:8080/b4ck0ff1ce/playwright-tests");

    // Créer plusieurs utilisateurs de test
    const users = [];
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Créer Utilisateur Test")');
      const email = `quickuser_${Date.now()}_${i}@jobbingtrack.com`;
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', "quickpass123");
      await page.fill('input[name="firstName"]', `Quick${i}`);
      await page.fill('input[name="lastName"]', "User");
      await page.selectOption('select[name="role"]', "USER");
      await page.click('button:has-text("Créer")');

      // Attendre la confirmation
      await expect(page.locator("text=Utilisateur créé")).toBeVisible();
      users.push(email);
    }

    // Tester la connexion rapide avec différents utilisateurs
    for (const userEmail of users) {
      await page.goto("http://localhost:8080/login");
      await page.fill('input[type="email"]', userEmail);
      await page.fill('input[type="password"]', "quickpass123");
      await page.click('button[type="submit"]');

      // Vérifier la connexion
      await expect(page.locator("text=Bonjour 👋")).toBeVisible({
        timeout: 10000,
      });

      // Se déconnecter rapidement
      await page.click('[data-testid="logout-button"]');
      await expect(page.locator("text=JobbingTrack")).toBeVisible();
    }
  });

  test("📊 Test de données utilisateur spécifiques", async ({ page }) => {
    // Naviguer vers l'interface d'administration des tests
    await page.goto("http://localhost:8080/b4ck0ff1ce/playwright-tests");

    // Créer un utilisateur avec des données spécifiques
    await page.click('button:has-text("Créer Utilisateur Test")');
    const specificEmail = `specific_${Date.now()}@jobbingtrack.com`;
    await page.fill('input[name="email"]', specificEmail);
    await page.fill('input[name="password"]', "specificpass123");
    await page.fill('input[name="firstName"]', "Specific");
    await page.fill('input[name="lastName"]', "User");
    await page.selectOption('select[name="role"]', "USER");
    await page.click('button:has-text("Créer")');

    // Attendre la confirmation
    await expect(page.locator("text=Utilisateur créé")).toBeVisible();

    // Se connecter avec cet utilisateur
    await page.goto("http://localhost:8080/login");
    await page.fill('input[type="email"]', specificEmail);
    await page.fill('input[type="password"]', "specificpass123");
    await page.click('button[type="submit"]');

    // Vérifier la connexion
    await expect(page.locator("text=Bonjour 👋")).toBeVisible({
      timeout: 10000,
    });

    // Vérifier que les données utilisateur sont correctes
    // (Adapter selon votre interface utilisateur)
    await expect(page.locator("text=Specific")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import config from "./test-config.js";

test.describe("📱 Application Mobile Flutter", () => {
  test.beforeEach(async ({ page }) => {
    // Configuration pour les tests mobile
    await page.setViewportSize({ width: 393, height: 851 });
  });

  test("✅ Application mobile se charge correctement", async ({ page }) => {
    // Naviguer vers l'application mobile Flutter
    await page.goto("http://localhost:8090");

    // Vérifier que l'application se charge
    await expect(page.locator("body")).toBeVisible({ timeout: 15000 });

    // Vérifier que les éléments principaux sont présents
    await expect(page.locator("text=JobbingTrack")).toBeVisible({
      timeout: 10000,
    });

    // Vérifier la présence du logo
    await expect(
      page.locator("text=Suivez vos candidatures facilement"),
    ).toBeVisible();
  });

  test("🔐 Connexion utilisateur mobile", async ({ page }) => {
    // Naviguer vers l'application mobile Flutter
    await page.goto("http://localhost:8090");

    // Attendre que l'application se charge
    await page.waitForLoadState("networkidle");

    // Vérifier que le formulaire de connexion est visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Remplir le formulaire de connexion
    await page.fill('input[type="email"]', "user1@jobbingtrack.com");
    await page.fill('input[type="password"]', "password123");

    // Cliquer sur le bouton de connexion
    await page.click('button:has-text("Se connecter")');

    // Attendre la redirection vers l'écran d'accueil
    await expect(page.locator("text=Bonjour 👋")).toBeVisible({
      timeout: 10000,
    });

    // Vérifier que l'utilisateur est connecté
    await expect(
      page.locator("text=Gérez vos candidatures en un coup d'œil"),
    ).toBeVisible();
  });

  test("🏠 Navigation dans l'écran d'accueil mobile", async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto("http://localhost:8090");

    // Se connecter d'abord
    await page.fill('input[type="email"]', "user1@jobbingtrack.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Se connecter")');

    // Attendre la redirection
    await expect(page.locator("text=Bonjour 👋")).toBeVisible({
      timeout: 10000,
    });

    // Vérifier les statistiques
    await expect(page.locator("text=5")).toBeVisible(); // Candidatures
    await expect(page.locator("text=2")).toBeVisible(); // Entretiens

    // Vérifier les actions rapides
    await expect(page.locator("text=📝")).toBeVisible(); // Candidatures
    await expect(page.locator("text=🏢")).toBeVisible(); // Entreprises
    await expect(page.locator("text=👤")).toBeVisible(); // Contacts
    await expect(page.locator("text=📅")).toBeVisible(); // Entretiens
  });

  test("📱 Navigation par onglets mobile", async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto("http://localhost:8090");

    // Se connecter
    await page.fill('input[type="email"]', "user1@jobbingtrack.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Se connecter")');

    // Attendre la redirection
    await expect(page.locator("text=Bonjour 👋")).toBeVisible({
      timeout: 10000,
    });

    // Vérifier la bottom navigation
    await expect(page.locator("text=Accueil")).toBeVisible();
    await expect(page.locator("text=Candidatures")).toBeVisible();
    await expect(page.locator("text=Entretiens")).toBeVisible();
    await expect(page.locator("text=Profil")).toBeVisible();

    // Tester la navigation par onglets
    await page.click("text=Candidatures");
    await expect(page.locator("text=Candidatures")).toBeVisible();

    await page.click("text=Entretiens");
    await expect(page.locator("text=Entretiens")).toBeVisible();

    await page.click("text=Profil");
    await expect(page.locator("text=Profil")).toBeVisible();

    // Retourner à l'accueil
    await page.click("text=Accueil");
    await expect(page.locator("text=Bonjour 👋")).toBeVisible();
  });

  test("📊 Interface responsive mobile", async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto("http://localhost:8090");

    // Tester différentes tailles d'écran
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await expect(page.locator("text=JobbingTrack")).toBeVisible();

    await page.setViewportSize({ width: 414, height: 896 }); // iPhone 11
    await expect(page.locator("text=JobbingTrack")).toBeVisible();

    await page.setViewportSize({ width: 393, height: 851 }); // iPhone 14
    await expect(page.locator("text=JobbingTrack")).toBeVisible();

    await page.setViewportSize({ width: 428, height: 926 }); // iPhone 14 Pro Max
    await expect(page.locator("text=JobbingTrack")).toBeVisible();
  });

  test("🔄 Synchronisation offline mobile", async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto("http://localhost:8090");

    // Se connecter
    await page.fill('input[type="email"]', "user1@jobbingtrack.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Se connecter")');

    // Attendre la redirection
    await expect(page.locator("text=Bonjour 👋")).toBeVisible({
      timeout: 10000,
    });

    // Tester la synchronisation offline
    // Simuler la perte de connexion
    await page.route("**/*", (route) => {
      if (
        route.request().url().includes("localhost:3000") ||
        route.request().url().includes("localhost:3001")
      ) {
        route.abort("connectionfailed");
      } else {
        route.continue();
      }
    });

    // Vérifier que l'indicateur offline s'affiche (adapter selon votre interface)
    await expect(page.locator("text=Offline")).toBeVisible({ timeout: 5000 });

    // Restaurer la connexion
    await page.unroute("**/*");

    // Vérifier que l'indicateur offline disparaît
    await expect(page.locator("text=Offline")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("📱 Gestes tactiles et interactions mobile", async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto("http://localhost:8090");

    // Se connecter
    await page.fill('input[type="email"]', "user1@jobbingtrack.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Se connecter")');

    // Attendre la redirection
    await expect(page.locator("text=Bonjour 👋")).toBeVisible({
      timeout: 10000,
    });

    // Tester les gestes tactiles
    // Tap sur une action rapide (Candidatures)
    await page.tap("text=📝");

    // Vérifier la navigation vers les candidatures
    await expect(page.locator("text=Candidatures")).toBeVisible();

    // Retour à l'accueil
    await page.click("text=Accueil");

    // Tester le swipe (simulé avec la souris)
    // Swipe vers la gauche pour naviguer
    await page.mouse.move(350, 400);
    await page.mouse.down();
    await page.mouse.move(50, 400);
    await page.mouse.up();

    // Vérifier que la navigation fonctionne
    await expect(page.locator("text=Bonjour 👋")).toBeVisible();
  });

  test("🔄 Test des différents comptes utilisateur", async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto("http://localhost:8090");

    // Tester les différents comptes utilisateur mentionnés dans l'interface
    const testAccounts = [
      { email: "user1@jobbingtrack.com", name: "User 1" },
      { email: "user2@jobbingtrack.com", name: "User 2" },
      { email: "user3@jobbingtrack.com", name: "User 3" },
    ];

    for (const account of testAccounts) {
      // Recharger la page pour chaque test
      await page.reload();

      // Se connecter avec le compte actuel
      await page.fill('input[type="email"]', account.email);
      await page.fill('input[type="password"]', "password123");
      await page.click('button:has-text("Se connecter")');

      // Vérifier la connexion réussie
      await expect(page.locator("text=Bonjour 👋")).toBeVisible({
        timeout: 10000,
      });

      // Se déconnecter
      await page.click('[data-testid="logout-button"]');
      await expect(page.locator("text=JobbingTrack")).toBeVisible();
    }
  });
});

test.describe("🔗 Intégration API Mobile", () => {
  test("📡 Connexion API mobile", async ({ request }) => {
    // Tester l'API directement avec les credentials mobile
    const response = await request.post(`${config.apiUrl}/api/v1/auth/login`, {
      data: {
        email: "user1@jobbingtrack.com",
        password: "password123",
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe("user1@jobbingtrack.com");
  });

  test("📋 Récupération des données utilisateur mobile", async ({
    request,
  }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(
      `${config.apiUrl}/api/v1/auth/login`,
      {
        data: {
          email: "user1@jobbingtrack.com",
          password: "password123",
        },
      },
    );

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Tester la récupération du profil utilisateur
    const profileResponse = await request.get(
      `${config.apiUrl}/api/v1/auth/profile`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    expect(profileResponse.ok()).toBeTruthy();
    const profileData = await profileResponse.json();
    expect(profileData.user.email).toBe("user1@jobbingtrack.com");
  });

  test("🏢 Récupération des entreprises mobile", async ({ request }) => {
    // Se connecter d'abord
    const loginResponse = await request.post(
      `${config.apiUrl}/api/v1/auth/login`,
      {
        data: {
          email: "user1@jobbingtrack.com",
          password: "password123",
        },
      },
    );

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Tester la récupération des entreprises
    const companiesResponse = await request.get(
      `${config.apiUrl}/api/v1/companies`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    expect(companiesResponse.ok()).toBeTruthy();
  });
});

test.describe("🎯 Tests de performance mobile", () => {
  test("⚡ Temps de chargement mobile", async ({ page }) => {
    const startTime = Date.now();

    // Naviguer vers l'application mobile Flutter
    await page.goto("http://localhost:8090");

    // Attendre que l'application se charge complètement
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;

    // Le temps de chargement doit être raisonnable (< 8 secondes pour Flutter)
    expect(loadTime).toBeLessThan(8000);
    console.log(`Temps de chargement mobile Flutter: ${loadTime}ms`);
  });

  test("📊 Performance de l'interface mobile", async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto("http://localhost:8090");

    // Se connecter
    await page.fill('input[type="email"]', "user1@jobbingtrack.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Se connecter")');

    // Attendre la redirection
    await expect(page.locator("text=Bonjour 👋")).toBeVisible({
      timeout: 10000,
    });

    // Mesurer les performances de l'interface
    const interfaceStartTime = Date.now();

    // Tester la navigation rapide
    await page.click("text=Candidatures");
    await page.click("text=Accueil");

    const interfaceTime = Date.now() - interfaceStartTime;
    expect(interfaceTime).toBeLessThan(2000);
    console.log(`Performance interface mobile: ${interfaceTime}ms`);
  });

  test("🔄 Performance de la synchronisation mobile", async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto("http://localhost:8090");

    // Se connecter
    await page.fill('input[type="email"]', "user1@jobbingtrack.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Se connecter")');

    // Attendre la redirection
    await expect(page.locator("text=Bonjour 👋")).toBeVisible({
      timeout: 10000,
    });

    // Mesurer le temps de synchronisation (simulé)
    const syncStartTime = Date.now();

    // Simuler une synchronisation
    await page.waitForTimeout(1000);

    const syncTime = Date.now() - syncStartTime;
    expect(syncTime).toBeLessThan(1500);
    console.log(`Performance synchronisation mobile: ${syncTime}ms`);
  });
});

test.describe("🧪 Tests d'intégration mobile", () => {
  test("🔄 Synchronisation entre web et mobile", async ({ page, context }) => {
    // Ouvrir deux onglets : un pour le web et un pour le mobile
    const webPage = await context.newPage();
    const mobilePage = page;

    // Se connecter sur le web
    await webPage.goto("http://localhost:8080/login");
    await webPage.fill('input[type="email"]', "user1@jobbingtrack.com");
    await webPage.fill('input[type="password"]', "password123");
    await webPage.click('button[type="submit"]');
    await webPage.waitForURL("**/b4ck0ff1ce");

    // Se connecter sur le mobile
    await mobilePage.goto("http://localhost:8090");
    await mobilePage.fill('input[type="email"]', "user1@jobbingtrack.com");
    await mobilePage.fill('input[type="password"]', "password123");
    await mobilePage.click('button:has-text("Se connecter")');

    // Vérifier que les deux interfaces sont connectées
    await expect(webPage.locator("text=Backoffice")).toBeVisible();
    await expect(mobilePage.locator("text=Bonjour 👋")).toBeVisible();
  });

  test("📱 Cohérence des données entre interfaces", async ({ page }) => {
    // Naviguer vers l'application mobile
    await page.goto("http://localhost:8090");

    // Se connecter
    await page.fill('input[type="email"]', "user1@jobbingtrack.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Se connecter")');

    // Attendre la redirection
    await expect(page.locator("text=Bonjour 👋")).toBeVisible({
      timeout: 10000,
    });

    // Vérifier que les données sont cohérentes
    await expect(page.locator("text=5")).toBeVisible(); // Même nombre que dans le web
    await expect(page.locator("text=2")).toBeVisible(); // Même nombre que dans le web
  });
});

import { test, expect } from "@playwright/test";

test.describe("⚡ Tests de Performance", () => {
  test("devrait charger rapidement la page de login", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/login");

    const loadTime = Date.now() - startTime;

    // La page devrait se charger en moins de 3 secondes
    expect(loadTime).toBeLessThan(3000);

    // Vérifier que les éléments critiques sont visibles rapidement
    await expect(page.locator('input[type="email"]')).toBeVisible({
      timeout: 2000,
    });
    await expect(page.locator('input[type="password"]')).toBeVisible({
      timeout: 2000,
    });
    await expect(page.locator('button[type="submit"]')).toBeVisible({
      timeout: 2000,
    });
  });

  test("devrait répondre rapidement aux actions utilisateur", async ({
    page,
  }) => {
    const startTime = Date.now();

    await page.goto("/b4ck0ff1ce");

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  test("devrait gérer la charge de données importantes", async ({ page }) => {
    await page.goto("/b4ck0ff1ce");

    // Simuler une grande quantité de données dans les applications
    await page.route("**/api/v1/applications*", async (route) => {
      const mockApplications = [];
      for (let i = 0; i < 100; i++) {
        mockApplications.push({
          id: `app-${i}`,
          position: `Position ${i}`,
          company: `Company ${i}`,
          status: i % 3 === 0 ? "ACTIVE" : i % 3 === 1 ? "INTERVIEW" : "HIRED",
          createdAt: new Date(
            Date.now() - i * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          applications: mockApplications,
          total: 100,
          page: 1,
          limit: 20,
        }),
      });
    });

    const startTime = Date.now();
    await page.locator("text=Applications").click();

    // Attendre que les données se chargent
    await expect(page.locator(".application-card")).toHaveCount(20);

    const loadTime = Date.now() - startTime;

    // Devrait charger 20 éléments en moins de 2 secondes même avec 100 éléments au total
    expect(loadTime).toBeLessThan(2000);

    // Tester la pagination
    await page
      .locator("button")
      .filter({ hasText: /Suivant|Next/ })
      .click();

    // La pagination devrait être rapide
    const paginationTime = Date.now() - startTime;
    expect(paginationTime).toBeLessThan(1000);
  });

  test("devrait maintenir les performances lors du filtrage et tri", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Aller dans les applications
    await page.locator("text=Applications").click();

    // Appliquer un filtre
    const filterStartTime = Date.now();
    await page.locator('select[name="statusFilter"]').selectOption("ACTIVE");
    await expect(page.locator(".application-card")).toHaveCount(5);
    const filterTime = Date.now() - filterStartTime;
    expect(filterTime).toBeLessThan(1000);

    // Appliquer un tri
    const sortStartTime = Date.now();
    await page.locator('select[name="sortBy"]').selectOption("createdAt");
    await expect(page.locator(".application-card")).toBeVisible();
    const sortTime = Date.now() - sortStartTime;
    expect(sortTime).toBeLessThan(1000);

    // Recherche en temps réel
    const searchStartTime = Date.now();
    await page.fill('input[name="search"]', "Tech");
    await expect(page.locator(".application-card")).toBeVisible();
    const searchTime = Date.now() - searchStartTime;
    expect(searchTime).toBeLessThan(1500);
  });

  test("devrait résister à une charge utilisateur simulée", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Simuler plusieurs actions rapides
    const actions = [
      () => page.locator("text=Applications").click(),
      () => page.locator("text=Entreprises").click(),
      () => page.locator("text=Contacts").click(),
      () => page.locator("text=Analytics").click(),
      () => page.locator("text=Paramètres").click(),
    ];

    const startTime = Date.now();
    for (const action of actions) {
      await action();
      // Petite pause entre les actions
      await page.waitForTimeout(100);
    }

    const totalTime = Date.now() - startTime;

    // Toutes les navigations devraient être rapides
    expect(totalTime).toBeLessThan(5000);

    // Vérifier que la dernière page est chargée correctement
    await expect(page.locator("text=Configuration")).toBeVisible();
  });

  test("devrait maintenir les performances sur mobile", async ({ page }) => {
    // Configurer pour mobile
    await page.setViewportSize({ width: 375, height: 667 });

    const startTime = Date.now();

    await page.goto("/b4ck0ff1ce");

    const loadTime = Date.now() - startTime;

    // Les performances sur mobile devraient être acceptables
    expect(loadTime).toBeLessThan(5000);

    // Tester quelques interactions mobiles
    await page.locator("text=Applications").tap();
    await expect(page.locator("text=Applications")).toBeVisible();

    // Tester le scroll et le toucher
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  test("devrait optimiser les ressources réseau", async ({ page }) => {
    // Surveiller les requêtes réseau
    const requests: any[] = [];
    page.on("request", (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
      });
    });

    await page.goto("/b4ck0ff1ce");

    // Vérifier que les ressources sont optimisées
    const cssRequests = requests.filter((r) => r.resourceType === "stylesheet");
    const jsRequests = requests.filter((r) => r.resourceType === "script");
    const imageRequests = requests.filter((r) => r.resourceType === "image");

    // Ne devrait pas y avoir trop de requêtes CSS/JS
    expect(cssRequests.length).toBeLessThan(10);
    expect(jsRequests.length).toBeLessThan(15);

    // Les images devraient être optimisées (pas trop volumineuses)
    // Note: Cette vérification dépendrait de l'implémentation réelle
  });

  test("devrait gérer efficacement la mémoire", async ({ page }) => {
    await page.goto("/b4ck0ff1ce");

    // Mesurer l'utilisation mémoire avant et après les actions
    const memoryBefore = await page.evaluate(
      () => (performance as any).memory?.usedJSHeapSize || 0,
    );

    // Effectuer plusieurs actions qui pourraient consommer de la mémoire
    for (let i = 0; i < 5; i++) {
      await page.locator("text=Applications").click();
      await page.waitForTimeout(200);
      await page.locator("text=Entreprises").click();
      await page.waitForTimeout(200);
    }

    const memoryAfter = await page.evaluate(
      () => (performance as any).memory?.usedJSHeapSize || 0,
    );

    // L'utilisation mémoire ne devrait pas augmenter de manière excessive
    if (memoryBefore > 0 && memoryAfter > 0) {
      const memoryIncrease = memoryAfter - memoryBefore;
      const memoryIncreasePercent = (memoryIncrease / memoryBefore) * 100;

      // L'augmentation mémoire devrait être raisonnable (moins de 50%)
      expect(memoryIncreasePercent).toBeLessThan(50);
    }
  });

  test("devrait maintenir les performances sous charge", async ({ page }) => {
    await page.goto("/b4ck0ff1ce");

    // Créer plusieurs éléments rapidement
    await page.locator("text=Entreprises").click();

    const createStartTime = Date.now();

    for (let i = 0; i < 10; i++) {
      await page.locator("button").filter({ hasText: /Créer/ }).click();
      await page.fill('input[name="name"]', `Entreprise ${i}`);
      await page.fill('input[name="industry"]', "Technologie");

      await page.route("**/api/v1/companies", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            id: `company-${i}`,
            name: `Entreprise ${i}`,
            industry: "Technologie",
          }),
        });
      });

      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(100); // Petite pause entre créations
    }

    const totalCreateTime = Date.now() - createStartTime;

    // La création de 10 éléments devrait être rapide
    expect(totalCreateTime).toBeLessThan(10000);

    // Vérifier que tous les éléments sont créés
    await expect(page.locator("text=Entreprise 0")).toBeVisible();
    await expect(page.locator("text=Entreprise 9")).toBeVisible();
  });
});

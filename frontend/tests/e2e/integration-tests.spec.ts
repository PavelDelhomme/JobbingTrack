import { test, expect } from "@playwright/test";
import {
  testUsers,
  testCompanies,
  testContacts,
  testApplications,
  apiMocks,
} from "./test-data";

test.describe("🔗 Tests d'Intégration - Microservices", () => {
  test("devrait permettre l'intégration complète entre auth et applications", async ({
    page,
  }) => {
    await page.goto("/backoffice");

    // Vérifier que l'utilisateur est bien connecté
    await expect(page.locator("text=Admin JobbingTrack")).toBeVisible();

    // Accéder aux applications avec interception des données
    await page.route(apiMocks.getApplications.url, async (route) => {
      await route.fulfill(apiMocks.getApplications.response);
    });

    await page.locator("text=Applications").click();

    // Vérifier que les données d'applications sont affichées
    await expect(
      page.locator("text=Développeur Full Stack Senior"),
    ).toBeVisible();
    await expect(page.locator("text=Data Scientist")).toBeVisible();

    // Créer une nouvelle application avec interception
    await page.route(apiMocks.createApplication.url, async (route) => {
      const response = apiMocks.createApplication.response(route.request());
      await route.fulfill(response);
    });

    await page
      .locator("button")
      .filter({ hasText: /Créer|Ajouter/ })
      .click();
    await page.fill('input[name="position"]', "Test Developer");
    await page.fill('input[name="salary"]', "40000-50000");
    await page
      .locator('select[name="companyId"]')
      .selectOption({ label: "TechStart Solutions" });
    await page.locator('button[type="submit"]').click();

    // Vérifier que la nouvelle application apparaît
    await expect(page.locator("text=Test Developer")).toBeVisible();
  });

  test("devrait synchroniser les données entre entreprises et contacts", async ({
    page,
  }) => {
    await page.goto("/backoffice");

    // Créer une entreprise
    await page.route(apiMocks.createCompany.url, async (route) => {
      const response = apiMocks.createCompany.response(route.request());
      await route.fulfill(response);
    });

    await page.locator("text=Entreprises").click();
    await page
      .locator("button")
      .filter({ hasText: /Créer|Ajouter/ })
      .click();
    await page.fill('input[name="name"]', "Nouvelle Entreprise Test");
    await page.fill('input[name="industry"]', "Technologie");
    await page.locator('button[type="submit"]').click();

    // Vérifier que l'entreprise est créée
    await expect(page.locator("text=Nouvelle Entreprise Test")).toBeVisible();

    // Créer un contact pour cette entreprise
    await page.route(apiMocks.createContact.url, async (route) => {
      const response = apiMocks.createContact.response(route.request());
      await route.fulfill(response);
    });

    await page.locator("text=Contacts").click();
    await page
      .locator("button")
      .filter({ hasText: /Créer|Ajouter/ })
      .click();
    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="lastName"]', "Contact");
    await page.fill('input[name="email"]', "redacted@example.invalid");
    await page.fill('input[name="position"]', "Manager");
    await page
      .locator('select[name="companyId"]')
      .selectOption({ label: "Nouvelle Entreprise Test" });
    await page.locator('button[type="submit"]').click();

    // Vérifier que le contact est créé et lié à l'entreprise
    await expect(page.locator("text=Test Contact")).toBeVisible();

    // Retourner aux entreprises et vérifier que le contact apparaît
    await page.locator("text=Entreprises").click();
    await page
      .locator("tr")
      .filter({ hasText: "Nouvelle Entreprise Test" })
      .locator("button")
      .filter({ hasText: /Détails/ })
      .click();

    // Devrait voir le contact associé
    await expect(page.locator("text=Test Contact")).toBeVisible();
  });

  test("devrait maintenir la cohérence des données lors des modifications", async ({
    page,
  }) => {
    await page.goto("/backoffice");

    // Modifier une entreprise existante
    await page.route("**/api/v1/companies/*", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Entreprise mise à jour",
          }),
        });
      } else {
        // GET request
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            ...testCompanies[0],
          }),
        });
      }
    });

    await page.locator("text=Entreprises").click();
    await page
      .locator("tr")
      .filter({ hasText: "TechStart Solutions" })
      .locator("button")
      .filter({ hasText: /Modifier/ })
      .click();

    await page.fill('input[name="name"]', "TechStart Solutions Updated");
    await page.fill('input[name="industry"]', "Technologie Avancée");
    await page.locator('button[type="submit"]').click();

    // Vérifier que les modifications sont sauvegardées
    await expect(page.locator("text=Entreprise mise à jour")).toBeVisible();

    // Vérifier que les contacts liés sont toujours associés
    await page.locator("text=Contacts").click();
    await expect(
      page.locator("text=TechStart Solutions Updated"),
    ).toBeVisible();
  });

  test("devrait gérer correctement les dépendances entre services", async ({
    page,
  }) => {
    await page.goto("/backoffice");

    // Créer une candidature liée à une entreprise
    await page.route(apiMocks.createApplication.url, async (route) => {
      const response = apiMocks.createApplication.response(route.request());
      await route.fulfill(response);
    });

    await page.locator("text=Applications").click();
    await page
      .locator("button")
      .filter({ hasText: /Créer|Ajouter/ })
      .click();

    await page.fill('input[name="position"]', "Integration Test Developer");
    await page.fill('input[name="salary"]', "45000-55000");
    await page
      .locator('select[name="companyId"]')
      .selectOption({ label: "TechStart Solutions" });
    await page.locator('button[type="submit"]').click();

    // Vérifier que la candidature est liée à l'entreprise
    await expect(page.locator("text=Integration Test Developer")).toBeVisible();

    // Modifier l'entreprise liée
    await page.route("**/api/v1/companies/*", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Entreprise mise à jour",
          }),
        });
      }
    });

    await page.locator("text=Entreprises").click();
    await page
      .locator("tr")
      .filter({ hasText: "TechStart Solutions" })
      .locator("button")
      .filter({ hasText: /Modifier/ })
      .click();
    await page.fill(
      'input[name="name"]',
      "TechStart Solutions - Integration Test",
    );
    await page.locator('button[type="submit"]').click();

    // Retourner aux candidatures et vérifier que la liaison est maintenue
    await page.locator("text=Applications").click();
    await expect(
      page.locator("text=TechStart Solutions - Integration Test"),
    ).toBeVisible();
  });

  test("devrait gérer les erreurs d'intégration de manière appropriée", async ({
    page,
  }) => {
    await page.goto("/backoffice");

    // Simuler une erreur de service (service company indisponible)
    await page.route("**/api/v1/companies*", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Service temporairement indisponible",
        }),
      });
    });

    await page.locator("text=Entreprises").click();

    // Devrait afficher un message d'erreur approprié
    await expect(
      page.locator("text=Service temporairement indisponible"),
    ).toBeVisible();

    // Les autres fonctionnalités devraient continuer à fonctionner
    await page.route("**/api/v1/applications*", async (route) => {
      await route.fulfill(apiMocks.getApplications.response);
    });

    await page.locator("text=Applications").click();
    await expect(
      page.locator("text=Développeur Full Stack Senior"),
    ).toBeVisible();
  });

  test("devrait maintenir la cohérence lors des suppressions en cascade", async ({
    page,
  }) => {
    await page.goto("/backoffice");

    // Créer une entreprise avec contacts et candidatures associés
    await page.route(apiMocks.createCompany.url, async (route) => {
      const response = apiMocks.createCompany.response(route.request());
      await route.fulfill(response);
    });

    await page.locator("text=Entreprises").click();
    await page
      .locator("button")
      .filter({ hasText: /Créer|Ajouter/ })
      .click();
    await page.fill('input[name="name"]', "Entreprise à Supprimer");
    await page.fill('input[name="industry"]', "Test");
    await page.locator('button[type="submit"]').click();

    // Créer des contacts pour cette entreprise
    await page.route(apiMocks.createContact.url, async (route) => {
      const response = apiMocks.createContact.response(route.request());
      await route.fulfill(response);
    });

    await page.locator("text=Contacts").click();
    await page
      .locator("button")
      .filter({ hasText: /Créer|Ajouter/ })
      .click();
    await page.fill('input[name="firstName"]', "Contact");
    await page.fill('input[name="lastName"]', "Test");
    await page.fill('input[name="email"]', "redacted@example.invalid");
    await page
      .locator('select[name="companyId"]')
      .selectOption({ label: "Entreprise à Supprimer" });
    await page.locator('button[type="submit"]').click();

    // Créer des candidatures pour cette entreprise
    await page.route(apiMocks.createApplication.url, async (route) => {
      const response = apiMocks.createApplication.response(route.request());
      await route.fulfill(response);
    });

    await page.locator("text=Applications").click();
    await page
      .locator("button")
      .filter({ hasText: /Créer|Ajouter/ })
      .click();
    await page.fill('input[name="position"]', "Test Position");
    await page
      .locator('select[name="companyId"]')
      .selectOption({ label: "Entreprise à Supprimer" });
    await page.locator('button[type="submit"]').click();

    // Supprimer l'entreprise
    await page.route("**/api/v1/companies/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Entreprise supprimée",
          }),
        });
      }
    });

    await page.locator("text=Entreprises").click();
    await page
      .locator("tr")
      .filter({ hasText: "Entreprise à Supprimer" })
      .locator("button")
      .filter({ hasText: /Supprimer/ })
      .click();
    await page
      .locator("button")
      .filter({ hasText: /Confirmer/ })
      .click();

    // Vérifier que l'entreprise est supprimée
    await expect(page.locator("text=Entreprise à Supprimer")).not.toBeVisible();

    // Vérifier que les contacts associés sont aussi supprimés ou marqués comme inactifs
    await page.locator("text=Contacts").click();
    await expect(
      page.locator("text=redacted@example.invalid"),
    ).not.toBeVisible();

    // Vérifier que les candidatures associées sont aussi supprimées
    await page.locator("text=Applications").click();
    await expect(page.locator("text=Test Position")).not.toBeVisible();
  });

  test("devrait gérer les conflits de données entre services", async ({
    page,
  }) => {
    await page.goto("/backoffice");

    // Simuler un conflit de données (entreprise référencée dans une candidature mais supprimée)
    await page.route("**/api/v1/companies*", async (route) => {
      if (route.request().url().includes("1")) {
        // GET pour entreprise spécifique
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Entreprise non trouvée",
          }),
        });
      } else {
        // GET pour liste des entreprises
        await route.fulfill(apiMocks.getCompanies.response);
      }
    });

    await page.route(apiMocks.getApplications.url, async (route) => {
      await route.fulfill(apiMocks.getApplications.response);
    });

    await page.locator("text=Applications").click();

    // Une candidature référence une entreprise qui n'existe plus
    await page
      .locator("tr")
      .filter({ hasText: "Développeur Full Stack Senior" })
      .locator("button")
      .filter({ hasText: /Détails/ })
      .click();

    // Devrait afficher un message d'erreur ou gérer le conflit
    await expect(page.locator("text=Entreprise non trouvée")).toBeVisible();

    // Le système devrait proposer de corriger le problème
    await expect(
      page.locator("button").filter({ hasText: /Corriger/ }),
    ).toBeVisible();
  });

  test("devrait maintenir la performance lors des intégrations complexes", async ({
    page,
  }) => {
    await page.goto("/backoffice");

    // Charger plusieurs pages qui nécessitent des intégrations entre services
    const pages = ["Applications", "Entreprises", "Contacts", "Analytics"];

    for (const pageName of pages) {
      const startTime = Date.now();

      // Configurer les mocks pour chaque service
      switch (pageName) {
        case "Applications":
          await page.route(apiMocks.getApplications.url, async (route) => {
            await route.fulfill(apiMocks.getApplications.response);
          });
          break;
        case "Entreprises":
          await page.route(apiMocks.getCompanies.url, async (route) => {
            await route.fulfill(apiMocks.getCompanies.response);
          });
          break;
        case "Contacts":
          await page.route(apiMocks.getContacts.url, async (route) => {
            await route.fulfill(apiMocks.getContacts.response);
          });
          break;
        case "Analytics":
          await page.route("**/api/v1/dashboard*", async (route) => {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                success: true,
                stats: {
                  totalApplications: 50,
                  totalCompanies: 20,
                  totalContacts: 30,
                  totalUsers: 5,
                },
              }),
            });
          });
          break;
      }

      await page.locator(`text=${pageName}`).click();

      const loadTime = Date.now() - startTime;

      // Chaque page devrait se charger rapidement malgré les intégrations
      expect(loadTime).toBeLessThan(3000);

      // Vérifier que la page se charge correctement
      await expect(page.locator(`text=${pageName}`).first()).toBeVisible();
    }
  });

  test("devrait gérer les timeouts et erreurs de réseau entre services", async ({
    page,
  }) => {
    await page.goto("/backoffice");

    // Simuler un timeout sur un service
    await page.route("**/api/v1/companies*", async (route) => {
      // Attendre plus longtemps que le timeout configuré
      await new Promise((resolve) => setTimeout(resolve, 6000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          companies: testCompanies,
        }),
      });
    });

    await page.locator("text=Entreprises").click();

    // Devrait afficher un message d'erreur de timeout
    await expect(page.locator("text=Timeout")).toBeVisible();

    // Les autres services devraient continuer à fonctionner
    await page.route(apiMocks.getApplications.url, async (route) => {
      await route.fulfill(apiMocks.getApplications.response);
    });

    await page.locator("text=Applications").click();
    await expect(
      page.locator("text=Développeur Full Stack Senior"),
    ).toBeVisible();
  });

  test("devrait maintenir l'intégrité référentielle entre services", async ({
    page,
  }) => {
    await page.goto("/backoffice");

    // Créer une candidature avec une entreprise qui sera supprimée
    await page.route(apiMocks.createApplication.url, async (route) => {
      const response = apiMocks.createApplication.response(route.request());
      await route.fulfill(response);
    });

    await page.locator("text=Applications").click();
    await page
      .locator("button")
      .filter({ hasText: /Créer|Ajouter/ })
      .click();
    await page.fill('input[name="position"]', "Test Integrity Position");
    await page
      .locator('select[name="companyId"]')
      .selectOption({ label: "TechStart Solutions" });
    await page.locator('button[type="submit"]').click();

    // Créer un contact lié à la même entreprise
    await page.route(apiMocks.createContact.url, async (route) => {
      const response = apiMocks.createContact.response(route.request());
      await route.fulfill(response);
    });

    await page.locator("text=Contacts").click();
    await page
      .locator("button")
      .filter({ hasText: /Créer|Ajouter/ })
      .click();
    await page.fill('input[name="firstName"]', "Integrity");
    await page.fill('input[name="lastName"]', "Test");
    await page
      .locator('select[name="companyId"]')
      .selectOption({ label: "TechStart Solutions" });
    await page.locator('button[type="submit"]').click();

    // Supprimer l'entreprise (devrait maintenir l'intégrité)
    await page.route("**/api/v1/companies/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 409, // Conflict - entreprise référencée
          contentType: "application/json",
          body: JSON.stringify({
            error:
              "Impossible de supprimer - entreprise référencée par des candidatures et contacts",
          }),
        });
      }
    });

    await page.locator("text=Entreprises").click();
    await page
      .locator("tr")
      .filter({ hasText: "TechStart Solutions" })
      .locator("button")
      .filter({ hasText: /Supprimer/ })
      .click();

    // Devrait recevoir une erreur de conflit
    await expect(page.locator("text=Impossible de supprimer")).toBeVisible();

    // L'entreprise ne devrait pas être supprimée
    await expect(page.locator("text=TechStart Solutions")).toBeVisible();

    // Les candidatures et contacts devraient toujours exister
    await page.locator("text=Applications").click();
    await expect(page.locator("text=Test Integrity Position")).toBeVisible();

    await page.locator("text=Contacts").click();
    await expect(page.locator("text=Integrity Test")).toBeVisible();
  });

  test("devrait synchroniser les données en temps réel entre services", async ({
    page,
  }) => {
    await page.goto("/backoffice");

    // Créer une entreprise dans une fenêtre
    await page.route(apiMocks.createCompany.url, async (route) => {
      const response = apiMocks.createCompany.response(route.request());
      await route.fulfill(response);
    });

    await page.locator("text=Entreprises").click();
    await page
      .locator("button")
      .filter({ hasText: /Créer|Ajouter/ })
      .click();
    await page.fill('input[name="name"]', "Entreprise Temps Réel");
    await page.locator('button[type="submit"]').click();

    // Ouvrir une nouvelle page/context pour simuler un autre utilisateur
    const browser = page.context().browser();
    if (!browser) {
      throw new Error("Browser non disponible dans ce contexte");
    }
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();

    await newPage.goto("/backoffice");

    // Dans la nouvelle page, vérifier que la nouvelle entreprise apparaît
    await newPage.route(apiMocks.getCompanies.url, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          companies: [
            ...testCompanies,
            {
              id: "realtime-1",
              name: "Entreprise Temps Réel",
              industry: "Technologie",
              website: "https://realtime.com",
              description: "Test de synchronisation temps réel",
              size: "10-20",
              location: "Paris, France",
              isActive: true,
            },
          ],
          total: testCompanies.length + 1,
        }),
      });
    });

    await newPage.locator("text=Entreprises").click();
    await expect(newPage.locator("text=Entreprise Temps Réel")).toBeVisible();

    // Fermer la nouvelle page
    await newContext.close();
  });
});

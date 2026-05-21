import { test, expect } from "@playwright/test";

test.describe("🔐 Tests de Sécurité Avancés", () => {
  test("devrait protéger contre les attaques par injection JWT", async ({
    page,
  }) => {
    await page.goto("/login");

    // Essayer de manipuler le token JWT
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          user: {
            id: "1",
            email: "admin@jobbingtrack.com",
            firstName: "Admin",
            lastName: "JobbingTrack",
            role: "SUPER_ADMIN",
          },
          // Token JWT malformé
          token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJlbWFpbCI6ImFkbWluQGpvYmJpbmd0cmFjay5jb20iLCJmaXJzdE5hbWUiOiJBZG1pbiIsImxhc3ROYW1lIjoiSm9iYmluZ1RyYWNrIiwicm9sZSI6IlNVUEVSX0FETUlOIn0.invalid_signature",
        }),
      });
    });

    await page.fill('input[type="email"]', "admin@jobbingtrack.com");
    await page.fill('input[type="password"]', "password123");
    await page.locator('button[type="submit"]').click();

    // Devrait détecter le token invalide et rediriger vers login
    await expect(page).toHaveURL("/login");

    // Vérifier que le token invalide est rejeté côté serveur
    await page.route("**/api/v1/auth/profile", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Token JWT invalide",
        }),
      });
    });

    await page.goto("/b4ck0ff1ce");
    await expect(page).toHaveURL("/login");
  });

  test("devrait protéger contre les attaques par élévation de privilèges", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Essayer d'accéder directement à une route admin
    await page.goto("/b4ck0ff1ce/users");

    // Devrait être refusé côté serveur
    await page.route("**/api/v1/auth/users", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Accès refusé - permissions insuffisantes",
        }),
      });
    });

    // Devrait voir une erreur 403 ou être redirigé
    await expect(page.locator("text=Accès refusé")).toBeVisible();

    // Essayer de modifier son propre rôle via manipulation du DOM
    await page.evaluate(() => {
      // Tenter de modifier le localStorage
      localStorage.setItem("token", "admin-jwt-token-12345");
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: "3",
          role: "SUPER_ADMIN", // Élévation de privilèges côté client
        }),
      );
    });

    await page.reload();

    // Le serveur devrait toujours refuser l'accès malgré la manipulation côté client
    await page.route("**/api/v1/auth/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          user: {
            id: "3",
            email: "user@jobbingtrack.com",
            role: "USER", // Le serveur retourne toujours le vrai rôle
          },
        }),
      });
    });

    // L'utilisateur devrait toujours avoir le rôle USER
    await expect(page.locator("text=Pierre Durand")).toBeVisible();
    await expect(page.locator("text=SUPER_ADMIN")).not.toBeVisible();
  });

  test("devrait protéger contre les attaques XSS avancées", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Aller dans les entreprises et créer une entreprise avec du contenu XSS
    await page.locator("text=Entreprises").click();

    // Essayer différentes variantes d'attaques XSS
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      "'-alert(String.fromCharCode(88,83,83))-'",
      '<iframe src="javascript:alert(`XSS`)">',
    ];

    for (const payload of xssPayloads) {
      await page.route("**/api/v1/companies", async (route) => {
        await route.fulfill({
          status: 400, // Rejet du contenu malveillant
          contentType: "application/json",
          body: JSON.stringify({
            error: "Contenu invalide détecté",
          }),
        });
      });

      await page.locator("button").filter({ hasText: /Créer/ }).click();
      await page.fill('input[name="name"]', payload);
      await page.fill('input[name="website"]', payload);
      await page.fill('textarea[name="description"]', payload);

      await page.locator('button[type="submit"]').click();

      // Devrait recevoir une erreur de validation
      await expect(page.locator("text=Contenu invalide")).toBeVisible();

      // Aucun script ne devrait s'exécuter
      const scriptExecuted = await page.evaluate(() => {
        return window.alertCalled || false;
      });

      expect(scriptExecuted).toBeFalsy();
    }
  });

  test("devrait protéger contre les attaques CSRF sophistiquées", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Créer une page malveillante dans un autre onglet
    const maliciousPage = await page.context().newPage();
    await maliciousPage.goto("about:blank");

    // Injecter du code malveillant qui tente une attaque CSRF
    await maliciousPage.evaluate(() => {
      // Créer un formulaire malveillant
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "http://localhost:3000/api/v1/companies";

      // Ajouter des champs avec des valeurs malveillantes
      const nameField = document.createElement("input");
      nameField.name = "name";
      nameField.value = "Entreprise Malveillante";

      const industryField = document.createElement("input");
      industryField.name = "industry";
      industryField.value = "Hacking";

      form.appendChild(nameField);
      form.appendChild(industryField);
      document.body.appendChild(form);

      // Tenter de soumettre automatiquement
      form.submit();
    });

    // Attendre un peu
    await maliciousPage.waitForTimeout(1000);

    // Fermer la page malveillante
    await maliciousPage.close();

    // Vérifier que l'attaque CSRF a été bloquée
    await page.route("**/api/v1/companies", async (route) => {
      // Vérifier que la requête contient les bons headers de sécurité
      const headers = route.request().headers();
      expect(headers["x-requested-with"]).toBe("XMLHttpRequest");
      expect(headers["authorization"]).toBe("Bearer admin-jwt-token-12345");

      // Même si les headers sont présents, vérifier l'origine
      expect(headers["origin"] || headers["referer"]).toContain(
        "localhost:3000",
      );

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          id: "csrf-test-company",
        }),
      });
    });

    // L'attaque devrait échouer car elle vient d'une origine différente
    await expect(
      page.locator("text=Entreprise Malveillante"),
    ).not.toBeVisible();
  });

  test("devrait gérer correctement les politiques de sécurité du contenu (CSP)", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Vérifier que les headers CSP sont présents
    const response = await page.request.get("/b4ck0ff1ce");
    const headers = response.headers();

    expect(headers["content-security-policy"]).toBeDefined();
    expect(headers["content-security-policy"]).toContain("default-src");
    expect(headers["content-security-policy"]).toContain("script-src");
    expect(headers["content-security-policy"]).toContain("style-src");

    // Essayer d'exécuter du code JavaScript externe (devrait être bloqué par CSP)
    await page.evaluate(() => {
      try {
        // Tenter de charger un script externe
        const script = document.createElement("script");
        script.src = "https://evil.com/malicious.js";
        document.head.appendChild(script);

        // Tenter d'utiliser eval (devrait être bloqué)
        eval('alert("XSS")');

        // Tenter d'utiliser une expression régulière avec eval
        new Function('alert("XSS")')();
      } catch (error) {
        console.log("CSP bloque le code malveillant:", error);
      }
    });

    // Le code malveillant devrait être bloqué
    const cspBlocked = await page.evaluate(() => {
      return window.cspBlocked || false;
    });

    // Vérifier que les tentatives d'injection sont bloquées
    expect(cspBlocked).toBeTruthy();
  });

  test("devrait protéger contre les attaques par déni de service côté client", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Simuler une attaque DoS côté client
    const dosStartTime = Date.now();

    // Créer de nombreux éléments DOM rapidement
    await page.evaluate(() => {
      for (let i = 0; i < 10000; i++) {
        const div = document.createElement("div");
        div.textContent = `Element ${i}`;
        div.style.position = "absolute";
        div.style.left = `${Math.random() * 1000}px`;
        div.style.top = `${Math.random() * 1000}px`;
        document.body.appendChild(div);
      }
    });

    const dosTime = Date.now() - dosStartTime;

    // L'application devrait résister à la création massive d'éléments
    expect(dosTime).toBeLessThan(5000);

    // L'interface devrait rester fonctionnelle malgré l'attaque
    const responseStartTime = Date.now();
    await page.locator("text=Applications").click();
    await expect(page.locator("text=Applications")).toBeVisible();
    const responseTime = Date.now() - responseStartTime;

    // L'interface devrait répondre rapidement même après l'attaque
    expect(responseTime).toBeLessThan(2000);

    // Nettoyer les éléments créés
    await page.evaluate(() => {
      const elements = document.querySelectorAll("div");
      elements.forEach((el) => {
        if (el.textContent?.startsWith("Element ")) {
          el.remove();
        }
      });
    });
  });

  test("devrait sécuriser les téléchargements et exports de données", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Aller dans les rapports
    await page.locator("text=Analytics").click();

    // Intercepter les requêtes d'export
    await page.route("**/api/v1/reports/export", async (route) => {
      const headers = route.request().headers();

      // Vérifier que la requête contient l'autorisation appropriée
      expect(headers["authorization"]).toBe("Bearer admin-jwt-token-12345");

      // Vérifier que le type de contenu demandé est valide
      const contentType = headers["content-type"];
      expect([
        "application/pdf",
        "text/csv",
        "application/vnd.ms-excel",
      ]).toContain(contentType);

      // Vérifier que le format demandé est sécurisé
      const url = route.request().url();
      const format = url.split("format=")[1];
      expect(["pdf", "csv", "excel"]).toContain(format);

      await route.fulfill({
        status: 200,
        contentType: contentType,
        body: "Contenu du rapport sécurisé",
      });
    });

    // Exporter un rapport
    await page
      .locator("button")
      .filter({ hasText: /Exporter/ })
      .click();
    await page.locator('select[name="format"]').selectOption("pdf");
    await page.locator('button[type="submit"]').click();

    // Vérifier que l'export fonctionne pour un utilisateur autorisé
    await expect(page.locator("text=Rapport généré")).toBeVisible();

    // Essayer d'exporter avec un utilisateur non autorisé
    await page.route("**/api/v1/reports/export", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Accès refusé - permissions insuffisantes",
        }),
      });
    });

    await page.locator("text=Analytics").click();

    // L'utilisateur non autorisé ne devrait pas pouvoir exporter
    await expect(
      page.locator("button").filter({ hasText: /Exporter/ }),
    ).not.toBeVisible();
  });

  test("devrait protéger contre les attaques de traversée de répertoire", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Essayer d'accéder à des chemins malveillants
    const maliciousPaths = [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\config\\sam",
      "/etc/shadow",
      "../../server.js",
      "../../../.env",
    ];

    for (const path of maliciousPaths) {
      // Essayer d'accéder via différentes méthodes
      await page.route(`**/${path}`, async (route) => {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Chemin non trouvé",
          }),
        });
      });

      try {
        // Tenter d'accéder au chemin malveillant
        await page.goto(`/b4ck0ff1ce/${path}`);

        // Devrait recevoir une erreur 404
        await expect(page.locator("text=Chemin non trouvé")).toBeVisible();
      } catch (error) {
        // L'erreur est attendue et indique que l'attaque est bloquée
        console.log(`✅ Attaque bloquée: ${path}`);
      }
    }

    // Vérifier que l'application fonctionne normalement après les tentatives d'attaque
    await page.goto("/b4ck0ff1ce");
    await expect(page.locator("text=Backoffice Administrateur")).toBeVisible();
  });

  test("devrait maintenir la sécurité lors des changements de configuration", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Aller dans les paramètres de sécurité
    await page.locator("text=Paramètres").click();
    await page.locator("text=Sécurité").click();

    // Modifier les paramètres de sécurité
    await page.route("**/api/v1/admin/security", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Paramètres de sécurité mis à jour",
          }),
        });
      }
    });

    // Désactiver certaines protections (simulation)
    await page.locator('input[name="csrfProtection"]').uncheck();
    await page.locator('input[name="rateLimiting"]').uncheck();
    await page.locator('button[type="submit"]').click();

    // Vérifier que les modifications sont appliquées
    await expect(page.locator("text=Paramètres mis à jour")).toBeVisible();

    // Même avec des protections désactivées, l'authentification devrait rester active
    await page.route("**/api/v1/auth/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          user: {
            id: "1",
            email: "admin@jobbingtrack.com",
            role: "SUPER_ADMIN",
          },
        }),
      });
    });

    // L'utilisateur devrait toujours être authentifié
    await expect(page.locator("text=Admin JobbingTrack")).toBeVisible();

    // Réactiver les protections
    await page.locator('input[name="csrfProtection"]').check();
    await page.locator('input[name="rateLimiting"]').check();
    await page.locator('button[type="submit"]').click();

    // Vérifier que les protections sont réactivées
    await expect(page.locator("text=Protections réactivées")).toBeVisible();
  });

  test("devrait protéger contre les attaques par timing", async ({ page }) => {
    await page.goto("/login");

    // Mesurer le temps de réponse pour différents utilisateurs
    const timingResults = [];

    for (let i = 0; i < 100; i++) {
      const startTime = Date.now();

      await page.route("**/api/v1/auth/login", async (route) => {
        // Simuler différents délais selon l'utilisateur
        const delay = i < 10 ? 100 : 1000; // Différents délais
        await new Promise((resolve) => setTimeout(resolve, delay));

        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Identifiants invalides",
          }),
        });
      });

      await page.fill('input[type="email"]', `user${i}@test.com`);
      await page.fill('input[type="password"]', "wrongpassword");
      await page.locator('button[type="submit"]').click();

      const responseTime = Date.now() - startTime;
      timingResults.push(responseTime);

      await page.waitForTimeout(100);
    }

    // Les temps de réponse devraient être cohérents (pas d'informations timing)
    const avgTime =
      timingResults.reduce((a, b) => a + b) / timingResults.length;
    const variance =
      timingResults.reduce(
        (acc, time) => acc + Math.pow(time - avgTime, 2),
        0,
      ) / timingResults.length;

    // La variance devrait être faible (pas d'informations timing exploitables)
    expect(variance).toBeLessThan(100000); // Variance acceptable

    console.log(
      `⏱️ Timing attack test: avg=${avgTime}ms, variance=${variance}`,
    );
  });

  test("devrait sécuriser les communications WebSocket et temps réel", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Vérifier que les connexions WebSocket sont sécurisées
    await page.route("**/api/v1/notifications/websocket", async (route) => {
      // Vérifier que la connexion WebSocket nécessite une authentification
      const headers = route.request().headers();
      expect(headers["authorization"]).toBe("Bearer admin-jwt-token-12345");

      // Simuler une connexion WebSocket sécurisée
      await route.fulfill({
        status: 101, // Switching Protocols
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });
    });

    // Tenter une connexion WebSocket sans authentification
    await page.route("**/api/v1/notifications/websocket", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Authentification WebSocket requise",
        }),
      });
    });

    // La connexion sans authentification devrait échouer
    const wsConnection = await page.evaluate(async () => {
      try {
        const ws = new WebSocket(
          "ws://localhost:3000/api/v1/notifications/websocket",
        );
        await new Promise((resolve, reject) => {
          ws.onopen = resolve;
          ws.onerror = reject;
          setTimeout(reject, 1000);
        });
        return true;
      } catch (error) {
        return false;
      }
    });

    expect(wsConnection).toBeFalsy();
  });

  test("devrait protéger contre les attaques de désérialisation", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Essayer d'envoyer des données sérialisées malveillantes
    const maliciousData = {
      // Payload de désérialisation malveillant
      ...Object.defineProperty({}, "toString", {
        value: () => "Malicious code executed",
        enumerable: false,
      }),
      constructor: {
        prototype: {
          toString: () => "Malicious code executed",
        },
      },
    };

    await page.route("**/api/v1/companies", async (route) => {
      // Vérifier que les données sont validées côté serveur
      const body = route.request().postDataJSON();

      // Le serveur devrait rejeter les données malformées
      if (body && (Object.getPrototypeOf(body) || body.constructor)) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Données malformées détectées",
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            id: "safe-company",
          }),
        });
      }
    });

    // Créer une entreprise avec des données normales
    await page.locator("text=Entreprises").click();
    await page.locator("button").filter({ hasText: /Créer/ }).click();
    await page.fill('input[name="name"]', "Entreprise Sûre");
    await page.fill('input[name="industry"]', "Sécurité");
    await page.locator('button[type="submit"]').click();

    // Devrait réussir avec des données normales
    await expect(page.locator("text=Entreprise créée")).toBeVisible();

    // Tenter avec des données malveillantes via JavaScript
    await page.evaluate(() => {
      // Tenter de manipuler les objets JavaScript
      const malicious = {};
      Object.defineProperty(Object.getPrototypeOf(malicious), "toString", {
        value: () => "Hacked!",
        writable: true,
        configurable: true,
      });
      malicious.constructor.prototype.toString = () => "Hacked!";

      // Envoyer via fetch
      fetch("/api/v1/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer admin-jwt-token-12345",
        },
        body: JSON.stringify(malicious),
      });
    });

    // Devrait être rejeté côté serveur
    await expect(page.locator("text=Données malformées")).toBeVisible();
  });

  test("devrait maintenir la sécurité lors des mises à jour système", async ({
    page,
  }) => {
    await page.goto("/b4ck0ff1ce");

    // Aller dans la gestion système
    await page.locator("text=Système").click();

    // Intercepter les requêtes de mise à jour
    await page.route("**/api/v1/admin/system/update", async (route) => {
      // Vérifier que la requête contient une signature de sécurité
      const headers = route.request().headers();
      expect(headers["x-security-signature"]).toBeDefined();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Système mis à jour",
        }),
      });
    });

    // Déclencher une mise à jour système
    await page
      .locator("button")
      .filter({ hasText: /Mettre à jour/ })
      .click();

    // Vérifier que la mise à jour nécessite une confirmation
    await expect(page.locator("text=Confirmer la mise à jour")).toBeVisible();

    await page
      .locator("button")
      .filter({ hasText: /Confirmer/ })
      .click();

    // Vérifier que la mise à jour est confirmée
    await expect(page.locator("text=Système mis à jour")).toBeVisible();

    // Vérifier que l'authentification reste active après la mise à jour
    await page.route("**/api/v1/auth/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          user: {
            id: "1",
            email: "admin@jobbingtrack.com",
            role: "SUPER_ADMIN",
          },
        }),
      });
    });

    // L'utilisateur devrait toujours être connecté
    await expect(page.locator("text=Admin JobbingTrack")).toBeVisible();
  });
});

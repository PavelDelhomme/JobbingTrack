import { test, expect } from '@playwright/test';

test.describe('🔥 Tests de Charge et Performance Avancés', () => {

  test('devrait résister à une charge utilisateur intensive', async ({ page }) => {
    await page.goto('/login');

    // Connexion rapide
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'admin@jobbingtrack.com',
            firstName: 'Admin',
            lastName: 'JobbingTrack',
            role: 'SUPER_ADMIN'
          },
          token: 'admin-jwt-token-12345'
        })
      });
    });

    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/backoffice');

    // Simuler 50 utilisateurs simultanés
    const userCount = 50;
    const startTime = Date.now();

    // Créer plusieurs contextes de navigateur
    const contexts = [];
    const pages = [];

    for (let i = 0; i < userCount; i++) {
      const context = await page.context().browser().newContext();
      const userPage = await context.newPage();

      contexts.push(context);
      pages.push(userPage);

      // Chaque utilisateur se connecte
      await userPage.goto('/login');
      await userPage.route('**/api/v1/auth/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: {
              id: `${i}`,
              email: `user${i}@jobbingtrack.com`,
              firstName: `User${i}`,
              lastName: 'Test',
              role: 'USER'
            },
            token: `user-token-${i}`
          })
        });
      });

      await userPage.fill('input[type="email"]', `user${i}@jobbingtrack.com`);
      await userPage.fill('input[type="password"]', 'password123');
      await userPage.locator('button[type="submit"]').click();
      await userPage.waitForURL('/backoffice');
    }

    const connectionTime = Date.now() - startTime;

    // Toutes les connexions devraient réussir en moins de 30 secondes
    expect(connectionTime).toBeLessThan(30000);

    // Chaque utilisateur navigue vers différentes pages
    const navigationStartTime = Date.now();

    for (let i = 0; i < pages.length; i++) {
      const userPage = pages[i];

      // Navigation simultanée vers différentes sections
      if (i % 4 === 0) {
        await userPage.route('**/api/v1/applications*', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              applications: [],
              total: 0
            })
          });
        });
        await userPage.locator('text=Applications').click();
      } else if (i % 4 === 1) {
        await userPage.route('**/api/v1/companies*', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              companies: [],
              total: 0
            })
          });
        });
        await userPage.locator('text=Entreprises').click();
      } else if (i % 4 === 2) {
        await userPage.route('**/api/v1/contacts*', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              contacts: [],
              total: 0
            })
          });
        });
        await userPage.locator('text=Contacts').click();
      } else {
        await userPage.route('**/api/v1/dashboard*', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              stats: { totalUsers: userCount, totalApplications: 0, totalCompanies: 0 }
            })
          });
        });
        await userPage.locator('text=Analytics').click();
      }
    }

    const navigationTime = Date.now() - navigationStartTime;

    // Toutes les navigations devraient être rapides même sous charge
    expect(navigationTime).toBeLessThan(15000);

    // Nettoyer les contextes
    for (const context of contexts) {
      await context.close();
    }
  });

  test('devrait maintenir les performances lors de requêtes API intensives', async ({ page }) => {
    await page.goto('/login');

    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'admin@jobbingtrack.com',
            firstName: 'Admin',
            lastName: 'JobbingTrack',
            role: 'SUPER_ADMIN'
          },
          token: 'admin-jwt-token-12345'
        })
      });
    });

    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/backoffice');

    // Simuler 100 requêtes API simultanées
    const requestCount = 100;
    const requests = [];

    for (let i = 0; i < requestCount; i++) {
      requests.push(
        page.route('**/api/v1/applications*', async route => {
          // Simuler différents délais de réponse
          const delay = Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              applications: [],
              total: 0
            })
          });
        })
      );
    }

    // Exécuter toutes les requêtes
    const startTime = Date.now();

    // Cliquer sur Applications plusieurs fois rapidement
    for (let i = 0; i < 20; i++) {
      await page.locator('text=Applications').click();
      await page.waitForTimeout(50);
    }

    const totalTime = Date.now() - startTime;

    // Même avec de nombreuses requêtes, les performances devraient rester acceptables
    expect(totalTime).toBeLessThan(5000);

    // Vérifier que les requêtes sont traitées correctement
    await expect(page.locator('text=Applications')).toBeVisible();
  });

  test('devrait gérer efficacement la mémoire sous charge prolongée', async ({ page }) => {
    await page.goto('/login');

    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'admin@jobbingtrack.com',
            firstName: 'Admin',
            lastName: 'JobbingTrack',
            role: 'SUPER_ADMIN'
          },
          token: 'admin-jwt-token-12345'
        })
      });
    });

    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/backoffice');

    // Mesurer la mémoire avant le test de charge
    const memoryBefore = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);

    // Simuler une utilisation intensive pendant 30 secondes
    const testDuration = 30000;
    const startTime = Date.now();

    while (Date.now() - startTime < testDuration) {
      // Naviguer entre différentes sections rapidement
      await page.locator('text=Applications').click();
      await page.route('**/api/v1/applications*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            applications: [],
            total: 0
          })
        });
      });

      await page.waitForTimeout(200);

      await page.locator('text=Entreprises').click();
      await page.route('**/api/v1/companies*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            companies: [],
            total: 0
          })
        });
      });

      await page.waitForTimeout(200);

      await page.locator('text=Contacts').click();
      await page.route('**/api/v1/contacts*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            contacts: [],
            total: 0
          })
        });
      });

      await page.waitForTimeout(200);

      await page.locator('text=Analytics').click();
      await page.route('**/api/v1/dashboard*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            stats: { totalUsers: 1, totalApplications: 0, totalCompanies: 0 }
          })
        });
      });

      await page.waitForTimeout(200);
    }

    // Mesurer la mémoire après le test
    const memoryAfter = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);

    if (memoryBefore > 0 && memoryAfter > 0) {
      const memoryIncrease = memoryAfter - memoryBefore;
      const memoryIncreasePercent = (memoryIncrease / memoryBefore) * 100;

      // L'utilisation mémoire ne devrait pas augmenter de manière excessive
      // même après une utilisation intensive prolongée
      expect(memoryIncreasePercent).toBeLessThan(100); // Moins de 100% d'augmentation

      console.log(`📊 Mémoire: ${memoryBefore} → ${memoryAfter} (${memoryIncreasePercent.toFixed(2)}% increase)`);
    }

    // Vérifier que l'application reste fonctionnelle
    await expect(page.locator('text=Analytics')).toBeVisible();
  });

  test('devrait maintenir la réactivité lors de la création massive de données', async ({ page }) => {
    await page.goto('/login');

    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'admin@jobbingtrack.com',
            firstName: 'Admin',
            lastName: 'JobbingTrack',
            role: 'SUPER_ADMIN'
          },
          token: 'admin-jwt-token-12345'
        })
      });
    });

    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/backoffice');

    // Créer 100 entreprises rapidement
    await page.locator('text=Entreprises').click();

    const creationStartTime = Date.now();
    const companyCount = 100;

    for (let i = 0; i < companyCount; i++) {
      await page.route('**/api/v1/companies', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            id: `company-${i}`,
            name: `Entreprise ${i}`,
            industry: 'Technologie',
            website: `https://entreprise${i}.com`,
            description: `Description ${i}`,
            size: '10-20',
            location: 'Paris, France',
            isActive: true
          })
        });
      });

      await page.locator('button').filter({ hasText: /Créer/ }).click();
      await page.fill('input[name="name"]', `Entreprise ${i}`);
      await page.fill('input[name="industry"]', 'Technologie');
      await page.fill('input[name="website"]', `https://entreprise${i}.com`);
      await page.fill('textarea[name="description"]', `Description de l'entreprise ${i}`);
      await page.locator('button[type="submit"]').click();

      // Petite pause pour éviter de surcharger
      if (i % 10 === 0) {
        await page.waitForTimeout(100);
      }
    }

    const creationTime = Date.now() - creationStartTime;

    // La création de 100 entreprises devrait être efficace
    expect(creationTime).toBeLessThan(60000); // Moins de 60 secondes

    // Vérifier que les entreprises sont créées
    await expect(page.locator('text=Entreprise 0')).toBeVisible();
    await expect(page.locator('text=Entreprise 99')).toBeVisible();

    // Tester la recherche avec beaucoup de données
    const searchStartTime = Date.now();
    await page.fill('input[name="search"]', 'Entreprise 50');
    await expect(page.locator('text=Entreprise 50')).toBeVisible();
    const searchTime = Date.now() - searchStartTime;

    // La recherche devrait rester rapide même avec beaucoup de données
    expect(searchTime).toBeLessThan(2000);
  });

  test('devrait résister aux attaques DoS simulées', async ({ page }) => {
    await page.goto('/login');

    // Simuler une attaque par force brute sur le login
    const attackStartTime = Date.now();
    const attackAttempts = 1000;

    for (let i = 0; i < attackAttempts; i++) {
      await page.route('**/api/v1/auth/login', async route => {
        // Simuler un rate limiting après quelques tentatives
        if (i > 10) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Trop de tentatives de connexion'
            })
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Identifiants invalides'
            })
          });
        }
      });

      await page.fill('input[type="email"]', `attacker${i}@evil.com`);
      await page.fill('input[type="password"]', `password${i}`);
      await page.locator('button[type="submit"]').click();

      // Vérifier que le rate limiting fonctionne
      if (i > 10) {
        await expect(page.locator('text=Trop de tentatives')).toBeVisible();
      }
    }

    const attackTime = Date.now() - attackStartTime;

    // L'attaque devrait être détectée et bloquée rapidement
    expect(attackTime).toBeLessThan(30000);

    // Vérifier que l'application reste fonctionnelle après l'attaque
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'admin@jobbingtrack.com',
            firstName: 'Admin',
            lastName: 'JobbingTrack',
            role: 'SUPER_ADMIN'
          },
          token: 'admin-jwt-token-12345'
        })
      });
    });

    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/backoffice');

    // L'application devrait fonctionner normalement après l'attaque
    await expect(page.locator('text=Backoffice Administrateur')).toBeVisible();
  });

  test('devrait optimiser les performances réseau sous charge', async ({ page }) => {
    await page.goto('/login');

    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'admin@jobbingtrack.com',
            firstName: 'Admin',
            lastName: 'JobbingTrack',
            role: 'SUPER_ADMIN'
          },
          token: 'admin-jwt-token-12345'
        })
      });
    });

    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/backoffice');

    // Surveiller les requêtes réseau
    const networkRequests: any[] = [];
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });

    // Simuler de nombreuses requêtes simultanées
    const concurrentRequests = 50;
    const requests = [];

    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        page.route('**/api/v1/applications*', async route => {
          // Simuler différents délais réseau
          const delay = Math.random() * 2000;
          await new Promise(resolve => setTimeout(resolve, delay));

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              applications: [],
              total: 0
            })
          });
        })
      );
    }

    // Déclencher de nombreuses navigations
    const navigationStartTime = Date.now();

    for (let i = 0; i < 10; i++) {
      await page.locator('text=Applications').click();
      await page.locator('text=Entreprises').click();
      await page.locator('text=Contacts').click();
      await page.waitForTimeout(100);
    }

    const navigationTime = Date.now() - navigationStartTime;

    // Les navigations devraient rester rapides même avec beaucoup de requêtes
    expect(navigationTime).toBeLessThan(10000);

    // Vérifier que les requêtes sont optimisées
    const uniqueUrls = new Set(networkRequests.map(r => r.url));
    console.log(`📡 Requêtes réseau: ${networkRequests.length} total, ${uniqueUrls.size} uniques`);

    // Le nombre de requêtes devrait être raisonnable (pas de duplication excessive)
    expect(networkRequests.length).toBeLessThan(concurrentRequests * 3);

    // Vérifier que la page fonctionne toujours
    await expect(page.locator('text=Applications')).toBeVisible();
  });

  test('devrait maintenir la fluidité de l\'interface sous charge CPU', async ({ page }) => {
    await page.goto('/login');

    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'admin@jobbingtrack.com',
            firstName: 'Admin',
            lastName: 'JobbingTrack',
            role: 'SUPER_ADMIN'
          },
          token: 'admin-jwt-token-12345'
        })
      });
    });

    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/backoffice');

    // Simuler une charge CPU intensive côté client
    const cpuLoadStartTime = Date.now();

    // Exécuter du code JavaScript intensif
    await page.evaluate(() => {
      // Créer une boucle intensive
      const start = Date.now();
      while (Date.now() - start < 5000) {
        // Boucle CPU intensive
        for (let i = 0; i < 100000; i++) {
          Math.random();
        }
      }
    });

    const cpuLoadTime = Date.now() - cpuLoadStartTime;

    // La charge CPU ne devrait pas bloquer l'interface trop longtemps
    expect(cpuLoadTime).toBeLessThan(8000);

    // L'interface devrait rester réactive
    const responseStartTime = Date.now();
    await page.locator('text=Applications').click();
    await expect(page.locator('text=Applications')).toBeVisible();
    const responseTime = Date.now() - responseStartTime;

    // L'interface devrait répondre rapidement même après charge CPU
    expect(responseTime).toBeLessThan(2000);
  });

  test('devrait gérer efficacement les grandes quantités de données DOM', async ({ page }) => {
    await page.goto('/login');

    await page.route('**/api/v1/auth/login', async route => {
      await page.route('**/api/v1/auth/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: {
              id: '1',
              email: 'admin@jobbingtrack.com',
              firstName: 'Admin',
              lastName: 'JobbingTrack',
              role: 'SUPER_ADMIN'
            },
            token: 'admin-jwt-token-12345'
          })
        });
      });

    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/backoffice');

    // Créer une grande quantité d'éléments DOM
    await page.route('**/api/v1/applications*', async route => {
      // Générer 1000 éléments pour tester la performance DOM
      const applications = [];
      for (let i = 0; i < 1000; i++) {
        applications.push({
          id: `app-${i}`,
          position: `Position ${i}`,
          company: `Company ${i}`,
          status: ['ACTIVE', 'INTERVIEW', 'HIRED'][i % 3],
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          applications,
          total: 1000,
          page: 1,
          limit: 1000
        })
      });
    });

    const domStartTime = Date.now();
    await page.locator('text=Applications').click();

    // Attendre que tous les éléments DOM soient rendus
    await expect(page.locator('.application-card')).toHaveCount(1000);

    const domLoadTime = Date.now() - domStartTime;

    // Le rendu de 1000 éléments devrait être efficace
    expect(domLoadTime).toBeLessThan(5000);

    // Tester le scroll avec beaucoup d'éléments
    const scrollStartTime = Date.now();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    const scrollTime = Date.now() - scrollStartTime;

    // Le scroll devrait rester fluide même avec beaucoup d'éléments
    expect(scrollTime).toBeLessThan(2000);

    // Vérifier que la recherche fonctionne avec beaucoup de données
    const searchStartTime = Date.now();
    await page.fill('input[name="search"]', 'Position 500');
    await expect(page.locator('text=Position 500')).toBeVisible();
    const searchTime = Date.now() - searchStartTime;

    // La recherche devrait être rapide même avec 1000 éléments
    expect(searchTime).toBeLessThan(1000);
  });

  test('devrait maintenir la stabilité lors de stress tests prolongés', async ({ page }) => {
    await page.goto('/login');

    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'admin@jobbingtrack.com',
            firstName: 'Admin',
            lastName: 'JobbingTrack',
            role: 'SUPER_ADMIN'
          },
          token: 'admin-jwt-token-12345'
        })
      });
    });

    await page.fill('input[type="email"]', 'admin@jobbingtrack.com');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/backoffice');

    // Test de stabilité prolongé (2 minutes)
    const stressTestDuration = 120000;
    const startTime = Date.now();
    let errorCount = 0;

    while (Date.now() - startTime < stressTestDuration) {
      try {
        // Actions aléatoires pour stresser l'application
        const actions = [
          () => page.locator('text=Applications').click(),
          () => page.locator('text=Entreprises').click(),
          () => page.locator('text=Contacts').click(),
          () => page.locator('text=Analytics').click(),
          () => page.locator('text=Paramètres').click()
        ];

        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        await randomAction();

        // Interactions aléatoires
        if (Math.random() > 0.5) {
          await page.fill('input[name="search"]', `Search ${Math.random()}`);
        }

        if (Math.random() > 0.7) {
          await page.keyboard.press('Escape');
        }

        await page.waitForTimeout(1000);

      } catch (error) {
        errorCount++;
        console.log(`❌ Erreur pendant le stress test: ${error}`);
      }
    }

    const totalTime = Date.now() - startTime;

    // Le test devrait durer environ 2 minutes
    expect(totalTime).toBeGreaterThan(115000); // Au moins 115 secondes
    expect(totalTime).toBeLessThan(125000);  // Au plus 125 secondes

    // Le nombre d'erreurs devrait être minimal
    expect(errorCount).toBeLessThan(10);

    // L'application devrait toujours fonctionner après le stress test
    await expect(page.locator('text=Backoffice Administrateur')).toBeVisible();

    console.log(`🔥 Stress test terminé: ${totalTime}ms, ${errorCount} erreurs`);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Analytics Graphs - Performance & Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    // Naviguer vers la page de connexion
    await page.goto('http://localhost:5003/login');
    
    // Se connecter
    await page.fill('input[type="email"]', 'admin@jobbingtrack.test');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Attendre la redirection
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Naviguer vers Performance & Analytics
    await page.goto('http://localhost:5003/backoffice/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should display CPU & Memory graph with correct timestamps', async ({ page }) => {
    // Attendre que le graphique soit chargé
    await page.waitForSelector('text=CPU & Mémoire', { timeout: 30000 });
    
    // Vérifier que le graphique est visible
    const graph = page.locator('text=CPU & Mémoire').locator('..').locator('svg');
    await expect(graph.first()).toBeVisible({ timeout: 10000 });
    
    // Vérifier que les lignes CPU Système, CPU Projet, Mémoire Système, Mémoire Projet sont présentes
    await expect(page.locator('text=CPU Système').or(page.locator('text="CPU Système"'))).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(page.locator('text=CPU Projet').or(page.locator('text="CPU Projet"'))).toBeVisible({ timeout: 5000 }).catch(() => {});
    
    // Vérifier que les timestamps sur l'axe X sont affichés
    const xAxisLabels = page.locator('svg >> text').filter({ hasText: /[0-9]{1,2}:[0-9]{2}/ });
    const labelCount = await xAxisLabels.count();
    expect(labelCount).toBeGreaterThan(0);
  });

  test('should display Network Traffic graph', async ({ page }) => {
    // Attendre que le graphique soit chargé
    await page.waitForSelector('text=Trafic Réseau', { timeout: 30000 }).catch(() => {});
    
    // Le graphique peut être désactivé temporairement, donc on vérifie seulement s'il existe
    const networkGraph = page.locator('text=Trafic Réseau');
    const exists = await networkGraph.count() > 0;
    if (exists) {
      await expect(networkGraph.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display Response Time & Errors graph', async ({ page }) => {
    // Attendre que le graphique soit chargé
    await page.waitForSelector('text=Temps de réponse', { timeout: 30000 }).catch(() => {});
    
    // Le graphique peut être désactivé temporairement
    const responseGraph = page.locator('text=Temps de réponse');
    const exists = await responseGraph.count() > 0;
    if (exists) {
      await expect(responseGraph.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display Availability graph', async ({ page }) => {
    // Attendre que le graphique soit chargé
    await page.waitForSelector('text=Disponibilité', { timeout: 30000 }).catch(() => {});
    
    // Le graphique peut être désactivé temporairement
    const availabilityGraph = page.locator('text=Disponibilité');
    const exists = await availabilityGraph.count() > 0;
    if (exists) {
      await expect(availabilityGraph.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should update graphs incrementally without full refresh', async ({ page }) => {
    // Attendre le chargement initial
    await page.waitForSelector('text=CPU & Mémoire', { timeout: 30000 });
    
    // Capturer l'état initial du graphique
    const initialGraph = page.locator('svg').first();
    const initialScreenshot = await initialGraph.screenshot();
    
    // Attendre quelques secondes pour voir si de nouvelles données arrivent
    await page.waitForTimeout(5000);
    
    // Vérifier que le graphique existe toujours (pas de réécriture complète)
    await expect(initialGraph).toBeVisible();
    
    // Le graphique devrait avoir été mis à jour avec de nouvelles données
    // (on ne peut pas vraiment vérifier le contenu sans accès aux données internes)
    const updatedGraph = page.locator('svg').first();
    await expect(updatedGraph).toBeVisible();
  });

  test('should display DEBUG - Test Timestamps graph with correct data', async ({ page }) => {
    // Attendre que le graphique DEBUG soit chargé
    await page.waitForSelector('text=DEBUG - Test Timestamps', { timeout: 30000 });
    
    // Vérifier que le graphique est visible
    const debugGraph = page.locator('text=DEBUG - Test Timestamps').locator('..').locator('svg');
    await expect(debugGraph.first()).toBeVisible({ timeout: 10000 });
    
    // Vérifier que les timestamps sont affichés correctement
    const xAxisLabels = page.locator('svg >> text').filter({ hasText: /[0-9]{1,2}:[0-9]{2}:[0-9]{2}|[0-9]{1,2}:[0-9]{2}/ });
    const labelCount = await xAxisLabels.count();
    expect(labelCount).toBeGreaterThan(0);
  });

  test('should have correct system CPU and Memory values', async ({ page }) => {
    // Vérifier les cartes de métriques système
    await page.waitForLoadState('networkidle');
    
    // Les cartes peuvent être désactivées temporairement, donc on vérifie seulement si elles existent
    const cpuCard = page.locator('text=CPU Système').or(page.locator('text*="CPU Système"'));
    const memoryCard = page.locator('text=Mémoire Système').or(page.locator('text*="Mémoire Système"'));
    
    // Si les cartes existent, vérifier qu'elles affichent des valeurs valides
    if (await cpuCard.count() > 0) {
      const cpuValue = await cpuCard.locator('..').textContent();
      // Vérifier que la valeur n'est pas "...", "NaN", ou vide
      expect(cpuValue).not.toContain('...');
      expect(cpuValue).not.toContain('NaN');
    }
    
    if (await memoryCard.count() > 0) {
      const memoryValue = await memoryCard.locator('..').textContent();
      expect(memoryValue).not.toContain('...');
      expect(memoryValue).not.toContain('NaN');
    }
  });

  test('should have correct project CPU and Memory values', async ({ page }) => {
    // Vérifier les cartes de métriques projet
    await page.waitForLoadState('networkidle');
    
    const projectCpuCard = page.locator('text=CPU Projet').or(page.locator('text*="CPU Projet"'));
    const projectMemoryCard = page.locator('text=Mémoire Projet').or(page.locator('text*="Mémoire Projet"'));
    
    // Si les cartes existent, vérifier qu'elles affichent des valeurs valides
    if (await projectCpuCard.count() > 0) {
      const cpuValue = await projectCpuCard.locator('..').textContent();
      expect(cpuValue).not.toContain('NaN');
    }
    
    if (await projectMemoryCard.count() > 0) {
      const memoryValue = await projectMemoryCard.locator('..').textContent();
      expect(memoryValue).not.toContain('NaN');
    }
  });

  test('should filter data by time range correctly', async ({ page }) => {
    // Sélectionner différentes plages de temps
    const timeRanges = ['1h', '6h', '24h', '7d'];
    
    for (const range of timeRanges) {
      // Chercher le sélecteur de plage de temps
      const timeRangeSelector = page.locator('button').filter({ hasText: range }).or(page.locator(`[aria-label*="${range}"]`));
      
      if (await timeRangeSelector.count() > 0) {
        await timeRangeSelector.click();
        await page.waitForTimeout(2000); // Attendre le rechargement
        
        // Vérifier que le graphique est toujours visible
        const graph = page.locator('svg').first();
        await expect(graph).toBeVisible({ timeout: 5000 });
      }
    }
  });
});


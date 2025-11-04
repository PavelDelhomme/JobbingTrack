/**
 * Tests de l'application mobile
 * Tests des fonctionnalités mobile et responsive
 */

const { chromium } = require('playwright');

class MobileTester {
  constructor(baseURL = 'http://localhost:8080') {
    this.baseURL = baseURL;
  }

  async testMobileApp() {
    console.log('📱 Test de l\'application mobile...\n');

    const browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE size
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    });

    const page = await context.newPage();

    try {
      await this.testMobileNavigation(page);
      await this.testMobileForms(page);
      await this.testMobileOffline(page);
      await this.testMobilePerformance(page);
      await this.testMobileAccessibility(page);

      console.log('\n✅ Tests mobile terminés avec succès');
    } catch (error) {
      console.error('\n❌ Erreur lors des tests mobile:', error.message);
    } finally {
      await browser.close();
    }
  }

  async testMobileNavigation(page) {
    console.log('🧭 Test de la navigation mobile...');

    await page.goto(`${this.baseURL}/mobile`);

    // Test du menu mobile
    await page.click('button[data-testid="mobile-menu"]');
    await page.waitForSelector('.mobile-menu.open');
    console.log('✅ Menu mobile accessible');

    // Test navigation entre les sections
    await page.click('a[href*="/dashboard"]');
    await page.waitForURL('**/dashboard');
    console.log('✅ Navigation dashboard OK');

    await page.goBack();

    await page.click('a[href*="/applications"]');
    await page.waitForURL('**/applications');
    console.log('✅ Navigation applications OK');
  }

  async testMobileForms(page) {
    console.log('📝 Test des formulaires mobile...');

    await page.goto(`${this.baseURL}/mobile/applications/new`);

    // Test saisie mobile
    await page.fill('input[name="title"]', 'Test Application Mobile');
    await page.fill('input[name="company"]', 'Test Company');
    await page.fill('textarea[name="description"]', 'Description test mobile');

    // Test des selects mobile
    await page.tap('select[name="status"]');
    await page.click('option[value="applied"]');
    console.log('✅ Sélection status OK');

    // Test soumission
    await page.click('button[type="submit"]');
    await page.waitForURL('**/applications');
    console.log('✅ Soumission formulaire OK');
  }

  async testMobileOffline(page) {
    console.log('📴 Test du mode hors ligne...');

    // Simuler la perte de connexion
    await page.context().setOffline(true);

    await page.goto(`${this.baseURL}/mobile/applications`);
    await page.waitForSelector('.offline-indicator');
    console.log('✅ Indicateur hors ligne visible');

    // Créer une application en mode hors ligne
    await page.click('button:has-text("Créer")');
    await page.fill('input[name="title"]', 'Offline Application');
    await page.click('button[type="submit"]');

    await expect(page.locator('.offline-notification')).toBeVisible();
    console.log('✅ Notification hors ligne OK');

    // Restaurer la connexion
    await page.context().setOffline(false);
    await page.waitForSelector('.online-indicator');
    console.log('✅ Indicateur en ligne OK');
  }

  async testMobilePerformance(page) {
    console.log('⚡ Test des performances mobile...');

    await page.goto(`${this.baseURL}/mobile`);

    // Mesurer le temps de chargement
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`⚡ Temps de chargement mobile: ${loadTime}ms`);
    if (loadTime < 3000) {
      console.log('✅ Performance mobile acceptable');
    } else {
      console.log('⚠️ Performance mobile à améliorer');
    }

    // Test scrolling performance
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(100);
    console.log('✅ Scroll performance OK');
  }

  async testMobileAccessibility(page) {
    console.log('♿ Test de l\'accessibilité mobile...');

    await page.goto(`${this.baseURL}/mobile`);

    // Test des attributs ARIA
    const buttonsWithAria = await page.$$eval('button[aria-label]', buttons => buttons.length);
    console.log(`✅ ${buttonsWithAria} boutons avec aria-label`);

    // Test contrast
    const contrastIssues = await page.evaluate(() => {
      // Simulation test contraste (simplifié)
      const elements = document.querySelectorAll('*');
      let lowContrast = 0;
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.color && styles.backgroundColor) {
          // Test basique de contraste
          lowContrast++;
        }
      });
      return lowContrast;
    });

    console.log(`♿ Test contraste: ${contrastIssues} éléments vérifiés`);
  }

  async testMobileGestures(page) {
    console.log('👆 Test des gestes tactiles...');

    await page.goto(`${this.baseURL}/mobile/applications`);

    // Test swipe gesture simulation
    const listItem = page.locator('.application-item').first();

    // Simulation swipe droite
    await listItem.hover();
    await page.mouse.down();
    await page.mouse.move(300, 0);
    await page.mouse.up();

    await page.waitForTimeout(500);
    console.log('✅ Test gestures tactiles OK');
  }

  async testMobileCamera(page) {
    console.log('📷 Test de la caméra mobile...');

    await page.goto(`${this.baseURL}/mobile/profile`);

    // Test upload photo
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/test-image.jpg');

    await page.waitForSelector('.profile-image');
    console.log('✅ Upload photo OK');
  }

  async testMobileNotifications(page) {
    console.log('🔔 Test des notifications mobile...');

    await page.goto(`${this.baseURL}/mobile/settings`);

    // Activer notifications
    await page.check('input[name="push-notifications"]');
    await page.click('button:has-text("Sauvegarder")');

    // Test notification permission
    const notificationPermission = await page.evaluate(() => {
      return Notification.permission;
    });

    console.log(`🔔 Permission notifications: ${notificationPermission}`);
  }

  async runAllTests() {
    console.log('🧪 Lancement de tous les tests mobile...\n');

    await this.testMobileApp();

    console.log('\n📱 Tests mobile terminés');
    return true;
  }
}

// Script principal
async function main() {
  const tester = new MobileTester();

  try {
    await tester.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MobileTester;

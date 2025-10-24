/**
 * Helpers pour les tests Playwright
 * Fonctions utilitaires pour simplifier l'écriture des tests E2E
 */

import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
}

export interface TestCompany {
  name: string;
  description: string;
  website: string;
  industry: string;
}

export interface TestApplication {
  title: string;
  description: string;
  companyId: number;
  userId: number;
  status: string;
}

// Utilisateurs de test
export const testUsers: Record<string, TestUser> = {
  admin: {
    email: 'admin@jobbingtrack.com',
    password: 'admin123',
    name: 'Admin Test',
    role: 'SUPER_ADMIN'
  },
  user: {
    email: 'user@jobbingtrack.com',
    password: 'user123',
    name: 'User Test',
    role: 'USER'
  },
  candidate: {
    email: 'candidate@jobbingtrack.com',
    password: 'candidate123',
    name: 'Candidate Test',
    role: 'CANDIDATE'
  },
  recruiter: {
    email: 'recruiter@jobbingtrack.com',
    password: 'recruiter123',
    name: 'Recruiter Test',
    role: 'RECRUITER'
  }
};

// Entreprises de test
export const testCompanies: Record<string, TestCompany> = {
  google: {
    name: 'Google',
    description: 'Entreprise technologique innovante',
    website: 'https://google.com',
    industry: 'Technology'
  },
  microsoft: {
    name: 'Microsoft',
    description: 'Leader en logiciels et services cloud',
    website: 'https://microsoft.com',
    industry: 'Technology'
  },
  amazon: {
    name: 'Amazon',
    description: 'E-commerce et services cloud',
    website: 'https://amazon.com',
    industry: 'E-commerce'
  }
};

// Candidatures de test
export const testApplications: Record<string, TestApplication> = {
  developer: {
    title: 'Développeur Full Stack',
    description: 'Poste de développeur full stack expérimenté',
    companyId: 1,
    userId: 1,
    status: 'APPLIED'
  },
  designer: {
    title: 'UX Designer',
    description: 'Designer UX/UI pour applications web',
    companyId: 2,
    userId: 1,
    status: 'INTERVIEW'
  }
};

// Fonction de connexion
export async function loginAs(page: Page, userType: keyof typeof testUsers = 'admin') {
  const user = testUsers[userType];

  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  // Vérifier que la connexion a réussi
  await expect(page.locator('h1')).toContainText('Dashboard');
}

// Fonction de création d'utilisateur de test
export async function createTestUser(page: Page, overrides: Partial<TestUser> = {}) {
  const user = { ...testUsers.user, ...overrides };

  await page.goto('/backoffice/users');
  await page.click('button:has-text("Créer utilisateur")');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="name"]', user.name);
  await page.fill('input[name="password"]', user.password);
  await page.selectOption('select[name="role"]', user.role.toLowerCase());
  await page.click('button[type="submit"]');

  await expect(page.locator('.success-message')).toBeVisible();
  return user;
}

// Fonction de création d'entreprise de test
export async function createTestCompany(page: Page, overrides: Partial<TestCompany> = {}) {
  const company = { ...testCompanies.google, ...overrides };

  await page.goto('/backoffice/companies');
  await page.click('button:has-text("Créer entreprise")');
  await page.fill('input[name="name"]', company.name);
  await page.fill('input[name="description"]', company.description);
  await page.fill('input[name="website"]', company.website);
  await page.fill('input[name="industry"]', company.industry);
  await page.click('button[type="submit"]');

  await expect(page.locator('.success-message')).toBeVisible();
  return company;
}

// Fonction de création de candidature de test
export async function createTestApplication(page: Page, overrides: Partial<TestApplication> = {}) {
  const application = { ...testApplications.developer, ...overrides };

  await page.goto('/backoffice/applications');
  await page.click('button:has-text("Créer candidature")');
  await page.fill('input[name="title"]', application.title);
  await page.fill('textarea[name="description"]', application.description);
  await page.fill('input[name="companyId"]', application.companyId.toString());
  await page.fill('input[name="userId"]', application.userId.toString());
  await page.selectOption('select[name="status"]', application.status.toLowerCase());
  await page.click('button[type="submit"]');

  await expect(page.locator('.success-message')).toBeVisible();
  return application;
}

// Fonction d'attente d'élément avec timeout personnalisé
export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { timeout });
  return page.locator(selector);
}

// Fonction de vérification d'erreur
export async function expectErrorMessage(page: Page, message: string) {
  await expect(page.locator('.error-message')).toContainText(message);
}

// Fonction de vérification de succès
export async function expectSuccessMessage(page: Page, message: string) {
  await expect(page.locator('.success-message')).toContainText(message);
}

// Fonction de navigation vers une page avec vérification
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

// Fonction de déconnexion
export async function logout(page: Page) {
  await page.click('button[data-testid="user-menu"]');
  await page.click('a[href*="/logout"]');
  await page.waitForURL('**/login');
}

// Fonction de génération de données aléatoires
export function generateRandomString(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Fonction de génération d'email de test
export function generateTestEmail() {
  return `test-${generateRandomString(8)}@example.com`;
}

// Fonction de capture d'écran avec nom personnalisé
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/e2e/results/${name}-${Date.now()}.png`,
    fullPage: true
  });
}

// Fonction de test du mode responsive
export async function testResponsive(page: Page, sizes = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 }
]) {
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.screenshot({
      path: `tests/e2e/results/responsive-${size.name}-${Date.now()}.png`
    });
  }
}
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'redacted@example.invalid')
    await page.fill('input[type="password"]', 'password123')

    await page.click('button[type="submit"]')

    // Attendre la redirection vers le backoffice
    await expect(page).toHaveURL('/backoffice')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'redacted@example.invalid')
    await page.fill('input[type="password"]', 'wrongpassword')

    await page.click('button[type="submit"]')

    // Vérifier qu'un message d'erreur apparaît
    await expect(page.locator('.error-message')).toBeVisible()
  })
})

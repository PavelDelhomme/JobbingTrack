import { Page } from '@playwright/test'

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
}

export async function waitForLoading(page: Page) {
  await page.waitForSelector('.loading', { state: 'hidden' })
}

export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/${name}.png` })
}

export async function fillForm(page: Page, formData: Record<string, string>) {
  for (const [field, value] of Object.entries(formData)) {
    await page.fill(`[name="${field}"]`, value)
  }
}

export async function selectOption(page: Page, selectName: string, optionValue: string) {
  await page.selectOption(`select[name="${selectName}"]`, optionValue)
}

export async function checkCheckbox(page: Page, checkboxName: string) {
  await page.check(`input[name="${checkboxName}"]`)
}

export async function clickButton(page: Page, buttonText: string) {
  await page.click(`button:has-text("${buttonText}")`)
}

export async function waitForToast(page: Page, message: string) {
  await page.waitForSelector(`.toast:has-text("${message}")`)
}

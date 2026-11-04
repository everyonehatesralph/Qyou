import type { Page } from '@playwright/test'

/** Fixed order ids for seeded orders, so routes like /order/<id> and "my orders" can point at them. */
export const seedId = (n: number) => `00000000-0000-4000-8000-0000000${90000 + n}`

/** The dev server's staff PIN (QYOU_STAFF_PIN in playwright.config.ts). */
export const STAFF_PIN = '123456'

export async function signInStaff(page: Page) {
  await page.goto('/staff/login')
  for (const digit of STAFF_PIN) await page.getByRole('button', { name: digit, exact: true }).click()
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/staff/dashboard')
}

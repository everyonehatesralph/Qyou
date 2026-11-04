import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { STAFF_PIN } from './fixtures'

// Staff change an item's photo; a guest menu open in another tab shows it straight
// away, and "Use original photo" brings the built-in one back.

const PHOTO = readFileSync(new URL('../public/menu/club-sandwich.webp', import.meta.url))

const cardPhoto = (guest: Page) => guest.locator('#section-coffee li', { hasText: 'Caramel Macchiato' }).locator('img')

test('a staff photo change reaches the guest menu', async ({ context }) => {
  const guest = await context.newPage()
  await guest.goto('/t/1')
  await guest.getByLabel('Your name').fill('Ana')
  await guest.getByRole('button', { name: 'Start ordering' }).click()
  await expect(cardPhoto(guest)).toHaveAttribute('src', '/menu/caramel-macchiato.webp')

  const staff = await context.newPage()
  await staff.goto('/staff/login')
  for (const digit of STAFF_PIN) await staff.getByRole('button', { name: digit, exact: true }).click()
  await staff.getByRole('button', { name: 'Sign in' }).click()
  await staff.waitForURL('**/staff/dashboard')
  await staff.evaluate(() => { history.pushState({}, '', '/staff/menu'); dispatchEvent(new PopStateEvent('popstate')) })

  await staff.getByRole('button', { name: 'Edit Caramel Macchiato' }).click()
  await staff.locator('input[type=file]').setInputFiles({ name: 'new.webp', mimeType: 'image/webp', buffer: PHOTO })
  await expect(staff.getByRole('dialog').locator('img')).toHaveAttribute('src', /^data:image\//)
  await staff.getByRole('button', { name: 'Save' }).click()
  await expect(cardPhoto(guest)).toHaveAttribute('src', /^data:image\//)

  await staff.getByRole('button', { name: 'Edit Caramel Macchiato' }).click()
  await staff.getByRole('button', { name: 'Use original photo' }).click()
  await staff.getByRole('button', { name: 'Save' }).click()
  await expect(cardPhoto(guest)).toHaveAttribute('src', '/menu/caramel-macchiato.webp')

  // Anything that isn't a photo is refused with a reason
  await staff.getByRole('button', { name: 'Edit Caramel Macchiato' }).click()
  await staff.locator('input[type=file]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
  await expect(staff.getByRole('alert')).toContainText('isn’t a photo')
})

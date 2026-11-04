import { test, expect } from '@playwright/test'

// Staff can turn down an incoming order (one sent from outside the restaurant, say):
// it leaves the dashboard and the guest's order page shows it as cancelled.

test('staff reject an incoming order', async ({ context }) => {
  const guest = await context.newPage()
  await guest.goto('/t/5')
  await guest.getByLabel('Your name').fill('Ana')
  await guest.getByRole('button', { name: 'Start ordering' }).click()
  await guest.getByRole('button', { name: 'Add Cold Brew' }).first().click()
  await guest.getByRole('button', { name: /View cart/ }).click()
  await guest.getByRole('button', { name: /Checkout/ }).click()
  await guest.getByRole('radio', { name: /Dine in/ }).click()
  await guest.getByRole('button', { name: /Place order/ }).click()
  await guest.waitForURL('**/order/**')
  const orderId = guest.url().split('/order/')[1]
  await expect(guest.getByRole('heading', { name: 'Order received' })).toBeVisible()

  const staff = await context.newPage()
  await staff.goto('/staff/login')
  for (const digit of '1234') await staff.getByRole('button', { name: digit, exact: true }).click()
  await staff.getByRole('button', { name: 'Sign in' }).click()
  await staff.waitForURL('**/staff/dashboard')

  const reject = staff.getByRole('button', { name: `Reject order ${orderId}` })
  await reject.click()
  await expect(reject).toHaveCount(0)

  await expect(guest.getByRole('heading', { name: 'Order cancelled' })).toBeVisible()
})

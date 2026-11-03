import { test, expect, type Page } from '@playwright/test'
import { STAFF_PIN } from './fixtures'

// Two devices (separate browser contexts, so nothing is shared but the server):
// a guest orders at table 5, staff confirm and cook it, and the guest's tracker follows.
// Table 5 is not used by the seed or the screen checks.

async function signInStaff(page: Page) {
  await page.goto('/staff/login')
  for (const digit of STAFF_PIN) await page.getByRole('button', { name: digit, exact: true }).click()
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/staff/dashboard')
}

test('an order placed on one phone reaches staff, and status flows back', async ({ browser }) => {
  const guestDevice = await browser.newContext()
  const staffDevice = await browser.newContext()
  const guest = await guestDevice.newPage()
  const staff = await staffDevice.newPage()

  // Guest checks in, orders and lands on the tracker
  await guest.goto('/t/5')
  await guest.getByLabel('Your name').fill('Kai')
  await guest.getByRole('button', { name: 'Start ordering' }).click()
  await guest.waitForURL('**/menu')
  await guest.getByRole('button', { name: 'Add Matcha Latte' }).click()
  await guest.getByRole('button', { name: 'Add one Matcha Latte' }).click()
  await guest.getByRole('button', { name: /View cart/ }).click()
  await guest.getByRole('button', { name: /Checkout/ }).click()
  await guest.getByRole('radio', { name: /Dine in/ }).click()
  await guest.getByRole('button', { name: /Place order/ }).click()
  await guest.waitForURL(/\/order\/[0-9a-f-]{36}$/)
  await expect(guest.getByRole('heading', { name: 'Order received' })).toBeVisible()

  // Staff, on their own device, see it arrive and confirm it
  await signInStaff(staff)
  const incoming = staff.locator('article, li, div').filter({ hasText: 'Kai' }).filter({ has: staff.getByRole('button', { name: 'Confirm order' }) }).last()
  await expect(incoming).toBeVisible()
  await incoming.getByRole('button', { name: 'Confirm order' }).click()
  await expect(guest.getByRole('heading', { name: 'Order confirmed' })).toBeVisible()

  // Kitchen moves it along; each step shows up on the guest's phone
  await staff.goto('/staff/kitchen')
  const ticket = staff.getByRole('article', { name: /^Table 5,/ })
  await ticket.getByRole('button', { name: 'Start preparing' }).click()
  await expect(guest.getByRole('heading', { name: 'Being prepared' })).toBeVisible()
  await ticket.getByRole('button', { name: 'Mark ready' }).click()
  await expect(guest.getByRole('heading', { name: 'Ready for you' })).toBeVisible()
  await ticket.getByRole('button', { name: 'Mark served' }).click()
  await expect(guest.getByRole('heading', { name: 'Enjoy your meal' })).toBeVisible()

  await guestDevice.close()
  await staffDevice.close()
})

test('guests only get the public board, and only staff change orders', async ({ page, request }) => {
  await page.goto('/takeaway-pickup')
  const frame = await page.evaluate(async () => {
    const res = await fetch('/api/orders/stream?feed=board')
    const reader = res.body!.getReader()
    const { value } = await reader.read()
    await reader.cancel()
    return new TextDecoder().decode(value)
  })
  expect(frame).toContain('"board"')
  // Seeded dine-in guest and dish: never sent to other guests
  expect(frame).not.toContain('Jun')
  expect(frame).not.toContain('Cold Brew')

  expect((await request.get('/api/orders/stream?feed=orders')).status()).toBe(401)
  expect((await request.get('/api/orders')).status()).toBe(401)
  const status = await request.post('/api/orders/status', { data: { id: '00000000-0000-4000-8000-000000090001', status: 'paid' } })
  expect(status.status()).toBe(401)
  expect((await request.post('/api/staff/login', { data: { pin: '000000' } })).status()).toBe(401)
})

test('the server prices orders from its menu', async ({ request }) => {
  const id = crypto.randomUUID()
  const res = await request.post('/api/orders/place', {
    data: {
      id, tableId: 5, tableName: 'Table 5', customerName: 'Price check', orderType: 'takeaway',
      items: [{ id: 2, quantity: 2, price: 1 }, { id: 7, quantity: 1, price: 0 }],
    },
  })
  expect(res.ok()).toBeTruthy()
  const { order } = await res.json()
  expect(order.total).toBe(165 * 2 + 95)
  expect(order.items).toEqual([
    { id: 2, name: 'Caramel Macchiato', price: 165, quantity: 2 },
    { id: 7, name: 'Butter Croissant', price: 95, quantity: 1 },
  ])
  expect(order.takeawayCode).toMatch(/^T-[A-HJ-NP-Z2-9]{4}$/)

  // Same id again: the first order comes back, nothing is added
  const again = await (await request.post('/api/orders/place', {
    data: { id, tableId: 5, tableName: 'Table 5', customerName: 'Price check', orderType: 'takeaway', items: [{ id: 10, quantity: 9 }] },
  })).json()
  expect(again.order.total).toBe(order.total)

  const unknown = await request.post('/api/orders/place', {
    data: { id: crypto.randomUUID(), tableId: 5, tableName: 'Table 5', customerName: '', orderType: 'dineIn', items: [{ id: 999, quantity: 1 }] },
  })
  expect(unknown.status()).toBe(400)
  expect((await unknown.json()).error).toBe('unknown_item')

  // Whoever holds the id (the phone that placed it) can cancel while it is still pending
  const cancel = await request.post('/api/orders/cancel', { data: { id } })
  expect(cancel.ok()).toBeTruthy()
  expect((await cancel.json()).order.status).toBe('cancelled')
})

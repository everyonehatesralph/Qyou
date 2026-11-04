import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { signInStaff } from './fixtures'

// Paying now, on two devices: a guest pays on the dev server's PayMongo stand-in
// (server/payments/fakePaymongo.ts: same API calls and signed webhook, no money), staff see
// the order only once it is paid. Table 10 is not used by the seed or the other flows.

/** Checks in at table 10, puts one Butter Croissant (₱95) in the cart and opens checkout. */
async function cartWithCroissant(guest: Page, name: string) {
  await guest.goto('/t/10')
  await guest.getByLabel('Your name').fill(name)
  await guest.getByRole('button', { name: 'Start ordering' }).click()
  await guest.waitForURL('**/menu')
  await guest.getByRole('button', { name: 'Add Butter Croissant' }).first().click()
  await guest.getByRole('button', { name: /View cart/ }).click()
  await guest.getByRole('button', { name: /Checkout/ }).click()
}

/** From the checkout sheet: dine in, pay now, off to the payment page. */
async function payNow(guest: Page) {
  await guest.getByRole('radio', { name: /Dine in/ }).click()
  await guest.getByRole('radio', { name: /Pay now/ }).click()
  await expect(guest.getByRole('button', { name: /Pay now/ })).toContainText('₱95')
  await guest.getByRole('button', { name: /Pay now/ }).click()
  await guest.waitForURL(/\/fake-paymongo\/checkout\/cs_/)
  await expect(guest.getByText('1× Butter Croissant')).toBeVisible()
  await expect(guest.getByRole('row', { name: /Total/ })).toContainText('₱95.00')
}

/** Every order, as staff see them. */
async function staffOrders(request: APIRequestContext) {
  const res = await request.get('/api/orders')
  expect(res.ok()).toBeTruthy()
  return (await res.json()) as { id: string; customerName: string; status: string; paidOnlineAt?: string; paymentMethod?: string }[]
}

test('a pay-now order reaches the kitchen once paid, marked paid, and serving it settles it', async ({ browser }) => {
  const guestDevice = await browser.newContext()
  const staffDevice = await browser.newContext()
  const guest = await guestDevice.newPage()
  const staff = await staffDevice.newPage()
  await signInStaff(staff)

  await cartWithCroissant(guest, 'Paz')
  await payNow(guest)
  // On the payment page, not paid yet: nothing for the kitchen
  expect((await staffOrders(staff.request)).filter(o => o.customerName === 'Paz')).toHaveLength(0)

  await guest.getByRole('button', { name: 'Pay ₱95.00 with GCash' }).click()
  await guest.waitForURL(/\/order\/[0-9a-f-]{36}$/)
  await expect(guest.getByRole('heading', { name: 'Order received' })).toBeVisible()
  await expect(guest.getByText(/Paid with GCash/)).toBeVisible()
  const [paz] = (await staffOrders(staff.request)).filter(o => o.customerName === 'Paz')
  expect(paz.paymentMethod).toBe('gcash')
  expect(paz.paidOnlineAt).toBeTruthy()

  // Staff see it arrive marked paid, and the kitchen ticket says so too
  const incoming = staff.locator('div').filter({ hasText: 'Paz' }).filter({ has: staff.getByRole('button', { name: 'Confirm order' }) }).last()
  await expect(incoming.getByText('Paid · GCash')).toBeVisible()
  await incoming.getByRole('button', { name: 'Confirm order' }).click()
  await expect(guest.getByRole('heading', { name: 'Order confirmed' })).toBeVisible()
  await staff.goto('/staff/kitchen')
  const ticket = staff.getByRole('article', { name: /^Table 10,/ }).filter({ hasText: 'Paz' })
  await expect(ticket.getByText('Paid · GCash')).toBeVisible()
  await ticket.getByRole('button', { name: 'Start preparing' }).click()
  await ticket.getByRole('button', { name: 'Mark ready' }).click()
  await expect(guest.getByRole('heading', { name: 'Ready for you' })).toBeVisible()
  // Nothing left to collect: serving it settles the bill
  await ticket.getByRole('button', { name: 'Mark served' }).click()
  await expect(guest.getByRole('heading', { name: 'All paid' })).toBeVisible()
  await staff.goto('/staff/dashboard')
  const awaitingPayment = staff.locator('section').filter({ has: staff.getByRole('heading', { name: /Awaiting payment/ }) })
  await expect(awaitingPayment.getByText(/Rosa/)).toBeVisible()
  await expect(awaitingPayment.getByText(/Paz/)).toHaveCount(0)

  // The cart it came from is done
  await guest.goto('/cart')
  await expect(guest.getByText('Your cart is empty').first()).toBeVisible()
  await guestDevice.close()
  await staffDevice.close()
})

test('a payment counts even if the webhook never arrives, and the guest cannot cancel it', async ({ browser, request }) => {
  const guestDevice = await browser.newContext()
  const guest = await guestDevice.newPage()
  await cartWithCroissant(guest, 'Noel')
  await payNow(guest)
  // As if PayMongo's webhook couldn't reach the shop (a protected preview, a dropped call)
  await guest.getByLabel('Tell the shop by webhook').uncheck()
  await guest.getByRole('button', { name: 'Pay ₱95.00 with Maya' }).click()
  await guest.waitForURL(/\/order\/[0-9a-f-]{36}$/)
  // The order page asks; the server checks with PayMongo and places it
  await expect(guest.getByRole('heading', { name: 'Order received' })).toBeVisible()
  await expect(guest.getByText(/Paid with Maya/)).toBeVisible()

  // Paid online: no Cancel on the guest's phone, and the server refuses it anyway
  const id = guest.url().split('/').pop()!
  await guest.goto('/my-orders')
  await expect(guest.getByRole('button', { name: /Cancel order/ })).toHaveCount(0)
  const cancel = await request.post('/api/orders/cancel', { data: { id } })
  expect(cancel.status()).toBe(409)
  expect((await cancel.json()).error).toBe('paid_online')
  await guestDevice.close()
})

test('backing out of the payment orders nothing and keeps the cart; paying later uses the same checkout', async ({ browser }) => {
  const guestDevice = await browser.newContext()
  const staffDevice = await browser.newContext()
  const guest = await guestDevice.newPage()
  const staff = await staffDevice.newPage()
  await signInStaff(staff)

  await cartWithCroissant(guest, 'Tess')
  await payNow(guest)
  const firstCheckout = guest.url()
  await guest.getByRole('button', { name: 'Back to the shop' }).click()
  await guest.waitForURL('**/cart?payment=cancelled')
  await expect(guest.getByText(/payment wasn't finished, so nothing was ordered/)).toBeVisible()
  await expect(guest.getByText('Butter Croissant')).toBeVisible()
  expect((await staffOrders(staff.request)).filter(o => o.customerName === 'Tess')).toHaveLength(0)

  // Same cart, pay again: the same checkout, not a second one to pay twice
  await guest.getByRole('button', { name: /Checkout/ }).click()
  await payNow(guest)
  expect(guest.url()).toBe(firstCheckout)
  await guest.getByRole('button', { name: 'Pay ₱95.00 with QR Ph' }).click()
  await guest.waitForURL(/\/order\/[0-9a-f-]{36}$/)
  await expect(guest.getByText(/Paid with QR Ph/)).toBeVisible()
  expect((await staffOrders(staff.request)).filter(o => o.customerName === 'Tess')).toHaveLength(1)
  await guestDevice.close()
  await staffDevice.close()
})

test('the payment server prices pay-now orders, and only a signed webhook is heard', async ({ request }) => {
  const config = await (await request.get('/api/payments/config')).json()
  expect(config).toEqual({ enabled: true, methods: ['gcash', 'paymaya', 'qrph', 'card'] })

  // Large (2), Hot (3), 100% sugar (5): the phone's prices are ignored
  const id = crypto.randomUUID()
  const start = await request.post('/api/payments/checkout', {
    data: { id, tableId: 10, tableName: 'Table 10', customerName: 'API', orderType: 'dineIn', items: [{ id: 2, quantity: 2, price: 1, choices: [2, 3, 5] }] },
  })
  expect(start.ok()).toBeTruthy()
  const { checkoutUrl } = await start.json()
  const page = await request.get(new URL(checkoutUrl).pathname)
  expect(await page.text()).toContain('₱390.00')
  expect((await (await request.post('/api/payments/confirm', { data: { id } })).json()).state).toBe('waiting')

  // A webhook nobody signed changes nothing
  const forged = await request.post('/api/payments/webhook', {
    headers: { 'Paymongo-Signature': 't=1,te=' + '0'.repeat(64) + ',li=' },
    data: { data: { id: 'evt_x', attributes: { type: 'checkout_session.payment.paid', livemode: false, data: { id: 'cs_x', attributes: { metadata: { order_id: id } } } } } },
  })
  expect(forged.status()).toBe(401)
  expect((await (await request.post('/api/payments/confirm', { data: { id } })).json()).state).toBe('waiting')

  // Order rules hold as for any order
  const bad = await request.post('/api/payments/checkout', {
    data: { id: crypto.randomUUID(), tableId: 10, tableName: 'Table 10', customerName: '', orderType: 'dineIn', items: [{ id: 2, quantity: 1 }] },
  })
  expect(bad.status()).toBe(400)
  expect((await bad.json()).error).toBe('missing_option')
  // A placed order can't be paid for again, and a checkout can't be placed at the counter instead
  const counter = await request.post('/api/orders/place', {
    data: { id, tableId: 10, tableName: 'Table 10', customerName: '', orderType: 'dineIn', items: [{ id: 7, quantity: 1 }] },
  })
  expect(counter.status()).toBe(409)
  expect((await counter.json()).error).toBe('checkout_open')
})

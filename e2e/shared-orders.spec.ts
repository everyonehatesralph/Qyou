import { test, expect, type Page } from '@playwright/test'
import { STAFF_PIN } from './fixtures'

// Two devices (separate browser contexts, so nothing is shared but the server):
// a guest orders at table 5, staff confirm and cook it, and the guest's tracker follows.
// Table 5 is not used by the seed or the screen checks; table 8 has a seeded open order.

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
  // Matcha Latte asks for size, hot or iced and sugar: two Large, the rest as they come
  await guest.getByRole('button', { name: 'Add Matcha Latte' }).first().click()
  const sheet = guest.getByRole('dialog')
  await sheet.locator('label', { hasText: 'Large' }).click()
  await expect(sheet.getByRole('radio', { name: /Large/ })).toBeChecked()
  await sheet.getByRole('button', { name: 'Add one Matcha Latte' }).click()
  await expect(sheet.getByRole('button', { name: /Add to cart/ })).toContainText('₱410')
  await sheet.getByRole('button', { name: /Add to cart/ }).click()
  await expect(sheet).toHaveCount(0)
  await guest.getByRole('button', { name: /View cart/ }).click()
  await guest.getByRole('button', { name: /Checkout/ }).click()
  await guest.getByRole('radio', { name: /Dine in/ }).click()
  await guest.getByRole('checkbox', { name: /Oat Milk Upgrade/ }).click()
  await expect(guest.getByRole('button', { name: /Place order/ })).toContainText('₱435')
  await guest.getByRole('button', { name: /Place order/ }).click()
  await guest.waitForURL(/\/order\/[0-9a-f-]{36}$/)
  await expect(guest.getByRole('heading', { name: 'Order received' })).toBeVisible()
  // Options and the add-on are charged: (175 + 30 Large) × 2 + 25, and the choices are on the order
  await expect(guest.getByText('Oat Milk Upgrade')).toBeVisible()
  await expect(guest.getByText('Large · Hot · 100% sugar')).toBeVisible()
  await expect(guest.getByText('₱435', { exact: true }).first()).toBeVisible()

  // Staff, on their own device, see it arrive and confirm it
  await signInStaff(staff)
  const incoming = staff.locator('article, li, div').filter({ hasText: 'Kai' }).filter({ has: staff.getByRole('button', { name: 'Confirm order' }) }).last()
  await expect(incoming).toBeVisible()
  await incoming.getByRole('button', { name: 'Confirm order' }).click()
  await expect(guest.getByRole('heading', { name: 'Order confirmed' })).toBeVisible()

  // Kitchen moves it along; each step shows up on the guest's phone
  await staff.goto('/staff/kitchen')
  const ticket = staff.getByRole('article', { name: /^Table 5,/ })
  // The bar sees exactly what to make
  await expect(ticket).toContainText('Large · Hot · 100% sugar')
  await ticket.getByRole('button', { name: 'Start preparing' }).click()
  await expect(guest.getByRole('heading', { name: 'Being prepared' })).toBeVisible()
  await ticket.getByRole('button', { name: 'Mark ready' }).click()
  await expect(guest.getByRole('heading', { name: 'Ready for you' })).toBeVisible()
  const readyAlert = guest.getByRole('alert').filter({ hasText: /is ready/ })
  await expect(readyAlert).toBeVisible()
  await ticket.getByRole('button', { name: 'Mark served' }).click()
  await expect(guest.getByRole('heading', { name: 'Enjoy your meal' })).toBeVisible()
  await expect(readyAlert).toHaveCount(0)

  await guestDevice.close()
  await staffDevice.close()
})

test('a second phone joins a table, and staff menu changes reach it at once', async ({ browser }) => {
  const guestDevice = await browser.newContext()
  const staffDevice = await browser.newContext()
  const guest = await guestDevice.newPage()
  const staff = await staffDevice.newPage()

  // Table 8 already has an open order (seed): another phone can still order there
  await guest.goto('/t/8')
  await expect(guest.getByText(/Others at Table 8 have ordered already/)).toBeVisible()
  await guest.getByLabel('Your name').fill('Mia')
  await guest.getByRole('button', { name: 'Start ordering' }).click()
  await guest.waitForURL('**/menu')

  // Sold out on the staff tablet: the guest's menu shows it without a reload
  await signInStaff(staff)
  await staff.goto('/staff/menu')
  await staff.getByRole('switch', { name: 'Avocado Toast available today' }).click()
  const toast = guest.getByRole('listitem').filter({ hasText: 'Avocado Toast' })
  await expect(toast.getByText('Sold out today')).toBeVisible()
  await staff.getByRole('switch', { name: 'Avocado Toast available today' }).click()
  await expect(toast.getByText('₱195')).toBeVisible()

  // New price on the staff tablet: shown to the guest at once, and that's what is charged
  await staff.getByRole('button', { name: 'Edit Cold Brew' }).click()
  await staff.getByLabel('Price (₱)').fill('160')
  await staff.getByRole('button', { name: 'Save' }).click()
  const coldBrew = guest.getByRole('listitem').filter({ hasText: 'Cold Brew' })
  await expect(coldBrew.getByText('₱160')).toBeVisible()
  await guest.getByRole('button', { name: 'Add Cold Brew' }).click()
  // Cold Brew has options; the usual picks (Regular, 100% sugar, normal ice) cost nothing extra
  await guest.getByRole('dialog').getByRole('button', { name: /Add to cart/ }).click()
  await guest.getByRole('button', { name: /View cart/ }).click()
  await guest.getByRole('button', { name: /Checkout/ }).click()
  await guest.getByRole('radio', { name: /Take away/ }).click()
  await guest.getByRole('button', { name: /Place order/ }).click()
  await guest.waitForURL(/\/order\/[0-9a-f-]{36}$/)
  await expect(guest.getByText('₱160', { exact: true }).first()).toBeVisible()

  // Put the price back for the rest of the suite
  await staff.getByRole('button', { name: 'Edit Cold Brew' }).click()
  await staff.getByLabel('Price (₱)').fill('155')
  await staff.getByRole('button', { name: 'Save' }).click()
  await expect(staff.getByRole('button', { name: 'Save' })).toHaveCount(0)
  await guestDevice.close()
  await staffDevice.close()
})

test('staff set how many tables there are, and check-in follows at once', async ({ browser }) => {
  const staffDevice = await browser.newContext()
  const guestDevice = await browser.newContext()
  const staff = await staffDevice.newPage()
  const guest = await guestDevice.newPage()
  await signInStaff(staff)
  await staff.goto('/staff/tables')

  // Table 9 has a served, unpaid order (seed): it can't be removed yet
  await staff.getByRole('button', { name: 'Edit tables' }).click()
  for (let i = 0; i < 2; i++) await staff.getByRole('button', { name: 'Remove one table' }).click()
  await staff.getByRole('button', { name: 'Save' }).click()
  await expect(staff.getByRole('alert')).toContainText('Table 9 still has open orders')

  // Two more instead
  for (let i = 0; i < 4; i++) await staff.getByRole('button', { name: 'Add one table' }).click()
  await staff.getByRole('button', { name: 'Save' }).click()
  await expect(staff.getByText('of 12 free')).toBeVisible()

  // A guest can check in at the new table straight away
  await guest.goto('/t/12')
  await expect(guest.getByLabel('Your name')).toBeVisible()

  // Back to 10 for the rest of the suite; table 12 is gone for guests too
  await staff.getByRole('button', { name: 'Edit tables' }).click()
  for (let i = 0; i < 2; i++) await staff.getByRole('button', { name: 'Remove one table' }).click()
  await staff.getByRole('button', { name: 'Save' }).click()
  await expect(staff.getByText('of 10 free')).toBeVisible()
  await guest.goto('/t/12')
  await expect(guest.getByText("This QR code isn't for a table here")).toBeVisible()

  await staffDevice.close()
  await guestDevice.close()
})

test('staff add an option group, and guests can choose it at its price', async ({ browser }) => {
  const staffDevice = await browser.newContext()
  const guestDevice = await browser.newContext()
  const staff = await staffDevice.newPage()
  const guest = await guestDevice.newPage()
  await signInStaff(staff)
  await staff.goto('/staff/menu')

  // A Milk group guests may skip: fresh milk free, oat milk +25
  await staff.getByRole('button', { name: 'Add option group' }).click()
  const editor = staff.getByRole('dialog')
  await editor.getByLabel('Name').fill('Milk')
  await editor.getByRole('switch', { name: 'Guests must choose' }).click()
  await editor.getByLabel('Choice 1', { exact: true }).fill('Fresh milk')
  await editor.getByRole('button', { name: 'Add choice' }).click()
  await editor.getByLabel('Choice 2', { exact: true }).fill('Oat milk')
  await editor.getByLabel('Choice 2 extra price (₱)').fill('25')
  await editor.getByRole('button', { name: 'Save' }).click()
  await expect(editor).toHaveCount(0)
  await expect(staff.getByText('Fresh milk, Oat milk +₱25')).toBeVisible()

  // On the macchiato
  await staff.getByRole('button', { name: 'Edit Caramel Macchiato' }).click()
  await staff.getByRole('dialog').locator('label', { hasText: 'Milk' }).click()
  await expect(staff.getByRole('dialog').getByRole('checkbox', { name: /Milk/ })).toBeChecked()
  await staff.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await expect(staff.getByRole('dialog')).toHaveCount(0)

  // A guest's phone offers it straight away, and oat milk adds 25
  await guest.goto('/t/3')
  await guest.getByLabel('Your name').fill('Ria')
  await guest.getByRole('button', { name: 'Start ordering' }).click()
  await guest.waitForURL('**/menu')
  await guest.getByRole('button', { name: 'Add Caramel Macchiato' }).first().click()
  const sheet = guest.getByRole('dialog')
  await expect(sheet.getByText('Optional')).toBeVisible()
  await sheet.locator('label', { hasText: 'Oat milk' }).click()
  await expect(sheet.getByRole('button', { name: /Add to cart/ })).toContainText('₱190')

  // Tidy up for the rest of the suite
  await staff.getByRole('button', { name: 'Edit Milk options' }).click()
  await staff.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(staff.getByText('Fresh milk, Oat milk +₱25')).toHaveCount(0)
  await staffDevice.close()
  await guestDevice.close()
})

test('guests only get the public board, and only staff change orders', async ({ page, request }) => {
  await page.goto('/takeaway-pickup')
  const frame = await page.evaluate(async () => {
    const res = await fetch('/api/stream?feeds=board')
    const reader = res.body!.getReader()
    const { value } = await reader.read()
    await reader.cancel()
    return new TextDecoder().decode(value)
  })
  expect(frame).toContain('"feed":"board"')
  // Seeded dine-in guest and dish: never sent to other guests
  expect(frame).not.toContain('Jun')
  expect(frame).not.toContain('Cold Brew')

  expect((await request.get('/api/stream?feeds=orders')).status()).toBe(401)
  expect((await request.get('/api/stream?feeds=menu,orders')).status()).toBe(401)
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
      // Large (2), Hot (3), 100% sugar (5): the phone can't make the large one cheaper
      items: [{ id: 2, quantity: 2, price: 1, choices: [2, 3, 5] }, { id: 7, quantity: 1, price: 0 }],
    },
  })
  expect(res.ok()).toBeTruthy()
  const { order } = await res.json()
  expect(order.total).toBe((165 + 30) * 2 + 95)
  expect(order.items).toEqual([
    { id: 2, name: 'Caramel Macchiato', price: 195, quantity: 2, category: 'Coffee', options: [
      { group: 'Size', choice: 'Large', price: 30 }, { group: 'Hot or iced', choice: 'Hot', price: 0 },
      { group: 'Sugar level', choice: '100% sugar', price: 0 },
    ] },
    { id: 7, name: 'Butter Croissant', price: 95, quantity: 1, category: 'Pastry' },
  ])
  // A drink without its options is refused
  const bare = await request.post('/api/orders/place', {
    data: { id: crypto.randomUUID(), tableId: 5, tableName: 'Table 5', customerName: '', orderType: 'dineIn', items: [{ id: 2, quantity: 1 }] },
  })
  expect((await bare.json()).error).toBe('missing_option')

  // An order needs a real, open table
  for (const tableId of [0, 99]) {
    const noTable = await request.post('/api/orders/place', {
      data: { id: crypto.randomUUID(), tableId, tableName: 'Table null', customerName: '', orderType: 'dineIn', items: [{ id: 1, quantity: 1 }] },
    })
    expect((await noTable.json()).error).toBe('invalid_table')
  }
  // Only staff set the number of tables
  expect((await request.post('/api/tables/count', { data: { count: 3 } })).status()).toBe(401)
  expect(order.takeawayCode).toMatch(/^T-[A-HJ-NP-Z2-9]{4}$/)
  // Today's queue number, on the restaurant's (Manila) calendar
  expect(Number.isInteger(order.number) && order.number >= 1).toBe(true)
  expect(order.orderDay).toBe(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()))

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

import { readFileSync } from 'node:fs'
import { test, expect, type BrowserContext } from '@playwright/test'

// The guest's receipt: Download receipt saves a PNG (caught as a Playwright download), and Share
// hands the same image to the share sheet (stubbed here: it records what it was given).

// Table 10 is free in the seeded data; the order is cancelled afterwards so the next run can use it
const placed: string[] = []
test.afterEach(async ({ request }) => {
  for (const orderId of placed.splice(0)) {
    await request.post('/api/orders/status', { data: { orderId, status: 'cancelled', timestamp: new Date().toISOString() } })
  }
})

async function stubShare(context: BrowserContext) {
  await context.addInitScript(() => {
    const shared: { name: string; type: string; size: number }[] = []
    ;(window as unknown as { __shared: typeof shared }).__shared = shared
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: (data: ShareData) => !!data.files?.length })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => { for (const f of data.files ?? []) shared.push({ name: f.name, type: f.type, size: f.size }) },
    })
  })
}

/** Width and height from a PNG's header. */
function pngSize(path: string) {
  const bytes = readFileSync(path)
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

test('a guest downloads and shares the receipt right after ordering, and again from Your orders', async ({ context }, testInfo) => {
  await stubShare(context)
  const page = await context.newPage()
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/t/10')
  await page.getByLabel('Your name').fill('Ana')
  await page.getByRole('button', { name: 'Start ordering' }).click()
  await page.getByRole('button', { name: 'Add Cold Brew' }).first().click()
  await page.getByRole('button', { name: /View cart/ }).click()
  await page.getByRole('button', { name: /Checkout/ }).click()
  await page.getByRole('radio', { name: /Dine in/ }).click()
  await page.getByRole('button', { name: /Place order/ }).click()
  await page.waitForURL('**/order/**')
  const orderId = page.url().split('/order/')[1]
  placed.push(orderId)

  // One tap on the order page saves the image
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download receipt' }).click()])
  expect(download.suggestedFilename()).toBe(`qyou-receipt-demo-cafe-${orderId}.png`)
  const file = testInfo.outputPath('receipt.png')
  await download.saveAs(file)
  const size = pngSize(file)
  expect(size.width).toBe(1080)
  expect(size.height).toBeGreaterThan(1200)

  // The receipt view says what it is, and shares the same image
  await page.getByRole('button', { name: 'View receipt' }).click()
  const sheet = page.getByRole('dialog', { name: 'Receipt' })
  for (const text of [`${orderId}`, 'Table 10', 'Ana', '1× Cold Brew', 'Total', 'Order receipt — not an official receipt']) {
    await expect(sheet.getByText(text, { exact: false }).first()).toBeVisible()
  }
  await sheet.getByRole('button', { name: 'Share' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared)).toEqual([
    { name: `qyou-receipt-demo-cafe-${orderId}.png`, type: 'image/png', size: expect.any(Number) },
  ])
  await page.keyboard.press('Escape')

  // Later, from Your orders
  await page.goto('/my-orders')
  const [again] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: `Download receipt for order ${orderId}` }).click()])
  expect(again.suggestedFilename()).toBe(`qyou-receipt-demo-cafe-${orderId}.png`)
})

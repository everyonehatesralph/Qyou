import { expect, type Page } from '@playwright/test'
import { STAFF_PIN, seedId } from './fixtures'

// Every route the app has, with how to reach it, shared by the screen and device suites.

export type Theme = 'light' | 'dark'
export interface Route {
  id: string
  path: string
  staff?: boolean
  /** Runs instead of a plain visit; must end on `path`. */
  setup?: (page: Page) => Promise<void>
}

async function checkIn(page: Page) {
  await page.goto('/t/1')
  await page.getByLabel('Your name').fill('Ana')
  await page.getByRole('button', { name: 'Start ordering' }).click()
  await page.waitForURL('**/menu')
}

async function addItems(page: Page) {
  // Popular repeats some items, so take the first of each
  await page.getByRole('button', { name: 'Add Caramel Macchiato' }).first().click()
  await page.getByRole('button', { name: 'Add Butter Croissant' }).first().click()
}

/** Client-side navigation keeps in-memory state (staff sign-in, cart). */
async function pushRoute(page: Page, path: string) {
  await page.evaluate(p => { history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate')) }, path)
  await page.waitForURL(`**${path}`)
}

async function staffSignIn(page: Page, path: string) {
  await page.goto('/staff/login')
  for (const digit of STAFF_PIN) await page.getByRole('button', { name: digit, exact: true }).click()
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/staff/dashboard')
  if (path !== '/staff/dashboard') await pushRoute(page, path)
}

export const ROUTES: Route[] = [
  { id: 'landing', path: '/' },
  { id: 'checkin', path: '/t/1' },
  { id: 'badtable', path: '/t/99' },
  { id: 'menu', path: '/menu', setup: async page => { await checkIn(page); await addItems(page) } },
  { id: 'cart', path: '/cart', setup: async page => { await checkIn(page); await addItems(page); await page.getByRole('button', { name: /View cart/ }).click(); await page.waitForURL('**/cart') } },
  { id: 'tracker', path: `/order/${seedId(1)}` },
  { id: 'myorders', path: '/my-orders' },
  { id: 'pickup', path: '/takeaway-pickup' },
  { id: 'expired', path: '/expired' },
  { id: 'notfound', path: '/no-such-page' },
  { id: 'login', path: '/staff/login' },
  { id: 'dashboard', path: '/staff/dashboard', staff: true },
  { id: 'kitchen', path: '/staff/kitchen', staff: true },
  { id: 'tables', path: '/staff/tables', staff: true },
  { id: 'staffmenu', path: '/staff/menu', staff: true },
  { id: 'sales', path: '/staff/sales', staff: true },
  { id: 'qr', path: '/staff/qr-codes', staff: true },
  { id: 'metrics', path: '/staff/metrics', staff: true },
]

/** Theme and this device's order ids, set before the app boots. */
export async function primeStorage(page: Page, theme: Theme) {
  await page.addInitScript(([t, myOrders]) => {
    localStorage.setItem('qyou_theme', t as string)
    // The "my orders" list reads this device's order ids
    localStorage.setItem('qyou_my_orders', JSON.stringify(myOrders))
  }, [theme, [seedId(1), seedId(2), seedId(5)]] as const)
}

export async function openRoute(page: Page, route: Route) {
  if (route.staff) await staffSignIn(page, route.path)
  else if (route.setup) await route.setup(page)
  else await page.goto(route.path)
}

export async function waitUntilSettled(page: Page) {
  // Route chunks load lazily behind a full-screen spinner
  await expect(page.locator('div.min-h-screen[role=status]')).toHaveCount(0, { timeout: 30_000 })
  await page.evaluate(() => document.fonts.ready)
  // Scroll through once so scroll-triggered reveals have played, then back to the top
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      window.scrollTo(0, y)
      await new Promise(r => setTimeout(r, 40))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(700)
  // Entrance animations (fades with a delay) must finish, or contrast is measured mid-fade
  await page.evaluate(() => Promise.race([
    Promise.all(document.getAnimations()
      .filter(a => a.effect?.getTiming().iterations !== Infinity)
      .map(a => a.finished.catch(() => undefined))),
    new Promise(r => setTimeout(r, 4000)),
  ]))
}

/** Collects page errors, console errors and failed requests while a test runs. */
export function watchProblems(page: Page) {
  const problems: string[] = []
  page.on('pageerror', e => problems.push(`page error: ${e.message}`))
  // "Failed to load resource" is reported below with its URL instead
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) problems.push(`console: ${msg.text()}`) })
  page.on('response', res => { if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`) })
  return problems
}

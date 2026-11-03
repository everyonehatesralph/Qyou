import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { STAFF_PIN, seedId } from './fixtures'

// Every route at phone, tablet and desktop width, in light and dark:
//  - no horizontal scrolling
//  - no console or page errors
//  - no WCAG 2.1 A/AA violations from axe (includes text color contrast)
//  - a full-page screenshot in test-results/screens for review

type Theme = 'light' | 'dark'
interface Route {
  id: string
  path: string
  staff?: boolean
  /** Runs instead of a plain visit; must end on `path`. */
  setup?: (page: Page) => Promise<void>
}

const WIDTHS = [375, 768, 1280]
const HEIGHT: Record<number, number> = { 375: 812, 768: 1024, 1280: 800 }
const THEMES: Theme[] = ['light', 'dark']

async function checkIn(page: Page) {
  await page.goto('/t/1')
  await page.getByLabel('Your name').fill('Ana')
  await page.getByRole('button', { name: 'Start ordering' }).click()
  await page.waitForURL('**/menu')
}

async function addItems(page: Page) {
  await page.getByRole('button', { name: 'Add Caramel Macchiato' }).click()
  await page.getByRole('button', { name: 'Add Butter Croissant' }).click()
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

const ROUTES: Route[] = [
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

async function waitUntilSettled(page: Page) {
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
}

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      // Kitchen: the app is always light here; "dark" is the kitchen's own default and
      // "light" is its own toggle set to light, so the test proves it opens dark by itself.
      const isKitchen = route.id === 'kitchen'
      const appTheme: Theme = isKitchen ? 'light' : theme
      const kitchenTheme = isKitchen && theme === 'light' ? 'light' : null

      test(`${route.id} ${width} ${theme}`, async ({ page }, testInfo) => {
        const problems: string[] = []
        page.on('pageerror', e => problems.push(`page error: ${e.message}`))
        // "Failed to load resource" is reported below with its URL instead
        page.on('console', msg => { if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) problems.push(`console: ${msg.text()}`) })
        page.on('response', res => { if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`) })

        await page.setViewportSize({ width, height: HEIGHT[width] })
        await page.addInitScript(([t, k, myOrders]) => {
          localStorage.setItem('qyou_theme', t as string)
          if (k) localStorage.setItem('qyou_kitchen_theme', k as string)
          else localStorage.removeItem('qyou_kitchen_theme')
          // The "my orders" list reads this device's order ids
          localStorage.setItem('qyou_my_orders', JSON.stringify(myOrders))
        }, [appTheme, kitchenTheme, [seedId(1), seedId(2), seedId(5)]] as const)

        if (route.staff) await staffSignIn(page, route.path)
        else if (route.setup) await route.setup(page)
        else await page.goto(route.path)
        await waitUntilSettled(page)

        await expect(page.locator('html')).toHaveAttribute('data-theme', appTheme)
        if (isKitchen && theme === 'dark') {
          await expect(page.locator('main').locator('xpath=ancestor::*[@data-theme][1]')).toHaveAttribute('data-theme', 'dark')
        }

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))
        expect(scrollWidth, 'no horizontal scroll').toBeLessThanOrEqual(clientWidth)

        await page.screenshot({ path: `test-results/screens/${route.id}-${width}-${theme}.png`, fullPage: true })

        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
        const violations = axe.violations.map(v => ({
          rule: v.id,
          impact: v.impact,
          nodes: v.nodes.map(n => `${n.target.join(' ')} :: ${n.failureSummary?.split('\n').slice(1).join(' ').trim()}`),
        }))
        if (violations.length) await testInfo.attach('axe', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' })
        expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
        expect(problems, problems.join('\n')).toEqual([])
      })
    }
  }
}

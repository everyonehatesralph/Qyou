import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { ROUTES, openRoute, primeStorage, waitUntilSettled, watchProblems, type Theme } from './routes'

// Every route at phone, tablet and desktop width, in light and dark:
//  - no horizontal scrolling
//  - no console or page errors
//  - no WCAG 2.2 A/AA violations from axe (includes text color contrast)
//  - a full-page screenshot in test-results/screens for review

const WIDTHS = [375, 768, 1280]
const HEIGHT: Record<number, number> = { 375: 812, 768: 1024, 1280: 800 }
const THEMES: Theme[] = ['light', 'dark']

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      test(`${route.id} ${width} ${theme}`, async ({ page }, testInfo) => {
        const problems = watchProblems(page)
        await page.setViewportSize({ width, height: HEIGHT[width] })
        await primeStorage(page, theme)
        await openRoute(page, route)
        await waitUntilSettled(page)

        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        // One theme everywhere: nothing on the page sets a mode of its own
        await expect(page.locator('body [data-theme]', { has: page.locator('main') })).toHaveCount(0)

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))
        expect(scrollWidth, 'no horizontal scroll').toBeLessThanOrEqual(clientWidth)

        await page.screenshot({ path: `test-results/screens/${route.id}-${width}-${theme}.png`, fullPage: true })

        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
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

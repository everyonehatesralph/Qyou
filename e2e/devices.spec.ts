import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { ROUTES, openRoute, primeStorage, waitUntilSettled, watchProblems, type Route } from './routes'
import { auditKeyboard, auditPage, type Finding } from './audit'

// Every route and every sheet on the screens people actually hold: small and large
// phones, phones turned sideways, tablets both ways and wide desktops (light mode;
// the screens suite already covers dark). Checks, beyond the screens suite:
//  - WCAG 2.2 A/AA from axe, which adds target size (2.5.8)
//  - touch targets of at least 44×44 on touch screens, 24×24 everywhere
//  - fields at 16px or more, so iOS does not zoom in when typing
//  - nothing past the screen edge and no text cut off without an ellipsis
//  - fixed and sticky bars keep under 30% of the screen
//  - every keyboard stop shows focus and is not hidden behind a bar

interface Device { id: string; width: number; height: number; touch: boolean }

const DEVICES: Device[] = [
  { id: 'phone-320', width: 320, height: 568, touch: true },
  { id: 'phone-360', width: 360, height: 740, touch: true },
  { id: 'phone-390', width: 390, height: 844, touch: true },
  { id: 'phone-430', width: 430, height: 932, touch: true },
  { id: 'landscape-667', width: 667, height: 375, touch: true },
  { id: 'landscape-844', width: 844, height: 390, touch: true },
  { id: 'tablet-820', width: 820, height: 1180, touch: true },
  { id: 'tablet-1024', width: 1024, height: 768, touch: true },
  { id: 'desktop-1440', width: 1440, height: 900, touch: false },
  { id: 'desktop-1920', width: 1920, height: 1080, touch: false },
]

interface Sheet { id: string; route: string; open: (page: Page) => Promise<void>; phoneOnly?: boolean }

const SHEETS: Sheet[] = [
  { id: 'help', route: 'menu', open: page => page.getByRole('button', { name: 'Help' }).click() },
  { id: 'item', route: 'menu', open: page => page.getByRole('button', { name: /^Matcha Latte/ }).first().click() },
  { id: 'checkout', route: 'cart', open: page => page.getByRole('button', { name: /Checkout/ }).click() },
  { id: 'summary', route: 'tracker', open: page => page.getByRole('button', { name: 'Order summary' }).click() },
  { id: 'edit-item', route: 'staffmenu', open: page => page.getByRole('button', { name: /^Edit / }).first().click() },
  { id: 'staff-more', route: 'dashboard', phoneOnly: true, open: page => page.getByRole('button', { name: 'More' }).click() },
]

// Rules that fail the test. The rest are written to the report for review.
const HARD = new Set(['target<24', 'target<44', 'input<16px', 'offscreen-x', 'clipped-text', 'bars>30%', 'focus-invisible', 'focus-obscured'])

async function axe(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  if (include) builder = builder.include(include)
  const result = await builder.analyze()
  return result.violations.map(v => ({ rule: `axe:${v.id}`, target: v.nodes.map(n => n.target.join(' ')).slice(0, 6).join(' | '), detail: v.help }))
}

function report(name: string, findings: Finding[]) {
  mkdirSync('test-results/audit', { recursive: true })
  writeFileSync(`test-results/audit/${name}.json`, JSON.stringify(findings, null, 2))
}

async function prepare(page: Page, device: Device, route: Route) {
  await primeStorage(page, 'light')
  await openRoute(page, route)
  await waitUntilSettled(page)
}

for (const device of DEVICES) {
  test.describe(device.id, () => {
    test.use({
      viewport: { width: device.width, height: device.height },
      isMobile: device.touch && device.width < 1024,
      hasTouch: device.touch,
    })

    for (const route of ROUTES) {
      test(`${route.id} ${device.id}`, async ({ page }) => {
        const problems = watchProblems(page)
        await prepare(page, device, route)

        const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        const findings: Finding[] = [
          ...(scroll > 0 ? [{ rule: 'h-scroll', target: 'document', detail: `${scroll}px wider than the screen` }] : []),
          ...(await axe(page)),
          ...(await auditPage(page, device.touch)),
        ]
        // Bars are measured part way down, where sticky headers have stuck
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 3))
        await page.waitForTimeout(300)
        findings.push(...(await auditPage(page, device.touch)).filter(f => f.rule === 'bars>30%'))
        findings.push(...(await auditKeyboard(page)))

        await page.evaluate(() => window.scrollTo(0, 0))
        await page.screenshot({ path: `test-results/devices/${route.id}-${device.id}.png`, fullPage: true })
        report(`${route.id}-${device.id}`, findings)

        const failing = findings.filter(f => f.rule === 'h-scroll' || f.rule.startsWith('axe:') || HARD.has(f.rule))
        expect(failing, JSON.stringify(failing, null, 2)).toEqual([])
        expect(problems, problems.join('\n')).toEqual([])
      })
    }

    for (const sheet of SHEETS) {
      if (sheet.phoneOnly && device.width >= 768) continue
      test(`sheet ${sheet.id} ${device.id}`, async ({ page }) => {
        const problems = watchProblems(page)
        await prepare(page, device, ROUTES.find(r => r.id === sheet.route)!)
        await sheet.open(page)
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        await page.waitForTimeout(500)

        const findings: Finding[] = [...(await axe(page, '[role=dialog]')), ...(await auditPage(page, device.touch))]

        // The whole sheet fits the screen, and its scroll area reaches the last control
        const box = await dialog.boundingBox()
        if (box && (box.y < -1 || box.y + box.height > device.height + 1)) {
          findings.push({ rule: 'sheet-offscreen', target: sheet.id, detail: `top ${Math.round(box.y)} bottom ${Math.round(box.y + box.height)} of ${device.height}` })
        }
        await page.screenshot({ path: `test-results/devices/sheet-${sheet.id}-${device.id}.png` })

        // Keyboard: focus starts inside, stays inside, and Escape closes it
        const inside = await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))
        if (!inside) findings.push({ rule: 'sheet-focus', target: sheet.id, detail: 'focus did not move into the sheet' })
        for (let i = 0; i < 25; i++) {
          await page.keyboard.press('Tab')
          if (!(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')))) {
            findings.push({ rule: 'sheet-focus', target: sheet.id, detail: 'Tab left the sheet' })
            break
          }
        }
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
        if (await dialog.count()) findings.push({ rule: 'sheet-escape', target: sheet.id, detail: 'Escape did not close it' })

        report(`sheet-${sheet.id}-${device.id}`, findings)
        const failing = findings.filter(f => f.rule.startsWith('axe:') || f.rule.startsWith('sheet-') || HARD.has(f.rule))
        expect(failing, JSON.stringify(failing, null, 2)).toEqual([])
        expect(problems, problems.join('\n')).toEqual([])
      })
    }
  })
}

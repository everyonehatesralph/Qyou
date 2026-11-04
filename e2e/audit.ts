import type { Page } from '@playwright/test'

// In-page checks that axe does not make: finger-sized targets, inputs that make iOS
// zoom, content past the screen edge, cut-off text, and fixed bars eating the screen.

export interface Finding {
  rule: string
  target: string
  detail: string
}

const INTERACTIVE =
  'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=tab],[role=switch],[role=checkbox],[role=radio],[role=menuitem],[tabindex]:not([tabindex="-1"])'

/** Runs in the page. Kept self-contained: it is serialized into the browser. */
function inPage({ selector, touch }: { selector: string; touch: boolean }) {
  const out: { rule: string; target: string; detail: string }[] = []
  const vw = document.documentElement.clientWidth
  const vh = window.innerHeight

  const name = (el: Element) =>
    ((el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('placeholder') || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 40))
  const where = (el: Element) => {
    const parts: string[] = []
    for (let e: Element | null = el; e && parts.length < 3 && e !== document.body; e = e.parentElement) {
      const cls = typeof e.className === 'string' ? e.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.') : ''
      parts.unshift(e.tagName.toLowerCase() + (cls ? '.' + cls : ''))
    }
    return `${parts.join(' > ')} "${name(el)}"`
  }
  const shown = (el: Element) => {
    if (el.closest('[aria-hidden="true"],[inert]')) return false
    for (let e: Element | null = el; e; e = e.parentElement) {
      const s = getComputedStyle(e)
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false
    }
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  /** Inside a dialog, only the dialog counts. */
  const dialog = document.querySelector('[role=dialog][aria-modal=true]')
  const scope = (el: Element) => !dialog || dialog.contains(el)

  // ── Touch targets ──
  const seen = new Set<Element>()
  for (const el of Array.from(document.querySelectorAll(selector))) {
    if (!shown(el) || !scope(el) || (el as HTMLButtonElement).disabled) continue
    // A visually hidden input measures by its label
    let box: Element = el
    const r0 = el.getBoundingClientRect()
    if (r0.width <= 2 || r0.height <= 2) {
      const label = el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`))
      if (!label) continue
      box = label
    }
    if (seen.has(box)) continue
    seen.add(box)
    // Links inside running text are exempt (WCAG 2.5.8 inline exception)
    if (el.tagName === 'A' && getComputedStyle(el).display === 'inline' && (el.parentElement?.innerText.length ?? 0) > name(el).length + 10) continue
    const r = box.getBoundingClientRect()
    const min = Math.min(r.width, r.height)
    if (min < 24) out.push({ rule: 'target<24', target: where(el), detail: `${Math.round(r.width)}×${Math.round(r.height)}` })
    // Chart columns focus for their tooltip; they are not buttons to tap, so 24px is enough
    else if (touch && min < 44 && el.getAttribute('role') !== 'img') out.push({ rule: 'target<44', target: where(el), detail: `${Math.round(r.width)}×${Math.round(r.height)}` })
  }

  // ── iOS zooms into fields under 16px ──
  if (touch) {
    for (const el of Array.from(document.querySelectorAll('input,select,textarea'))) {
      const type = (el as HTMLInputElement).type
      if (['checkbox', 'radio', 'range', 'hidden', 'button', 'submit'].includes(type) || !shown(el) || !scope(el)) continue
      const size = parseFloat(getComputedStyle(el).fontSize)
      if (size < 16) out.push({ rule: 'input<16px', target: where(el), detail: `${size}px` })
    }
  }

  // ── Content past the screen edge, or cut off inside its box ──
  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    if (!(el instanceof HTMLElement) || !shown(el) || !scope(el)) continue
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent!.trim())
    if (!hasText && !el.matches(selector + ',img,svg')) continue
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    // Skip anything an ancestor clips or scrolls on purpose (marquees, carousels)
    let clipped = false
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const as = getComputedStyle(a)
      if (as.overflowX !== 'visible' || as.position === 'fixed') { clipped = true; break }
    }
    if (!clipped && (r.right > vw + 1 || r.left < -1)) out.push({ rule: 'offscreen-x', target: where(el), detail: `left ${Math.round(r.left)} right ${Math.round(r.right)} of ${vw}` })
    // Screen-reader-only text is clipped to 1px on purpose
    if (hasText && el.clientWidth > 1 && (s.overflowX === 'hidden' || s.overflowX === 'clip') && el.scrollWidth > el.clientWidth + 1) {
      out.push({ rule: s.textOverflow === 'ellipsis' ? 'truncated' : 'clipped-text', target: where(el), detail: `${el.scrollWidth} in ${el.clientWidth}` })
    }
    if (hasText && s.webkitLineClamp !== 'none' && s.webkitLineClamp && el.scrollHeight > el.clientHeight + 1) {
      out.push({ rule: 'truncated', target: where(el), detail: `line clamp ${s.webkitLineClamp}` })
    }
    if (hasText && parseFloat(s.fontSize) < 12) out.push({ rule: 'text<12px', target: where(el), detail: s.fontSize })
  }

  // ── Fixed and sticky bars: how much of the screen they keep ──
  if (!dialog) {
    let covered = 0
    const bars: string[] = []
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      if (!(el instanceof HTMLElement)) continue
      const s = getComputedStyle(el)
      if (s.position !== 'fixed' && s.position !== 'sticky') continue
      if (!shown(el)) continue
      const r = el.getBoundingClientRect()
      // Full-width bars only; skip full-screen layers, side rails and inner sticky columns
      const visibleH = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0))
      if (visibleH === 0 || r.width < vw * 0.6 || visibleH > vh * 0.9) continue
      // Nested bars count once
      let nested = false
      for (let a = el.parentElement; a; a = a.parentElement) if (['fixed', 'sticky'].includes(getComputedStyle(a).position)) nested = true
      if (nested) continue
      covered += visibleH
      bars.push(`${where(el)} ${Math.round(visibleH)}px`)
    }
    if (covered > vh * 0.3) out.push({ rule: 'bars>30%', target: bars.join(' | '), detail: `${Math.round(covered)} of ${vh}px` })
  }

  return out
}

export async function auditPage(page: Page, touch: boolean): Promise<Finding[]> {
  return page.evaluate(inPage, { selector: INTERACTIVE, touch })
}

/**
 * Tabs through the page: every stop needs a visible focus indicator and must not be
 * hidden behind a fixed bar (WCAG 2.4.7, 2.4.11).
 */
export async function auditKeyboard(page: Page, maxStops = 60): Promise<Finding[]> {
  const out: Finding[] = []
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0) })
  const visited = new Set<string>()
  for (let i = 0; i < maxStops; i++) {
    await page.keyboard.press('Tab')
    // Let focus styles (and the near-zero reduced-motion transitions) reach the screen first
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const label = ((el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40))
      const key = `${el.tagName}|${label}|${Math.round(el.getBoundingClientRect().top + scrollY)}`
      const s = getComputedStyle(el)
      const indicator = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 1) || s.boxShadow !== 'none'
      const r = el.getBoundingClientRect()
      const points = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.bottom - 2]]
      let cover = ''
      const hidden = points.filter(([x, y]) => {
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { cover = `off screen at ${Math.round(x)},${Math.round(y)}`; return true }
        const hit = document.elementFromPoint(x, y)
        if (hit && (el.contains(hit) || hit.contains(el))) return false
        cover = hit ? `under ${hit.tagName.toLowerCase()}.${String(hit.className).split(' ').slice(0, 3).join('.')}` : 'nothing hit'
        return true
      }).length
      return { key, label: `${el.tagName.toLowerCase()} "${label}"`, indicator, hidden, cover }
    })
    if (!stop) continue
    if (visited.has(stop.key)) break
    visited.add(stop.key)
    if (!stop.indicator) out.push({ rule: 'focus-invisible', target: stop.label, detail: 'no outline or ring' })
    if (stop.hidden === 3) out.push({ rule: 'focus-obscured', target: stop.label, detail: stop.cover })
  }
  return out
}

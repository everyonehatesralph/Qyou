// Checks every text/background token pair in both modes against WCAG AA.
// Reads the token blocks in src/styles/globals.css and computes the accent
// tokens from the restaurant config, exactly as the app does at startup.
// Exit code 1 on any failure.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { contrastRatio } from '../src/theme/color.ts'
import { accentTokens } from '../src/theme/accent.ts'
import { RESTAURANT } from '../src/config/restaurant.ts'

const cssPath = fileURLToPath(new URL('../src/styles/globals.css', import.meta.url))
const css = readFileSync(cssPath, 'utf8')

function readBlock(selector) {
  const start = css.indexOf(selector + ' {')
  if (start === -1) return {}
  const end = css.indexOf('}', start)
  const body = css.slice(start, end)
  const tokens = {}
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)) tokens[m[1]] = m[2]
  return tokens
}

const BLOCKS = {
  light: readBlock(':root, [data-theme="light"]'),
  dark: readBlock('[data-theme="dark"]'),
}

const STATUS = ['waiting', 'progress', 'ready', 'done', 'cancelled']

// [foreground, background, minimum ratio]
const PAIRS = [
  ['text', 'bg', 4.5],
  ['text', 'surface', 4.5],
  ['text-muted', 'bg', 4.5],
  ['text-muted', 'surface', 4.5],
  ['text-muted', 'surface-2', 4.5],
  ['on-accent', 'accent', 4.5],
  ['on-accent', 'accent-hover', 4.5],
  ['accent-text', 'accent-soft', 4.5],
  ['accent-text', 'surface', 4.5],
  ['accent-text', 'bg', 4.5],
  ['accent', 'surface', 3.0], // UI component (buttons, focus ring)
  ...STATUS.map(s => [`status-${s}-text`, `status-${s}-bg`, 4.5]),
  // Table tiles and banners put regular text on status fills
  ...STATUS.map(s => ['text-muted', `status-${s}-bg`, 4.5]),
  ['text-faint', 'surface', 3.0], // placeholders only
]

let failures = 0
const rows = []

for (const mode of ['light', 'dark']) {
  const tokens = { ...BLOCKS[mode] }
  if (!tokens.surface) {
    rows.push([mode, '(token block missing)', '', '', 'FAIL'])
    failures++
    continue
  }
  const accent = accentTokens(mode, RESTAURANT.accent[mode], RESTAURANT.onAccent[mode], tokens.surface)
  for (const [k, v] of Object.entries(accent)) tokens[k.slice(2)] = v

  for (const [fg, bg, min] of PAIRS) {
    if (!tokens[fg] || !tokens[bg]) {
      rows.push([mode, `${fg} / ${bg}`, 'missing', min.toFixed(1), 'FAIL'])
      failures++
      continue
    }
    const ratio = contrastRatio(tokens[fg], tokens[bg])
    const ok = ratio >= min
    if (!ok) failures++
    rows.push([mode, `${fg} / ${bg}`, ratio.toFixed(2), min.toFixed(1), ok ? 'pass' : 'FAIL'])
  }
}

const widths = [5, 40, 7, 4, 4]
const line = r => r.map((c, i) => String(c).padEnd(widths[i])).join('  ')
console.log(line(['mode', 'pair', 'ratio', 'min', '']))
console.log(line(widths.map(w => '-'.repeat(w))))
for (const r of rows) console.log(line(r))
console.log(failures === 0 ? `\nAll ${rows.length} pairs meet WCAG AA.` : `\n${failures} pair(s) below WCAG AA.`)
process.exit(failures === 0 ? 0 : 1)

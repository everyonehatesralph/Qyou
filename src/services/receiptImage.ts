// Draws a receipt (see receipt.ts) as a PNG for the guest to keep or share: light paper with
// a torn edge on the page colour, the same whichever mode the phone is in. The colours are the
// light theme's tokens, read from the stylesheet when it draws. Only loaded when a guest
// downloads or shares a receipt, so no other page pays for it.
import type { Receipt } from './receipt'

interface Palette { page: string; paper: string; ink: string; muted: string; line: string; accent: string; onAccent: string }

/** The light theme's colours, as the stylesheet (and the restaurant's accent) define them. */
function lightPalette(): Palette {
  const probe = document.createElement('div')
  probe.setAttribute('data-theme', 'light')
  probe.hidden = true
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  const palette = {
    page: token('--bg', 'white'),
    paper: token('--surface', 'white'),
    ink: token('--text', 'black'),
    muted: token('--text-muted', 'dimgray'),
    line: token('--border-strong', 'gray'),
    accent: token('--accent', 'black'),
    onAccent: token('--on-accent', 'white'),
  }
  probe.remove()
  return palette
}

// Layout in CSS pixels; the image is drawn at 3× (1080 px wide)
const SCALE = 3
const WIDTH = 360
const MARGIN = 18
const PAD = 22
const PAPER_W = WIDTH - MARGIN * 2
const CONTENT_W = PAPER_W - PAD * 2
const LEFT = MARGIN + PAD
const RIGHT = MARGIN + PAD + CONTENT_W
const TOOTH = PAPER_W / 27
const TOOTH_DEPTH = 6

const SANS = 'Archivo, system-ui, sans-serif'
const FONT = {
  place: `760 20px ${SANS}`,
  label: `500 10px "JetBrains Mono", ui-monospace, monospace`,
  row: `400 12.5px ${SANS}`,
  rowValue: `600 12.5px ${SANS}`,
  item: `600 14px ${SANS}`,
  sub: `400 12px ${SANS}`,
  total: `760 18px ${SANS}`,
  small: `400 11px ${SANS}`,
  tile: `760 20px ${SANS}`,
}

type Ctx = CanvasRenderingContext2D & { fontStretch?: string; letterSpacing?: string }

function setFont(ctx: Ctx, font: string, display = false, spacing = '0px') {
  ctx.font = font
  // Display type in the app is Archivo set wide (font-stretch 112%); older browsers skip it
  if ('fontStretch' in ctx) ctx.fontStretch = display ? 'semi-expanded' : 'normal'
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing
}

/** Breaks text into lines no wider than `max`, splitting words that are too long on their own. */
function wrap(ctx: Ctx, text: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= max) { line = next; continue }
    if (line) lines.push(line)
    line = ''
    let piece = ''
    for (const ch of word) {
      if (ctx.measureText(piece + ch).width > max && piece) { lines.push(piece); piece = '' }
      piece += ch
    }
    line = piece
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

/**
 * Lays the receipt out from the top and, when `draw` is set, paints it. Returns the bottom of
 * the paper, so a first pass can size the canvas.
 */
function paint(ctx: Ctx, r: Receipt, logo: string, p: Palette, draw: boolean): number {
  const text = (s: string, x: number, y: number, align: CanvasTextAlign = 'left', color = p.ink) => {
    if (!draw) return
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.fillText(s, x, y)
  }
  const dashes = (y: number) => {
    if (!draw) return
    ctx.save()
    ctx.strokeStyle = p.line
    ctx.globalAlpha = 0.6
    ctx.lineWidth = 1
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(LEFT, y)
    ctx.lineTo(RIGHT, y)
    ctx.stroke()
    ctx.restore()
  }
  ctx.textBaseline = 'alphabetic'
  let y = MARGIN + PAD

  // The restaurant's letter tile, its name and what this is
  const tile = 40
  if (draw) {
    ctx.fillStyle = p.accent
    ctx.beginPath()
    // roundRect is missing from older Safari; a square tile is fine there
    if (typeof ctx.roundRect === 'function') ctx.roundRect(WIDTH / 2 - tile / 2, y, tile, tile, 11)
    else ctx.rect(WIDTH / 2 - tile / 2, y, tile, tile)
    ctx.fill()
  }
  setFont(ctx, FONT.tile, true)
  text(logo.slice(0, 2), WIDTH / 2, y + 27, 'center', p.onAccent)
  y += tile + 26
  setFont(ctx, FONT.place, true)
  for (const line of wrap(ctx, r.place, CONTENT_W)) { text(line, WIDTH / 2, y, 'center'); y += 24 }
  setFont(ctx, FONT.label, false, '1.5px')
  text('ORDER RECEIPT', WIDTH / 2, y, 'center', p.muted)
  y += 18
  dashes(y)
  y += 22

  // Order number, date, table, name, status, payment
  for (const [label, value] of r.details) {
    setFont(ctx, FONT.row)
    const labelW = ctx.measureText(label).width
    text(label, LEFT, y, 'left', p.muted)
    setFont(ctx, FONT.rowValue)
    const lines = wrap(ctx, value, CONTENT_W - labelW - 16)
    lines.forEach((line, i) => text(line, RIGHT, y + i * 17, 'right'))
    y += lines.length * 17 + 5
  }
  y += 4
  dashes(y)
  y += 24

  // Items: quantity and name, amount; each price and options below
  for (const line of r.lines) {
    setFont(ctx, FONT.item)
    const amountW = ctx.measureText(line.amount).width
    text(line.amount, RIGHT, y, 'right')
    const names = wrap(ctx, `${line.quantity}× ${line.name}`, CONTENT_W - amountW - 14)
    names.forEach((n, i) => text(n, LEFT, y + i * 19, 'left'))
    y += names.length * 19
    setFont(ctx, FONT.sub)
    const subs = wrap(ctx, [`${line.each} each`, line.options].filter(Boolean).join(' · '), CONTENT_W - 14)
    subs.forEach((s, i) => text(s, LEFT, y - 1 + i * 16, 'left', p.muted))
    y += subs.length * 16 + 10
  }

  if (r.notes.length) {
    setFont(ctx, FONT.sub)
    text('Notes', LEFT, y, 'left', p.muted)
    y += 17
    for (const note of r.notes) {
      for (const n of wrap(ctx, note, CONTENT_W)) { text(n, LEFT, y); y += 16 }
    }
    y += 8
  }
  dashes(y)
  y += 30

  setFont(ctx, FONT.total, true)
  text('Total', LEFT, y)
  text(r.total, RIGHT, y, 'right')
  y += 18
  dashes(y)
  y += 24

  setFont(ctx, FONT.small)
  for (const line of wrap(ctx, r.disclaimer, CONTENT_W)) { text(line, WIDTH / 2, y, 'center', p.muted); y += 15 }
  for (const line of wrap(ctx, `Thank you for ordering at ${r.place}.`, CONTENT_W)) { text(line, WIDTH / 2, y, 'center', p.muted); y += 15 }
  y += 4
  setFont(ctx, FONT.label, false, '1.5px')
  text('ORDERED WITH QYOU', WIDTH / 2, y, 'center', p.muted)
  return y + PAD - 4
}

/** The paper: rounded top corners and a torn (zigzag) bottom edge. */
function paperPath(ctx: Ctx, bottom: number) {
  const x = MARGIN, top = MARGIN, w = PAPER_W, radius = 14
  ctx.beginPath()
  ctx.moveTo(x, bottom)
  ctx.lineTo(x, top + radius)
  ctx.arcTo(x, top, x + radius, top, radius)
  ctx.lineTo(x + w - radius, top)
  ctx.arcTo(x + w, top, x + w, top + radius, radius)
  ctx.lineTo(x + w, bottom)
  const teeth = Math.round(w / TOOTH)
  const step = w / teeth
  for (let i = 0; i < teeth; i++) {
    ctx.lineTo(x + w - (i + 0.5) * step, bottom + TOOTH_DEPTH)
    ctx.lineTo(x + w - (i + 1) * step, bottom)
  }
  ctx.closePath()
}

/** The receipt as a PNG, 1080 px wide. */
export async function receiptPng(receipt: Receipt, logo: string): Promise<Blob> {
  const sample = `${receipt.place} ${receipt.total} ₱×—0123456789`
  await Promise.all(Object.values(FONT).map(f => document.fonts.load(f, sample))).catch(() => undefined)

  const palette = lightPalette()
  const canvas = document.createElement('canvas')
  let ctx = canvas.getContext('2d') as Ctx | null
  if (!ctx) throw new Error('Canvas is not available')
  const bottom = paint(ctx, receipt, logo, palette, false)
  const height = Math.ceil(bottom + TOOTH_DEPTH + MARGIN)

  canvas.width = WIDTH * SCALE
  canvas.height = height * SCALE
  ctx = canvas.getContext('2d') as Ctx
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = palette.page
  ctx.fillRect(0, 0, WIDTH, height)
  paperPath(ctx, bottom)
  ctx.fillStyle = palette.paper
  ctx.fill()
  ctx.save()
  ctx.strokeStyle = palette.line
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
  paint(ctx, receipt, logo, palette, true)

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not make the image'))), 'image/png'))
}

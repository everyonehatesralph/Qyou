// Pure hex color math used for accent theming and the contrast check.
// No imports, erasable TypeScript only, so Node can run it directly.

export type RGB = [number, number, number]

/** Parses `#rgb` or `#rrggbb` (case-insensitive). */
export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Invalid hex color: ${hex}`)
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/** Writes lowercase `#rrggbb`; channels are clamped and rounded. */
export function rgbToHex(rgb: RGB): string {
  return '#' + rgb
    .map(c => Math.min(255, Math.max(0, Math.round(c))).toString(16).padStart(2, '0'))
    .join('')
}

/** Mixes two colors; `weightA` is the share of `a` in [0, 1]. Rounds half up per channel. */
export function mixHex(a: string, b: string, weightA: number): string {
  const w = Math.min(1, Math.max(0, weightA))
  const ra = hexToRgb(a)
  const rb = hexToRgb(b)
  const mixed = ra.map((c, i) => Math.floor(c * w + rb[i] * (1 - w) + 0.5)) as RGB
  return rgbToHex(mixed)
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.x contrast ratio, always ≥ 1. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

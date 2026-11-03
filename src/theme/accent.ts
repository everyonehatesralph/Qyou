// Computes the restaurant's accent shades for both modes and injects them as
// CSS custom properties. Shades are mixed here in JS rather than with CSS
// color-mix(), so iOS Safari before 16.2 renders them correctly.

import { contrastRatio, mixHex, relativeLuminance } from './color.ts'
import { RESTAURANT } from '../config/restaurant.ts'

export type Mode = 'light' | 'dark'

/** Surface color each mode's `--accent-soft` is mixed against (matches globals.css). */
const SURFACE: Record<Mode, string> = { light: '#FFFFFF', dark: '#131B2E' }

/**
 * Accent mixed toward black (light mode) or white (dark mode) just enough to
 * read as text on every given background (≥ 4.6:1). Works for any accent a
 * restaurant picks, bright or dark.
 */
function readableAccentText(mode: Mode, accent: string, backgrounds: string[]): string {
  const toward = mode === 'light' ? '#000000' : '#ffffff'
  for (let w = 0.85; w >= 0.2; w -= 0.05) {
    const candidate = mixHex(accent, toward, w)
    if (backgrounds.every(bg => contrastRatio(candidate, bg) >= 4.6)) return candidate
  }
  return toward
}

export function accentTokens(
  mode: Mode,
  accent: string,
  onAccent: string,
  surface: string,
): Record<string, string> {
  // Hover moves away from the text color on the accent, so the label stays readable
  const onAccentIsDark = relativeLuminance(onAccent) < 0.18
  const hover = mixHex(accent, onAccentIsDark ? '#ffffff' : '#000000', 0.85)
  const soft = mixHex(accent, surface, mode === 'light' ? 0.12 : 0.18)
  return {
    '--accent': accent,
    '--accent-hover': hover,
    '--on-accent': onAccent,
    '--accent-soft': soft,
    '--accent-text': readableAccentText(mode, accent, [surface, soft]),
  }
}

function block(mode: Mode): string {
  const tokens = accentTokens(mode, RESTAURANT.accent[mode], RESTAURANT.onAccent[mode], SURFACE[mode])
  return Object.entries(tokens).map(([k, v]) => `${k}:${v};`).join('')
}

/** Injects `<style id="qyou-accent">` once. Call before the first render. */
export function applyRestaurantTheme(): void {
  if (typeof document === 'undefined' || document.getElementById('qyou-accent')) return
  const style = document.createElement('style')
  style.id = 'qyou-accent'
  style.textContent =
    `:root,[data-theme="light"]{${block('light')}}` +
    `[data-theme="dark"]{${block('dark')}}`
  document.head.appendChild(style)
}

// Computes the restaurant's accent shades for both modes and injects them as
// CSS custom properties. Shades are mixed here in JS rather than with CSS
// color-mix(), so iOS Safari before 16.2 renders them correctly.

import { mixHex } from './color.ts'
import { RESTAURANT } from '../config/restaurant.ts'

export type Mode = 'light' | 'dark'

/** Surface color each mode's `--accent-soft` is mixed against (matches globals.css). */
const SURFACE: Record<Mode, string> = { light: '#FFFFFF', dark: '#1E1A17' }

export function accentTokens(
  mode: Mode,
  accent: string,
  onAccent: string,
  surface: string,
): Record<string, string> {
  if (mode === 'light') {
    return {
      '--accent': accent,
      '--accent-hover': mixHex(accent, '#000000', 0.85),
      '--on-accent': onAccent,
      '--accent-soft': mixHex(accent, surface, 0.12),
      '--accent-text': mixHex(accent, '#000000', 0.8),
    }
  }
  return {
    '--accent': accent,
    '--accent-hover': mixHex(accent, '#ffffff', 0.85),
    '--on-accent': onAccent,
    '--accent-soft': mixHex(accent, surface, 0.18),
    '--accent-text': mixHex(accent, '#ffffff', 0.85),
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

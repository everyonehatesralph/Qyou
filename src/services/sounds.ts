// Order alert sounds. Browsers only play audio once the person has tapped the page, so the
// first tap (or key press) anywhere unlocks it. Until then isSoundOn() is false and staff
// screens say so, because an alert that can't make a sound is a missed order.

export type Sound = 'newOrder' | 'orderReady'

const FILES: Record<Sound, string> = {
  newOrder:   '/sounds/new-order.mp3',
  orderReady: '/sounds/order-ready.mp3',
}
const SOUNDS = Object.keys(FILES) as Sound[]
const GESTURES = ['pointerdown', 'touchend', 'keydown'] as const

const elements: Partial<Record<Sound, HTMLAudioElement>> = {}
let unlocked = false
let armed = false
let unlocking = false
const listeners = new Set<(on: boolean) => void>()

function element(sound: Sound): HTMLAudioElement {
  let a = elements[sound]
  if (!a) {
    a = new Audio(FILES[sound])
    a.preload = 'auto'
    elements[sound] = a
  }
  return a
}

function setUnlocked(on: boolean) {
  if (on === unlocked) return
  unlocked = on
  listeners.forEach(l => l(on))
}

/** Plays each sound silently once, which is what lets it ring later (iOS needs every element). */
function tryUnlock() {
  if (unlocked || unlocking) return
  unlocking = true
  Promise.all(SOUNDS.map(s => {
    const a = element(s)
    a.muted = true
    return a.play().then(() => { a.pause(); a.currentTime = 0 })
  }))
    .then(() => {
      setUnlocked(true)
      GESTURES.forEach(g => document.removeEventListener(g, tryUnlock, true))
    })
    // Still blocked: the listeners stay, so the next tap tries again
    .catch(() => { /* noop */ })
    .finally(() => {
      SOUNDS.forEach(s => { if (elements[s]) elements[s]!.muted = false })
      unlocking = false
    })
}

/** Starts listening for the tap that unlocks audio. Safe to call from every screen. */
export function armSound() {
  if (armed || typeof document === 'undefined') return
  armed = true
  GESTURES.forEach(g => document.addEventListener(g, tryUnlock, true))
  // Someone already tapped this page (e.g. typing the staff PIN): unlocking is allowed now
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  if (activation?.hasBeenActive) tryUnlock()
}

export function isSoundOn() {
  return unlocked
}

export function onSoundChange(listener: (on: boolean) => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Plays a sound from the start. Resolves false if the browser still blocks it. */
export async function playSound(sound: Sound): Promise<boolean> {
  const a = element(sound)
  try {
    a.muted = false
    a.volume = 1
    a.currentTime = 0
    await a.play()
    setUnlocked(true)
    return true
  } catch {
    return beep()
  }
}

export function stopSound(sound: Sound) {
  const a = elements[sound]
  if (a) { a.pause(); a.currentTime = 0 }
}

export function vibrate(pattern: number[]) {
  try { navigator.vibrate?.(pattern) } catch { /* not supported */ }
}

let audioContext: AudioContext | null = null

/** Two short tones, for when the sound file can't play. Also needs an unlocked page. */
function beep(): boolean {
  try {
    audioContext ??= new AudioContext()
    const ctx = audioContext
    if (ctx.state !== 'running') return false
    const tone = (start: number, freq: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.4, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25)
      osc.start(start)
      osc.stop(start + 0.25)
    }
    tone(ctx.currentTime, 880)
    tone(ctx.currentTime + 0.3, 1100)
    return true
  } catch {
    return false
  }
}

// ─── Which orders already rang on this device ────────────────────────────────
const MAX_REMEMBERED = 500

export function loadRang(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(`qyou_rang_${key}`)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch { /* noop */ }
  return new Set()
}

export function saveRang(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(`qyou_rang_${key}`, JSON.stringify([...ids].slice(-MAX_REMEMBERED)))
  } catch { /* noop */ }
}

/**
 * The orders in `candidates` that haven't rung yet, and the set to remember afterwards.
 * Pure, so the rules are tested without a browser.
 */
export function newlyDue(candidates: string[], rang: Set<string>): { fresh: string[]; next: Set<string> } {
  const fresh = candidates.filter(id => !rang.has(id))
  if (fresh.length === 0) return { fresh, next: rang }
  return { fresh, next: new Set([...rang, ...fresh]) }
}

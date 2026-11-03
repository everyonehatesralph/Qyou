import { useSyncExternalStore } from 'react'
import type { MenuItem } from '../constants/menu'

// Item photos: the built-in one, or one staff picked on the staff menu.
// Picked photos are kept in this device's storage for now, so other phones keep
// seeing the built-in photo until the shared backend stores them.

const KEY = 'qyou_menu_photos'
const SIZE = 640
const MAX_FILE = 20 * 1024 * 1024

/** Item id → data URL of the picked photo, or '' when staff removed the photo. */
export type PhotoOverrides = Record<number, string>

let cache: PhotoOverrides | null = null
const listeners = new Set<() => void>()
let channel: BroadcastChannel | null = null

function read(): PhotoOverrides {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

function emit() {
  listeners.forEach(fn => fn())
}

function getSnapshot() {
  if (!cache) cache = read()
  return cache
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  // Other tabs: BroadcastChannel where it exists, the storage event otherwise
  if (!channel && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(KEY)
    channel.onmessage = () => { cache = read(); emit() }
  }
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = read(); emit() } }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}

function write(next: PhotoOverrides) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    throw new Error('This device is out of space for photos. Remove a photo you don’t need and try again.')
  }
  cache = next
  emit()
  channel?.postMessage('changed')
}

export function usePhotoOverrides(): PhotoOverrides {
  return useSyncExternalStore(subscribe, getSnapshot)
}

/** The photo to show for an item, or null for none. */
export function photoFor(item: Pick<MenuItem, 'id' | 'image'>, overrides: PhotoOverrides): string | null {
  if (item.id in overrides) return overrides[item.id] || null
  return item.image ?? null
}

export function savePhoto(id: number, dataUrl: string) {
  write({ ...getSnapshot(), [id]: dataUrl })
}

/** No photo at all for this item (guests see its letter tile). */
export function removePhoto(id: number) {
  write({ ...getSnapshot(), [id]: '' })
}

/** Back to the built-in photo. */
export function resetPhoto(id: number) {
  const next = { ...getSnapshot() }
  delete next[id]
  write(next)
}

/**
 * Turns a picked file into a square, menu-sized photo: centre-cropped to 640×640 and
 * re-encoded (WebP where the browser can, JPEG otherwise), so a 5 MB camera photo
 * becomes ~60 KB.
 */
export async function preparePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('That file isn’t a photo. Choose a JPG, PNG or HEIC image.')
  if (file.size > MAX_FILE) throw new Error('That photo is over 20 MB. Choose a smaller one.')

  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode().catch(() => { throw new Error('This photo couldn’t be opened. Try another one.') })

    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = Math.min(SIZE, side)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('This browser can’t prepare photos.')
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
      0, 0, canvas.width, canvas.height,
    )
    const webp = canvas.toDataURL('image/webp', 0.8)
    // Browsers that can't encode WebP hand back a PNG instead
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

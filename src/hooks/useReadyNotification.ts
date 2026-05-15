import { useEffect, useRef, useCallback, useState } from 'react'
import { getMyOrderIds } from '../context/OrderContext'
import type { Order } from '../context/OrderContext'

const RINGTONE_PATH = '/sounds/your-phone-lingoging.mp3'

/**
 * Audio unlock utility.
 * Browsers block audio playback until the user has interacted with the page.
 * This pre-loads the ringtone and "unlocks" the audio context on first tap/click.
 */
let audioUnlocked = false
let preloadedAudio: HTMLAudioElement | null = null

function ensureAudioUnlock() {
  if (audioUnlocked) return

  const unlock = () => {
    if (audioUnlocked) return
    audioUnlocked = true

    // Pre-load the ringtone
    preloadedAudio = new Audio(RINGTONE_PATH)
    preloadedAudio.preload = 'auto'
    preloadedAudio.load()

    // Play a silent frame to unlock audio pipeline
    preloadedAudio.volume = 0
    preloadedAudio.play().then(() => {
      preloadedAudio!.pause()
      preloadedAudio!.currentTime = 0
      preloadedAudio!.volume = 1.0
    }).catch(() => {
      // Still blocked — will retry on next interaction
      audioUnlocked = false
    })

    document.removeEventListener('click', unlock, true)
    document.removeEventListener('touchstart', unlock, true)
    document.removeEventListener('touchend', unlock, true)
  }

  document.addEventListener('click', unlock, true)
  document.addEventListener('touchstart', unlock, true)
  document.addEventListener('touchend', unlock, true)
}

/**
 * Plays the ringtone. Returns a promise that resolves when playback starts.
 */
function playRingtone(): Promise<void> {
  return new Promise((resolve) => {
    try {
      // Use preloaded audio or create new
      const audio = preloadedAudio || new Audio(RINGTONE_PATH)
      audio.currentTime = 0
      audio.volume = 1.0
      audio.play().then(resolve).catch(() => {
        console.warn('[ReadyNotification] Ringtone blocked — tap the page first')
        resolve()
      })
    } catch {
      resolve()
    }
  })
}

/**
 * Vibrates the device with a strong pattern.
 */
function vibrateDevice() {
  if ('vibrate' in navigator) {
    // Strong pattern: long-short-long-short-long
    navigator.vibrate([500, 150, 500, 150, 300])
  }
}

/**
 * Hook: fires ringtone + vibration when any of this customer's orders
 * transitions to "ready" status.
 *
 * Returns { readyOrderId } — the ID of the order that just became ready,
 * so the UI can show a notification overlay.
 */
export function useReadyNotification(orders: Order[]) {
  const prevReadyIdsRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)
  const [newReadyOrderId, setNewReadyOrderId] = useState<string | null>(null)

  // Start listening for audio unlock as soon as hook mounts
  useEffect(() => {
    ensureAudioUnlock()
  }, [])

  useEffect(() => {
    const myIds = new Set(getMyOrderIds())
    const myOrders = orders.filter(o => myIds.has(o.id))
    const currentReadyIds = new Set(
      myOrders.filter(o => o.status === 'ready').map(o => o.id)
    )

    // Skip on first mount
    if (!initializedRef.current) {
      initializedRef.current = true
      prevReadyIdsRef.current = currentReadyIds
      return
    }

    // Find newly ready orders
    let newReadyId: string | null = null
    currentReadyIds.forEach(id => {
      if (!prevReadyIdsRef.current.has(id)) {
        newReadyId = id
      }
    })

    if (newReadyId) {
      playRingtone()
      vibrateDevice()
      setNewReadyOrderId(newReadyId)
    }

    prevReadyIdsRef.current = currentReadyIds
  }, [orders])

  const dismissNotification = useCallback(() => {
    setNewReadyOrderId(null)
    // Stop ringtone when dismissed
    if (preloadedAudio) {
      preloadedAudio.pause()
      preloadedAudio.currentTime = 0
    }
  }, [])

  return { newReadyOrderId, dismissNotification }
}

import { useEffect, useRef, useCallback } from 'react'
import { getMyOrderIds } from '../context/OrderContext'
import type { Order } from '../context/OrderContext'

/**
 * Plays a ringtone + vibrates when any of the customer's orders
 * transitions to "ready" status.
 *
 * Uses /sounds/your-phone-lingoging.mp3 as the notification ringtone.
 * Vibration pattern: long buzz → pause → long buzz → pause → short buzz
 */
export function useReadyNotification(orders: Order[]) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevReadyIdsRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)

  const playRingtone = useCallback(() => {
    try {
      // Stop any currently playing ringtone
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }

      const audio = new Audio('/sounds/your-phone-lingoging.mp3')
      audio.volume = 1.0
      audioRef.current = audio
      audio.play().catch(() => {
        // Browser may block autoplay — silently fail
        console.warn('Ringtone blocked by browser autoplay policy')
      })
    } catch (e) {
      console.warn('Ringtone unavailable:', e)
    }
  }, [])

  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) {
      // Strong vibration pattern: buzz-pause-buzz-pause-buzz
      navigator.vibrate([400, 200, 400, 200, 200])
    }
  }, [])

  useEffect(() => {
    const myIds = new Set(getMyOrderIds())
    const myOrders = orders.filter(o => myIds.has(o.id))
    const currentReadyIds = new Set(
      myOrders.filter(o => o.status === 'ready').map(o => o.id)
    )

    // Skip notification on first mount (don't ring for already-ready orders)
    if (!initializedRef.current) {
      initializedRef.current = true
      prevReadyIdsRef.current = currentReadyIds
      return
    }

    // Check if any NEW order just became ready
    let hasNew = false
    currentReadyIds.forEach(id => {
      if (!prevReadyIdsRef.current.has(id)) {
        hasNew = true
      }
    })

    if (hasNew) {
      playRingtone()
      vibrate()
    }

    prevReadyIdsRef.current = currentReadyIds
  }, [orders, playRingtone, vibrate])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])
}

import { useEffect, useRef, useCallback } from 'react'
import type { Order } from '../context/OrderContext'
/**
 * Plays a notification sound and vibrates the device.
 *
 * @param orders     — full orders array
 * @param filterFn   — optional: only count orders matching this predicate.
 *                      Notification fires when the FILTERED count increases.
 *                      Dashboard: pass undefined (fires on new orders).
 *                      Kitchen:   pass `o => o.status === 'confirmed'` (fires on cashier confirmation).
 */
export function useOrderNotification(
  orders: Order[],
  filterFn?: (order: Order) => boolean,
) {
  const count = filterFn ? orders.filter(filterFn).length : orders.length
  const prevCountRef  = useRef(count)
  const audioCtxRef   = useRef<AudioContext | null>(null)

  const playSound = useCallback(async () => {
    try {
      const audio = new Audio('/sounds/stupid-f__king-bird.mp3')
      audio.volume = 0.8
      await audio.play()
    } catch {
      // Fallback: generate a pleasant double-beep via Web Audio API
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext()
        }
        const ctx = audioCtxRef.current
        const playBeep = (startTime: number, freq: number, duration: number) => {
          const osc  = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.setValueAtTime(freq, startTime)
          osc.type = 'sine'
          gain.gain.setValueAtTime(0, startTime)
          gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
          osc.start(startTime)
          osc.stop(startTime + duration)
        }
        const now = ctx.currentTime
        playBeep(now,       880, 0.25)
        playBeep(now + 0.3, 1100, 0.25)
      } catch (e) {
        console.warn('Audio notification unavailable:', e)
      }
    }
  }, [])

  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }
  }, [])

  useEffect(() => {
    if (count > prevCountRef.current) {
      playSound()
      vibrate()
    }
    prevCountRef.current = count
  }, [count, playSound, vibrate])
}
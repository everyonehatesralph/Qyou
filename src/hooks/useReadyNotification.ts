import { useEffect, useCallback, useState } from 'react'
import { getMyOrderIds } from '../context/OrderContext'
import type { Order } from '../context/OrderContext'
import { armSound, loadRang, newlyDue, playSound, saveRang, stopSound, vibrate } from '../services/sounds'

/**
 * Rings and vibrates once when one of this phone's orders becomes ready, on whatever page
 * the guest is on. Remembered by order id, so a reload never rings again for an order that
 * already rang, and an order that became ready while the phone slept rings when it wakes.
 *
 * Returns the order that just became ready, for the on-screen alert.
 */
export function useReadyNotification(orders: Order[], connected: boolean) {
  const [readyOrder, setReadyOrder] = useState<Order | null>(null)

  useEffect(() => { armSound() }, [])

  useEffect(() => {
    if (!connected) return
    const mine = new Set(getMyOrderIds())
    const ready = orders.filter(o => mine.has(o.id) && o.status === 'ready')
    const { fresh, next } = newlyDue(ready.map(o => o.id), loadRang('ready'))
    if (fresh.length === 0) return
    saveRang('ready', next)
    setReadyOrder(ready.find(o => o.id === fresh[0]) ?? null)
    void playSound('orderReady')
    vibrate([500, 150, 500, 150, 300])
  }, [orders, connected])

  // Picked up or served meanwhile: the alert has done its job
  useEffect(() => {
    if (!readyOrder) return
    const now = orders.find(o => o.id === readyOrder.id)
    if (now && now.status !== 'ready') {
      setReadyOrder(null)
      stopSound('orderReady')
    }
  }, [orders, readyOrder])

  const dismissNotification = useCallback(() => {
    setReadyOrder(null)
    stopSound('orderReady')
  }, [])

  return { readyOrder, dismissNotification }
}

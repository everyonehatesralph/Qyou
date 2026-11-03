import { useEffect, useRef } from 'react'
import type { Order } from '../context/OrderContext'
import { armSound, loadRang, newlyDue, playSound, saveRang, vibrate } from '../services/sounds'

/**
 * Rings once for every order that newly matches `match`: a new order on the dashboard,
 * a confirmed ticket in the kitchen. Orders are remembered by id on this device, so a
 * reload, a reconnect, or another order leaving at the same moment never causes a missed
 * or a repeated ring. Nothing rings until the order feed is live.
 *
 * @param storageKey  one per screen, e.g. 'dashboard' and 'kitchen'
 */
export function useOrderNotification(
  orders: Order[],
  match: (order: Order) => boolean,
  { connected, storageKey }: { connected: boolean; storageKey: string },
) {
  const matchRef = useRef(match)
  matchRef.current = match

  useEffect(() => { armSound() }, [])

  useEffect(() => {
    if (!connected) return
    // Board entries (another guest's order seen from a guest view) never ring
    const due = orders.filter(o => !o.id.startsWith('board:') && matchRef.current(o)).map(o => o.id)
    const { fresh, next } = newlyDue(due, loadRang(storageKey))
    if (fresh.length === 0) return
    saveRang(storageKey, next)
    void playSound('newOrder')
    vibrate([200, 100, 200])
  }, [orders, connected, storageKey])
}

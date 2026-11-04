import {
  createContext, useContext, useState, useCallback, useMemo,
  useEffect, useRef, type ReactNode,
} from 'react'
import { orderSync } from '../services/orderSync'
import {
  newOrderId, orderErrorText, type CheckoutState, type Order, type OrderStatus, type OrderType, type PlaceOrderInput,
} from '../services/orderModel'
import { metricsCollector } from '../services/metricsCollector'
import { useAuth } from './AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────
export type { Order, OrderItem, OrderStatus, OrderType } from '../services/orderModel'
export { getMyOrderIds, isAwaitingPayment, forgetCheckout } from '../services/orderSync'

type CartLine = { id: number; name: string; price: number; quantity: number; choices?: number[] }

/** Only ids, quantities and option choices go up: the server prices the order from its menu. */
function orderRequest(
  cartItems: CartLine[], tableId: number | null, tableName: string, customerName: string, orderType: OrderType, notes?: string,
): Omit<PlaceOrderInput, 'id'> {
  return {
    tableId:      tableId ?? 0,
    tableName:    tableName || `Table ${tableId}`,
    customerName,
    orderType,
    items:        cartItems.map(ci => ({ id: ci.id, quantity: ci.quantity, ...(ci.choices?.length ? { choices: ci.choices } : {}) })),
    notes,
  }
}

// The last pay-now try in this tab: paying again for the same cart (back from the payment page,
// even after a reload) reuses its id, so the server hands back the same checkout, never a second one.
const SS_PAY_ATTEMPT = 'qyou_pay_attempt'
function readAttempt(): { key: string; id: string } | null {
  try { return JSON.parse(sessionStorage.getItem(SS_PAY_ATTEMPT) ?? 'null') } catch { return null }
}
function saveAttempt(attempt: { key: string; id: string } | null) {
  try {
    if (attempt) sessionStorage.setItem(SS_PAY_ATTEMPT, JSON.stringify(attempt))
    else sessionStorage.removeItem(SS_PAY_ATTEMPT)
  } catch { /* noop */ }
}

// Orders used to live in this browser only; drop that stale copy
try { localStorage.removeItem('qyou_orders') } catch { /* noop */ }

// ─── Context ──────────────────────────────────────────────────────────────────
interface OrderContextType {
  /** Staff: every order. Guests: their own orders, plus other people's active orders without items or totals. */
  orders: Order[]
  /** Resolves with the new order's id once the restaurant has it; rejects with words to show the guest. */
  placeOrder: (
    cartItems: { id: number; name: string; price: number; quantity: number; choices?: number[] }[],
    tableId: number | null,
    tableName: string,
    customerName: string,
    orderType: OrderType,
    notes?: string,
  ) => Promise<string>
  /**
   * Pay now: prices the order and opens its payment. Resolves with where to pay, or with no
   * checkoutUrl when this cart is already paid (go to the order). Rejects with words to show.
   */
  startCheckout: (
    cartItems: CartLine[],
    tableId: number | null,
    tableName: string,
    customerName: string,
    orderType: OrderType,
    notes?: string,
  ) => Promise<{ orderId: string; checkoutUrl?: string }>
  /** Whether a pay-now order has been paid; loads it once it has. */
  checkPayment: (orderId: string) => Promise<CheckoutState>
  updateOrderStatus: (orderId: string, status: OrderStatus) => void
  cancelOrder: (orderId: string) => void
  getOrder: (orderId: string) => Order | undefined
  isConnected: boolean
  syncMode: 'supabase' | 'server'
}

const OrderContext = createContext<OrderContextType | null>(null)

export function OrderProvider({ children }: { children: ReactNode }) {
  const { isStaff } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [isConnected, setIsConnected] = useState(false)
  /** The last order that failed to send; retrying the same cart reuses its id, so it can't land twice. */
  const lastFailed = useRef<{ key: string; id: string } | null>(null)
  const isStaffRef = useRef(isStaff)

  useEffect(() => {
    isStaffRef.current = isStaff
    orderSync.setRole(isStaff ? 'staff' : 'guest')
  }, [isStaff])

  useEffect(() => {
    metricsCollector.recordSSEConnection(true)
    const unsub = orderSync.onChange((next, connected) => {
      setOrders(next)
      setIsConnected(connected)
    })
    return () => {
      unsub()
      metricsCollector.recordSSEConnection(false)
    }
  }, [])

  // ── Place order ──
  const placeOrder = useCallback(async (
    cartItems: { id: number; name: string; price: number; quantity: number; choices?: number[] }[],
    tableId: number | null,
    tableName: string,
    customerName: string,
    orderType: OrderType,
    notes?: string,
  ): Promise<string> => {
    const startTime = performance.now()
    metricsCollector.recordOrderInFlight(true)

    const request = orderRequest(cartItems, tableId, tableName, customerName, orderType, notes)
    const key = JSON.stringify(request)
    const id = lastFailed.current?.key === key ? lastFailed.current.id : newOrderId()

    try {
      const order = await orderSync.placeOrder({ id, ...request })
      lastFailed.current = null
      metricsCollector.recordOrderLatency(performance.now() - startTime)
      metricsCollector.recordOrderProcessed(true)
      return order.id
    } catch (err) {
      lastFailed.current = { key, id }
      metricsCollector.recordOrderProcessed(false)
      throw new Error(orderErrorText(err))
    } finally {
      metricsCollector.recordOrderInFlight(false)
    }
  }, [])

  // ── Pay now ──
  const startCheckout = useCallback(async (
    cartItems: CartLine[],
    tableId: number | null,
    tableName: string,
    customerName: string,
    orderType: OrderType,
    notes?: string,
  ): Promise<{ orderId: string; checkoutUrl?: string }> => {
    const request = orderRequest(cartItems, tableId, tableName, customerName, orderType, notes)
    const key = JSON.stringify(request)
    const last = readAttempt()
    let id = last?.key === key ? last.id : newOrderId()
    for (let tries = 0; ; tries++) {
      saveAttempt({ key, id })
      try {
        const started = await orderSync.startCheckout({ id, ...request })
        if ('paid' in started) return { orderId: id }
        return { orderId: id, checkoutUrl: started.checkoutUrl }
      } catch (err) {
        const code = err instanceof Error ? err.message : String(err)
        // This very cart was already paid for from this tab: that is the order
        if (code.includes('already_placed') && last?.id === id) return { orderId: id }
        // The id went with another cart: once more with a new one
        if (tries === 0 && (code.includes('checkout_changed') || code.includes('already_placed'))) {
          id = newOrderId()
          continue
        }
        throw new Error(orderErrorText(err))
      }
    }
  }, [])

  const checkPayment = useCallback((orderId: string) => orderSync.checkPayment(orderId), [])

  // Once the paid order is here, the next pay-now cart is a new order, even if it looks the same
  useEffect(() => {
    const attempt = readAttempt()
    if (attempt && orders.some(o => o.id === attempt.id)) saveAttempt(null)
  }, [orders])

  // ── Update status (staff) ──
  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    const startTime = performance.now()
    orderSync.updateStatus(orderId, status).then(
      () => metricsCollector.recordSSEUpdateLatency(performance.now() - startTime),
      err => console.warn(`[orders] could not mark ${orderId} ${status}:`, orderErrorText(err)),
    )
  }, [])

  // ── Cancel order ──
  const cancelOrder = useCallback((orderId: string) => {
    // Can only cancel pending or confirmed orders, and guests can't cancel what they paid online
    const order = orders.find(o => o.id === orderId)
    if (!order || !['pending', 'confirmed'].includes(order.status) || (!isStaffRef.current && order.paidOnlineAt)) {
      return
    }
    orderSync.cancelOrder(orderId).catch(err => console.warn(`[orders] could not cancel ${orderId}:`, orderErrorText(err)))
  }, [orders])

  const getOrder = useCallback(
    (orderId: string) => orders.find(o => o.id === orderId),
    [orders]
  )

  const value = useMemo(() => ({
    orders, placeOrder, startCheckout, checkPayment, updateOrderStatus, cancelOrder, getOrder, isConnected, syncMode: orderSync.mode,
  }), [orders, placeOrder, startCheckout, checkPayment, updateOrderStatus, cancelOrder, getOrder, isConnected])

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
}

/** Whether guests can pay online here; null until known. */
export function usePaymentsEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  useEffect(() => {
    let live = true
    orderSync.paymentsEnabled().then(on => { if (live) setEnabled(on) })
    return () => { live = false }
  }, [])
  return enabled
}

export function useOrders() {
  const ctx = useContext(OrderContext)
  if (!ctx) throw new Error('useOrders must be used within OrderProvider')
  // Pages that show orders start the live feed; the landing page never opens one
  useEffect(() => { orderSync.start() }, [])
  return ctx
}

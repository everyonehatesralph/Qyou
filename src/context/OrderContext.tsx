import {
  createContext, useContext, useState, useCallback, useMemo,
  useEffect, useRef, type ReactNode,
} from 'react'
import { orderSync } from '../services/orderSync'
import { newOrderId, orderErrorText, type Order, type OrderStatus, type OrderType, type PlaceOrderInput } from '../services/orderModel'
import { metricsCollector } from '../services/metricsCollector'
import { useAuth } from './AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────
export type { Order, OrderItem, OrderStatus, OrderType } from '../services/orderModel'
export { getMyOrderIds } from '../services/orderSync'

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

  useEffect(() => {
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

    // Only ids, quantities and option choices go up: the server prices the order from its menu
    const request: Omit<PlaceOrderInput, 'id'> = {
      tableId:      tableId ?? 0,
      tableName:    tableName || `Table ${tableId}`,
      customerName,
      orderType,
      items:        cartItems.map(ci => ({ id: ci.id, quantity: ci.quantity, ...(ci.choices?.length ? { choices: ci.choices } : {}) })),
      notes,
    }
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
    // Can only cancel pending or confirmed orders
    const order = orders.find(o => o.id === orderId)
    if (!order || !['pending', 'confirmed'].includes(order.status)) {
      return
    }
    orderSync.cancelOrder(orderId).catch(err => console.warn(`[orders] could not cancel ${orderId}:`, orderErrorText(err)))
  }, [orders])

  const getOrder = useCallback(
    (orderId: string) => orders.find(o => o.id === orderId),
    [orders]
  )

  const value = useMemo(() => ({
    orders, placeOrder, updateOrderStatus, cancelOrder, getOrder, isConnected, syncMode: orderSync.mode,
  }), [orders, placeOrder, updateOrderStatus, cancelOrder, getOrder, isConnected])

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
}

export function useOrders() {
  const ctx = useContext(OrderContext)
  if (!ctx) throw new Error('useOrders must be used within OrderProvider')
  // Pages that show orders start the live feed; the landing page never opens one
  useEffect(() => { orderSync.start() }, [])
  return ctx
}

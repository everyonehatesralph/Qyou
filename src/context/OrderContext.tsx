import {
  createContext, useContext, useState, useCallback, useMemo,
  useEffect, type ReactNode,
} from 'react'
import { orderSync } from '../services/orderSync'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface OrderItem {
  id: number
  name: string
  price: number
  quantity: number
}
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served'
export interface Order {
  id: string
  tableId: number
  tableName: string
  customerName: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  createdAt: string
  notes?: string
  confirmedAt?: string
  preparingAt?: string
  readyAt?: string
  servedAt?: string
}

// ─── localStorage helpers ──────────────────────────────────────────────────────
const LS_ORDERS    = 'deverse_orders'
const LS_MY_ORDERS = 'deverse_my_orders'

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LS_ORDERS)
    if (raw) return JSON.parse(raw) as Order[]
  } catch { /* noop */ }
  return []
}

function saveMyOrderId(orderId: string) {
  try {
    const raw = localStorage.getItem(LS_MY_ORDERS)
    const ids: string[] = raw ? JSON.parse(raw) : []
    if (!ids.includes(orderId)) {
      ids.unshift(orderId)
      localStorage.setItem(LS_MY_ORDERS, JSON.stringify(ids.slice(0, 20)))
    }
  } catch { /* noop */ }
}

export function getMyOrderIds(): string[] {
  try {
    const raw = localStorage.getItem(LS_MY_ORDERS)
    if (raw) return JSON.parse(raw)
  } catch { /* noop */ }
  return []
}

function makeOrderId() {
  return Math.floor(10000 + Math.random() * 90000).toString()
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface OrderContextType {
  orders: Order[]
  placeOrder: (
    cartItems: { id: number; name: string; price: number; quantity: number }[],
    tableId: number | null,
    tableName: string,
    customerName: string,
    notes?: string,
  ) => string
  updateOrderStatus: (orderId: string, status: OrderStatus) => void
  getOrder: (orderId: string) => Order | undefined
  isConnected: boolean
}

const OrderContext = createContext<OrderContextType | null>(null)

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(loadOrders)
  const [isConnected, setIsConnected] = useState(false)

  // ── Connect SSE for real-time cross-device sync ──
  useEffect(() => {
    orderSync.connect()

    const unsub = orderSync.onSync((payload) => {
      const serverOrders = payload as Order[]
      setOrders(serverOrders)
      setIsConnected(true)
      try { localStorage.setItem(LS_ORDERS, JSON.stringify(serverOrders)) } catch { /* noop */ }
    })

    // Check connection status periodically
    const interval = setInterval(() => {
      setIsConnected(orderSync.isConnected)
    }, 3000)

    return () => {
      unsub()
      clearInterval(interval)
    }
  }, [])

  // ── Place order ──
  const placeOrder = useCallback((
    cartItems: { id: number; name: string; price: number; quantity: number }[],
    tableId: number | null,
    tableName: string,
    customerName: string,
    notes?: string,
  ): string => {
    const id = makeOrderId()
    const newOrder: Order = {
      id,
      tableId:      tableId ?? 0,
      tableName:    tableName || `Table ${tableId}`,
      customerName,
      items:        cartItems.map(ci => ({ id: ci.id, name: ci.name, price: ci.price, quantity: ci.quantity })),
      total:        cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
      status:       'pending',
      createdAt:    new Date().toISOString(),
      notes,
    }

    // Optimistic update
    setOrders(prev => {
      const next = [newOrder, ...prev]
      try { localStorage.setItem(LS_ORDERS, JSON.stringify(next)) } catch { /* noop */ }
      return next
    })

    saveMyOrderId(id)

    // Send to server (async — don't block)
    orderSync.placeOrder(newOrder)

    return id
  }, [])

  // ── Update status ──
  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    const timestamp = new Date().toISOString()
    const STAGE_TS: Partial<Record<OrderStatus, keyof Order>> = {
      confirmed: 'confirmedAt',
      preparing: 'preparingAt',
      ready:     'readyAt',
      served:    'servedAt',
    }
    const tsKey = STAGE_TS[status]

    // Optimistic update
    setOrders(prev => {
      const next = prev.map(o => o.id === orderId
        ? { ...o, status, ...(tsKey ? { [tsKey]: timestamp } : {}) }
        : o
      )
      try { localStorage.setItem(LS_ORDERS, JSON.stringify(next)) } catch { /* noop */ }
      return next
    })

    // Send to server (async — don't block)
    orderSync.updateStatus(orderId, status)
  }, [])

  const getOrder = useCallback(
    (orderId: string) => orders.find(o => o.id === orderId),
    [orders]
  )

  const value = useMemo(() => ({
    orders, placeOrder, updateOrderStatus, getOrder, isConnected,
  }), [orders, placeOrder, updateOrderStatus, getOrder, isConnected])

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
}

export function useOrders() {
  const ctx = useContext(OrderContext)
  if (!ctx) throw new Error('useOrders must be used within OrderProvider')
  return ctx
}

import {
  createContext, useContext, useState, useCallback, useMemo, useEffect,
  type ReactNode,
} from 'react'
import { useMenuState } from './MenuContext'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CartItemType {
  id: number
  name: string
  price: number
  category: string
  description: string
  quantity: number
  /** False when the item sold out or left the menu after it was added. */
  available: boolean
}

interface CartLine { id: number; quantity: number }

interface CartContextType {
  cartItems: CartItemType[]
  addToCart: (item: { id: number }) => void
  removeFromCart: (id: number) => void
  updateQuantity: (id: number, delta: number) => void
  clearCart: () => void
  /** What the server will charge: available items at today's menu prices. */
  cartTotal: number
  cartCount: number
  /** Lines that can't be ordered right now (sold out or removed). */
  unavailableCount: number
}

const CartContext = createContext<CartContextType | null>(null)

// The cart survives a reload of this tab, not other tabs or devices
const SS_CART = 'qyou_cart'

function loadLines(): CartLine[] {
  try {
    const raw = sessionStorage.getItem(SS_CART)
    if (raw) return (JSON.parse(raw) as CartLine[]).filter(l => Number.isInteger(l.id) && l.quantity > 0)
  } catch { /* noop */ }
  return []
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { byId } = useMenuState()
  const [lines, setLines] = useState<CartLine[]>(loadLines)

  useEffect(() => {
    try { sessionStorage.setItem(SS_CART, JSON.stringify(lines)) } catch { /* noop */ }
  }, [lines])

  const addToCart = useCallback((item: { id: number }) => {
    setLines(prev => {
      const existing = prev.find(l => l.id === item.id)
      if (existing) return prev.map(l => l.id === item.id ? { ...l, quantity: l.quantity + 1 } : l)
      return [...prev, { id: item.id, quantity: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((id: number) =>
    setLines(prev => prev.filter(l => l.id !== id)), [])

  const updateQuantity = useCallback((id: number, delta: number) => {
    setLines(prev =>
      prev
        .map(l => (l.id === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter(l => l.quantity > 0),
    )
  }, [])

  const clearCart = useCallback(() => setLines([]), [])

  // Names and prices always come from the live menu, so the cart shows what the server charges
  const cartItems = useMemo(() => lines.flatMap((l): CartItemType[] => {
    const item = byId.get(l.id)
    if (!item || item.addon) return []
    return [{
      id: item.id, name: item.name, price: item.price, category: item.category, description: item.description,
      quantity: l.quantity, available: item.active && item.available,
    }]
  }), [lines, byId])

  const cartTotal = useMemo(
    () => cartItems.filter(i => i.available).reduce((s, i) => s + i.price * i.quantity, 0),
    [cartItems],
  )

  const cartCount = useMemo(
    () => cartItems.reduce((s, i) => s + i.quantity, 0),
    [cartItems],
  )

  const unavailableCount = useMemo(() => cartItems.filter(i => !i.available).length, [cartItems])

  const value = useMemo(() => ({
    cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount, unavailableCount,
  }), [cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount, unavailableCount])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

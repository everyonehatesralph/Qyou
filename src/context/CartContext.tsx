import {
  createContext, useContext, useState, useCallback, useMemo, useEffect,
  type ReactNode,
} from 'react'
import { useMenuState } from './MenuContext'
import { checkOptions, groupsFor, lineKey, type ChosenOption } from '../services/orderModel'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CartItemType {
  /** One line per item and set of choices: the same drink Large and Regular are two lines. */
  key: string
  id: number
  name: string
  /** Price of one, options included. */
  price: number
  category: string
  description: string
  quantity: number
  /** Option choice ids picked for this line. */
  choices: number[]
  /** The picked choices, for showing ("Large · Iced"). */
  options: ChosenOption[]
  /** False when the item sold out, left the menu, or its options changed after it was added. */
  available: boolean
  /** Why it can't be ordered, when it can't. */
  problem?: 'sold_out' | 'options_changed'
  /** Built-in photo, for the cart thumbnail. */
  image?: string
}

interface CartLine { id: number; quantity: number; choices?: number[] }

interface CartContextType {
  cartItems: CartItemType[]
  /** Adds one (or `quantity`) of an item with these choices. */
  addToCart: (item: { id: number }, choices?: number[], quantity?: number) => void
  /** A line's key, or an item id for items without options. */
  removeFromCart: (key: string | number) => void
  updateQuantity: (key: string | number, delta: number) => void
  clearCart: () => void
  /** What the server will charge: available items at today's menu prices, options included. */
  cartTotal: number
  cartCount: number
  /** Lines that can't be ordered right now (sold out, removed, or options changed). */
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

const keyOf = (l: CartLine) => lineKey(l.id, l.choices)
const toKey = (key: string | number) => (typeof key === 'number' ? String(key) : key)

export function CartProvider({ children }: { children: ReactNode }) {
  const { byId, allOptionGroups } = useMenuState()
  const [lines, setLines] = useState<CartLine[]>(loadLines)

  useEffect(() => {
    try { sessionStorage.setItem(SS_CART, JSON.stringify(lines)) } catch { /* noop */ }
  }, [lines])

  const addToCart = useCallback((item: { id: number }, choices: number[] = [], quantity = 1) => {
    const sorted = [...choices].sort((a, b) => a - b)
    const key = lineKey(item.id, sorted)
    setLines(prev => {
      const existing = prev.find(l => keyOf(l) === key)
      if (existing) return prev.map(l => (l === existing ? { ...l, quantity: l.quantity + quantity } : l))
      return [...prev, { id: item.id, quantity, ...(sorted.length ? { choices: sorted } : {}) }]
    })
  }, [])

  const removeFromCart = useCallback((key: string | number) =>
    setLines(prev => prev.filter(l => keyOf(l) !== toKey(key))), [])

  const updateQuantity = useCallback((key: string | number, delta: number) => {
    setLines(prev =>
      prev
        .map(l => (keyOf(l) === toKey(key) ? { ...l, quantity: l.quantity + delta } : l))
        .filter(l => l.quantity > 0),
    )
  }, [])

  const clearCart = useCallback(() => setLines([]), [])

  // Names, prices and options always come from the live menu, so the cart shows what the server charges
  const cartItems = useMemo(() => lines.flatMap((l): CartItemType[] => {
    const item = byId.get(l.id)
    if (!item || item.addon) return []
    const choices = l.choices ?? []
    const check = checkOptions(groupsFor(item, allOptionGroups), choices)
    const soldOut = !item.active || !item.available
    return [{
      key: keyOf(l), id: item.id, name: item.name, price: item.price + check.extra, category: item.category,
      description: item.description, quantity: l.quantity, choices, options: check.options,
      available: !soldOut && check.ok,
      ...(soldOut ? { problem: 'sold_out' as const } : !check.ok ? { problem: 'options_changed' as const } : {}),
      image: item.image,
    }]
  }), [lines, byId, allOptionGroups])

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

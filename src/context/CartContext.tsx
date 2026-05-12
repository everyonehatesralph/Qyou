import {
  createContext, useContext, useState, useCallback, useMemo,
  type ReactNode,
} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CartItemType {
  id: number
  name: string
  price: number
  category: string
  description: string
  quantity: number
}

interface CartContextType {
  cartItems: CartItemType[]
  addToCart: (item: Omit<CartItemType, 'quantity'>) => void
  removeFromCart: (id: number) => void
  updateQuantity: (id: number, delta: number) => void
  clearCart: () => void
  cartTotal: number
  cartCount: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItemType[]>([])

  const addToCart = useCallback((item: Omit<CartItemType, 'quantity'>) => {
    setCartItems(prev => {
      const existing = prev.find(ci => ci.id === item.id)
      if (existing) return prev.map(ci => ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci)
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((id: number) =>
    setCartItems(prev => prev.filter(ci => ci.id !== id)), [])

  const updateQuantity = useCallback((id: number, delta: number) => {
    setCartItems(prev =>
      prev.map(ci => {
        if (ci.id !== id) return ci
        const q = ci.quantity + delta
        return q <= 0 ? null : { ...ci, quantity: q }
      }).filter(Boolean) as CartItemType[]
    )
  }, [])

  const clearCart = useCallback(() => setCartItems([]), [])

  const cartTotal = useMemo(
    () => cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
    [cartItems]
  )

  const cartCount = useMemo(
    () => cartItems.reduce((s, i) => s + i.quantity, 0),
    [cartItems]
  )

  const value = useMemo(() => ({
    cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount,
  }), [cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

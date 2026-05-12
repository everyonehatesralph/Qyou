import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useOrders } from '../../context/OrderContext'
import OrderCheckoutModal, { type CheckoutOptions } from '../../components/OrderCheckoutModal'

export default function Cart() {
  const navigate = useNavigate()
  const { cartItems, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart()
  const { customerName, tableId, tableName } = useAuth()
  const { placeOrder: placeOrderRaw } = useOrders()
  const [showCheckout, setShowCheckout] = useState(false)
  const [placing,      setPlacing]      = useState(false)

  const handleCheckout = () => {
    if (cartItems.length === 0) return
    setShowCheckout(true)
  }

  const handleConfirm = (opts: CheckoutOptions) => {
    setShowCheckout(false)
    setPlacing(true)
    const fullNotes = [
      opts.dineIn ? 'Dine In' : 'Take Away',
      ...opts.addOns.map(a => a.label),
      opts.notes,
    ].filter(Boolean).join(' | ')

    setTimeout(() => {
      const orderId = placeOrderRaw(cartItems, tableId, tableName, customerName, fullNotes)
      clearCart()
      navigate(`/order/${orderId}`, { replace: true })
    }, 400)
  }

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-36 md:pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/menu')} className="p-2 rounded-lg text-text-muted hover:text-text-base hover:bg-surface-2 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <ShoppingBag className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-text-base">Your Order</h1>
          {cartItems.length > 0 && (
            <button onClick={clearCart} className="ml-auto text-xs text-error hover:text-error/80 transition-colors font-medium">
              Clear all
            </button>
          )}
        </div>

        {customerName && (
          <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-lg bg-primary-glow border border-primary/20">
            <span className="text-primary text-sm font-medium">👋 Hey, {customerName}!</span>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-text-faint mx-auto mb-4" />
            <p className="text-text-muted text-base mb-1">Your cart is empty</p>
            <p className="text-text-faint text-sm mb-6">Add items from the menu to get started</p>
            <button onClick={() => navigate('/menu')} className="btn-primary py-3 px-8 rounded-xl">
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            {/* Item list */}
            <div className="card divide-y divide-border mb-4">
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-base font-medium text-sm truncate">{item.name}</p>
                    <p className="text-text-muted text-xs mt-0.5">₱{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => item.quantity === 1 ? removeFromCart(item.id) : updateQuantity(item.id, -1)}
                      className="w-7 h-7 rounded-md bg-surface-3 border border-border hover:border-error/50 text-text-muted hover:text-error flex items-center justify-center transition-all"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="text-text-base font-semibold text-sm w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 rounded-md bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-background flex items-center justify-center transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-primary font-bold text-sm w-16 text-right flex-shrink-0">
                    ₱{(item.price * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="card p-4 mb-6">
              <div className="flex justify-between text-text-muted text-sm mb-2">
                <span>Subtotal</span>
                <span>₱{cartTotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-text-base font-bold text-base border-t border-border pt-2 mt-2">
                <span>Total</span>
                <span className="text-primary">₱{cartTotal.toFixed(0)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky place order */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4 md:px-0 md:flex md:justify-center z-30">
          <button
            onClick={handleCheckout}
            disabled={placing}
            className="w-full md:w-80 btn-primary py-4 rounded-2xl text-background font-bold text-base shadow-glow-primary disabled:opacity-60"
          >
            {placing ? '⏳ Placing order…' : `Review Order · ₱${cartTotal.toFixed(0)}`}
          </button>
        </div>
      )}

      {/* Checkout multi-step modal */}
      {showCheckout && (
        <OrderCheckoutModal
          cartItems={cartItems}
          cartTotal={cartTotal}
          customerName={customerName}
          onConfirm={handleConfirm}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  )
}

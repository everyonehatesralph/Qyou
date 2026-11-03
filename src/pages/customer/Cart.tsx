import { ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useOrders } from '../../context/OrderContext'
import { RESTAURANT } from '../../config/restaurant'
import OrderCheckoutModal, { type CheckoutOptions } from '../../components/OrderCheckoutModal'
import { Button, Card, EmptyState, LetterTile, PageHeader, QuantityStepper, buttonClasses } from '../../components/ui'

const peso = (n: number) => `${RESTAURANT.currency}${n.toFixed(0)}`

export default function Cart() {
  const navigate = useNavigate()
  const { cartItems, addToCart, updateQuantity, cartTotal, cartCount, clearCart } = useCart()
  const { customerName, tableId, tableName } = useAuth()
  const { placeOrder: placeOrderRaw } = useOrders()
  const [showCheckout, setShowCheckout] = useState(false)
  const [placing, setPlacing] = useState(false)

  const handleConfirm = (opts: CheckoutOptions) => {
    setPlacing(true)
    const fullNotes = [
      opts.dineIn ? 'Dine In' : 'Take Away',
      ...opts.addOns.map(a => a.label),
      opts.notes,
    ].filter(Boolean).join(' | ')

    setTimeout(() => {
      const orderId = placeOrderRaw(cartItems, tableId, tableName, customerName, opts.dineIn ? 'dineIn' : 'takeaway', fullNotes)
      clearCart()
      setShowCheckout(false)
      navigate(`/order/${orderId}`, { replace: true })
    }, 400)
  }

  return (
    <div className="min-h-screen bg-bg pb-44">
      <div className="mx-auto max-w-3xl px-4 pt-5">
        <PageHeader
          title="Your cart"
          subtitle={cartCount > 0 ? `${cartCount} ${cartCount === 1 ? 'item' : 'items'}${tableName ? ` · ${tableName}` : ''}` : undefined}
          back={() => navigate('/menu')}
          actions={cartItems.length > 0 ? (
            <Button variant="ghost" onClick={clearCart} className="-mr-3 text-ink-muted">Clear</Button>
          ) : undefined}
        />

        {cartItems.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            body="Add something from the menu and it will show up here."
            action={<Button variant="primary" onClick={() => navigate('/menu')}>Browse the menu</Button>}
          />
        ) : (
          <>
            <ul className="mt-5 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {cartItems.map(item => (
                <li key={item.id} className="flex gap-3 px-4 py-3.5">
                  <LetterTile text={item.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[15px] font-medium leading-snug text-ink">{item.name}</p>
                      <p className="shrink-0 text-[15px] font-medium tabular-nums text-ink">{peso(item.price * item.quantity)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-[13px] tabular-nums text-ink-muted">{peso(item.price)} each</p>
                      <QuantityStepper
                        value={item.quantity}
                        itemName={item.name}
                        onChange={next => next > item.quantity ? addToCart(item) : updateQuantity(item.id, -1)}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <Card className="mt-4">
              <dl className="space-y-1.5 text-[15px]">
                <div className="flex justify-between text-ink-muted">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{peso(cartTotal)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-2 font-medium text-ink">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{peso(cartTotal)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[13px] text-ink-muted">Add-ons and notes for the kitchen come next, at checkout.</p>
            </Card>
          </>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-4 pb-3">
          <button
            type="button"
            onClick={() => setShowCheckout(true)}
            className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true }, 'mx-auto flex max-w-3xl justify-between shadow-pop')}
          >
            <span>Checkout</span>
            <span className="tabular-nums">{peso(cartTotal)}</span>
          </button>
        </div>
      )}

      <OrderCheckoutModal
        open={showCheckout}
        cartItems={cartItems}
        cartTotal={cartTotal}
        tableName={tableName}
        placing={placing}
        onConfirm={handleConfirm}
        onClose={() => { if (!placing) setShowCheckout(false) }}
      />
    </div>
  )
}

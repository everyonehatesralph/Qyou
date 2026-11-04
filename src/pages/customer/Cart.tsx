import { ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCart } from '../../context/CartContext'
import { useMenu } from '../../context/MenuContext'
import { optionsText } from '../../services/orderModel'
import { useAuth } from '../../context/AuthContext'
import { useOrders } from '../../context/OrderContext'
import { RESTAURANT } from '../../config/restaurant'
import OrderCheckoutModal, { type CheckoutOptions } from '../../components/OrderCheckoutModal'
import ItemPhoto from '../../components/ItemPhoto'
import { Button, EmptyState, PageHeader, QuantityStepper, announce, buttonClasses, cn, focusMain } from '../../components/ui'

const peso = (n: number) => `${RESTAURANT.currency}${n.toFixed(0)}`

export default function Cart() {
  const navigate = useNavigate()
  const { cartItems, addToCart, updateQuantity, cartTotal, cartCount, clearCart, unavailableCount } = useCart()
  // Keeps names, prices and sold-out up to date while the guest looks at the cart
  useMenu()
  const { customerName, tableId, tableName } = useAuth()
  const { placeOrder: placeOrderRaw } = useOrders()
  const [showCheckout, setShowCheckout] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState('')

  const itemsText = (n: number) => n === 0 ? 'Your cart is empty' : `${n} ${n === 1 ? 'item' : 'items'} in your cart`

  const changeQty = (item: typeof cartItems[number], next: number) => {
    if (next > item.quantity) {
      addToCart(item, item.choices)
      announce(`${item.name}: ${next}. ${itemsText(cartCount + 1)}.`)
      return
    }
    updateQuantity(item.key, -1)
    if (next > 0) {
      announce(`${item.name}: ${next}. ${itemsText(cartCount - 1)}.`)
      return
    }
    announce(`Removed ${item.name}. ${itemsText(cartCount - 1)}.`)
    // Its row (and the focused button) is gone: continue from the page heading
    focusMain()
  }

  const clearAll = () => {
    clearCart()
    announce('Your cart is empty.')
    focusMain()
  }

  const handleConfirm = async (opts: CheckoutOptions) => {
    setPlacing(true)
    setPlaceError('')
    // Add-ons are lines of their own, priced by the server like everything else
    const lines = [
      ...cartItems.filter(i => i.available),
      ...opts.addOns.map(a => ({ id: a.id, name: a.name, price: a.price, quantity: 1 })),
    ]

    try {
      // A short minimum so "Placing order…" never just flickers
      const [orderId] = await Promise.all([
        placeOrderRaw(lines, tableId, tableName, customerName, opts.dineIn ? 'dineIn' : 'takeaway', opts.notes.trim() || undefined),
        new Promise(resolve => setTimeout(resolve, 400)),
      ])
      clearCart()
      setShowCheckout(false)
      navigate(`/order/${orderId}`, { replace: true })
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : String(err))
      setPlacing(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg pb-44">
      <main className="mx-auto max-w-3xl animate-enter px-4 pt-5">
        <PageHeader
          title="Your cart"
          subtitle={cartCount > 0 ? `${cartCount} ${cartCount === 1 ? 'item' : 'items'}${tableName ? ` · ${tableName}` : ''}` : undefined}
          back={() => navigate('/menu')}
          actions={cartItems.length > 0 ? (
            <Button variant="ghost" onClick={clearAll} className="-mr-3 text-ink-muted" aria-label="Clear the cart">Clear</Button>
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
            <ul className="mt-5 overflow-hidden rounded-card border border-line bg-surface">
              <AnimatePresence initial={false}>
              {cartItems.map(item => (
                <motion.li
                  key={item.key}
                  layout
                  exit={{ opacity: 0, x: -48, height: 0, paddingTop: 0, paddingBottom: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-3 border-b border-line px-4 py-3.5 last:border-b-0"
                >
                  <ItemPhoto item={item} dimmed={!item.available} className="h-14 w-14 shrink-0 rounded-control border border-line max-[359px]:hidden" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className={cn('text-[15px] font-medium leading-snug', item.available ? 'text-ink' : 'text-ink-muted')}>{item.name}</p>
                        {item.options.length > 0 && <p className="mt-0.5 text-[13px] text-ink-muted">{optionsText(item)}</p>}
                      </div>
                      <p className={cn('shrink-0 text-[15px] tabular-nums', item.available ? 'font-medium text-ink' : 'text-ink-muted line-through')}>{peso(item.price * item.quantity)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      {item.available
                        ? <p className="text-[13px] tabular-nums text-ink-muted">{peso(item.price)} each</p>
                        : <p className="text-[13px] font-medium text-status-cancelled-text">
                            {item.problem === 'options_changed' ? 'Options changed. Remove it and add it again.' : 'Sold out. Remove it to order.'}
                          </p>}
                      <QuantityStepper
                        value={item.quantity}
                        itemName={item.name}
                        onChange={next => changeQty(item, next)}
                      />
                    </div>
                  </div>
                </motion.li>
              ))}
              </AnimatePresence>
            </ul>

            {/* Summary as a receipt with a torn bottom edge */}
            <div className="receipt-edge mt-4 bg-surface px-4 pb-7 pt-4 sm:px-5">
              <p className="mb-3 flex justify-between font-mono text-xs uppercase tracking-widest text-ink-muted">
                <span>Summary</span>
                <span>{tableName || 'No table'}</span>
              </p>
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
              {!tableId && (
                <p role="status" className="mt-2 text-[13px] font-medium text-status-cancelled-text">
                  Scan the QR code on your table to order.
                </p>
              )}
            </div>
          </>
        )}
      </main>

      <AnimatePresence>
      {cartItems.length > 0 && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-4 pb-3 short:bottom-[calc(3rem+env(safe-area-inset-bottom))] short:pb-2"
        >
          <button
            type="button"
            onClick={() => setShowCheckout(true)}
            disabled={!tableId || unavailableCount > 0}
            className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true }, 'mx-auto flex max-w-3xl justify-between shadow-pop short:h-11')}
          >
            <span>{unavailableCount > 0 ? 'Remove sold-out items' : 'Checkout'}</span>
            <span className="tabular-nums">{peso(cartTotal)}</span>
          </button>
        </motion.div>
      )}
      </AnimatePresence>

      <OrderCheckoutModal
        open={showCheckout}
        cartItems={cartItems}
        cartTotal={cartTotal}
        tableName={tableName}
        placing={placing}
        error={placeError}
        onConfirm={handleConfirm}
        onClose={() => { if (!placing) setShowCheckout(false) }}
      />
    </div>
  )
}

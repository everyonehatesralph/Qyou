import { ArrowLeft, BadgeCheck, BellRing, Check, ClipboardList, Loader2, Receipt, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { forgetCheckout, isAwaitingPayment, useOrders } from '../../context/OrderContext'
import { useCart } from '../../context/CartContext'
import type { Order, OrderStatus as Status } from '../../context/OrderContext'
import { clockTime } from '../../hooks/useNow'
import { STATUS_STEP } from '../../theme/status'
import { RESTAURANT } from '../../config/restaurant'
import InvoiceModal from '../../components/InvoiceModal'
import { Button, Card, EmptyState, IconButton, StatusPill, Ticket, announce, cn } from '../../components/ui'
import { optionsText, orderRef, paymentLabel } from '../../services/orderModel'

const peso = (n: number) => `${RESTAURANT.currency}${n.toFixed(0)}`

const HEADLINES: Record<Status, { title: string; body: (o: Order) => string }> = {
  pending:   { title: 'Order received',  body: () => 'Waiting for staff to confirm it.' },
  confirmed: { title: 'Order confirmed', body: () => 'It is in line for the kitchen.' },
  preparing: { title: 'Being prepared',  body: () => 'The kitchen is working on it now.' },
  ready:     { title: 'Ready for you',   body: o => o.orderType === 'takeaway' ? 'Show your pickup code at the counter.' : 'It is on its way to your table.' },
  served:    { title: 'Enjoy your meal', body: () => 'Your order has been served.' },
  paid:      { title: 'All paid',        body: () => 'Thank you for ordering with us.' },
  cancelled: { title: 'Order cancelled', body: () => 'Please ask a staff member if this is a mistake.' },
}

const STEPS = [
  { label: 'Received', at: (o: Order) => o.createdAt },
  { label: 'Confirmed', at: (o: Order) => o.confirmedAt },
  { label: 'Preparing', at: (o: Order) => o.preparingAt },
  { label: 'Ready', at: (o: Order) => o.readyAt },
]

function Timeline({ order }: { order: Order }) {
  const step = STATUS_STEP[order.status]
  const cancelled = order.status === 'cancelled'
  const rows = STEPS.map((s, i) => {
    const at = s.at(order)
    // A milestone is done once reached; the next one is the step being waited on
    const done = cancelled ? i === 0 || !!at : step >= i
    const current = !cancelled && i === step + 1
    return { ...s, at, done, current }
  })

  return (
    <ol className="relative">
      {rows.map((row, i) => {
        const last = i === rows.length - 1 && !cancelled
        const lineDone = row.done && (rows[i + 1]?.done ?? cancelled)
        return (
          <li key={row.label} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span aria-hidden className={cn('absolute left-[11px] top-6 h-[calc(100%-1rem)] w-0.5 rounded-full', lineDone ? 'bg-ink' : 'bg-line')} />
            )}
            <span
              aria-hidden
              className={cn(
                'relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                row.done && 'bg-ink text-bg',
                row.current && 'border-2 border-ink bg-surface',
                !row.done && !row.current && 'border border-line-strong bg-surface',
              )}
            >
              {row.done && (
                <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 26 }}>
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </motion.span>
              )}
              {row.current && <span className="h-2 w-2 animate-pulse rounded-full bg-ink" />}
            </span>
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
              <span className={cn('text-[15px]', row.done || row.current ? 'font-medium text-ink' : 'text-ink-muted')}>
                {row.label}
                {row.current && <span className="sr-only"> (current step)</span>}
              </span>
              {row.at && (row.done || row.current) && (
                <span className="text-sm tabular-nums text-ink-muted">{clockTime(row.at)}</span>
              )}
            </div>
          </li>
        )
      })}
      {cancelled && (
        <li className="relative flex gap-3">
          <span aria-hidden className="relative z-10 mt-0.5 h-6 w-6 shrink-0 rounded-full bg-status-cancelled-text" />
          <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
            <span className="text-[15px] font-medium text-status-cancelled-text">Cancelled</span>
            {order.cancelledAt && <span className="text-sm tabular-nums text-ink-muted">{clockTime(order.cancelledAt)}</span>}
          </div>
        </li>
      )}
    </ol>
  )
}

export default function OrderStatus() {
  const navigate = useNavigate()
  const { orderId } = useParams()
  const { orders, isConnected, checkPayment } = useOrders()
  const { clearCart } = useCart()
  const [showSummary, setShowSummary] = useState(false)

  const order = useMemo(() => orders.find(o => o.id === orderId), [orders, orderId])

  // A pay-now order exists once it is paid. Until then, keep asking (the server checks with
  // PayMongo), whether or not PayMongo's webhook got through.
  const awaiting = !!orderId && isAwaitingPayment(orderId)
  const [unknownCheckout, setUnknownCheckout] = useState(false)
  const [waitedLong, setWaitedLong] = useState(false)
  useEffect(() => {
    if (!orderId || order || !awaiting) return
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const since = Date.now()
    const ask = async () => {
      try {
        const state = await checkPayment(orderId)
        if (!live) return
        if (state === 'unknown') { setUnknownCheckout(true); return }
      } catch { /* offline for a moment: ask again */ }
      if (!live) return
      if (Date.now() - since > 45_000) setWaitedLong(true)
      timer = setTimeout(ask, 3000)
    }
    ask()
    return () => { live = false; clearTimeout(timer) }
  }, [orderId, order, awaiting, checkPayment])

  // The paid order is in: the cart it came from is done
  useEffect(() => {
    if (!order || !orderId || !isAwaitingPayment(orderId)) return
    forgetCheckout(orderId)
    clearCart()
    announce('Payment received. Your order is in.')
  }, [order, orderId, clearCart])

  // Status changes arrive live; read them out (not the status the page opened with)
  const lastStatus = useRef(order?.status)
  useEffect(() => {
    if (!order) return
    if (lastStatus.current && lastStatus.current !== order.status) {
      const h = HEADLINES[order.status] ?? HEADLINES.pending
      announce(`${h.title}. ${h.body(order)}`)
    }
    lastStatus.current = order.status
  }, [order])

  if (!order && awaiting && !unknownCheckout) {
    return (
      <main className="min-h-screen bg-bg px-4 pb-28 pt-8">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-ink-muted" aria-hidden />
          <h1 className="font-display text-2xl text-ink">Confirming your payment…</h1>
          <p className="text-sm leading-relaxed text-ink-muted">
            Your order goes to the kitchen as soon as the payment is confirmed. This usually takes a few seconds.
          </p>
          {waitedLong && (
            <>
              <p className="text-sm leading-relaxed text-ink-muted">
                Still waiting. If you paid, keep this page open or show it to the staff. If you didn't finish paying, go back to your cart.
              </p>
              <Button onClick={() => navigate('/cart')}>Back to your cart</Button>
            </>
          )}
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-bg px-4 pb-28 pt-8">
        {isConnected ? (
          <EmptyState
            icon={ClipboardList}
            title="We can't find this order"
            body="There is no such order on this device. It may have been placed on another phone."
            action={<Button variant="primary" onClick={() => navigate('/my-orders')}>See your orders</Button>}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-ink-muted" role="status">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            <p className="text-sm">Loading your order…</p>
          </div>
        )}
      </main>
    )
  }

  const headline = HEADLINES[order.status] ?? HEADLINES.pending
  const step = STATUS_STEP[order.status]
  const waitingForReady = step >= 0 && step < 3
  const isTakeaway = order.orderType === 'takeaway' && !!order.takeawayCode
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <main className="min-h-screen bg-bg pb-28">
      <div className="mx-auto max-w-xl animate-enter px-4 pt-3">
        <div className="flex items-center gap-1">
          <IconButton label="Back to your orders" onClick={() => navigate('/my-orders')} className="-ml-2.5">
            <ArrowLeft />
          </IconButton>
          <p className="text-sm text-ink-muted">Your order</p>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-muted" aria-live="polite">
            <span className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-status-ready-text' : 'bg-status-waiting-text')} aria-hidden />
            {isConnected ? 'Live' : 'Connecting…'}
          </span>
        </div>

        {/* The order as a queue ticket: status above the perforation, the queue number big on the stub */}
        <div className="mt-3 drop-shadow-sm">
          <Ticket
            bodyClassName="px-5 pb-5 pt-5"
            stubClassName="flex items-end justify-between gap-3 px-5 pb-5 pt-4"
            stub={
              <>
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">Your number</p>
                  <p className="mt-1 font-display text-[64px] leading-[0.85] tracking-[-0.04em] text-ink">{orderRef(order)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">{order.orderType === 'takeaway' ? 'Take away' : 'Dine in'}</p>
                  <p className="mt-1 text-[15px] font-semibold text-ink">{order.tableName}</p>
                </div>
              </>
            }
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.header
                key={order.status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="font-display text-[32px] leading-[1.02] tracking-[-0.03em] text-ink">{headline.title}</h1>
                <p className="mt-1.5 text-[15px] text-ink-muted">{headline.body(order)}</p>
                <StatusPill status={order.status} audience="customer" className="mt-3" />
              </motion.header>
            </AnimatePresence>
          </Ticket>
        </div>

        {isTakeaway && (
          <div className="mt-4 drop-shadow-sm">
            <Ticket
              tone="accent"
              bodyClassName="px-5 pb-4 pt-4 text-center"
              stubClassName="px-5 pb-4 pt-3 text-center text-sm"
              stub={<p>Show this at the counter when your order is ready.</p>}
            >
              <p className="font-mono text-xs uppercase tracking-widest">Pickup code</p>
              <p className="mt-1 font-mono text-[42px] leading-none tracking-[0.04em]">{order.takeawayCode}</p>
            </Ticket>
          </div>
        )}

        <Card className="mt-5">
          <h2 className="sr-only">Progress</h2>
          <Timeline order={order} />
        </Card>

        {waitingForReady && (
          <p className="mt-4 flex items-start gap-2.5 px-1 text-sm leading-relaxed text-ink-muted">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Keep Qyou open on your phone. It rings when your order is ready, even while you browse the menu.
          </p>
        )}

        <Card className="mt-5" padding="none">
          <div className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-5">
            <h2 className="text-sm font-medium text-ink">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </h2>
            <span className="flex items-center gap-1.5 text-sm text-ink-muted">
              {order.orderType === 'takeaway'
                ? <><ShoppingBag className="h-4 w-4" aria-hidden /> Take away</>
                : <><UtensilsCrossed className="h-4 w-4" aria-hidden /> Dine in</>}
            </span>
          </div>
          <ul className="divide-y divide-line px-4 sm:px-5">
            {order.items.map((item, i) => (
              <li key={`${item.id}-${i}`} className="flex justify-between gap-3 py-2.5 text-[15px]">
                <span className="text-ink">
                  <span className="tabular-nums text-ink-muted">{item.quantity}× </span>
                  {item.name}
                  {item.options?.length ? <span className="block text-[13px] text-ink-muted">{optionsText(item)}</span> : null}
                </span>
                <span className="tabular-nums text-ink">{peso(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          {order.notes && (
            <p className="border-t border-line px-4 py-3 text-sm text-ink-muted sm:px-5">
              <span className="font-medium text-ink">Notes: </span>
              {order.notes}
            </p>
          )}
          <div className="flex justify-between border-t border-line px-4 py-3.5 text-[15px] font-medium text-ink sm:px-5">
            <span>Total</span>
            <span className="tabular-nums">{peso(order.total)}</span>
          </div>
          {order.paidOnlineAt && (
            <p className="flex items-center gap-2 border-t border-line px-4 py-3 text-sm font-medium text-status-ready-text sm:px-5">
              <BadgeCheck className="h-4 w-4" aria-hidden />
              Paid with {paymentLabel(order.paymentMethod)} · {clockTime(order.paidOnlineAt)}
            </p>
          )}
        </Card>

        {/* Side by side from 640px; stacked full width on phones so neither label is squeezed */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button leftIcon={<Receipt />} onClick={() => setShowSummary(true)}>Order summary</Button>
          <Button variant="ghost" onClick={() => navigate('/menu')}>Order more</Button>
        </div>
      </div>

      <InvoiceModal order={order} open={showSummary} onClose={() => setShowSummary(false)} />
    </main>
  )
}

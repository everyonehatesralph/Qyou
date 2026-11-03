import { ArrowLeft, BellRing, Check, ClipboardList, Loader2, Receipt, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useOrders } from '../../context/OrderContext'
import type { Order, OrderStatus as Status } from '../../context/OrderContext'
import { useReadyNotification } from '../../hooks/useReadyNotification'
import { clockTime } from '../../hooks/useNow'
import { STATUS_STEP } from '../../theme/status'
import { RESTAURANT } from '../../config/restaurant'
import InvoiceModal from '../../components/InvoiceModal'
import { Button, Card, EmptyState, IconButton, StatusPill, cn } from '../../components/ui'

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
              {row.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
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
  const { orders, isConnected } = useOrders()
  const [showSummary, setShowSummary] = useState(false)
  // Rings and vibrates when one of this device's orders becomes ready
  const { newReadyOrderId, dismissNotification } = useReadyNotification(orders)

  const order = useMemo(() => orders.find(o => o.id === orderId), [orders, orderId])

  if (!order) {
    return (
      <div className="min-h-screen bg-bg px-4 pb-28 pt-8">
        {isConnected ? (
          <EmptyState
            icon={ClipboardList}
            title="We can't find this order"
            body={`There is no order ${orderId ?? ''} on this device. It may have been placed on another phone.`}
            action={<Button variant="primary" onClick={() => navigate('/my-orders')}>See your orders</Button>}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-ink-muted" role="status">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            <p className="text-sm">Loading your order…</p>
          </div>
        )}
      </div>
    )
  }

  const headline = HEADLINES[order.status] ?? HEADLINES.pending
  const step = STATUS_STEP[order.status]
  const waitingForReady = step >= 0 && step < 3
  const isTakeaway = order.orderType === 'takeaway' && !!order.takeawayCode
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="min-h-screen bg-bg pb-28">
      <div className="mx-auto max-w-xl px-4 pt-3">
        <div className="flex items-center gap-1">
          <IconButton label="Back to your orders" onClick={() => navigate('/my-orders')} className="-ml-2.5">
            <ArrowLeft />
          </IconButton>
          <p className="text-sm text-ink-muted">
            Order {order.id} · {order.tableName}
          </p>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-muted" aria-live="polite">
            <span className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-status-ready-text' : 'bg-status-waiting-text')} aria-hidden />
            {isConnected ? 'Live' : 'Connecting…'}
          </span>
        </div>

        <header className="mt-3">
          <h1 className="font-display text-[32px] leading-tight tracking-[-0.01em] text-ink">{headline.title}</h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">{headline.body(order)}</p>
          <StatusPill status={order.status} audience="customer" className="mt-3" />
        </header>

        {newReadyOrderId === order.id && (
          <div className="mt-5 flex items-center gap-3 rounded-card bg-status-ready-bg p-4 text-status-ready-text" role="alert">
            <BellRing className="h-5 w-5 shrink-0" aria-hidden />
            <p className="flex-1 text-[15px] font-medium">Your order is ready!</p>
            <Button size="md" onClick={dismissNotification} className="h-9">OK</Button>
          </div>
        )}

        {isTakeaway && (
          <Card className="mt-5 text-center">
            <p className="text-sm text-ink-muted">Pickup code</p>
            <p className="mt-1 text-[44px] font-medium leading-none tracking-[0.08em] text-ink">{order.takeawayCode}</p>
            <p className="mt-2 text-sm text-ink-muted">Show this at the counter when your order is ready.</p>
          </Card>
        )}

        <Card className="mt-5">
          <h2 className="sr-only">Progress</h2>
          <Timeline order={order} />
        </Card>

        {waitingForReady && (
          <p className="mt-4 flex items-start gap-2.5 px-1 text-sm leading-relaxed text-ink-muted">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Keep this page open. Your phone will ring when your order is ready.
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
            {order.items.map(item => (
              <li key={item.id} className="flex justify-between gap-3 py-2.5 text-[15px]">
                <span className="text-ink">
                  <span className="tabular-nums text-ink-muted">{item.quantity}× </span>
                  {item.name}
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
        </Card>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button leftIcon={<Receipt />} onClick={() => setShowSummary(true)}>Order summary</Button>
          <Button variant="ghost" onClick={() => navigate('/menu')}>Order more</Button>
        </div>
      </div>

      <InvoiceModal order={order} open={showSummary} onClose={() => setShowSummary(false)} />
    </div>
  )
}

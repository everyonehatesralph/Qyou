import { ChevronRight, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useOrders, getMyOrderIds } from '../../context/OrderContext'
import type { Order } from '../../context/OrderContext'
import { useNow, timeAgo } from '../../hooks/useNow'
import { ACTIVE_STATUSES, STATUS_GROUP_CLASSES, STATUS_META, STATUS_STEP } from '../../theme/status'
import { RESTAURANT } from '../../config/restaurant'
import { BottomSheet, Button, EmptyState, PageHeader, StatusPill, cn } from '../../components/ui'

const peso = (n: number) => `${RESTAURANT.currency}${n.toFixed(0)}`

function OrderRow({ order, now, onOpen, onCancel }: { order: Order; now: number; onOpen: () => void; onCancel?: () => void }) {
  const active = ACTIVE_STATUSES.includes(order.status)
  const step = STATUS_STEP[order.status]
  const fill = STATUS_GROUP_CLASSES[STATUS_META[order.status].group].fill
  const canCancel = order.status === 'pending' || order.status === 'confirmed'

  return (
    <li className="rounded-card border border-line bg-surface">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-3 rounded-card p-4 text-left transition-colors duration-150 hover:bg-surface-2"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-[15px] font-medium text-ink">Order {order.id}</span>
            <StatusPill status={order.status} audience="customer" />
          </div>
          <p className="mt-1.5 truncate text-sm text-ink-muted">
            {order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
          </p>
          <p className="mt-1 text-[13px] text-ink-muted">
            {timeAgo(order.createdAt, now)} · <span className="tabular-nums">{peso(order.total)}</span>
          </p>
        </div>
        <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
      </button>

      {active && (
        <div className="flex gap-1 px-4 pb-4" aria-hidden>
          {[0, 1, 2, 3].map(i => (
            <span key={i} className={cn('h-1 flex-1 rounded-full', i <= step ? fill : 'bg-surface-3')} />
          ))}
        </div>
      )}

      {canCancel && onCancel && (
        <div className="border-t border-line px-4 py-2">
          <Button variant="ghost" onClick={onCancel} className="-ml-3 text-status-cancelled-text hover:bg-status-cancelled-bg">
            Cancel order
          </Button>
        </div>
      )}
    </li>
  )
}

export default function MyOrders() {
  const navigate = useNavigate()
  const { orders, cancelOrder } = useOrders()
  const now = useNow(30_000)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const myOrderIds = useMemo(() => getMyOrderIds(), [orders])

  const myOrders = useMemo(() => {
    return myOrderIds
      .map(id => orders.find(o => o.id === id))
      .filter((o): o is Order => !!o)
  }, [orders, myOrderIds])

  // Paid orders count as past, like served and cancelled ones
  const activeOrders = myOrders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const pastOrders = myOrders.filter(o => !ACTIVE_STATUSES.includes(o.status))

  const confirmCancel = () => {
    if (cancelId) cancelOrder(cancelId)
    setCancelId(null)
  }

  return (
    <div className="min-h-screen bg-bg pb-28">
      <div className="mx-auto max-w-3xl px-4 pt-5">
        <PageHeader title="Your orders" subtitle={myOrders.length > 0 ? 'Orders placed from this phone.' : undefined} />

        {myOrders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No orders yet"
            body="Orders you place from this phone show up here, with their status."
            action={<Button variant="primary" onClick={() => navigate('/menu')}>Browse the menu</Button>}
          />
        ) : (
          <div className="mt-6 space-y-8">
            {activeOrders.length > 0 && (
              <section aria-labelledby="active-orders">
                <h2 id="active-orders" className="mb-3 font-display text-xl text-ink">Active</h2>
                <ul className="grid gap-3 md:grid-cols-2">
                  {activeOrders.map(order => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      now={now}
                      onOpen={() => navigate(`/order/${order.id}`)}
                      onCancel={() => setCancelId(order.id)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {pastOrders.length > 0 && (
              <section aria-labelledby="past-orders">
                <div className="mb-3 flex items-center justify-between">
                  <h2 id="past-orders" className="font-display text-xl text-ink">Past</h2>
                  <Button variant="ghost" onClick={() => navigate('/menu')} className="-mr-3">Order again</Button>
                </div>
                <ul className="grid gap-3 md:grid-cols-2">
                  {pastOrders.map(order => (
                    <OrderRow key={order.id} order={order} now={now} onOpen={() => navigate(`/order/${order.id}`)} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      <BottomSheet
        open={cancelId !== null}
        onClose={() => setCancelId(null)}
        title="Cancel this order?"
        description={cancelId ? `Order ${cancelId} will be cancelled and the kitchen won't make it.` : undefined}
      >
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button onClick={() => setCancelId(null)}>Keep order</Button>
          <Button variant="danger" onClick={confirmCancel}>Cancel order</Button>
        </div>
      </BottomSheet>
    </div>
  )
}

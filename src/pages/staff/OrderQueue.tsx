import { CheckCircle, ChefHat, EyeOff, ShoppingBag } from 'lucide-react'
import { useOrders } from '../../context/OrderContext'
import type { OrderStatus, Order } from '../../context/OrderContext'
import { useOrderNotification } from '../../hooks/useOrderNotification'
import SoundOffNotice from '../../components/SoundOffNotice'
import { useNow, minutesSince } from '../../hooks/useNow'
import { useSidebar } from '../../context/SidebarContext'
import { useMemo, useState, useCallback, memo } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import StaffPageShell from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import { Button, EmptyState, IconButton, cn } from '../../components/ui'
import { peso } from '../../utils/formatters'
import { orderRef } from '../../services/orderModel'

// ─── Pipeline ────────────────────────────────────────────────────────────────
type KitchenStatus = 'confirmed' | 'preparing' | 'ready'

const COLUMNS: { status: KitchenStatus; label: string; action: string }[] = [
  { status: 'confirmed', label: 'New',       action: 'Start preparing' },
  { status: 'preparing', label: 'Preparing', action: 'Mark ready' },
  { status: 'ready',     label: 'Ready',     action: 'Mark served' },
]

const NEXT: Record<KitchenStatus, OrderStatus> = {
  confirmed: 'preparing',
  preparing: 'ready',
  ready:     'served',
}

/** Minutes after which a waiting order is flagged amber, then red. */
const LATE_MIN = 10
const VERY_LATE_MIN = 20

// ─── Order card ──────────────────────────────────────────────────────────────
interface KitchenCardProps {
  order: Order
  status: KitchenStatus
  action: string
  now: number
  onAdvance: (orderId: string, status: KitchenStatus) => void
  onHide: (orderId: string) => void
}

const KitchenCard = memo(function KitchenCard({ order, status, action, now, onAdvance, onHide }: KitchenCardProps) {
  const mins = minutesSince(order.createdAt, now)
  // Ready orders are done cooking; only flag time while the kitchen still owes them
  const late = status !== 'ready' && mins >= LATE_MIN
  const veryLate = status !== 'ready' && mins >= VERY_LATE_MIN
  const isTakeaway = order.orderType === 'takeaway'

  return (
    <motion.article
      // Same layout id in every column, so a ticket slides across when its status changes
      layoutId={order.id}
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className={cn(
        'flex flex-col rounded-card border-2 bg-surface',
        veryLate ? 'border-status-cancelled-text' : late ? 'border-status-waiting-text' : status === 'ready' ? 'border-status-ready-text' : 'border-line',
      )}
      aria-label={`${order.tableName}, ${mins} minutes`}
    >
      <div className="flex items-start gap-2 p-4 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="whitespace-nowrap font-display text-[26px] leading-none text-ink xl:text-[30px]">{order.tableName}</h3>
          <p className="mt-1.5 truncate text-sm text-ink-muted">
            {order.customerName || 'Guest'} · <span className="font-mono text-[13px]">Nº {orderRef(order)}</span>
          </p>
        </div>
        <div
          className={cn(
            'rounded-control px-2.5 py-1.5 text-right',
            veryLate ? 'bg-status-cancelled-bg text-status-cancelled-text' : late ? 'bg-status-waiting-bg text-status-waiting-text' : 'text-ink',
          )}
        >
          <p className="text-[22px] font-medium leading-none tabular-nums">
            {mins}
            <span className="ml-0.5 text-sm">min</span>
          </p>
          {late && <p className="mt-1 text-xs font-medium">{veryLate ? 'Very late' : 'Waiting long'}</p>}
        </div>
        <IconButton label="Hide from this screen" onClick={() => onHide(order.id)} className="-mr-2.5 -mt-2.5 text-ink-muted">
          <EyeOff />
        </IconButton>
      </div>

      {isTakeaway && (
        <p className="mx-4 mb-2 inline-flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-sm font-medium text-ink">
          <ShoppingBag className="h-4 w-4" aria-hidden />
          Take away · <span className="font-mono">{order.takeawayCode}</span>
        </p>
      )}

      <ul className="mx-4 space-y-1.5 border-t border-line pt-3">
        {order.items.map(item => (
          <li key={item.id} className="flex gap-2.5 text-[18px] leading-snug text-ink">
            <span className="min-w-[2ch] font-medium tabular-nums">{item.quantity}×</span>
            <span>{item.name}</span>
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="mx-4 mt-3 rounded-control bg-status-waiting-bg px-3 py-2 text-[15px] text-status-waiting-text">
          {order.notes}
        </p>
      )}

      <div className="mt-auto flex items-center gap-3 p-4 pt-4">
        <span className="text-sm tabular-nums text-ink-muted">{peso(order.total)}</span>
        <Button
          variant={status === 'ready' ? 'secondary' : 'primary'}
          size="lg"
          leftIcon={<CheckCircle />}
          onClick={() => onAdvance(order.id, status)}
          className="flex-1"
        >
          {action}
        </Button>
      </div>
    </motion.article>
  )
})

// ─── Page ────────────────────────────────────────────────────────────────────
export default function OrderQueue() {
  const { orders, updateOrderStatus, isConnected } = useOrders()
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const now = useNow(30_000)

  useOrderNotification(orders, o => o.status === 'confirmed', { connected: isConnected, storageKey: 'kitchen' })

  // Oldest first within each column, so the longest wait is on top
  const byStatus = useMemo(() => {
    const map: Record<KitchenStatus, Order[]> = { confirmed: [], preparing: [], ready: [] }
    orders.forEach(o => {
      if ((o.status === 'confirmed' || o.status === 'preparing' || o.status === 'ready') && !hidden.has(o.id)) {
        map[o.status].push(o)
      }
    })
    for (const list of Object.values(map)) {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }
    return map
  }, [orders, hidden])

  const totalActive = byStatus.confirmed.length + byStatus.preparing.length + byStatus.ready.length
  const servedOrders = useMemo(() => orders.filter(o => o.status === 'served'), [orders])

  const advance = useCallback((orderId: string, current: KitchenStatus) => {
    updateOrderStatus(orderId, NEXT[current])
  }, [updateOrderStatus])

  const hide = useCallback((orderId: string) => {
    setHidden(prev => new Set([...prev, orderId]))
  }, [])

  return (
    <StaffPageShell>
      <StaffHeader
        title="Kitchen"
        subtitle={totalActive === 0 ? 'No active orders' : `${totalActive} active ${totalActive === 1 ? 'order' : 'orders'}`}
        sidebarExpanded={sidebarExpanded}
        onSidebarToggle={toggleSidebar}
      />

      <main className="space-y-8 px-4 py-5 sm:px-6 sm:py-6">
        <SoundOffNotice />
        {totalActive === 0 ? (
          <div className="rounded-card border border-line bg-surface">
            <EmptyState
              icon={ChefHat}
              title="No orders in the kitchen"
              body="Orders show up here once they are confirmed at the counter."
            />
          </div>
        ) : (
          <LayoutGroup>
          <div className="grid gap-5 md:auto-cols-[minmax(300px,1fr)] md:grid-flow-col md:overflow-x-auto md:pb-2">
            {COLUMNS.map(col => {
              const list = byStatus[col.status]
              return (
                <section key={col.status} aria-labelledby={`col-${col.status}`} className="min-w-0">
                  <div className="mb-3 flex items-center justify-between rounded-control bg-surface-2 px-3 py-2">
                    <h2 id={`col-${col.status}`} className="text-[15px] font-medium text-ink">{col.label}</h2>
                    <span className="min-w-7 rounded-full bg-surface px-2 py-0.5 text-center text-sm font-medium tabular-nums text-ink">
                      {list.length}
                    </span>
                  </div>
                  {list.length === 0 ? (
                    <p className="rounded-card border-2 border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                      Nothing here
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {list.map(order => (
                        <KitchenCard
                          key={order.id}
                          order={order}
                          status={col.status}
                          action={col.action}
                          now={now}
                          onAdvance={advance}
                          onHide={hide}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
          </LayoutGroup>
        )}

        {servedOrders.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-xl text-ink">
              Served <span className="text-base text-ink-muted">{servedOrders.length}</span>
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {servedOrders.map(order => (
                <li key={order.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0 text-status-ready-text" aria-hidden />
                  <span className="text-ink">{order.tableName}</span>
                  <span className="truncate text-ink-muted">· {order.customerName || 'Guest'} · {orderRef(order)}</span>
                  <span className="ml-auto shrink-0 tabular-nums text-ink-muted">{peso(order.total)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </StaffPageShell>
  )
}

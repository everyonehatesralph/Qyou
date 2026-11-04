import { Banknote, Bell, Check, ShoppingBag, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOrders } from '../../context/OrderContext'
import type { Order } from '../../context/OrderContext'
import { useOrderNotification } from '../../hooks/useOrderNotification'
import { useNow, timeAgo } from '../../hooks/useNow'
import { useSidebar } from '../../context/SidebarContext'
import { useMemo, useState, memo, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StaffPageShell, { StaffMain } from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import KpiCard from '../../components/KpiCard'
import DashboardAnalytics from '../../components/DashboardAnalytics'
import TableCard from '../../components/TableCard'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Button, Card, EmptyState, StatusPill, cn } from '../../components/ui'
import { RESTAURANT, tableLabel } from '../../config/restaurant'
import { peso } from '../../utils/formatters'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const itemsSummary = (o: Order) => o.items.map(i => `${i.quantity}× ${i.name}`).join(', ')

function SectionTitle({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-xl text-ink">
        {title}
        {count !== undefined && <span className="ml-2 text-base text-ink-muted">{count}</span>}
      </h2>
      {action}
    </div>
  )
}

// ─── New order card ──────────────────────────────────────────────────────────
const IncomingCard = memo(function IncomingCard({ order, now, onConfirm, onReject }: {
  order: Order
  now: number
  onConfirm: (id: string) => void
  /** Turns down an order no one should cook (e.g. sent from outside the restaurant). */
  onReject: (id: string) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    >
    <Card padding="none" className="flex h-full flex-col border-status-waiting-text">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <p className="font-display text-xl leading-tight text-ink">{order.tableName}</p>
          <p className="mt-0.5 truncate text-sm text-ink-muted">
            {order.customerName || 'Guest'} · <span className="font-mono text-[13px]">Nº {order.id}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-medium tabular-nums text-ink">{peso(order.total)}</p>
          <p className="mt-0.5 text-[13px] text-ink-muted">{timeAgo(order.createdAt, now)}</p>
        </div>
      </div>
      {order.orderType === 'takeaway' && (
        <p className="mx-4 mb-2 inline-flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink">
          <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
          Take away · <span className="font-mono">{order.takeawayCode}</span>
        </p>
      )}
      <ul className="mx-4 space-y-1 border-t border-line pt-3 text-[15px] text-ink">
        {order.items.map(item => (
          <li key={item.id}>
            <span className="tabular-nums text-ink-muted">{item.quantity}× </span>
            {item.name}
          </li>
        ))}
      </ul>
      {order.notes && <p className="mx-4 mt-3 rounded-control bg-surface-2 px-3 py-2 text-sm text-ink">{order.notes}</p>}
      <div className="mt-auto flex gap-2 p-4 pt-4">
        <Button
          variant="ghost"
          leftIcon={<X />}
          onClick={() => onReject(order.id)}
          aria-label={`Reject order ${order.id}`}
          className="text-status-cancelled-text hover:bg-status-cancelled-bg"
        >
          Reject
        </Button>
        <Button variant="primary" leftIcon={<Check />} onClick={() => onConfirm(order.id)} className="flex-1">
          Confirm order
        </Button>
      </div>
    </Card>
    </motion.div>
  )
})

export default function Dashboard() {
  const navigate = useNavigate()
  const { orders, updateOrderStatus, cancelOrder, isConnected } = useOrders()
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()
  const now = useNow(30_000)
  const [freeTableId, setFreeTableId] = useState<number | null>(null)

  useOrderNotification(orders, o => o.status === 'pending')

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending'), [orders])
  const activeOrders = useMemo(
    () => orders.filter(o => !['served', 'paid', 'pending', 'cancelled'].includes(o.status)),
    [orders],
  )
  const servedOrders = useMemo(() => orders.filter(o => o.status === 'served'), [orders])
  const inKitchenCount = useMemo(() => orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length, [orders])
  const readyCount = useMemo(() => orders.filter(o => o.status === 'ready').length, [orders])
  const todayRevenue = useMemo(() => {
    const today = new Date().toDateString()
    return orders
      .filter(o => o.status === 'paid' && new Date(o.createdAt).toDateString() === today)
      .reduce((s, o) => s + o.total, 0)
  }, [orders])

  // On the dashboard a table is occupied by its unpaid, uncancelled orders
  const ordersByTable = useMemo(() => {
    const map = new Map<number, Order[]>()
    for (const o of orders) {
      if (o.status === 'paid' || o.status === 'cancelled') continue
      map.set(o.tableId, [...(map.get(o.tableId) ?? []), o])
    }
    return map
  }, [orders])
  const freeCount = RESTAURANT.tables.filter(t => !ordersByTable.has(t.id)).length

  const confirmOrder = (orderId: string) => updateOrderStatus(orderId, 'confirmed')
  const rejectOrder = (orderId: string) => cancelOrder(orderId)
  const markPaid = (orderId: string) => updateOrderStatus(orderId, 'paid')

  // Unchanged behavior: freeing a table marks all its unpaid orders as paid
  const tableToFree = freeTableId === null ? [] : orders.filter(o => o.tableId === freeTableId && o.status !== 'paid')
  const clearTable = () => {
    tableToFree.forEach(o => updateOrderStatus(o.id, 'paid'))
    setFreeTableId(null)
  }

  return (
    <StaffPageShell>
      <StaffHeader
        title="Dashboard"
        subtitle={`${greeting()} · ${RESTAURANT.name}`}
        actions={
          <span
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium',
              isConnected ? 'bg-status-ready-bg text-status-ready-text' : 'bg-status-cancelled-bg text-status-cancelled-text',
            )}
            aria-live="polite"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {isConnected ? 'Live' : 'Offline'}
          </span>
        }
        sidebarExpanded={sidebarExpanded}
        onSidebarToggle={toggleSidebar}
      />

      <StaffMain className="space-y-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="New orders" value={pendingOrders.length} group="waiting" />
          <KpiCard label="In the kitchen" value={inKitchenCount} group="progress" />
          <KpiCard label="Ready to serve" value={readyCount} group="ready" />
          <KpiCard label="Paid today" value={peso(todayRevenue)} />
        </div>

        <section>
          <SectionTitle title="Incoming orders" count={pendingOrders.length} />
          {pendingOrders.length === 0 ? (
            <Card>
              <EmptyState icon={Bell} title="No new orders" body="New orders appear here, with a sound, as guests place them." className="py-6" />
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {pendingOrders.map(order => (
                  <IncomingCard key={order.id} order={order} now={now} onConfirm={confirmOrder} onReject={rejectOrder} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {activeOrders.length > 0 && (
          <section>
            <SectionTitle
              title="In progress"
              count={activeOrders.length}
              action={<Button variant="ghost" onClick={() => navigate('/staff/kitchen')} className="-mr-3">Open kitchen</Button>}
            />
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {activeOrders.map(order => (
                <li key={order.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-ink">
                      <span className="font-medium">{order.tableName}</span>
                      <span className="text-ink-muted"> · {order.customerName || 'Guest'} · {order.id}</span>
                    </p>
                    <p className="mt-0.5 truncate text-sm text-ink-muted">{itemsSummary(order)}</p>
                  </div>
                  <StatusPill status={order.status} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {servedOrders.length > 0 && (
          <section>
            <SectionTitle title="Awaiting payment" count={servedOrders.length} />
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {servedOrders.map(order => (
                // Narrow phones: who and what on one line, amount and Mark paid below
                <li key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1 basis-full min-[460px]:basis-0">
                    <p className="text-[15px] text-ink">
                      <span className="font-medium">{order.tableName}</span>
                      <span className="text-ink-muted"> · {order.customerName || 'Guest'} · {order.id}</span>
                    </p>
                    <p className="mt-0.5 truncate text-sm text-ink-muted">{itemsSummary(order)}</p>
                  </div>
                  <p className="text-[15px] font-medium tabular-nums text-ink">{peso(order.total)}</p>
                  <Button leftIcon={<Banknote />} onClick={() => markPaid(order.id)} className="ml-auto min-[460px]:ml-0">Mark paid</Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <DashboardAnalytics orders={orders} />

        <section>
          <SectionTitle
            title="Tables"
            action={<span className="text-sm text-ink-muted">{freeCount} of {RESTAURANT.tables.length} free</span>}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {RESTAURANT.tables.map(table => (
              <TableCard
                key={table.id}
                compact
                label={table.label}
                orders={ordersByTable.get(table.id) ?? []}
                onFree={() => setFreeTableId(table.id)}
              />
            ))}
          </div>
        </section>
      </StaffMain>

      <ConfirmDialog
        open={freeTableId !== null}
        title={freeTableId !== null ? `Free ${tableLabel(freeTableId)}?` : ''}
        body={`This marks its ${tableToFree.length} open ${tableToFree.length === 1 ? 'order' : 'orders'} as paid so new guests can check in.`}
        confirmLabel="Free table"
        onConfirm={clearTable}
        onClose={() => setFreeTableId(null)}
      />
    </StaffPageShell>
  )
}

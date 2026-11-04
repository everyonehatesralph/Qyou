import { Banknote, Bell, Check, ShoppingBag } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOrders } from '../../context/OrderContext'
import type { Order } from '../../context/OrderContext'
import { useOrderNotification } from '../../hooks/useOrderNotification'
import SoundOffNotice from '../../components/SoundOffNotice'
import { useNow, timeAgo } from '../../hooks/useNow'
import { useSidebar } from '../../context/SidebarContext'
import { useMemo, useState, memo, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StaffPageShell from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import KpiCard from '../../components/KpiCard'
import DashboardAnalytics from '../../components/DashboardAnalytics'
import TableCard, { settleSummary } from '../../components/TableCard'
import ConfirmDialog from '../../components/ConfirmDialog'
import PaidOnlineBadge from '../../components/PaidOnlineBadge'
import { Button, Card, EmptyState, StatusPill, cn } from '../../components/ui'
import { useTables } from '../../context/TablesContext'
import { RESTAURANT } from '../../config/restaurant'
import { peso } from '../../utils/formatters'
import { openOrdersByTable, optionsText, orderRef, settleTable } from '../../services/orderModel'
import { paidToday } from '../../services/analytics'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const itemsSummary = (o: Order) => o.items.map(i => `${i.quantity}× ${i.name}${i.options?.length ? ` (${optionsText(i)})` : ''}`).join(', ')

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
const IncomingCard = memo(function IncomingCard({ order, now, onConfirm }: { order: Order; now: number; onConfirm: (id: string) => void }) {
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
            {order.customerName || 'Guest'} · <span className="font-mono text-[13px]">Nº {orderRef(order)}</span>
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
      <PaidOnlineBadge order={order} className="mx-4 mb-2" />
      <ul className="mx-4 space-y-1 border-t border-line pt-3 text-[15px] text-ink">
        {order.items.map((item, i) => (
          <li key={`${item.id}-${i}`}>
            <span className="tabular-nums text-ink-muted">{item.quantity}× </span>
            {item.name}
            {item.options?.length ? <span className="block text-sm text-ink-muted">{optionsText(item)}</span> : null}
          </li>
        ))}
      </ul>
      {order.notes && <p className="mx-4 mt-3 rounded-control bg-surface-2 px-3 py-2 text-sm text-ink">{order.notes}</p>}
      <div className="mt-auto p-4 pt-4">
        <Button variant="primary" fullWidth leftIcon={<Check />} onClick={() => onConfirm(order.id)}>
          Confirm order
        </Button>
      </div>
    </Card>
    </motion.div>
  )
})

export default function Dashboard() {
  const navigate = useNavigate()
  const { orders, updateOrderStatus, isConnected } = useOrders()
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()
  const now = useNow(30_000)
  const [freeTableId, setFreeTableId] = useState<number | null>(null)

  useOrderNotification(orders, o => o.status === 'pending', { connected: isConnected, storageKey: 'dashboard' })

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending'), [orders])
  const activeOrders = useMemo(
    () => orders.filter(o => !['served', 'paid', 'pending', 'cancelled'].includes(o.status)),
    [orders],
  )
  const servedOrders = useMemo(() => orders.filter(o => o.status === 'served'), [orders])
  const inKitchenCount = useMemo(() => orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length, [orders])
  const readyCount = useMemo(() => orders.filter(o => o.status === 'ready').length, [orders])
  // Money taken today: paid orders by the time they were paid
  const todayRevenue = useMemo(() => paidToday(orders), [orders])

  // A table is occupied by its unpaid, uncancelled orders (the same rule everywhere)
  const ordersByTable = useMemo(() => openOrdersByTable(orders), [orders])
  const { tables, label: tableLabel } = useTables()
  const freeCount = tables.filter(t => !ordersByTable.has(t.id)).length

  const confirmOrder = (orderId: string) => updateOrderStatus(orderId, 'confirmed')
  const markPaid = (orderId: string) => updateOrderStatus(orderId, 'paid')

  // Freeing a table: what was served is paid, what the kitchen hasn't finished is cancelled
  const settle = settleTable(freeTableId === null ? [] : ordersByTable.get(freeTableId) ?? [])
  const clearTable = () => {
    settle.pay.forEach(o => updateOrderStatus(o.id, 'paid'))
    settle.cancel.forEach(o => updateOrderStatus(o.id, 'cancelled'))
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

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-5 sm:px-6 sm:py-6">
        <SoundOffNotice />
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
                  <IncomingCard key={order.id} order={order} now={now} onConfirm={confirmOrder} />
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
                      <span className="text-ink-muted"> · {order.customerName || 'Guest'} · {orderRef(order)}</span>
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
                      <span className="text-ink-muted"> · {order.customerName || 'Guest'} · {orderRef(order)}</span>
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
            action={<span className="text-sm text-ink-muted">{freeCount} of {tables.length} free</span>}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {tables.map(table => (
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
      </main>

      <ConfirmDialog
        open={freeTableId !== null}
        title={freeTableId !== null ? `Free ${tableLabel(freeTableId)}?` : ''}
        body={settleSummary(settle)}
        confirmLabel="Free table"
        onConfirm={clearTable}
        onClose={() => setFreeTableId(null)}
      />
    </StaffPageShell>
  )
}

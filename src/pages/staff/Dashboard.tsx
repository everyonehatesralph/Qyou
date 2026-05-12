import { LayoutGrid, Users, TrendingUp, Coffee, Clock, CheckCircle, Bell, ChefHat, Volume2 } from 'lucide-react'
import { useOrders } from '../../context/OrderContext'
import type { Order } from '../../context/OrderContext'
import { useOrderNotification } from '../../hooks/useOrderNotification'
import { useMemo, useCallback, memo } from 'react'

const TABLES = [
  { id: 1, name: 'Window Seat' },
  { id: 2, name: 'Center Table' },
  { id: 3, name: 'Garden View' },
  { id: 4, name: 'Bar Seat A' },
  { id: 5, name: 'Bar Seat B' },
]

const STATUS_COLOR: Record<string, string> = {
  pending:   'text-warning',
  confirmed: 'text-info',
  preparing: 'text-primary',
  ready:     'text-success',
  served:    'text-text-muted',
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'Awaiting Confirmation',
  confirmed: 'Sent to Kitchen',
  preparing: 'In Preparation',
  ready:     'Ready to Serve',
  served:    'Served',
}

function elapsed(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  return `${Math.floor(secs / 60)}m ago`
}

// ─── Memoized Pending Order Card ──────────────────────────────────────────────
const PendingCard = memo(function PendingCard({
  order,
  onConfirm,
}: {
  order: Order
  onConfirm: (id: string) => void
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-300"
      style={{
        backgroundColor: 'rgba(251,191,36,0.06)',
        border: '2px solid rgba(251,191,36,0.45)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-text-base font-bold text-lg">#{order.id}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse"
              style={{ backgroundColor: 'rgba(251,191,36,0.2)', color: '#FBBF24' }}
            >
              NEW
            </span>
          </div>
          <p className="text-text-muted text-xs mt-0.5">
            {order.tableName} · {order.customerName}
          </p>
        </div>
        <div className="text-right">
          <span className="font-bold text-sm" style={{ color: '#C8860A' }}>
            ₱{order.total.toFixed(0)}
          </span>
          <p className="text-text-faint text-[10px] flex items-center gap-1 justify-end mt-0.5">
            <Clock className="w-3 h-3" />
            {elapsed(order.createdAt)}
          </p>
        </div>
      </div>
      {/* Items */}
      <div
        className="rounded-lg p-3 space-y-1"
        style={{ backgroundColor: 'rgba(13,11,10,0.3)' }}
      >
        {order.items.map(item => (
          <div key={item.id} className="flex justify-between items-center text-sm">
            <span className="text-text-base font-medium">{item.name}</span>
            <span className="text-text-muted">×{item.quantity}</span>
          </div>
        ))}
        {order.notes && (
          <div
            className="pt-2 mt-1 text-xs text-text-muted"
            style={{ borderTop: '1px dashed rgba(255,255,255,0.06)' }}
          >
            📝 {order.notes}
          </div>
        )}
      </div>
      {/* Confirm button */}
      <button
        onClick={() => onConfirm(order.id)}
        className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
        style={{ backgroundColor: '#60A5FA', color: '#0D0B0A' }}
      >
        <CheckCircle className="w-4 h-4" />
        Confirm & Send to Kitchen
      </button>
    </div>
  )
})

export default function Dashboard() {
  const { orders, updateOrderStatus, isConnected } = useOrders()

  // Alert cashier when new pending orders come in
  useOrderNotification(orders, o => o.status === 'pending')

  const pendingOrders = useMemo(
    () => orders.filter(o => o.status === 'pending'),
    [orders]
  )
  const activeOrders = useMemo(
    () => orders.filter(o => o.status !== 'served' && o.status !== 'pending'),
    [orders]
  )
  const inKitchenCount = useMemo(
    () => orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length,
    [orders]
  )
  const readyCount = useMemo(
    () => orders.filter(o => o.status === 'ready').length,
    [orders]
  )
  const occupiedTableIds = useMemo(
    () => new Set(orders.filter(o => o.status !== 'served').map(o => o.tableId)),
    [orders]
  )

  const confirmOrder = useCallback((orderId: string) => {
    updateOrderStatus(orderId, 'confirmed')
  }, [updateOrderStatus])

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <LayoutGrid className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-text-base">Cashier Dashboard</h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isConnected ? '#4ADE80' : '#F87171' }}
              />
              <span className="text-text-muted">{isConnected ? 'Live' : 'Offline'}</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Volume2 className="w-3.5 h-3.5" /> Alerts on
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Awaiting Confirmation', value: pendingOrders.length, icon: Bell,       color: 'text-warning' },
            { label: 'In Kitchen',            value: inKitchenCount,       icon: ChefHat,    color: 'text-primary' },
            { label: 'Ready to Serve',        value: readyCount,           icon: Coffee,     color: 'text-success' },
            { label: 'Occupied Tables',       value: occupiedTableIds.size, icon: Users,     color: 'text-info' },
          ].map(stat => (
            <div key={stat.label} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-text-muted text-xs">{stat.label}</p>
                <stat.icon className={`w-5 h-5 ${stat.color} opacity-60`} />
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Incoming Orders (need cashier confirmation) ── */}
        <div className="mb-8">
          <h2 className="text-text-muted text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-warning" />
            Incoming Orders
            {pendingOrders.length > 0 && (
              <span
                className="badge text-xs animate-pulse"
                style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)' }}
              >
                {pendingOrders.length} new
              </span>
            )}
          </h2>
          {pendingOrders.length === 0 ? (
            <div className="card p-10 text-center">
              <Coffee className="w-10 h-10 text-text-faint mx-auto mb-2" />
              <p className="text-text-muted text-sm">No pending orders</p>
              <p className="text-text-faint text-xs mt-1">New customer orders will appear here for confirmation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingOrders.map(order => (
                <PendingCard key={order.id} order={order} onConfirm={confirmOrder} />
              ))}
            </div>
          )}
        </div>

        {/* ── Active Orders (in kitchen / ready) ── */}
        {activeOrders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-text-muted text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Active Orders ({activeOrders.length})
            </h2>
            <div className="space-y-2">
              {activeOrders.map(order => (
                <div key={order.id} className="card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-text-base font-semibold text-sm">#{order.id}</span>
                      <span className="text-text-muted text-xs">·</span>
                      <span className="text-text-muted text-xs">{order.tableName}</span>
                      <span className="text-text-muted text-xs">·</span>
                      <span className="text-text-muted text-xs">{order.customerName}</span>
                    </div>
                    <p className="text-text-faint text-xs truncate">
                      {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-primary font-bold text-sm">₱{order.total.toFixed(0)}</p>
                    <span className={`text-xs font-semibold ${STATUS_COLOR[order.status]}`}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tables ── */}
        <h2 className="text-text-muted text-sm font-semibold uppercase tracking-wider mb-3">Tables</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {TABLES.map(table => {
            const occupied = occupiedTableIds.has(table.id)
            const tableOrders = orders.filter(o => o.tableId === table.id && o.status !== 'served')
            return (
              <div key={table.id} className={`card p-4 border-2 ${
                occupied
                  ? 'border-primary/40 bg-primary-glow'
                  : 'border-transparent'
              }`}>
                <p className="font-bold text-text-base text-sm mb-1">{table.name}</p>
                <p className={`text-xs font-semibold ${occupied ? 'text-primary' : 'text-success'}`}>
                  {occupied ? 'OCCUPIED' : 'AVAILABLE'}
                </p>
                {tableOrders.map(o => (
                  <div key={o.id} className="mt-2 pt-2 border-t border-border">
                    <p className="text-text-muted text-xs">#{o.id} · {o.customerName}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${STATUS_COLOR[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </p>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

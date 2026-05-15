import { ChefHat, CheckCircle, Clock, Loader2, Bell, Volume2, X, Flame } from 'lucide-react'
import { useOrders } from '../../context/OrderContext'
import type { OrderStatus, Order } from '../../context/OrderContext'
import { useOrderNotification } from '../../hooks/useOrderNotification'
import { useMemo, useState, useCallback, memo } from 'react'

// ─── Pipeline definition ──────────────────────────────────────────────────────
type Stage = {
  status: OrderStatus
  label: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  btnLabel: string
  color: string
  desc: string
}
const PIPELINE: Stage[] = [
  { status: 'confirmed', label: 'Queued',      icon: Bell,      btnLabel: 'Start Preparing', color: '#60A5FA', desc: 'Cashier confirmed' },
  { status: 'preparing', label: 'Preparing',   icon: Flame,     btnLabel: 'Mark as Ready',   color: '#C8860A', desc: 'In preparation' },
  { status: 'ready',     label: 'Ready! 🔔',   icon: CheckCircle, btnLabel: 'Mark Served',   color: '#4ADE80', desc: 'Ready to serve' },
]
const NEXT: Record<string, OrderStatus> = {
  confirmed: 'preparing',
  preparing: 'ready',
  ready:     'served',
}
const CARD_STYLE: Record<OrderStatus, { border: string; bg: string; badge: string; text: string }> = {
  pending:   { border: 'rgba(251,191,36,0.45)',  bg: 'rgba(251,191,36,0.06)',  badge: 'rgba(251,191,36,0.15)',  text: '#FBBF24' },
  confirmed: { border: 'rgba(96,165,250,0.45)',  bg: 'rgba(96,165,250,0.06)',  badge: 'rgba(96,165,250,0.15)',  text: '#60A5FA' },
  preparing: { border: 'rgba(200,134,10,0.5)',   bg: 'rgba(200,134,10,0.07)',  badge: 'rgba(200,134,10,0.15)',  text: '#C8860A' },
  ready:     { border: 'rgba(74,222,128,0.5)',   bg: 'rgba(74,222,128,0.07)',  badge: 'rgba(74,222,128,0.15)',  text: '#4ADE80' },
  served:    { border: '#2E2318',                bg: '#171210',                badge: '#211A15',                text: '#5C4F44' },
  paid:      { border: '#2E2318',                bg: '#171210',                badge: '#211A15',                text: '#3A3330' },
  cancelled: { border: 'rgba(239,68,68,0.3)',    bg: 'rgba(239,68,68,0.04)',   badge: 'rgba(239,68,68,0.12)',   text: '#EF4444' },
}

function elapsed(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m`
}

// ─── Compact Order Card ───────────────────────────────────────────────────────
interface OrderCardProps {
  order: Order
  stage: Stage
  onAdvance: (orderId: string, status: OrderStatus) => void
  onDismiss: (orderId: string) => void
}

const OrderCard = memo(function OrderCard({ order, stage, onAdvance, onDismiss }: OrderCardProps) {
  const s    = CARD_STYLE[order.status]
  const next = NEXT[order.status] as OrderStatus | undefined

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-all duration-300"
      style={{ backgroundColor: s.bg, border: `1.5px solid ${s.border}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-text-base font-bold text-lg">#{order.id}</span>
          {order.status === 'ready' && (
            <Bell className="w-4 h-4 animate-bounce" style={{ color: '#4ADE80' }} />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-text-faint text-[11px] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {elapsed(order.createdAt)}
          </span>
          <button
            onClick={() => onDismiss(order.id)}
            className="p-0.5 rounded text-text-faint hover:text-text-muted transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Table + Customer */}
      <p className="text-text-muted text-xs -mt-1">
        {order.tableName} · {order.customerName}
      </p>

      {/* Items */}
      <div
        className="rounded-lg p-2.5 space-y-1"
        style={{ backgroundColor: 'rgba(13,11,10,0.35)' }}
      >
        {order.items.map(item => (
          <div key={item.id} className="flex justify-between items-center">
            <span className="text-text-base text-sm font-medium">{item.name}</span>
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: s.badge, color: s.text }}
            >
              ×{item.quantity}
            </span>
          </div>
        ))}
        {order.notes && (
          <p
            className="pt-1.5 mt-1 text-[11px] text-text-muted"
            style={{ borderTop: '1px dashed rgba(255,255,255,0.06)' }}
          >
            📝 {order.notes}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm" style={{ color: '#C8860A' }}>₱{order.total.toFixed(0)}</span>
      </div>

      {/* Advance button */}
      {next && (
        <button
          onClick={() => onAdvance(order.id, order.status)}
          className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{
            backgroundColor: stage.color,
            color: '#0D0B0A',
          }}
        >
          {order.status === 'confirmed' ? <Loader2 className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {stage.btnLabel}
        </button>
      )}
    </div>
  )
})

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OrderQueue() {
  const { orders, updateOrderStatus } = useOrders()
  const [dismissed, setDismissed]     = useState<Set<string>>(new Set())

  useOrderNotification(orders, o => o.status === 'confirmed')

  // Group orders by pipeline stage
  const ordersByStage = useMemo(() => {
    const map: Record<string, Order[]> = { confirmed: [], preparing: [], ready: [] }
    orders.forEach(o => {
      if (['confirmed', 'preparing', 'ready'].includes(o.status) && !dismissed.has(o.id)) {
        map[o.status]?.push(o)
      }
    })
    return map
  }, [orders, dismissed])

  const totalActive = useMemo(
    () => Object.values(ordersByStage).reduce((s, arr) => s + arr.length, 0),
    [ordersByStage]
  )

  const servedOrders = useMemo(
    () => orders.filter(o => o.status === 'served'),
    [orders]
  )

  const advance = useCallback((orderId: string, current: OrderStatus) => {
    const next = NEXT[current]
    if (next) updateOrderStatus(orderId, next as OrderStatus)
  }, [updateOrderStatus])

  const dismiss = useCallback((orderId: string) => {
    setDismissed(prev => new Set([...prev, orderId]))
  }, [])

  return (
    <div className="min-h-screen bg-background md:ml-56 pt-4 md:pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <ChefHat className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-text-base">Kitchen Queue</h1>
          <div className="ml-auto flex items-center gap-3">
            {totalActive > 0 && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(200,134,10,0.15)', color: '#C8860A', border: '1px solid rgba(200,134,10,0.3)' }}
              >
                {totalActive} active
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Volume2 className="w-3.5 h-3.5" /> Alerts on
            </span>
          </div>
        </div>

        {/* ── Column lanes ── */}
        {totalActive === 0 ? (
          <div className="card p-16 text-center mb-8">
            <ChefHat className="w-14 h-14 text-text-faint mx-auto mb-3" />
            <p className="text-text-muted font-medium">No orders in kitchen</p>
            <p className="text-text-faint text-sm mt-1">Orders confirmed by the cashier will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
            {PIPELINE.map(stage => {
              const stageOrders = ordersByStage[stage.status] || []
              return (
                <div key={stage.status}>
                  {/* Column header */}
                  <div
                    className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: CARD_STYLE[stage.status].badge }}
                  >
                    <stage.icon className="w-4 h-4" style={{ color: stage.color }} />
                    <span className="text-sm font-bold" style={{ color: stage.color }}>
                      {stage.label}
                    </span>
                    <span
                      className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: CARD_STYLE[stage.status].bg, color: stage.color }}
                    >
                      {stageOrders.length}
                    </span>
                  </div>

                  {/* Cards in this column */}
                  {stageOrders.length === 0 ? (
                    <div
                      className="rounded-xl p-8 text-center"
                      style={{ border: '1.5px dashed #2E2318' }}
                    >
                      <p className="text-text-faint text-xs">No orders</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stageOrders.map(order => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          stage={stage}
                          onAdvance={advance}
                          onDismiss={dismiss}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Served today ── */}
        {servedOrders.length > 0 && (
          <div>
            <h2 className="text-text-muted text-xs font-semibold uppercase tracking-widest mb-3">
              Completed today ({servedOrders.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {servedOrders.map(order => (
                <div
                  key={order.id}
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{ backgroundColor: '#171210', border: '1px solid #2E2318', opacity: 0.6 }}
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#4ADE80' }} />
                  <span className="text-text-muted text-sm font-mono">#{order.id}</span>
                  <span className="text-text-faint text-xs">·</span>
                  <span className="text-text-muted text-sm truncate">{order.tableName}</span>
                  <span className="ml-auto text-text-faint text-sm font-medium flex-shrink-0">
                    ₱{order.total.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

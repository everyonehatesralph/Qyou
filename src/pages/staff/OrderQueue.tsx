import { ChefHat, CheckCircle, Clock, Loader2, Bell, Volume2, X } from 'lucide-react'
import { useOrders } from '../../context/OrderContext'
import type { OrderStatus, Order } from '../../context/OrderContext'
import { useOrderNotification } from '../../hooks/useOrderNotification'
import { useMemo, useState, useCallback, memo } from 'react'

// ─── Pipeline definition ──────────────────────────────────────────────────────
type Stage = {
  status: OrderStatus
  label: string
  btnLabel: string
  btnStyle: 'default' | 'green' | 'blue'
  desc: string
}
const PIPELINE: Stage[] = [
  { status: 'confirmed', label: 'Confirmed',  btnLabel: 'Start Preparing', btnStyle: 'blue',    desc: 'Cashier confirmed — ready to start' },
  { status: 'preparing', label: 'Preparing',  btnLabel: 'Mark as Ready',   btnStyle: 'green',   desc: 'Currently being prepared' },
  { status: 'ready',     label: 'Ready! 🔔',  btnLabel: 'Mark Served',     btnStyle: 'green',   desc: 'Waiting to be served to table' },
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
}

function elapsed(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  return `${mins}m ago`
}

// ─── Memoized Order Card ──────────────────────────────────────────────────────
// React.memo prevents re-rendering cards whose data hasn't changed,
// which is critical when the kitchen has many concurrent orders.
interface OrderCardProps {
  order: Order
  onAdvance: (orderId: string, status: OrderStatus) => void
  onDismiss: (orderId: string) => void
}

const OrderCard = memo(function OrderCard({ order, onAdvance, onDismiss }: OrderCardProps) {
  const s     = CARD_STYLE[order.status]
  const next  = NEXT[order.status] as OrderStatus | undefined
  const stage = PIPELINE.find(p => p.status === order.status)

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 transition-all duration-300"
      style={{ backgroundColor: s.bg, border: `2px solid ${s.border}` }}
    >
      {/* Order header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-text-base font-bold text-xl">#{order.id}</span>
            {order.status === 'ready' && (
              <Bell className="w-5 h-5 animate-bounce" style={{ color: '#4ADE80' }} />
            )}
            {order.status === 'pending' && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse"
                style={{ backgroundColor: 'rgba(251,191,36,0.2)', color: '#FBBF24' }}
              >
                NEW
              </span>
            )}
          </div>
          <p className="text-text-muted text-xs mt-0.5">
            {order.tableName} · {order.customerName}
          </p>
        </div>
        <div className="flex items-start gap-1">
          <span
            className="badge text-[11px]"
            style={{ backgroundColor: s.badge, color: s.text, border: `1px solid ${s.border}` }}
          >
            {stage?.label ?? order.status}
          </span>
          <button
            onClick={() => onDismiss(order.id)}
            className="p-1 rounded text-text-faint hover:text-text-muted transition-colors ml-1"
            title="Hide this card"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {/* Items */}
      <div
        className="rounded-lg p-3 space-y-1.5"
        style={{ backgroundColor: 'rgba(13,11,10,0.3)' }}
      >
        {order.items.map(item => (
          <div key={item.id} className="flex justify-between items-center">
            <span className="text-text-base text-sm font-medium">{item.name}</span>
            <span
              className="text-sm font-bold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: s.badge, color: s.text }}
            >
              ×{item.quantity}
            </span>
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
      {/* Meta row */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-text-faint">
          <Clock className="w-3.5 h-3.5" />
          {elapsed(order.createdAt)}
        </span>
        <span className="font-bold" style={{ color: '#C8860A' }}>
          ₱{order.total.toFixed(0)}
        </span>
      </div>
      {/* Status pipeline mini-bar */}
      <div className="flex gap-1">
        {PIPELINE.map(p => {
          const stageIdx  = PIPELINE.findIndex(x => x.status === order.status)
          const thisIdx   = PIPELINE.findIndex(x => x.status === p.status)
          const isDone    = thisIdx < stageIdx
          const isCurrent = p.status === order.status
          const sc        = CARD_STYLE[p.status]
          return (
            <div
              key={p.status}
              className="flex-1 h-1.5 rounded-full transition-all duration-500"
              style={{
                backgroundColor: isDone
                  ? '#4ADE80'
                  : isCurrent
                    ? sc.text
                    : 'rgba(255,255,255,0.07)',
              }}
            />
          )
        })}
      </div>
      {/* Advance button */}
      {next && stage && (
        <button
          onClick={() => onAdvance(order.id, order.status)}
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          style={
            stage.btnStyle === 'green'
              ? { backgroundColor: '#4ADE80', color: '#0D0B0A' }
              : stage.btnStyle === 'blue'
                ? { backgroundColor: '#60A5FA', color: '#0D0B0A' }
                : { backgroundColor: '#2C231B', color: s.text, border: `1px solid ${s.border}` }
          }
        >
          {stage.btnStyle === 'green'
            ? <CheckCircle className="w-4 h-4" />
            : <Loader2 className="w-4 h-4" />
          }
          {stage.btnLabel}
        </button>
      )}
      {order.status === 'ready' && (
        <p className="text-center text-xs" style={{ color: '#4ADE80' }}>
          ✓ Customer is being notified
        </p>
      )}
    </div>
  )
})

// ─── Memoized Served Item ─────────────────────────────────────────────────────
const ServedItem = memo(function ServedItem({ order }: { order: Order }) {
  return (
    <div
      className="rounded-xl p-3 flex items-center gap-3"
      style={{ backgroundColor: '#171210', border: '1px solid #2E2318', opacity: 0.6 }}
    >
      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#4ADE80' }} />
      <span className="text-text-muted text-sm font-mono">#{order.id}</span>
      <span className="text-text-faint">·</span>
      <span className="text-text-muted text-sm">{order.tableName}</span>
      <span className="text-text-faint">·</span>
      <span className="text-text-muted text-sm flex-1 truncate">{order.customerName}</span>
      <span className="text-text-faint text-xs">
        {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
      </span>
      <span className="text-text-faint text-sm font-medium flex-shrink-0">
        ₱{order.total.toFixed(0)}
      </span>
    </div>
  )
})

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OrderQueue() {
  // Use the atomic OrderContext — only re-renders when orders change
  const { orders, updateOrderStatus } = useOrders()
  const [dismissed, setDismissed]     = useState<Set<string>>(new Set())
  // Alert kitchen when cashier confirms an order (new confirmed order enters kitchen)
  useOrderNotification(orders, o => o.status === 'confirmed')

  // Kitchen only sees confirmed/preparing/ready — pending goes to cashier
  const activeOrders = useMemo(
    () => orders.filter(o => o.status !== 'served' && o.status !== 'pending' && !dismissed.has(o.id)),
    [orders, dismissed]
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
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <ChefHat className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-text-base">Kitchen Queue</h1>
          <div className="ml-auto flex items-center gap-3">
            {activeOrders.length > 0 && (
              <span
                className="badge text-xs"
                style={{ backgroundColor: 'rgba(200,134,10,0.15)', color: '#C8860A', border: '1px solid rgba(200,134,10,0.3)' }}
              >
                {activeOrders.length} active
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Volume2 className="w-3.5 h-3.5" /> Alerts on
            </span>
          </div>
        </div>
        {/* Pipeline legend */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {PIPELINE.map((stage, idx) => {
            const c = CARD_STYLE[stage.status]
            return (
              <div key={stage.status} className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: c.badge, color: c.text, border: `1px solid ${c.border}` }}
                >
                  {idx + 1}. {stage.label}
                </span>
                {idx < PIPELINE.length - 1 && (
                  <span className="text-text-faint text-xs">→</span>
                )}
              </div>
            )
          })}
          <span className="text-text-faint text-xs flex-shrink-0">→ Served ✓</span>
        </div>
        {/* Empty state */}
        {activeOrders.length === 0 && (
          <div className="card p-16 text-center mb-6">
            <ChefHat className="w-14 h-14 text-text-faint mx-auto mb-3" />
            <p className="text-text-muted font-medium">No orders in kitchen</p>
            <p className="text-text-faint text-sm mt-1">Orders confirmed by the cashier will appear here.</p>
          </div>
        )}
        {/* Active order cards — each card is React.memo'd */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {activeOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onAdvance={advance}
              onDismiss={dismiss}
            />
          ))}
        </div>
        {/* Served section */}
        {servedOrders.length > 0 && (
          <div>
            <h2 className="text-text-muted text-xs font-semibold uppercase tracking-widest mb-3">
              Completed today ({servedOrders.length})
            </h2>
            <div className="space-y-2">
              {servedOrders.map(order => (
                <ServedItem key={order.id} order={order} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

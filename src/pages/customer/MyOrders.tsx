import { ClipboardList, ChefHat, Clock, CheckCircle, ArrowRight, Loader2, Coffee, X, Heart, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useOrders, getMyOrderIds } from '../../context/OrderContext'
import type { Order } from '../../context/OrderContext'
import { useReadyNotification } from '../../hooks/useReadyNotification'

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: typeof Clock }> = {
  pending: { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', label: 'Awaiting Cashier', icon: Clock },
  confirmed: { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', label: 'Cashier Confirmed', icon: CheckCircle },
  preparing: { color: '#C8860A', bg: 'rgba(200,134,10,0.1)', label: 'Kitchen Preparing', icon: ChefHat },
  ready: { color: '#4ADE80', bg: 'rgba(74,222,128,0.1)', label: 'Ready for You! 🎉', icon: CheckCircle },
  served: { color: '#4ADE80', bg: 'rgba(74,222,128,0.06)', label: 'Served ✓', icon: CheckCircle },
  cancelled: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'Cancelled', icon: X },
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return `${hours}h ago`
}

function OrderCard({ order, onTap, onCancel }: { order: Order; onTap: () => void; onCancel?: (id: string) => void }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const Icon = cfg.icon
  const isActive = order.status !== 'served' && order.status !== 'cancelled'
  const canCancel = order.status === 'pending' || order.status === 'confirmed'

  return (
    <div
      className="w-full card p-4 transition-all duration-200"
      style={isActive ? { borderColor: cfg.color + '60' } : undefined}
    >
      <button
        onClick={onTap}
        className="w-full text-left transition-all active:scale-[0.98]"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: cfg.bg }}
          >
            {order.status === 'preparing'
              ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: cfg.color }} />
              : <Icon className="w-5 h-5" style={{ color: cfg.color }} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-text-base font-semibold text-sm">Order #{order.id}</span>
              {order.status !== 'cancelled' && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  {order.status === 'ready' ? 'READY!' : 'ACTIVE'}
                </span>
              )}
            </div>
            <p className="text-text-muted text-xs truncate">
              {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold" style={{ color: cfg.color }}>
                {cfg.label}
              </span>
              <span className="text-text-faint text-[10px]">·</span>
              <span className="text-text-faint text-[10px]">{timeAgo(order.createdAt)}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-primary font-bold text-sm">₱{order.total.toFixed(0)}</p>
            <ArrowRight className="w-4 h-4 text-text-faint mt-1 ml-auto" />
          </div>
        </div>

        {/* Live progress bar for active orders */}
        {isActive && (
          <div className="flex gap-1 mt-3">
            {['pending', 'confirmed', 'preparing', 'ready'].map((step, i) => {
              const stepIdx = ['pending', 'confirmed', 'preparing', 'ready'].indexOf(order.status)
              const isDone = i < stepIdx
              const isCurrent = i === stepIdx
              return (
                <div
                  key={step}
                  className="flex-1 h-1 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: isDone ? '#4ADE80'
                      : isCurrent ? cfg.color
                        : 'rgba(255,255,255,0.07)',
                  }}
                />
              )
            })}
          </div>
        )}
      </button>

      {/* Cancel button for pending/confirmed orders */}
      {canCancel && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCancel?.(order.id)
          }}
          className="mt-3 w-full py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          Cancel Order
        </button>
      )}
    </div>
  )
}

export default function MyOrders() {
  const navigate = useNavigate()
  const { orders, cancelOrder } = useOrders()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(true)
  const { newReadyOrderId, dismissNotification } = useReadyNotification(orders)
  const myOrderIds = useMemo(() => getMyOrderIds(), [orders])

  const myOrders = useMemo(() => {
    return myOrderIds
      .map(id => orders.find(o => o.id === id))
      .filter((o): o is Order => !!o)
  }, [orders, myOrderIds])

  const activeOrders = useMemo(() => myOrders.filter(o => o.status !== 'served' && o.status !== 'cancelled'), [myOrders])
  const pastOrders = useMemo(() => myOrders.filter(o => o.status === 'served' || o.status === 'cancelled'), [myOrders])

  const handleCancelOrder = (orderId: string) => {
    setCancellingId(orderId)
  }

  const confirmCancel = (orderId: string) => {
    cancelOrder(orderId)
    setCancellingId(null)
  }

  const hasServedOrders = pastOrders.some(o => o.status === 'served')

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-8">
        {/* ── Thank You Celebration Banner (Mobile) or Modal (Desktop) ────────────────────── */}
        {hasServedOrders && showCelebration && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowCelebration(false)}
          >
            <div
              className="rounded-2xl p-6 sm:p-8 text-center max-w-sm w-full animate-in fade-in scale-in-95"
              style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button inside container */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowCelebration(false)}
                  className="p-1 rounded-lg transition-all hover:bg-white/10"
                  style={{ color: '#9B8B7A' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Animated hearts */}
              <div className="flex justify-center gap-2 mb-4 sm:mb-6">
                <Heart
                  className="w-6 sm:w-8 h-6 sm:h-8 animate-bounce"
                  style={{ color: '#C8860A', animationDelay: '0s' }}
                />
                <Heart
                  className="w-6 sm:w-8 h-6 sm:h-8 animate-bounce"
                  style={{ color: '#4ADE80', animationDelay: '0.1s' }}
                />
                <Heart
                  className="w-6 sm:w-8 h-6 sm:h-8 animate-bounce"
                  style={{ color: '#C8860A', animationDelay: '0.2s' }}
                />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-text-base">Thank You!</h2>
              <p className="text-text-muted mb-4 sm:mb-6 text-sm sm:text-base">
                We hope you enjoyed your order. Thank you for choosing us!
              </p>

              <div
                className="rounded-xl p-3 sm:p-4 mb-4 sm:mb-6"
                style={{ backgroundColor: 'rgba(200,134,10,0.08)', border: '1px solid rgba(200,134,10,0.2)' }}
              >
                <p className="text-xs sm:text-sm text-text-base font-medium">Ready for another round?</p>
                <p className="text-[10px] sm:text-xs text-text-muted mt-1">Place a new order and enjoy more delicious items</p>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setShowCelebration(false)}
                  className="flex-1 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95"
                  style={{ backgroundColor: '#211A15', color: '#C8860A', border: '1px solid #2E2318' }}
                >
                  View Orders
                </button>
                <button
                  onClick={() => {
                    setShowCelebration(false)
                    navigate('/menu')
                  }}
                  className="flex-1 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95"
                  style={{ backgroundColor: '#C8860A', color: '#0D0B0A' }}
                >
                  Order Again
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-text-base">My Orders</h1>
        </div>

        {myOrders.length === 0 ? (
          <div className="card p-12 text-center">
            <Coffee className="w-14 h-14 text-text-faint mx-auto mb-4" />
            <p className="text-text-muted font-medium mb-1">No orders yet</p>
            <p className="text-text-faint text-sm mb-6">Place your first order from the menu!</p>
            <button
              onClick={() => navigate('/menu')}
              className="btn-primary py-3 px-8 rounded-xl text-background font-semibold"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  Active Orders ({activeOrders.length})
                </h2>
                <div className="space-y-3">
                  {activeOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onTap={() => navigate(`/order/${order.id}`)}
                      onCancel={handleCancelOrder}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past Orders */}
            {pastOrders.length > 0 && (
              <div>
                <h2 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3">
                  Past Orders ({pastOrders.length})
                </h2>
                <div className="space-y-2">
                  {pastOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onTap={() => navigate(`/order/${order.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* Order Ready notification overlay */}
      {newReadyOrderId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={dismissNotification}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full text-center"
            style={{ backgroundColor: '#171210', border: '2px solid rgba(74,222,128,0.4)', boxShadow: '0 0 60px rgba(74,222,128,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Animated bell */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(74,222,128,0.12)', border: '2px solid rgba(74,222,128,0.35)' }}
            >
              <Bell className="w-10 h-10 animate-bounce" style={{ color: '#4ADE80' }} />
            </div>

            <h3 className="text-xl font-bold mb-1" style={{ color: '#4ADE80' }}>
              Your Order is Ready! 🎉
            </h3>
            <p className="text-text-muted text-sm mb-2">
              Order #{newReadyOrderId}
            </p>
            <p className="text-text-faint text-xs mb-5">
              Head to the pickup area or ask a waiter to bring it to you
            </p>

            <div className="flex gap-3">
              <button
                onClick={dismissNotification}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{ backgroundColor: '#211A15', color: '#9B8B7A', border: '1px solid #2E2318' }}
              >
                Dismiss
              </button>
              <button
                onClick={() => { dismissNotification(); navigate(`/order/${newReadyOrderId}`) }}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ backgroundColor: '#4ADE80', color: '#0D0B0A' }}
              >
                View Order →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {cancellingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setCancellingId(null)}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full text-center"
            style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <X className="w-7 h-7" style={{ color: '#EF4444' }} />
            </div>
            <h3 className="text-lg font-bold text-text-base mb-1">Cancel this order?</h3>
            <p className="text-text-muted text-sm mb-5">
              Order #{cancellingId} will be cancelled and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancellingId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{ backgroundColor: '#211A15', color: '#9B8B7A', border: '1px solid #2E2318' }}
              >
                Keep Order
              </button>
              <button
                onClick={() => confirmCancel(cancellingId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ backgroundColor: '#EF4444', color: '#fff' }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

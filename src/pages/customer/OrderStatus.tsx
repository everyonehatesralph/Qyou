import { Clock, CheckCircle, Loader2, ChefHat, Bell, Receipt } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useOrders } from '../../context/OrderContext'
import InvoiceModal from '../../components/InvoiceModal'

// ─── Pipeline definition — Customer → Cashier → Kitchen → Customer ────────────
const STEPS = [
  { key: 'pending',   label: 'Order Placed',       desc: 'Your order has been submitted to the cashier for confirmation.',     color: '#C8860A' },
  { key: 'confirmed', label: 'Cashier Confirmed',   desc: 'The cashier has confirmed your order and sent it to the kitchen.',  color: '#60A5FA' },
  { key: 'preparing', label: 'Kitchen Preparing',   desc: 'The kitchen is now preparing your food and drinks.',               color: '#C8860A' },
  { key: 'ready',     label: 'Ready for You! 🎉',   desc: 'Your order is ready — a staff member will bring it to your table.', color: '#4ADE80' },
  { key: 'served',    label: 'Served ✓',            desc: 'Enjoy your meal! Thank you for dining with us.',                   color: '#4ADE80' },
]
const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'ready', 'served']

function elapsed(iso: string | undefined, now: number) {
  if (!iso) return ''
  const secs = Math.floor((now - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m`
}

export default function OrderStatus() {
  const navigate = useNavigate()
  const { orderId } = useParams()
  // Use atomic OrderContext — only re-renders when orders change, not cart/auth
  const { orders, isConnected } = useOrders()
  const [showInvoice, setShowInvoice] = useState(false)

  // Memoize order lookup to avoid re-scanning array on unrelated renders
  const order = useMemo(
    () => orders.find(o => o.id === orderId),
    [orders, orderId]
  )

  // Re-read fresh elapsed times on every render (BroadcastChannel drives renders)
  const now = Date.now()
  const currentIdx = order ? STATUS_ORDER.indexOf(order.status) : 0

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ backgroundColor: 'rgba(200,134,10,0.12)', border: '1px solid rgba(200,134,10,0.3)' }}
          >
            <ChefHat className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-base">Order Status</h1>
          <p className="text-text-muted text-sm mt-1 font-mono">Order #{orderId}</p>
          <p className="text-text-faint text-xs mt-1 flex items-center justify-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: isConnected ? '#4ADE80' : '#F87171' }}
            />
            {isConnected ? 'Live — updates instantly across all devices' : 'Connecting to server…'}
          </p>
        </div>

        {!order ? (
          <div className="card p-10 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-text-muted text-sm">Looking for your order…</p>
            <button
              onClick={() => navigate('/menu')}
              className="btn-primary py-3 px-6 rounded-xl mt-5 text-background font-semibold text-sm"
            >
              Back to Menu
            </button>
          </div>
        ) : (
          <>
            {/* ── Current status banner ── */}
            {order.status === 'ready' ? (
              <div
                className="rounded-xl p-4 flex items-center gap-3 mb-5"
                style={{ backgroundColor: 'rgba(74,222,128,0.1)', border: '2px solid rgba(74,222,128,0.4)' }}
              >
                <Bell className="w-6 h-6 animate-bounce flex-shrink-0" style={{ color: '#4ADE80' }} />
                <div>
                  <p className="font-bold text-sm" style={{ color: '#4ADE80' }}>Your order is ready!</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(74,222,128,0.7)' }}>
                    A staff member will bring it to your table shortly.
                  </p>
                </div>
              </div>
            ) : order.status === 'served' ? (
              <div
                className="rounded-xl p-4 flex items-center gap-3 mb-5"
                style={{ backgroundColor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}
              >
                <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#4ADE80' }} />
                <p className="font-semibold text-sm" style={{ color: '#4ADE80' }}>
                  Enjoy your meal! 🎉 Thank you for dining with us.
                </p>
              </div>
            ) : (
              <div
                className="rounded-xl p-3 flex items-center gap-3 mb-5"
                style={{ backgroundColor: 'rgba(200,134,10,0.07)', border: '1px solid rgba(200,134,10,0.25)' }}
              >
                <Loader2 className="w-5 h-5 animate-spin flex-shrink-0 text-primary" />
                <p className="text-text-muted text-sm">
                  {order.status === 'pending'
                    ? 'Waiting for kitchen to accept your order…'
                    : order.status === 'confirmed'
                      ? 'Kitchen confirmed — preparation starting soon…'
                      : 'Your order is being prepared…'
                  }
                </p>
              </div>
            )}

            {/* ── Order summary ── */}
            <div className="card p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-text-muted text-xs font-semibold uppercase tracking-wide">Order Summary</span>
                <span
                  className="badge text-xs"
                  style={{ backgroundColor: 'rgba(200,134,10,0.12)', color: '#C8860A', border: '1px solid rgba(200,134,10,0.25)' }}
                >
                  {order.tableName} · {order.customerName}
                </span>
              </div>
              <div className="space-y-1.5 mb-3">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-text-muted">{item.name} <span className="text-text-faint">×{item.quantity}</span></span>
                    <span className="text-text-base font-medium">₱{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div
                className="flex justify-between items-center pt-3"
                style={{ borderTop: '1px solid #2E2318' }}
              >
                <span className="text-text-muted text-sm">Total</span>
                <span className="font-bold text-lg text-primary">₱{order.total.toFixed(0)}</span>
              </div>
            </div>

            {/* ── Status stepper ── */}
            <div className="card p-5 mb-5">
              <p className="text-text-muted text-xs font-semibold uppercase tracking-wide mb-4">Order Progress</p>
              <div className="space-y-0">
                {STEPS.map((step, idx) => {
                  const isDone    = idx < currentIdx
                  const isActive  = idx === currentIdx
                  const isFuture  = idx > currentIdx
                  // Get stage timestamp
                  const tsMap: Record<string, string | undefined> = {
                    confirmed: order.confirmedAt,
                    preparing: order.preparingAt,
                    ready:     order.readyAt,
                    served:    order.servedAt,
                  }
                  const stageTime = tsMap[step.key]
                  return (
                    <div key={step.key}>
                      <div className="flex items-start gap-4">
                        {/* Circle icon */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500"
                            style={
                              isDone   ? { backgroundColor: 'rgba(74,222,128,0.15)',   color: '#4ADE80', border: '2px solid rgba(74,222,128,0.4)' }  :
                              isActive ? { backgroundColor: `rgba(${step.color === '#4ADE80' ? '74,222,128' : step.color === '#60A5FA' ? '96,165,250' : '200,134,10'},0.15)`, color: step.color, border: `2px solid ${step.color}` } :
                                         { backgroundColor: '#1A1412', color: '#3D3028', border: '2px solid #2E2318' }
                            }
                          >
                            {isDone   ? <CheckCircle className="w-5 h-5" /> :
                             isActive ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                        <Clock className="w-4 h-4" />}
                          </div>
                        </div>
                        {/* Label */}
                        <div className="flex-1 pt-1 pb-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              className="font-semibold text-sm transition-all duration-300"
                              style={{ color: isDone ? '#4ADE80' : isActive ? step.color : '#3D3028' }}
                            >
                              {step.label}
                            </p>
                            {stageTime && !isFuture && (
                              <span className="text-text-faint text-[10px]">
                                {elapsed(stageTime, now)} ago
                              </span>
                            )}
                            {isActive && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse"
                                style={{ backgroundColor: `rgba(200,134,10,0.15)`, color: '#C8860A' }}
                              >
                                CURRENT
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <p className="text-text-faint text-xs mt-0.5 leading-relaxed">
                              {step.desc}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Connector line */}
                      {idx < STEPS.length - 1 && (
                        <div
                          className="ml-4 w-0.5 h-5 rounded-full transition-all duration-500"
                          style={{ backgroundColor: isDone ? 'rgba(74,222,128,0.35)' : '#1A1412' }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Actions ── */}
            <button
              onClick={() => setShowInvoice(true)}
              className="w-full btn-ghost py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm mb-3"
            >
              <Receipt className="w-4 h-4" />
              View Invoice
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 text-text-faint hover:text-text-muted text-sm transition-colors text-center"
            >
              ← Back to Home
            </button>
          </>
        )}
      </div>
      {order && showInvoice && (
        <InvoiceModal order={order} onClose={() => setShowInvoice(false)} />
      )}
    </div>
  )
}

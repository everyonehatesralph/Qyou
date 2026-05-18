import { useNavigate, useParams } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useOrders } from '../../context/OrderContext'
import InvoiceModal from '../../components/InvoiceModal'



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



  return (
    <div className="min-h-screen bg-background pt-14 pb-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-base mb-2">Order Status</h1>
          <p className="text-text-muted text-sm">Order #{orderId}</p>
          <p className="text-text-faint text-xs mt-2">
            {isConnected ? '🟢 Live' : '⚠️ Connecting…'}
          </p>
        </div>

        {!order ? (
          <div className="card p-8 text-center">
            <p className="text-text-muted mb-4">Loading your order…</p>
            <button
              onClick={() => navigate('/my-orders')}
              className="btn-primary py-2 px-4 rounded-lg text-sm"
            >
              Back to Orders
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Banner */}
            <div className="card p-4 bg-primary/10 border border-primary/30">
              <p className="text-primary font-semibold text-sm">{order.status.toUpperCase()}</p>
              <p className="text-text-muted text-xs mt-1">{order.tableName} · {order.customerName}</p>
            </div>

            {/* Order Items */}
            <div className="card p-4">
              <p className="text-text-muted text-xs font-bold uppercase mb-3">Items</p>
              <div className="space-y-2">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-text-base">{item.name} ×{item.quantity}</span>
                    <span className="text-primary font-semibold">₱{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-3 pt-3 flex justify-between">
                <span className="font-bold">Total</span>
                <span className="text-primary font-bold text-lg">₱{order.total.toFixed(0)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowInvoice(true)}
                className="flex-1 btn-primary py-2 rounded-lg text-sm"
              >
                View Invoice
              </button>
              <button
                onClick={() => navigate('/my-orders')}
                className="flex-1 btn-ghost py-2 rounded-lg text-sm"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
      {order && showInvoice && (
        <InvoiceModal order={order} onClose={() => setShowInvoice(false)} />
      )}
    </div>
  )
}

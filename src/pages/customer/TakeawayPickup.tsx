import { QRCodeSVG } from 'qrcode.react'
import { ShoppingBag, Clock, Check } from 'lucide-react'
import { useOrders } from '../../context/OrderContext'
import { useTheme } from '../../context/ThemeContext'
import { useMemo } from 'react'

export default function TakeawayPickup() {
  const { orders } = useOrders()
  const { isDark } = useTheme()

  // Get all active takeaway orders
  const takeawayOrders = useMemo(() => {
    return orders.filter(o => 
      o.orderType === 'takeaway' && 
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders])

  // Build QR code value - URL to this page
  const qrUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/takeaway-pickup`
    : 'https://deverse-cafe.local/takeaway-pickup'

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ready': return '#4ADE80'
      case 'preparing': return '#C8860A'
      case 'confirmed': return '#60A5FA'
      default: return '#9B8B7A'
    }
  }

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'ready': return '✓ Ready!'
      case 'preparing': return '🔥 Preparing'
      case 'confirmed': return '⏳ Queued'
      default: return '📋 Pending'
    }
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-background' : 'bg-light-bg'}`}>
      {/* Header with Fixed QR Code */}
      <div className="pt-14 pb-28 border-b" style={{ borderColor: isDark ? '#2E2318' : '#D4C8B0' }}>
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Scan to check your order</p>
            <div className="p-4 rounded-2xl" style={{ backgroundColor: isDark ? 'rgba(200,134,10,0.06)' : 'rgba(176,117,8,0.05)' }}>
              <QRCodeSVG 
                value={qrUrl}
                size={180}
                level="H"
                includeMargin={true}
                fgColor={isDark ? '#0D0B0A' : '#3A3330'}
                bgColor={isDark ? '#FFFFFF' : '#F0E6D3'}
              />
            </div>
          </div>

          {/* Title & Instructions */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
              <ShoppingBag className="w-8 h-8" style={{ color: '#C8860A' }} />
              <h1 className="text-4xl font-bold text-text-base">Takeaway Orders</h1>
            </div>
            <p className="text-text-muted text-lg mb-4">
              Scan the QR code or find your order below
            </p>
            <div className="space-y-2 text-sm text-text-muted">
              <p>• Look for your unique <span className="font-bold text-text-base">code</span> (e.g., <span className="font-mono" style={{ color: '#C8860A' }}>T-K9V2</span>)</p>
              <p>• Check the status of your order</p>
              <p>• Pick up when marked <span className="font-bold" style={{ color: '#4ADE80' }}>✓ Ready!</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        {takeawayOrders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-text-faint mx-auto mb-4 opacity-50" />
            <p className="text-text-muted text-lg">No active takeaway orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {takeawayOrders.map(order => {
              const statusColor = getStatusColor(order.status)
              const statusLabel = getStatusLabel(order.status)
              const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000)
              const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m`

              return (
                <div
                  key={order.id}
                  className="rounded-2xl p-6 transition-all hover:scale-105 cursor-pointer"
                  style={{
                    backgroundColor: isDark 
                      ? 'rgba(200,134,10,0.08)' 
                      : 'rgba(176,117,8,0.06)',
                    border: `2px solid ${statusColor}`,
                  }}
                >
                  {/* Order Code - LARGE */}
                  <div className="text-center mb-4">
                    <p className="text-xs text-text-muted uppercase tracking-widest mb-2 font-semibold">Order Code</p>
                    <p 
                      className="text-5xl font-black tracking-wider"
                      style={{ color: statusColor }}
                    >
                      {order.takeawayCode}
                    </p>
                  </div>

                  {/* Customer Name */}
                  <p className="text-center text-text-base font-semibold mb-3 truncate">
                    {order.customerName}
                  </p>

                  {/* Status Badge */}
                  <div
                    className="rounded-lg px-3 py-2 text-center mb-4 font-bold text-sm text-black"
                    style={{ backgroundColor: statusColor }}
                  >
                    {statusLabel}
                  </div>

                  {/* Time */}
                  <p className="text-xs text-text-muted text-center flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    {elapsedStr}
                  </p>

                  {/* Ready Indicator */}
                  {order.status === 'ready' && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: statusColor }}>
                      <div className="flex items-center justify-center gap-2" style={{ color: statusColor }}>
                        <Check className="w-5 h-5" />
                        <span className="font-bold text-sm">READY FOR PICKUP</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div 
        className="border-t mt-12 py-6 text-center text-xs text-text-muted"
        style={{ borderColor: isDark ? '#2E2318' : '#D4C8B0' }}
      >
        <p>Orders update in real-time • Questions? Ask staff for assistance</p>
      </div>
    </div>
  )
}

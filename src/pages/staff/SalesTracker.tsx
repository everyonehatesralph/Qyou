import { useMemo } from 'react'
import { TrendingUp, TrendingDown, BarChart2, DollarSign, ShoppingBag, Award } from 'lucide-react'
import { useOrders } from '../../context/OrderContext'

interface ItemStat {
  id: number
  name: string
  category: string
  totalQty: number
  totalRevenue: number
}

export default function SalesTracker() {
  const { orders } = useOrders()

  // Only count served orders for accurate sales data
  const servedOrders = useMemo(() => orders.filter(o => o.status === 'served'), [orders])
  const allOrders    = useMemo(() => orders, [orders])

  // ── Aggregate per-item stats ──────────────────────────────────────────────────
  const itemStats = useMemo(() => {
    const map = new Map<number, ItemStat>()
    servedOrders.forEach(order => {
      order.items.forEach(item => {
        const existing = map.get(item.id)
        if (existing) {
          existing.totalQty     += item.quantity
          existing.totalRevenue += item.price * item.quantity
        } else {
          map.set(item.id, {
            id:           item.id,
            name:         item.name,
            category:     'Menu',
            totalQty:     item.quantity,
            totalRevenue: item.price * item.quantity,
          })
        }
      })
    })
    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty)
  }, [servedOrders])

  // ── Summary stats ─────────────────────────────────────────────────────────────
  const totalRevenue = useMemo(
    () => servedOrders.reduce((s, o) => s + o.total, 0),
    [servedOrders]
  )
  const totalOrders  = servedOrders.length
  const activeOrders = allOrders.filter(o => o.status !== 'served').length
  const avgOrderVal  = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const topItems    = itemStats.slice(0, 5)
  const bottomItems = itemStats.length > 5 ? itemStats.slice(-3).reverse() : []

  // ── Bar chart max ─────────────────────────────────────────────────────────────
  const maxQty = itemStats[0]?.totalQty ?? 1

  // ── Today's orders ────────────────────────────────────────────────────────────
  const today = new Date().toDateString()
  const todayOrders = useMemo(
    () => servedOrders.filter(o => new Date(o.createdAt).toDateString() === today),
    [servedOrders, today]
  )
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0)

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <BarChart2 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-text-base">Sales Tracker</h1>
          <span className="ml-auto text-xs text-text-muted">Based on served orders only</span>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Revenue",    value: `₱${totalRevenue.toFixed(0)}`,   icon: DollarSign, color: '#C8860A' },
            { label: "Orders Served",    value: totalOrders,                       icon: ShoppingBag, color: '#4ADE80' },
            { label: "Today's Revenue",  value: `₱${todayRevenue.toFixed(0)}`,    icon: TrendingUp,  color: '#60A5FA' },
            { label: "Avg Order Value",  value: `₱${avgOrderVal.toFixed(0)}`,     icon: Award,       color: '#F472B6' },
          ].map(stat => (
            <div key={stat.label} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-text-muted text-xs">{stat.label}</p>
                <stat.icon className="w-4 h-4 opacity-60" style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {itemStats.length === 0 ? (
          <div className="card p-16 text-center">
            <BarChart2 className="w-12 h-12 text-text-faint mx-auto mb-3" />
            <p className="text-text-muted font-semibold">No sales data yet</p>
            <p className="text-text-faint text-sm mt-1">Sales data appears once orders are marked as served in the Kitchen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── All Items Bar Chart ─────────────────────────────────────── */}
            <div className="card p-5">
              <h2 className="text-text-base font-bold mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                Sales by Item
              </h2>
              <div className="space-y-3">
                {itemStats.map((item, idx) => (
                  <div key={item.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-text-base text-sm font-medium truncate max-w-[60%]">{item.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-text-muted text-xs">{item.totalQty} sold</span>
                        <span className="text-sm font-bold" style={{ color: '#C8860A' }}>₱{item.totalRevenue.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="relative h-2 rounded-full" style={{ backgroundColor: '#2E2318' }}>
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{
                          width: `${(item.totalQty / maxQty) * 100}%`,
                          backgroundColor: idx === 0 ? '#C8860A' : idx === 1 ? '#E8C97A' : idx <= 3 ? '#9B8B7A' : '#4B3B2A',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {/* ── Top Sellers ──────────────────────────────────────────── */}
              <div className="card p-5">
                <h2 className="text-text-base font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: '#4ADE80' }} />
                  Top Sellers
                </h2>
                <div className="space-y-2">
                  {topItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: idx === 0 ? 'rgba(200,134,10,0.2)' : 'rgba(255,255,255,0.05)',
                          color: idx === 0 ? '#C8860A' : '#9B8B7A',
                          border: idx === 0 ? '1px solid rgba(200,134,10,0.4)' : '1px solid #2E2318',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-sm text-text-base truncate">{item.name}</span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}
                      >
                        {item.totalQty}×
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Least Sellers ─────────────────────────────────────────── */}
              {bottomItems.length > 0 && (
                <div className="card p-5">
                  <h2 className="text-text-base font-bold mb-4 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" style={{ color: '#F87171' }} />
                    Least Ordered
                  </h2>
                  <div className="space-y-2">
                    {bottomItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: '#F87171' }}
                        />
                        <span className="flex-1 text-sm text-text-muted truncate">{item.name}</span>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#F87171' }}
                        >
                          {item.totalQty}×
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-text-faint text-xs mt-3">
                    💡 Consider promoting or reviewing these items.
                  </p>
                </div>
              )}

              {/* ── Today summary ─────────────────────────────────────────── */}
              <div className="card p-5">
                <h2 className="text-text-base font-bold mb-3 text-sm">Today at a Glance</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(200,134,10,0.08)', border: '1px solid rgba(200,134,10,0.2)' }}>
                    <p className="text-2xl font-bold" style={{ color: '#C8860A' }}>{todayOrders.length}</p>
                    <p className="text-text-muted text-xs mt-0.5">Orders today</p>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    <p className="text-2xl font-bold" style={{ color: '#60A5FA' }}>{activeOrders}</p>
                    <p className="text-text-muted text-xs mt-0.5">Active now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

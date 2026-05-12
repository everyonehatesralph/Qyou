import { useMemo, useState, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, BarChart2, DollarSign, ShoppingBag, Award,
  Clock, Users, Download, Zap, Coffee, Activity, PieChart, Filter,
} from 'lucide-react'
import { useOrders } from '../../context/OrderContext'
// types inferred from useOrders()

// ─── Helpers ──────────────────────────────────────────────────────────────────
function minutesBetween(a: string, b: string) {
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 60000)
}
function hourLabel(h: number) {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}
function dayLabel(d: number) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]
}

type TimeFilter = 'today' | '7d' | '30d' | 'all'

export default function SalesTracker() {
  const { orders } = useOrders()
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  // ── Filter orders by time ─────────────────────────────────────────────────
  const completed = useMemo(() => {
    const now = Date.now()
    return orders.filter(o => {
      if (o.status !== 'served' && o.status !== 'paid') return false
      const t = new Date(o.createdAt).getTime()
      if (timeFilter === 'today') return new Date(o.createdAt).toDateString() === new Date().toDateString()
      if (timeFilter === '7d') return now - t < 7 * 86400000
      if (timeFilter === '30d') return now - t < 30 * 86400000
      return true
    })
  }, [orders, timeFilter])

  // ── KPI stats ─────────────────────────────────────────────────────────────
  const totalRevenue = completed.reduce((s, o) => s + o.total, 0)
  const totalOrders = completed.length
  const avgOrderVal = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const uniqueCustomers = new Set(completed.map(o => o.customerName)).size

  // ── Avg serve time (pending → served) ─────────────────────────────────────
  const avgServeMin = useMemo(() => {
    const times = completed
      .filter(o => o.servedAt)
      .map(o => minutesBetween(o.createdAt, o.servedAt!))
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  }, [completed])

  // ── Per-item stats ────────────────────────────────────────────────────────
  const itemStats = useMemo(() => {
    const map = new Map<number, { id: number; name: string; category: string; qty: number; rev: number }>()
    completed.forEach(o => o.items.forEach(i => {
      const e = map.get(i.id)
      if (e) { e.qty += i.quantity; e.rev += i.price * i.quantity }
      else map.set(i.id, { id: i.id, name: i.name, category: 'Menu', qty: i.quantity, rev: i.price * i.quantity })
    }))
    return [...map.values()].sort((a, b) => b.qty - a.qty)
  }, [completed])

  const topItems = itemStats.slice(0, 5)
  const bottomItems = itemStats.length > 5 ? itemStats.slice(-3).reverse() : []
  const maxQty = itemStats[0]?.qty ?? 1

  // ── Peak hours (0-23) ─────────────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    const counts = Array(24).fill(0) as number[]
    const revenue = Array(24).fill(0) as number[]
    completed.forEach(o => {
      const h = new Date(o.createdAt).getHours()
      counts[h]++
      revenue[h] += o.total
    })
    const maxC = Math.max(...counts, 1)
    return { counts, revenue, max: maxC }
  }, [completed])

  const busiestHour = hourlyData.counts.indexOf(Math.max(...hourlyData.counts))
  const quietestHour = useMemo(() => {
    const c = hourlyData.counts
    // find quietest among hours that had at least 1 order
    const active = c.map((v, i) => ({ v, i })).filter(x => x.v > 0)
    if (active.length === 0) return 0
    return active.reduce((a, b) => a.v < b.v ? a : b).i
  }, [hourlyData])

  // ── Daily trend (last 7 days) ─────────────────────────────────────────────
  const dailyTrend = useMemo(() => {
    const days: { label: string; orders: number; revenue: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toDateString()
      const dayOrders = completed.filter(o => new Date(o.createdAt).toDateString() === ds)
      days.push({
        label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : dayLabel(d.getDay()),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      })
    }
    return days
  }, [completed])
  const maxDailyRev = Math.max(...dailyTrend.map(d => d.revenue), 1)

  // ── Order status funnel ───────────────────────────────────────────────────
  const funnel = useMemo(() => {
    const s = { pending: 0, confirmed: 0, preparing: 0, ready: 0, served: 0, paid: 0 }
    orders.forEach(o => { if (o.status in s) s[o.status as keyof typeof s]++ })
    return s
  }, [orders])
  const funnelMax = Math.max(Object.values(funnel).reduce((a, b) => a + b, 0), 1)

  // ── Category breakdown ────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map = new Map<string, { qty: number; rev: number }>()
    completed.forEach(o => o.items.forEach(i => {
      const cat = i.name.toLowerCase().includes('coffee') || i.name.toLowerCase().includes('latte') || i.name.toLowerCase().includes('espresso') ? 'Coffee'
        : i.name.toLowerCase().includes('tea') || i.name.toLowerCase().includes('matcha') ? 'Tea'
        : i.name.toLowerCase().includes('cake') || i.name.toLowerCase().includes('croissant') || i.name.toLowerCase().includes('muffin') ? 'Pastry'
        : 'Food'
      const e = map.get(cat)
      if (e) { e.qty += i.quantity; e.rev += i.price * i.quantity }
      else map.set(cat, { qty: i.quantity, rev: i.price * i.quantity })
    }))
    return [...map.entries()].sort((a, b) => b[1].rev - a[1].rev)
  }, [completed])
  const catMaxRev = categoryData[0]?.[1].rev ?? 1
  const CAT_COLORS: Record<string, string> = { Coffee: '#C8860A', Tea: '#4ADE80', Pastry: '#F472B6', Food: '#60A5FA' }

  // ── Smart insights ────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const msgs: string[] = []
    if (busiestHour >= 0 && totalOrders > 0) msgs.push(`🔥 Peak hour is ${hourLabel(busiestHour)} with ${hourlyData.counts[busiestHour]} orders`)
    if (quietestHour >= 0 && totalOrders > 0) msgs.push(`💤 Quietest hour is ${hourLabel(quietestHour)} — consider promotions`)
    if (avgServeMin > 0) msgs.push(`⏱️ Average serve time is ${avgServeMin.toFixed(1)} minutes`)
    if (topItems[0]) msgs.push(`🏆 "${topItems[0].name}" is your #1 seller (${topItems[0].qty} sold)`)
    if (bottomItems[0]) msgs.push(`📉 "${bottomItems[0].name}" has low demand — consider reviewing`)
    if (avgOrderVal > 0) msgs.push(`💰 Average order value is ₱${avgOrderVal.toFixed(0)}`)
    if (uniqueCustomers > 0) msgs.push(`👥 ${uniqueCustomers} unique customers served`)
    return msgs
  }, [busiestHour, quietestHour, avgServeMin, topItems, bottomItems, avgOrderVal, uniqueCustomers, hourlyData, totalOrders])

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const header = 'Order ID,Customer,Table,Items,Total,Status,Created,Served\n'
    const rows = completed.map(o =>
      `${o.id},"${o.customerName}","${o.tableName}","${o.items.map(i => `${i.name}x${i.quantity}`).join('; ')}",${o.total},${o.status},${o.createdAt},${o.servedAt || ''}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `deverse-sales-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [completed])

  return (
    <div className="min-h-screen bg-background md:ml-56 pt-4 md:pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <BarChart2 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-text-base">Sales Analytics</h1>
            {/* Live pulse */}
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-text-faint text-[10px]">Live</span>
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Time filters */}
            {([['today', 'Today'], ['7d', '7 Days'], ['30d', '30 Days'], ['all', 'All Time']] as [TimeFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={timeFilter === key
                  ? { backgroundColor: '#C8860A', color: '#0D0B0A' }
                  : { backgroundColor: '#211A15', color: '#9B8B7A', border: '1px solid #2E2318' }
                }
              >
                <Filter className="w-3 h-3 inline mr-1" />{label}
              </button>
            ))}
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              style={{ backgroundColor: '#211A15', color: '#9B8B7A', border: '1px solid #2E2318' }}
            >
              <Download className="w-3 h-3" />Export CSV
            </button>
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Revenue',       val: `₱${totalRevenue.toFixed(0)}`,     icon: DollarSign,  color: '#C8860A', sub: '' },
            { label: 'Orders',        val: totalOrders,                        icon: ShoppingBag, color: '#4ADE80', sub: '' },
            { label: 'Avg Order',     val: `₱${avgOrderVal.toFixed(0)}`,      icon: Award,       color: '#F472B6', sub: '' },
            { label: 'Customers',     val: uniqueCustomers,                    icon: Users,       color: '#60A5FA', sub: '' },
            { label: 'Avg Serve',     val: `${avgServeMin.toFixed(1)}m`,       icon: Clock,       color: '#FBBF24', sub: '' },
            { label: 'Peak Hour',     val: totalOrders > 0 ? hourLabel(busiestHour) : '—', icon: Zap, color: '#F87171', sub: '' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-text-muted text-[11px] font-medium">{s.label}</p>
                <s.icon className="w-3.5 h-3.5 opacity-50" style={{ color: s.color }} />
              </div>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.val}</p>
            </div>
          ))}
        </div>

        {completed.length === 0 ? (
          <div className="rounded-xl p-16 text-center" style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}>
            <BarChart2 className="w-12 h-12 text-text-faint mx-auto mb-3" />
            <p className="text-text-muted font-semibold">No sales data yet</p>
            <p className="text-text-faint text-sm mt-1">Complete orders to see analytics here.</p>
          </div>
        ) : (
          <>
            {/* ── Row 1: Revenue Trend + Peak Hours ──────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              {/* Revenue Trend */}
              <div className="rounded-xl p-5" style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}>
                <h2 className="text-text-base font-bold text-sm mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: '#C8860A' }} />
                  Revenue Trend (7 Days)
                </h2>
                <div className="flex items-end gap-2 h-36">
                  {dailyTrend.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-text-faint font-medium">
                        {d.revenue > 0 ? `₱${d.revenue.toFixed(0)}` : ''}
                      </span>
                      <div className="w-full relative" style={{ height: '100px' }}>
                        <div
                          className="absolute bottom-0 w-full rounded-t-md transition-all duration-500"
                          style={{
                            height: `${Math.max((d.revenue / maxDailyRev) * 100, 2)}%`,
                            backgroundColor: i === 6 ? '#C8860A' : 'rgba(200,134,10,0.3)',
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-text-muted font-medium">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Peak Hours Heatmap */}
              <div className="rounded-xl p-5" style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}>
                <h2 className="text-text-base font-bold text-sm mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: '#F87171' }} />
                  Peak Hours
                </h2>
                <div className="grid grid-cols-8 gap-1">
                  {hourlyData.counts.slice(6, 22).map((count, idx) => {
                    const h = idx + 6
                    const intensity = count / hourlyData.max
                    return (
                      <div key={h} className="flex flex-col items-center gap-1">
                        <div
                          className="w-full aspect-square rounded-md flex items-center justify-center text-[10px] font-bold transition-all"
                          style={{
                            backgroundColor: count === 0 ? '#211A15'
                              : `rgba(200,134,10,${0.15 + intensity * 0.7})`,
                            color: intensity > 0.5 ? '#0D0B0A' : '#9B8B7A',
                            border: h === busiestHour ? '2px solid #C8860A' : '1px solid transparent',
                          }}
                        >
                          {count || '·'}
                        </div>
                        <span className="text-[9px] text-text-faint">{hourLabel(h)}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between mt-3 text-[10px] text-text-faint">
                  <span>🔥 Busiest: <strong className="text-text-muted">{hourLabel(busiestHour)}</strong></span>
                  <span>💤 Quietest: <strong className="text-text-muted">{hourLabel(quietestHour)}</strong></span>
                </div>
              </div>
            </div>

            {/* ── Row 2: Sales by Item + Category + Funnel ────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              {/* Sales by Item */}
              <div className="rounded-xl p-5 lg:col-span-2" style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}>
                <h2 className="text-text-base font-bold text-sm mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  Sales by Item
                </h2>
                <div className="space-y-2.5">
                  {itemStats.map((item, idx) => (
                    <div key={item.id}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold w-5 text-text-faint">{idx + 1}</span>
                          <span className="text-text-base text-sm font-medium truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-text-muted text-xs">{item.qty} sold</span>
                          <span className="text-sm font-bold" style={{ color: '#C8860A' }}>₱{item.rev.toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="relative h-1.5 rounded-full" style={{ backgroundColor: '#2E2318' }}>
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{
                            width: `${(item.qty / maxQty) * 100}%`,
                            backgroundColor: idx === 0 ? '#C8860A' : idx === 1 ? '#E8C97A' : idx <= 3 ? '#9B8B7A' : '#4B3B2A',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column: Category + Funnel */}
              <div className="space-y-5">
                {/* Category Breakdown */}
                <div className="rounded-xl p-5" style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}>
                  <h2 className="text-text-base font-bold text-sm mb-3 flex items-center gap-2">
                    <PieChart className="w-4 h-4" style={{ color: '#F472B6' }} />
                    Category Mix
                  </h2>
                  <div className="space-y-2.5">
                    {categoryData.map(([cat, data]) => (
                      <div key={cat}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium" style={{ color: CAT_COLORS[cat] || '#9B8B7A' }}>{cat}</span>
                          <span className="text-xs text-text-muted">₱{data.rev.toFixed(0)}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ backgroundColor: '#2E2318' }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${(data.rev / catMaxRev) * 100}%`, backgroundColor: CAT_COLORS[cat] || '#9B8B7A' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Funnel */}
                <div className="rounded-xl p-5" style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}>
                  <h2 className="text-text-base font-bold text-sm mb-3 flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-primary" />
                    Order Pipeline
                  </h2>
                  {(['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid'] as const).map(status => {
                    const count = funnel[status]
                    const colors: Record<string, string> = {
                      pending: '#FBBF24', confirmed: '#60A5FA', preparing: '#C8860A',
                      ready: '#4ADE80', served: '#9B8B7A', paid: '#5C4F44',
                    }
                    return (
                      <div key={status} className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] text-text-muted w-16 capitalize">{status}</span>
                        <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#2E2318' }}>
                          <div className="h-2 rounded-full transition-all" style={{ width: `${(count / funnelMax) * 100}%`, backgroundColor: colors[status] }} />
                        </div>
                        <span className="text-xs font-bold w-6 text-right" style={{ color: colors[status] }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── Row 3: Top/Bottom + Insights ───────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              {/* Top Sellers */}
              <div className="rounded-xl p-5" style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}>
                <h2 className="text-text-base font-bold text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: '#4ADE80' }} />
                  Top Sellers
                </h2>
                <div className="space-y-2">
                  {topItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: idx === 0 ? 'rgba(200,134,10,0.2)' : '#211A15',
                          color: idx === 0 ? '#C8860A' : '#9B8B7A',
                          border: idx === 0 ? '1px solid rgba(200,134,10,0.4)' : '1px solid #2E2318',
                        }}
                      >{idx + 1}</span>
                      <span className="flex-1 text-sm text-text-base truncate">{item.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}
                      >{item.qty}×</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Least Sellers */}
              <div className="rounded-xl p-5" style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}>
                <h2 className="text-text-base font-bold text-sm mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" style={{ color: '#F87171' }} />
                  Least Ordered
                </h2>
                {bottomItems.length > 0 ? (
                  <div className="space-y-2">
                    {bottomItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#F87171' }} />
                        <span className="flex-1 text-sm text-text-muted truncate">{item.name}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#F87171' }}
                        >{item.qty}×</span>
                      </div>
                    ))}
                    <p className="text-text-faint text-[11px] mt-2">💡 Consider promotions for these items</p>
                  </div>
                ) : (
                  <p className="text-text-faint text-sm">Need more data</p>
                )}
              </div>

              {/* Smart Insights */}
              <div className="rounded-xl p-5" style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}>
                <h2 className="text-text-base font-bold text-sm mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: '#FBBF24' }} />
                  Smart Insights
                </h2>
                <div className="space-y-2">
                  {insights.map((msg, i) => (
                    <p key={i} className="text-xs text-text-muted leading-relaxed">{msg}</p>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

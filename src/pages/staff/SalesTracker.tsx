import { useMemo, useState, useCallback, type ReactNode } from 'react'
import { BarChart3, Download } from 'lucide-react'
import { useOrders } from '../../context/OrderContext'
import { useSidebar } from '../../context/SidebarContext'
import StaffPageShell from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import KpiCard from '../../components/KpiCard'
import { ColumnChart } from '../../components/Charts'
import { Button, Card, EmptyState, Segmented, cn } from '../../components/ui'
import { STATUS_GROUP_CLASSES, STATUS_META } from '../../theme/status'
import { peso } from '../../utils/formatters'

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

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <h2 className="mb-4 font-display text-lg text-ink">{title}</h2>
      {children}
    </Card>
  )
}

/** Horizontal bar used by the item, category and pipeline lists. */
function Bar({ value, max, fill = 'bg-chart' }: { value: number; max: number; fill?: string }) {
  return (
    <div className="h-2 rounded-full bg-surface-2">
      <div className={cn('h-2 rounded-full transition-[width] duration-500', fill)} style={{ width: `${Math.max((value / max) * 100, value > 0 ? 2 : 0)}%` }} />
    </div>
  )
}

export default function SalesTracker() {
  const { orders } = useOrders()
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()
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
        label: i === 0 ? 'Today' : i === 1 ? 'Yest.' : dayLabel(d.getDay()),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      })
    }
    return days
  }, [completed])

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

  // ── Insights ──────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const msgs: string[] = []
    if (busiestHour >= 0 && totalOrders > 0) msgs.push(`Peak hour is ${hourLabel(busiestHour)} with ${hourlyData.counts[busiestHour]} orders.`)
    if (quietestHour >= 0 && totalOrders > 0) msgs.push(`Quietest hour is ${hourLabel(quietestHour)}; a good time for promotions.`)
    if (avgServeMin > 0) msgs.push(`Average time from order to served is ${avgServeMin.toFixed(1)} minutes.`)
    if (topItems[0]) msgs.push(`“${topItems[0].name}” is your top seller (${topItems[0].qty} sold).`)
    if (bottomItems[0]) msgs.push(`“${bottomItems[0].name}” sells the least; worth reviewing.`)
    if (avgOrderVal > 0) msgs.push(`Average order value is ${peso(avgOrderVal)}.`)
    if (uniqueCustomers > 0) msgs.push(`${uniqueCustomers} different guests ordered.`)
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
    a.href = url; a.download = `qyou-sales-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [completed])

  return (
    <StaffPageShell>
      <StaffHeader
        title="Analytics"
        subtitle="Sales from served and paid orders"
        actions={<Button leftIcon={<Download />} onClick={exportCSV} disabled={completed.length === 0}>CSV</Button>}
        sidebarExpanded={sidebarExpanded}
        onSidebarToggle={toggleSidebar}
      />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        <Segmented<TimeFilter>
          label="Time range"
          value={timeFilter}
          onChange={setTimeFilter}
          options={[
            { value: 'today', label: 'Today' },
            { value: '7d', label: '7 days' },
            { value: '30d', label: '30 days' },
            { value: 'all', label: 'All' },
          ]}
          className="max-w-md"
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Revenue" value={peso(totalRevenue)} />
          <KpiCard label="Orders" value={totalOrders} />
          <KpiCard label="Average order" value={peso(avgOrderVal)} />
          <KpiCard label="Guests" value={uniqueCustomers} />
          <KpiCard label="Average serve" value={`${avgServeMin.toFixed(avgServeMin < 10 ? 1 : 0)} min`} />
          <KpiCard label="Peak hour" value={totalOrders > 0 ? hourLabel(busiestHour) : '—'} />
        </div>

        {completed.length === 0 ? (
          <Card>
            <EmptyState icon={BarChart3} title="No sales yet" body="Served and paid orders show up here." />
          </Card>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Revenue, last 7 days">
                {dailyTrend.every(d => d.revenue === 0) && (
                  <p className="-mt-2 mb-2 text-sm text-ink-muted">No served or paid orders in the last 7 days.</p>
                )}
                <ColumnChart
                  title="Revenue per day, last 7 days"
                  height={160}
                  data={dailyTrend.map((d, i) => ({
                    label: d.label,
                    value: d.revenue,
                    detail: `${peso(d.revenue)} · ${d.orders} ${d.orders === 1 ? 'order' : 'orders'}`,
                    emphasis: i === dailyTrend.length - 1,
                  }))}
                />
              </Panel>

              <Panel title="Orders by hour">
                <div className="grid grid-cols-8 gap-1.5">
                  {hourlyData.counts.slice(6, 22).map((count, idx) => {
                    const h = idx + 6
                    const intensity = count / hourlyData.max
                    return (
                      <div key={h} className="flex flex-col items-center gap-1">
                        <div
                          className={cn(
                            'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[6px] text-xs font-medium',
                            count === 0 ? 'bg-surface-2 text-ink-muted' : 'text-ink',
                            h === busiestHour && count > 0 && 'ring-2 ring-ink ring-offset-1 ring-offset-surface',
                          )}
                        >
                          {/* Accent tint capped at 50% so ink text stays readable (AA) in both modes */}
                          {count > 0 && <span className="absolute inset-0 bg-chart" style={{ opacity: 0.12 + intensity * 0.38 }} aria-hidden />}
                          <span className="relative">{count || '·'}</span>
                        </div>
                        <span className="text-xs text-ink-muted">{hourLabel(h)}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex justify-between text-sm text-ink-muted">
                  <span>Busiest: <span className="font-medium text-ink">{hourLabel(busiestHour)}</span></span>
                  <span>Quietest: <span className="font-medium text-ink">{hourLabel(quietestHour)}</span></span>
                </div>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Sales by item" className="lg:col-span-2">
                <ol className="space-y-3">
                  {itemStats.map((item, idx) => (
                    <li key={item.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="min-w-0 text-[15px] text-ink">
                          <span className="mr-2 tabular-nums text-ink-muted">{idx + 1}</span>
                          {item.name}
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-ink-muted">
                          {item.qty} sold · <span className="font-medium text-ink">{peso(item.rev)}</span>
                        </span>
                      </div>
                      <Bar value={item.qty} max={maxQty} />
                    </li>
                  ))}
                </ol>
              </Panel>

              <div className="space-y-4">
                <Panel title="Category mix">
                  <ul className="space-y-3">
                    {categoryData.map(([cat, data]) => (
                      <li key={cat}>
                        <div className="mb-1.5 flex justify-between text-[15px]">
                          <span className="text-ink">{cat}</span>
                          <span className="tabular-nums text-ink-muted">{peso(data.rev)}</span>
                        </div>
                        <Bar value={data.rev} max={catMaxRev} />
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="Order pipeline">
                  <ul className="space-y-2.5">
                    {(['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid'] as const).map(status => (
                      <li key={status} className="flex items-center gap-3">
                        <span className="w-[4.5rem] text-sm text-ink-muted">{STATUS_META[status].label}</span>
                        <div className="flex-1">
                          <Bar value={funnel[status]} max={funnelMax} fill={STATUS_GROUP_CLASSES[STATUS_META[status].group].fill} />
                        </div>
                        <span className="w-6 text-right text-sm font-medium tabular-nums text-ink">{funnel[status]}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Top sellers">
                <ol className="space-y-2.5">
                  {topItems.map((item, idx) => (
                    <li key={item.id} className="flex items-center gap-3 text-[15px]">
                      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums', idx === 0 ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-muted')}>
                        {idx + 1}
                      </span>
                      <span className="min-w-0 flex-1 text-ink">{item.name}</span>
                      <span className="tabular-nums text-ink-muted">{item.qty}×</span>
                    </li>
                  ))}
                </ol>
              </Panel>

              <Panel title="Least ordered">
                {bottomItems.length > 0 ? (
                  <ul className="space-y-2.5">
                    {bottomItems.map(item => (
                      <li key={item.id} className="flex items-center gap-3 text-[15px]">
                        <span className="min-w-0 flex-1 text-ink">{item.name}</span>
                        <span className="tabular-nums text-ink-muted">{item.qty}×</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-muted">Needs more than five items sold to compare.</p>
                )}
              </Panel>

              <Panel title="Insights">
                <ul className="space-y-2 text-sm leading-relaxed text-ink-muted">
                  {insights.map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
              </Panel>
            </div>
          </>
        )}
      </main>
    </StaffPageShell>
  )
}

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Order } from '../context/OrderContext'
import { useMenuState } from '../context/MenuContext'
import { today } from '../services/analytics'
import { peso } from '../utils/formatters'
import KpiCard from './KpiCard'
import { BarList, ColumnChart } from './Charts'
import { Button, Card, cn } from './ui'

const hourLabel = (h: number) => (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`)

/** "+12% vs yesterday" with an arrow; text tokens only, the arrow carries direction. */
function Delta({ today, yesterday }: { today: number; yesterday: number }) {
  if (yesterday === 0) return <span>{today > 0 ? 'No sales yesterday to compare' : 'Same as yesterday'}</span>
  const pct = Math.round(((today - yesterday) / yesterday) * 100)
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {pct > 0 ? '+' : ''}{pct}% vs yesterday
    </span>
  )
}

/** Today at a glance: revenue, orders, wait and prep times, orders by hour, top sellers. */
export default function DashboardAnalytics({ orders }: { orders: Order[] }) {
  const navigate = useNavigate()

  const { byId } = useMenuState()

  // Same definitions as the Analytics page (src/services/analytics.ts)
  const stats = useMemo(() => {
    const now = new Date()
    const t = today(orders, byId, now)
    // Orders by hour from the first order (or 7am) to now, at least six hours wide
    const withOrders = t.hours.filter(h => h.orders > 0).map(h => h.hour)
    const first = Math.min(7, ...withOrders)
    const last = Math.min(23, Math.max(now.getHours(), first + 5))
    const hours = t.hours.slice(first, last + 1).map(h => ({
      label: hourLabel(h.hour),
      value: h.orders,
      detail: `${h.orders} ${h.orders === 1 ? 'order' : 'orders'} · ${peso(h.revenue)} sold`,
      emphasis: h.hour === now.getHours(),
    }))
    return { ...t, hours }
  }, [orders, byId])

  const fmtMin = (m: number | null) => (m === null ? '—' : `${m.toFixed(m < 10 ? 1 : 0)} min`)

  return (
    <section aria-labelledby="today-analytics">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="today-analytics" className="font-display text-xl text-ink">Today at a glance</h2>
        <Button variant="ghost" onClick={() => navigate('/staff/sales')} className="-mr-3">
          Open analytics <ArrowRight />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Revenue" value={peso(stats.revenueToday)} hint={<Delta today={stats.revenueToday} yesterday={stats.revenueYesterday} />} />
        <KpiCard label="Orders" value={stats.ordersToday} hint={<Delta today={stats.ordersToday} yesterday={stats.ordersYesterday} />} />
        <KpiCard label="Avg. wait to ready" value={fmtMin(stats.wait)} hint="From order to ready" />
        <KpiCard label="Avg. prep time" value={fmtMin(stats.prep)} hint="Preparing to ready" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        {/* The chart grows to match the stacked cards beside it */}
        <Card className="flex flex-col">
          <h3 className="text-[15px] font-semibold text-ink">Orders by hour</h3>
          <p className="mt-0.5 text-sm text-ink-muted">Hover or tap a bar for the count and takings.</p>
          {stats.ordersToday === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">No orders yet today.</p>
          ) : (
            <ColumnChart fill className="mt-5 flex-1" title="Orders by hour today" data={stats.hours} labelEvery={2} height={160} />
          )}
        </Card>

        <div className="grid gap-3">
          <Card>
            <h3 className="mb-4 text-[15px] font-semibold text-ink">Top sellers today</h3>
            {stats.top.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing sold yet today.</p>
            ) : (
              <BarList rank data={stats.top.map(t => ({ key: t.id, label: t.name, value: t.qty, detail: `${t.qty} ordered` }))} />
            )}
          </Card>
          <Card>
            <h3 className="mb-3 text-[15px] font-semibold text-ink">Busiest tables</h3>
            {stats.busiest.length === 0 ? (
              <p className="text-sm text-ink-muted">No orders yet today.</p>
            ) : (
              <ul className="divide-y divide-line text-[15px]">
                {stats.busiest.map(([name, t], i) => (
                  <li key={name} className={cn('flex items-center justify-between gap-3 py-2', i === 0 && 'pt-0')}>
                    <span className="text-ink">{name}</span>
                    <span className="text-sm tabular-nums text-ink-muted">{t.n} {t.n === 1 ? 'order' : 'orders'} · {peso(t.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </section>
  )
}

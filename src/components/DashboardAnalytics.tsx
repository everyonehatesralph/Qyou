import { useMemo } from 'react'
import type { ColumnDatum } from './Charts'
import { useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Order } from '../context/OrderContext'
import { peso } from '../utils/formatters'
import KpiCard from './KpiCard'
import { BarList, ColumnChart, useColumnsThatFit } from './Charts'
import { Button, Card, cn } from './ui'

const isSameDay = (iso: string, day: Date) => new Date(iso).toDateString() === day.toDateString()
const minutes = (from?: string, to?: string) => (from && to ? (new Date(to).getTime() - new Date(from).getTime()) / 60_000 : null)
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const hourLabel = (h: number) => (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`)

interface Hour { h: number; n: number; rev: number; now: boolean }

/**
 * One column per hour, or per block of 2 or more hours when the hours would not fit as
 * finger-sized columns (a narrow phone late in the day). Blocks start at the first hour.
 */
function hourColumns(hours: Hour[], fits: number): { size: number; columns: ColumnDatum[] } {
  const size = Math.max(1, Math.ceil(hours.length / fits))
  const columns: ColumnDatum[] = []
  for (let i = 0; i < hours.length; i += size) {
    const block = hours.slice(i, i + size)
    const n = block.reduce((s, x) => s + x.n, 0)
    const rev = block.reduce((s, x) => s + x.rev, 0)
    const from = block[0].h
    columns.push({
      label: hourLabel(from),
      name: block.length > 1 ? `${hourLabel(from)}–${hourLabel((block[block.length - 1].h + 1) % 24)}` : undefined,
      value: n,
      detail: `${n} ${n === 1 ? 'order' : 'orders'} · ${peso(rev)}`,
      emphasis: block.some(x => x.now),
    })
  }
  return { size, columns }
}

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

  const stats = useMemo(() => {
    const now = new Date()
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
    const live = orders.filter(o => o.status !== 'cancelled')
    const today = live.filter(o => isSameDay(o.createdAt, now))
    const yest = live.filter(o => isSameDay(o.createdAt, yesterday))
    // Revenue counts served and paid orders, like the Analytics page
    const done = (list: Order[]) => list.filter(o => o.status === 'served' || o.status === 'paid')
    const revenue = (list: Order[]) => done(list).reduce((s, o) => s + o.total, 0)

    const wait = avg(today.map(o => minutes(o.createdAt, o.readyAt)).filter((m): m is number => m !== null))
    const prep = avg(today.map(o => minutes(o.preparingAt, o.readyAt)).filter((m): m is number => m !== null))

    // Orders by hour from the first order (or 7am) to now
    const counts = new Map<number, { n: number; rev: number }>()
    for (const o of today) {
      const h = new Date(o.createdAt).getHours()
      const e = counts.get(h) ?? { n: 0, rev: 0 }
      counts.set(h, { n: e.n + 1, rev: e.rev + o.total })
    }
    const first = Math.min(7, ...counts.keys())
    const last = Math.max(now.getHours(), first + 5)
    const hours: Hour[] = Array.from({ length: last - first + 1 }, (_, i) => first + i).map(h => ({
      h,
      ...(counts.get(h) ?? { n: 0, rev: 0 }),
      now: h === now.getHours(),
    }))

    const items = new Map<number, { name: string; qty: number; rev: number }>()
    for (const o of today) for (const i of o.items) {
      const e = items.get(i.id) ?? { name: i.name, qty: 0, rev: 0 }
      items.set(i.id, { name: i.name, qty: e.qty + i.quantity, rev: e.rev + i.price * i.quantity })
    }
    const top = [...items.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5)

    const tables = new Map<string, { n: number; rev: number }>()
    for (const o of today) {
      const e = tables.get(o.tableName) ?? { n: 0, rev: 0 }
      tables.set(o.tableName, { n: e.n + 1, rev: e.rev + o.total })
    }
    const busiest = [...tables.entries()].sort((a, b) => b[1].n - a[1].n || b[1].rev - a[1].rev).slice(0, 4)

    return {
      revenueToday: revenue(today), revenueYesterday: revenue(yest),
      ordersToday: today.length, ordersYesterday: yest.length,
      wait, prep, hours, top, busiest,
    }
  }, [orders])

  const [chartRef, fits] = useColumnsThatFit<HTMLDivElement>()
  const byHour = useMemo(() => hourColumns(stats.hours, fits), [stats.hours, fits])
  const chartTitle = `Orders ${byHour.size === 1 ? 'by hour' : `per ${byHour.size} hours`}`

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
          <h3 className="text-[15px] font-semibold text-ink">{chartTitle}</h3>
          <p className="mt-0.5 text-sm text-ink-muted">Hover or tap a bar for the count and takings.</p>
          {stats.ordersToday === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">No orders yet today.</p>
          ) : (
            // Measured box: on a narrow screen late in the day the hours pair up into blocks
            <div ref={chartRef} className="mt-5 flex flex-1 flex-col">
              <ColumnChart fill className="flex-1" title={`${chartTitle} today`} data={byHour.columns} labelEvery={2} height={160} />
            </div>
          )}
        </Card>

        <div className="grid gap-3">
          <Card>
            <h3 className="mb-4 text-[15px] font-semibold text-ink">Top sellers today</h3>
            {stats.top.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing sold yet today.</p>
            ) : (
              <BarList rank data={stats.top.map(([id, t]) => ({ key: id, label: t.name, value: t.qty, detail: `${t.qty} sold` }))} />
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
                    <span className="text-sm tabular-nums text-ink-muted">{t.n} {t.n === 1 ? 'order' : 'orders'} · {peso(t.rev)}</span>
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

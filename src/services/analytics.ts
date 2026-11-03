// The numbers on the dashboard and the Analytics page, in one place so both screens agree.
// No imports beyond types, so node --test runs it as-is.
//
// Definitions:
//   order received  any order that wasn't cancelled
//   sale            an order the guest got: served (bill still open) or paid
//   revenue         the total of sales, add-ons included (the server prices both)
//   paid            money taken: paid orders, dated by when they were paid
// Days are calendar days on this device's clock, counted by when the order was placed.
import type { Order, OrderItem, OrderStatus } from './orderModel'

export const isSale = (o: Pick<Order, 'status'>) => o.status === 'served' || o.status === 'paid'
export const isReceived = (o: Pick<Order, 'status'>) => o.status !== 'cancelled'

export type Range = 'today' | '7d' | '30d' | '90d'
const RANGE_DAYS: Record<Range, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90 }

export function startOfDay(d: Date): Date {
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  return s
}

const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

/** Placed today or on the days before it, to make `range` calendar days. */
export function inRange(o: Pick<Order, 'createdAt'>, range: Range, now = new Date()): boolean {
  const t = new Date(o.createdAt).getTime()
  const from = addDays(startOfDay(now), -(RANGE_DAYS[range] - 1)).getTime()
  return t >= from && t < addDays(startOfDay(now), 1).getTime()
}

export const sameDay = (iso: string, day: Date) => new Date(iso).toDateString() === day.toDateString()

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null)
const minutes = (from?: string, to?: string) =>
  from && to ? Math.max(0, (new Date(to).getTime() - new Date(from).getTime()) / 60_000) : null

/** An order line's category: saved on the order since the live menu; older orders look it up. */
export function categoryOf(item: OrderItem, menu: Map<number, { category: string }>): string {
  return item.category ?? menu.get(item.id)?.category ?? 'Other'
}
const isAddOn = (item: OrderItem, menu: Map<number, { category: string; addon?: boolean }>) =>
  item.addon ?? menu.get(item.id)?.addon ?? false

export interface Summary {
  revenue: number
  sales: number
  averageOrder: number
  /** Distinct guest names per table per day; a name is the only thing a guest gives us. */
  guests: number
  /** Order placed to served, over orders that recorded both. */
  averageServeMin: number | null
}

export function summarize(sales: Order[]): Summary {
  const revenue = sum(sales.map(o => o.total))
  const guests = new Set(
    sales
      .filter(o => o.customerName.trim())
      .map(o => `${o.customerName.trim().toLowerCase()}|${o.tableId}|${new Date(o.createdAt).toDateString()}`),
  ).size
  return {
    revenue,
    sales: sales.length,
    averageOrder: sales.length ? revenue / sales.length : 0,
    guests,
    averageServeMin: avg(sales.map(o => minutes(o.createdAt, o.servedAt)).filter((m): m is number => m !== null)),
  }
}

export interface ItemSales { id: number; name: string; category: string; qty: number; revenue: number }

/** Menu items by quantity (then revenue); add-ons left out, they would crowd the list. */
export function itemSales(orders: Order[], menu: Map<number, { category: string; addon?: boolean }>): ItemSales[] {
  const map = new Map<number, ItemSales>()
  for (const o of orders) for (const i of o.items) {
    if (isAddOn(i, menu)) continue
    const e = map.get(i.id) ?? { id: i.id, name: i.name, category: categoryOf(i, menu), qty: 0, revenue: 0 }
    e.qty += i.quantity
    e.revenue += i.price * i.quantity
    map.set(i.id, e)
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue || a.name.localeCompare(b.name))
}

/** Revenue and quantity per category, add-ons as their own category. Adds up to total revenue. */
export function categoryMix(orders: Order[], menu: Map<number, { category: string; addon?: boolean }>) {
  const map = new Map<string, { qty: number; revenue: number }>()
  for (const o of orders) for (const i of o.items) {
    const cat = categoryOf(i, menu)
    const e = map.get(cat) ?? { qty: 0, revenue: 0 }
    e.qty += i.quantity
    e.revenue += i.price * i.quantity
    map.set(cat, e)
  }
  return [...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue)
}

/** Orders and revenue per hour of the day (0–23), by when they were placed. */
export function byHour(orders: Order[]) {
  const counts = Array<number>(24).fill(0)
  const revenue = Array<number>(24).fill(0)
  for (const o of orders) {
    const h = new Date(o.createdAt).getHours()
    counts[h]++
    revenue[h] += o.total
  }
  const active = counts.map((n, h) => ({ n, h })).filter(x => x.n > 0)
  const busiest = active.length ? active.reduce((a, b) => (b.n > a.n ? b : a)).h : null
  const quietest = active.length ? active.reduce((a, b) => (b.n < a.n ? b : a)).h : null
  return { counts, revenue, busiest, quietest }
}

/** The last `days` calendar days, oldest first; always that many days, whatever else is filtered. */
export function dailyTrend(sales: Order[], days: number, now = new Date()) {
  const today = startOfDay(now)
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - (days - 1))
    const list = sales.filter(o => sameDay(o.createdAt, day))
    return { day, orders: list.length, revenue: sum(list.map(o => o.total)) }
  })
}

export const PIPELINE: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid']

export function pipeline(orders: Order[]): Record<OrderStatus, number> {
  const counts = { pending: 0, confirmed: 0, preparing: 0, ready: 0, served: 0, paid: 0, cancelled: 0 }
  for (const o of orders) counts[o.status]++
  return counts
}

/** The dashboard's "today at a glance". */
export function today(orders: Order[], menu: Map<number, { category: string; addon?: boolean }>, now = new Date()) {
  const yesterday = addDays(now, -1)
  const received = orders.filter(isReceived)
  const todays = received.filter(o => sameDay(o.createdAt, now))
  const yesterdays = received.filter(o => sameDay(o.createdAt, yesterday))
  const revenue = (list: Order[]) => sum(list.filter(isSale).map(o => o.total))

  const tables = new Map<string, { n: number; revenue: number }>()
  for (const o of todays) {
    const e = tables.get(o.tableName) ?? { n: 0, revenue: 0 }
    tables.set(o.tableName, { n: e.n + 1, revenue: e.revenue + (isSale(o) ? o.total : 0) })
  }

  return {
    revenueToday: revenue(todays),
    revenueYesterday: revenue(yesterdays),
    ordersToday: todays.length,
    ordersYesterday: yesterdays.length,
    /** Order placed to ready. */
    wait: avg(todays.map(o => minutes(o.createdAt, o.readyAt)).filter((m): m is number => m !== null)),
    /** Preparing to ready. */
    prep: avg(todays.map(o => minutes(o.preparingAt, o.readyAt)).filter((m): m is number => m !== null)),
    /** Orders received per hour; revenue only from sales. */
    hours: (() => {
      const all = byHour(todays)
      const sold = byHour(todays.filter(isSale))
      return all.counts.map((n, h) => ({ hour: h, orders: n, revenue: sold.revenue[h] }))
    })(),
    /** What guests ordered today (not cancelled), add-ons left out. */
    top: itemSales(todays, menu).slice(0, 5),
    busiest: [...tables.entries()].sort((a, b) => b[1].n - a[1].n || b[1].revenue - a[1].revenue).slice(0, 4),
  }
}

/** Money taken today: paid orders by when they were paid. */
export function paidToday(orders: Order[], now = new Date()): number {
  return sum(orders.filter(o => o.status === 'paid' && sameDay(o.paidAt ?? o.createdAt, now)).map(o => o.total))
}

// ─── CSV ─────────────────────────────────────────────────────────────────────
/** One CSV field: quoted, quotes doubled, and a leading = + - @ defused so spreadsheets don't run it. */
export function csvField(value: string | number): string {
  let s = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export function salesCsv(sales: Order[], ref: (o: Order) => string): string {
  const header = ['Order', 'Order ID', 'Customer', 'Table', 'Type', 'Items', 'Total', 'Status', 'Placed', 'Served', 'Paid']
  const rows = sales.map(o => [
    ref(o), o.id, o.customerName, o.tableName, o.orderType === 'takeaway' ? 'Take away' : 'Dine in',
    o.items.map(i => `${i.quantity}x ${i.name}`).join('; '), o.total, o.status,
    o.createdAt, o.servedAt ?? '', o.paidAt ?? '',
  ].map(csvField).join(','))
  return [header.map(csvField).join(','), ...rows].join('\r\n')
}

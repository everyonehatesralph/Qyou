import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SEED_MENU } from '../constants/menu.ts'
import {
  byHour, categoryMix, csvField, dailyTrend, inRange, isSale, itemSales, paidToday, pipeline, salesCsv,
  summarize, today,
} from './analytics.ts'
import type { Order } from './orderModel.ts'

const menu = new Map(SEED_MENU.map(m => [m.id, m]))
const NOW = new Date(2026, 10, 4, 15, 30) // 4 Nov 2026, 3:30pm local
const at = (day: number, hour: number, min = 0) => new Date(2026, 10, day, hour, min).toISOString()

let n = 0
const order = (over: Partial<Order>): Order => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  tableId: 1,
  tableName: 'Table 1',
  customerName: 'Ana',
  items: [{ id: 2, name: 'Caramel Macchiato', price: 165, quantity: 1, category: 'Coffee' }],
  total: 165,
  status: 'paid',
  orderType: 'dineIn',
  takeawayCode: '',
  createdAt: at(4, 10),
  ...over,
})

test('sales are served or paid orders; cancelled and unfinished ones are not', () => {
  assert.deepEqual(
    (['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'] as const).map(status => isSale({ status })),
    [false, false, false, false, true, true, false],
  )
})

test('ranges are whole calendar days ending today', () => {
  assert.ok(inRange({ createdAt: at(4, 0, 1) }, 'today', NOW))
  assert.ok(!inRange({ createdAt: at(3, 23, 59) }, 'today', NOW))
  assert.ok(!inRange({ createdAt: at(5, 9) }, '7d', NOW)) // tomorrow
  assert.ok(inRange({ createdAt: new Date(2026, 9, 29, 8).toISOString() }, '7d', NOW)) // 29 Oct: 7th day back
  assert.ok(!inRange({ createdAt: new Date(2026, 9, 28, 23).toISOString() }, '7d', NOW))
})

test('summary: revenue, average, guests per table per day, serve time', () => {
  const sales = [
    order({ total: 200, customerName: 'Ana', servedAt: at(4, 10, 20) }),
    order({ total: 100, customerName: ' ana ', tableId: 1 }), // same guest, same table, same day
    order({ total: 300, customerName: 'Ana', tableId: 2 }),   // another Ana at another table
    order({ total: 400, customerName: '' }),                 // no name: not counted as a guest
  ]
  const s = summarize(sales)
  assert.equal(s.revenue, 1000)
  assert.equal(s.sales, 4)
  assert.equal(s.averageOrder, 250)
  assert.equal(s.guests, 2)
  assert.equal(s.averageServeMin, 20)
  assert.equal(summarize([]).averageServeMin, null)
})

test('item sales leave add-ons out; the category mix keeps them and adds up to revenue', () => {
  const sales = [
    order({
      items: [
        { id: 4, name: 'Cold Brew', price: 155, quantity: 2, category: 'Coffee' },
        { id: 102, name: 'Oat Milk Upgrade', price: 25, quantity: 1, category: 'Add-ons', addon: true },
      ],
      total: 335,
    }),
    // An order from before categories were saved: looked up on the menu
    order({ items: [{ id: 6, name: 'Iced Lemon Verbena', price: 125, quantity: 1 }], total: 125 }),
  ]
  assert.deepEqual(itemSales(sales, menu).map(i => [i.name, i.category, i.qty, i.revenue]), [
    ['Cold Brew', 'Coffee', 2, 310],
    ['Iced Lemon Verbena', 'Tea', 1, 125],
  ])
  const mix = categoryMix(sales, menu)
  assert.deepEqual(mix.map(([c, v]) => [c, v.revenue]), [['Coffee', 310], ['Tea', 125], ['Add-ons', 25]])
  assert.equal(mix.reduce((s, [, v]) => s + v.revenue, 0), 335 + 125)
})

test('busiest and quietest hours, and none when there is nothing', () => {
  const h = byHour([order({ createdAt: at(4, 9) }), order({ createdAt: at(4, 12) }), order({ createdAt: at(4, 12, 30) })])
  assert.equal(h.busiest, 12)
  assert.equal(h.quietest, 9)
  assert.equal(h.counts[12], 2)
  assert.deepEqual([byHour([]).busiest, byHour([]).quietest], [null, null])
})

test('the 7-day trend always has 7 days, oldest first', () => {
  const trend = dailyTrend([order({ createdAt: at(4, 9), total: 50 }), order({ createdAt: at(1, 9), total: 70 })], 7, NOW)
  assert.equal(trend.length, 7)
  assert.equal(trend[6].day.getDate(), 4)
  assert.equal(trend[6].revenue, 50)
  assert.equal(trend[3].day.getDate(), 1)
  assert.equal(trend[3].revenue, 70)
})

test('pipeline counts every status', () => {
  const p = pipeline([order({ status: 'pending' }), order({ status: 'pending' }), order({ status: 'cancelled' })])
  assert.equal(p.pending, 2)
  assert.equal(p.cancelled, 1)
  assert.equal(p.paid, 0)
})

test('today: revenue only from sales, orders from everything not cancelled', () => {
  const orders = [
    order({ status: 'paid', total: 300, createdAt: at(4, 9) }),
    order({ status: 'pending', total: 999, createdAt: at(4, 14) }),
    order({ status: 'cancelled', total: 500, createdAt: at(4, 14) }),
    order({ status: 'served', total: 120, createdAt: at(3, 11) }), // yesterday
  ]
  const t = today(orders, menu, NOW)
  assert.equal(t.revenueToday, 300)
  assert.equal(t.ordersToday, 2)
  assert.equal(t.revenueYesterday, 120)
  assert.equal(t.ordersYesterday, 1)
  assert.deepEqual([t.hours[14].orders, t.hours[14].revenue], [1, 0])
  assert.deepEqual([t.hours[9].orders, t.hours[9].revenue], [1, 300])
})

test('paid today goes by when it was paid, not when it was ordered', () => {
  const orders = [
    order({ status: 'paid', total: 200, createdAt: at(3, 23, 50), paidAt: at(4, 0, 10) }),
    order({ status: 'paid', total: 80, createdAt: at(4, 8), paidAt: at(4, 9) }),
    order({ status: 'served', total: 500, createdAt: at(4, 9) }),
  ]
  assert.equal(paidToday(orders, NOW), 280)
})

test('CSV fields are quoted and formulas are defused', () => {
  assert.equal(csvField('Ana "the chef"'), '"Ana ""the chef"""')
  assert.equal(csvField('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`)
  assert.equal(csvField('+639171234567'), `"'+639171234567"`)
  assert.equal(csvField(-5), '"-5"')
  const csv = salesCsv(
    [order({ customerName: 'Jo, Jr.', number: 42, orderDay: '2026-11-04' }), order({ number: 7 })],
    o => String(o.number).padStart(3, '0'),
    () => '2026-11-03',
  )
  const [header, row, older] = csv.split('\r\n')
  assert.match(header, /^"Day","Queue no\.","Order ID","Customer"/)
  assert.match(row, /^"2026-11-04","042","00000000-[^"]+","Jo, Jr\."/)
  // An order saved before queue numbers had a day: the day comes from the caller
  assert.match(older, /^"2026-11-03","007",/)
})

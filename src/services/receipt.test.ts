import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RECEIPT_DISCLAIMER, buildReceipt, receiptFileName, receiptNotes, receiptRef, type ReceiptOrder } from './receipt.ts'

const ctx = {
  place: 'Qyou Demo Café',
  money: (n: number) => `₱${n.toFixed(0)}`,
  statusLabel: (s: string) => ({ pending: 'Waiting for confirmation', ready: 'Ready for you', paid: 'Paid', cancelled: 'Cancelled' } as Record<string, string>)[s] ?? s,
}
const base: ReceiptOrder = {
  id: '90001',
  tableName: 'Table 4',
  customerName: 'Ana',
  orderType: 'dineIn',
  takeawayCode: '',
  createdAt: '2026-11-04T04:41:00Z',
  status: 'pending',
  total: 425,
  notes: 'Dine In | + Oat Milk Upgrade | Extra hot',
  items: [{ name: 'Caramel Macchiato', price: 165, quantity: 2 }, { name: 'Butter Croissant', price: 95, quantity: 1 }],
}
const detail = (r: ReturnType<typeof buildReceipt>, label: string) => r.details.find(([l]) => l === label)?.[1]

test('a receipt has the place, number, date, table, name, status, items, total and disclaimer', () => {
  const r = buildReceipt(base, ctx)
  assert.equal(r.place, 'Qyou Demo Café')
  assert.equal(detail(r, 'Order Nº'), '90001')
  assert.match(detail(r, 'Date')!, /2026/)
  assert.equal(detail(r, 'Table'), 'Table 4')
  assert.equal(detail(r, 'Name'), 'Ana')
  assert.equal(detail(r, 'Status'), 'Waiting for confirmation')
  assert.equal(detail(r, 'Payment'), 'Not paid yet')
  assert.deepEqual(r.lines[0], { quantity: 2, name: 'Caramel Macchiato', options: '', each: '₱165', amount: '₱330' })
  assert.equal(r.total, '₱425')
  assert.deepEqual(r.notes, ['+ Oat Milk Upgrade', 'Extra hot'])
  assert.equal(r.disclaimer, RECEIPT_DISCLAIMER)
  assert.match(RECEIPT_DISCLAIMER, /not an official receipt/)
})

test('take-away receipts show the pickup code; paid orders say paid', () => {
  const r = buildReceipt({ ...base, orderType: 'takeaway', takeawayCode: 'T-8KQ0', notes: 'Take Away', status: 'paid' }, ctx)
  assert.equal(detail(r, 'Take away'), 'T-8KQ0')
  assert.equal(detail(r, 'Table'), undefined)
  assert.equal(detail(r, 'Status'), 'Paid')
  assert.equal(detail(r, 'Payment'), undefined)
  assert.deepEqual(r.notes, [])
  assert.equal(detail(buildReceipt({ ...base, status: 'ready', paidOnlineAt: base.createdAt }, ctx), 'Payment'), 'Paid')
})

test('a cancelled order has no payment line', () => {
  const r = buildReceipt({ ...base, status: 'cancelled' }, ctx)
  assert.equal(detail(r, 'Status'), 'Cancelled')
  assert.equal(detail(r, 'Payment'), undefined)
})

test('queue numbers, long ids and item options come through when the order has them', () => {
  const r = buildReceipt({
    ...base,
    id: '9f1c2b7a-1111-2222-3333-444455556666',
    number: 42,
    items: [{ name: 'Iced Latte', price: 195, quantity: 1, options: [{ choice: 'Large' }, { choice: '50% sugar' }] }],
  }, ctx)
  assert.equal(detail(r, 'Order Nº'), '042')
  assert.equal(detail(r, 'Order ID'), '9f1c2b7a-1111-2222-3333-444455556666')
  assert.equal(r.lines[0].options, 'Large · 50% sugar')
  assert.equal(receiptRef({ id: '9f1c2b7a-1111-2222-3333-444455556666' }), '9F1C2B')
})

test('notes drop the order type; file names are safe', () => {
  assert.deepEqual(receiptNotes('Take Away |  No ice | '), ['No ice'])
  assert.deepEqual(receiptNotes(undefined), [])
  assert.equal(receiptFileName('Qyou Demo Café', '90001'), 'qyou-receipt-qyou-demo-cafe-90001.png')
  assert.equal(receiptFileName('', '042'), 'qyou-receipt-042.png')
})

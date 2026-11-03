import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MENU_ITEMS, SEED_MENU } from '../constants/menu.ts'
import {
  guestView, isOpenOrder, isOrderId, newOrderId, openOrdersByTable, orderErrorText, orderRef, priceOrder,
  settleTable, toBoardRow, withStatus, OrderError, type BoardRow, type Order,
} from './orderModel.ts'

const order = (over: Partial<Order> = {}): Order & { boardId: string } => ({
  id: newOrderId(),
  boardId: newOrderId(),
  tableId: 3,
  tableName: 'Table 3',
  customerName: 'Mico',
  items: [{ id: 10, name: 'Club Sandwich', price: 225, quantity: 1 }],
  total: 225,
  status: 'pending',
  orderType: 'dineIn',
  takeawayCode: '',
  createdAt: '2026-11-04T01:00:00.000Z',
  notes: 'No onions',
  ...over,
}) as Order & { boardId: string }

test('priceOrder uses menu prices and merges repeated lines', () => {
  const { items, total } = priceOrder(MENU_ITEMS, [
    { id: 2, quantity: 1, price: 1 },
    { id: 7, quantity: 2 },
    { id: 2, quantity: 2 },
  ])
  assert.deepEqual(items, [
    { id: 2, name: 'Caramel Macchiato', price: 165, quantity: 3, category: 'Coffee' },
    { id: 7, name: 'Butter Croissant', price: 95, quantity: 2, category: 'Pastry' },
  ])
  assert.equal(total, 165 * 3 + 95 * 2)
})

test('add-ons are priced and marked like any other line', () => {
  const { items, total } = priceOrder(SEED_MENU, [{ id: 3, quantity: 1 }, { id: 101, quantity: 1 }, { id: 104, quantity: 1 }])
  assert.equal(total, 175 + 30 + 0)
  assert.deepEqual(items.map(i => [i.name, i.category, i.addon ?? false]), [
    ['Matcha Latte', 'Coffee', false],
    ['Extra Espresso Shot', 'Add-ons', true],
    ['Less Ice', 'Add-ons', true],
  ])
})

test('removed menu items cannot be ordered', () => {
  const menu = SEED_MENU.map(m => (m.id === 9 ? { ...m, active: false } : m))
  assert.throws(() => priceOrder(menu, [{ id: 9, quantity: 1 }]), /unknown_item/)
})

test('priceOrder refuses bad carts with the same codes as the database', () => {
  const code = (lines: unknown) => {
    try { priceOrder(MENU_ITEMS, lines); return 'ok' } catch (e) { return (e as OrderError).code }
  }
  assert.equal(code([]), 'empty_order')
  assert.equal(code('nope'), 'empty_order')
  assert.equal(code([{ id: 999, quantity: 1 }]), 'unknown_item')
  assert.equal(code([{ id: 1, quantity: 0 }]), 'invalid_items')
  assert.equal(code([{ id: 1, quantity: 1.5 }]), 'invalid_items')
  assert.equal(code([{ id: '1', quantity: 1 }]), 'invalid_items')
  assert.equal(code([{ id: 1, quantity: 51 }]), 'too_many_items')
  assert.equal(code([{ ...MENU_ITEMS[0], quantity: 1 }]), 'ok')
  const soldOut = MENU_ITEMS.map(m => (m.id === 6 ? { ...m, available: false } : m))
  assert.throws(() => priceOrder(soldOut, [{ id: 6, quantity: 1 }]), /item_unavailable/)
})

test('the board row drops items, total, notes and dine-in names', () => {
  const row = toBoardRow(order({ status: 'confirmed', confirmedAt: '2026-11-04T01:02:00.000Z' }))
  assert.deepEqual(Object.keys(row).sort(), [
    'boardId', 'confirmedAt', 'createdAt', 'customerName', 'orderType', 'status', 'tableId', 'tableName', 'takeawayCode',
  ])
  assert.equal(row.customerName, '')
  assert.equal(toBoardRow(order({ orderType: 'takeaway', customerName: 'Ana' })).customerName, 'Ana')
})

test('guestView keeps own orders whole and follows their status on the board', () => {
  const mine = order()
  const boardMine: BoardRow = { ...toBoardRow(mine), status: 'preparing', preparingAt: '2026-11-04T01:05:00.000Z' }
  const other = order({ tableId: 8, customerName: 'Paolo', createdAt: '2026-11-04T01:10:00.000Z' })
  const done = order({ tableId: 9, status: 'paid' })

  const view = guestView([mine], [boardMine, toBoardRow(other), toBoardRow(done)])
  assert.equal(view.length, 2, 'paid orders of other people are left out')

  const [first, second] = view
  // Newest first: the other table's order
  assert.equal(first.id, `board:${other.boardId}`)
  assert.equal(first.tableId, 8)
  assert.deepEqual(first.items, [])
  assert.equal(first.total, 0)
  assert.equal(first.customerName, '')

  assert.equal(second.id, mine.id)
  assert.equal(second.status, 'preparing')
  assert.equal(second.preparingAt, '2026-11-04T01:05:00.000Z')
  assert.equal(second.notes, 'No onions')
  assert.equal(second.total, 225)
})

test('withStatus stamps the matching time', () => {
  const at = '2026-11-04T02:00:00.000Z'
  assert.equal(withStatus(order(), 'ready', at).readyAt, at)
  assert.equal(withStatus(order(), 'cancelled', at).cancelledAt, at)
  assert.equal(withStatus(order(), 'pending', at).status, 'pending')
})

test('order ids are v4 UUIDs, with or without crypto.randomUUID', () => {
  assert.ok(isOrderId(newOrderId()))
  const { randomUUID } = globalThis.crypto
  try {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true })
    const ids = new Set(Array.from({ length: 200 }, newOrderId))
    assert.equal(ids.size, 200)
    for (const id of ids) assert.ok(isOrderId(id), id)
  } finally {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: randomUUID, configurable: true })
  }
  assert.ok(!isOrderId('90001'))
  assert.ok(!isOrderId('board:1234'))
})

test('orderRef is the short ticket number', () => {
  assert.equal(orderRef({ id: newOrderId(), number: 42 }), '0042')
  assert.equal(orderRef({ id: newOrderId(), number: 12345 }), '12345')
  assert.equal(orderRef({ id: '90001' }), '90001')
  assert.equal(orderRef({ id: 'abcdef12-0000-4000-8000-000000000000' }), 'ABCDEF')
})

test('orderErrorText turns codes into words and anything else into a connection hint', () => {
  assert.match(orderErrorText(new Error('item_unavailable')), /sold out/)
  assert.match(orderErrorText(new Error('P0001: not_cancellable')), /can no longer be cancelled/)
  assert.match(orderErrorText(new TypeError('Failed to fetch')), /connection/)
})

test('a table is held by orders that are neither paid nor cancelled', () => {
  assert.equal(isOpenOrder({ status: 'served' }), true)
  assert.equal(isOpenOrder({ status: 'paid' }), false)
  assert.equal(isOpenOrder({ status: 'cancelled' }), false)
  const byTable = openOrdersByTable([
    order({ tableId: 2, status: 'served' }),
    order({ tableId: 2, status: 'cancelled' }),
    order({ tableId: 3, status: 'paid' }),
    order({ tableId: 4, status: 'pending' }),
  ])
  assert.deepEqual([...byTable.keys()].sort(), [2, 4])
  assert.equal(byTable.get(2)!.length, 1)
})

test('freeing a table pays what was served and cancels what the kitchen has not finished', () => {
  const open = [
    order({ status: 'served', total: 300 }),
    order({ status: 'ready', total: 120 }),
    order({ status: 'preparing', total: 500 }),
    order({ status: 'pending', total: 95 }),
    order({ status: 'confirmed', total: 60 }),
  ]
  const { pay, cancel, payTotal } = settleTable(open)
  assert.deepEqual(pay.map(o => o.status), ['served', 'ready'])
  assert.deepEqual(cancel.map(o => o.status), ['preparing', 'pending', 'confirmed'])
  assert.equal(payTotal, 420)
})

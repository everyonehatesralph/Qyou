import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MENU_ITEMS, OPTION_GROUPS, SEED_MENU } from '../constants/menu.ts'
import {
  applyOptionGroupSave, applyStatus, applyTableCount, checkOptions, moneyInAt, paymentLabel, refundDue, groupsFor, guestView, isOpenOrder, isOrderId, lineKey, optionsText, newOrderId, openOrdersByTable, orderErrorText, orderRef, priceOrder,
  restaurantDay, settleTable, toBoardRow, withStatus, OrderError, type BoardRow, type Order,
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

test("orderRef is the day's queue number, three digits", () => {
  assert.equal(orderRef({ id: newOrderId(), number: 1 }), '001')
  assert.equal(orderRef({ id: newOrderId(), number: 42 }), '042')
  assert.equal(orderRef({ id: newOrderId(), number: 1234 }), '1234')
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

test('the restaurant day turns over at midnight in its timezone, not UTC', () => {
  // 11:59pm and 12:01am in Manila (UTC+8)
  assert.equal(restaurantDay(new Date('2026-11-04T15:59:00Z'), 'Asia/Manila'), '2026-11-04')
  assert.equal(restaurantDay(new Date('2026-11-04T16:01:00Z'), 'Asia/Manila'), '2026-11-05')
  // The same instant is still the 4th in UTC
  assert.equal(restaurantDay(new Date('2026-11-04T16:01:00Z'), 'UTC'), '2026-11-04')
})

test('setting the number of tables opens 1..n and switches off the rest', () => {
  const ten = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, label: i === 1 ? 'Patio' : `Table ${i + 1}`, active: true }))
  const eight = applyTableCount(ten, 8, new Set())
  assert.deepEqual(eight.filter(t => t.active).map(t => t.id), [1, 2, 3, 4, 5, 6, 7, 8])
  assert.equal(eight.length, 10, 'switched-off tables are kept for old orders')
  const twelve = applyTableCount(eight, 12, new Set())
  assert.deepEqual(twelve.filter(t => t.active).map(t => t.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  assert.equal(twelve.find(t => t.id === 2)!.label, 'Patio', 'names are kept')
  assert.equal(twelve.find(t => t.id === 12)!.label, 'Table 12')
})

test('a table with open orders cannot be switched off', () => {
  const ten = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, label: `Table ${i + 1}`, active: true }))
  assert.throws(() => applyTableCount(ten, 7, new Set([3, 9, 8])), /table_in_use:8/)
  assert.doesNotThrow(() => applyTableCount(ten, 9, new Set([3, 9])))
  for (const bad of [0, 201, 2.5, '5', null]) assert.throws(() => applyTableCount(ten, bad, new Set()), /invalid_table_count/)
  assert.equal(orderErrorText(new Error('table_in_use:9')), 'Table 9 still has open orders. Free it before removing it.')
})

// ─── Item options ────────────────────────────────────────────────────────────
const LARGE = 2, ICED = 4, HOT = 3, REGULAR = 1, FULL_SUGAR = 5, HALF_SUGAR = 7, NORMAL_ICE = 10

test('options are priced and keep each drink apart', () => {
  const { items, total } = priceOrder(SEED_MENU, [
    { id: 2, quantity: 1, choices: [LARGE, ICED, HALF_SUGAR] },
    { id: 2, quantity: 1, choices: [REGULAR, HOT, FULL_SUGAR] },
    { id: 2, quantity: 1, choices: [HALF_SUGAR, LARGE, ICED] },
  ], OPTION_GROUPS)
  assert.equal(total, (165 + 30) * 2 + 165)
  assert.equal(items.length, 2)
  assert.deepEqual([items[0].quantity, items[0].price, optionsText(items[0])], [2, 195, 'Large · Iced · 50% sugar'])
  assert.deepEqual(items[0].options!.map(o => [o.group, o.choice, o.price]), [
    ['Size', 'Large', 30], ['Hot or iced', 'Iced', 0], ['Sugar level', '50% sugar', 0],
  ])
  assert.deepEqual([items[1].quantity, items[1].price], [1, 165])
})

test('options must be complete and offered', () => {
  const code = (choices: unknown, id = 2) => {
    try { priceOrder(SEED_MENU, [{ id, quantity: 1, choices }], OPTION_GROUPS); return 'ok' } catch (e) { return (e as OrderError).code }
  }
  assert.equal(code([REGULAR, HOT, FULL_SUGAR]), 'ok')
  assert.equal(code([REGULAR, HOT]), 'missing_option')
  assert.equal(code(undefined), 'missing_option')
  assert.equal(code([REGULAR, LARGE, HOT, FULL_SUGAR]), 'invalid_options')
  assert.equal(code([REGULAR, HOT, FULL_SUGAR, NORMAL_ICE]), 'invalid_options')  // no ice on this drink
  assert.equal(code([REGULAR, HOT, FULL_SUGAR, 999]), 'invalid_options')
  assert.equal(code([REGULAR, REGULAR, HOT, FULL_SUGAR]), 'invalid_options')
  assert.equal(code('large'), 'invalid_options')
  assert.equal(code([1.5]), 'invalid_options')
  assert.equal(code([REGULAR], 7), 'invalid_options')                          // croissant has none
  assert.equal(code([REGULAR, FULL_SUGAR, NORMAL_ICE], 4), 'ok')               // cold brew: size, sugar, ice
  // A removed group isn't asked for, and its choices can't be picked
  const noSugar = OPTION_GROUPS.map(g => (g.id === 3 ? { ...g, active: false } : g))
  assert.doesNotThrow(() => priceOrder(SEED_MENU, [{ id: 2, quantity: 1, choices: [REGULAR, HOT] }], noSugar))
  assert.throws(() => priceOrder(SEED_MENU, [{ id: 2, quantity: 1, choices: [REGULAR, HOT, FULL_SUGAR] }], noSugar), /invalid_options/)
})

test('checkOptions tells the cart what is missing', () => {
  const groups = groupsFor(SEED_MENU.find(m => m.id === 2)!, OPTION_GROUPS)
  assert.deepEqual(groups.map(g => g.name), ['Size', 'Hot or iced', 'Sugar level'])
  const partial = checkOptions(groups, [LARGE])
  assert.deepEqual([partial.ok, partial.missing, partial.extra], [false, ['Hot or iced', 'Sugar level'], 30])
  assert.equal(checkOptions(groups, [LARGE, ICED, HALF_SUGAR]).ok, true)
  assert.equal(lineKey(2, [7, 2, 4]), '2:2,4,7')
  assert.equal(lineKey(7), '7')
})

test('staff edit option groups; choice ids stay unique', () => {
  const groups = OPTION_GROUPS.map(g => ({ ...g, active: true }))
  const added = applyOptionGroupSave(groups, { name: ' Milk ', required: false, multiple: false, choices: [{ name: 'Fresh', price: 0 }, { name: 'Oat', price: 25 }] })
  assert.equal(added.group.id, 5)
  assert.equal(added.group.name, 'Milk')
  assert.deepEqual(added.group.choices.map(c => c.id), [100, 101])
  // Edit: keep Oat (new price), drop Fresh, add Soy
  const oat = added.group.choices[1]
  const edited = applyOptionGroupSave(added.groups, { id: 5, name: 'Milk', choices: [{ id: oat.id, name: 'Oat', price: 35 }, { name: 'Soy', price: 20 }] })
  assert.deepEqual(edited.group.choices, [{ id: 101, name: 'Oat', price: 35 }, { id: 102, name: 'Soy', price: 20 }])
  assert.equal(edited.group.required, false, 'kept when not sent')
  const code = (input: Parameters<typeof applyOptionGroupSave>[1]) => {
    try { applyOptionGroupSave(groups, input); return 'ok' } catch (e) { return (e as OrderError).code }
  }
  assert.equal(code({ name: '', choices: [{ name: 'A', price: 0 }] }), 'invalid_name')
  assert.equal(code({ name: 'X', choices: [] }), 'invalid_choices')
  assert.equal(code({ name: 'X', choices: [{ name: 'A', price: -1 }] }), 'invalid_choices')
  assert.equal(code({ name: 'X', choices: [{ name: 'A', price: 1.005 }] }), 'invalid_choices')
  assert.equal(code({ name: 'X', choices: [{ id: 2, name: 'Large', price: 0 }] }), 'invalid_choices') // another group's choice
  assert.equal(code({ id: 99, name: 'X', choices: [{ name: 'A', price: 0 }] }), 'unknown_option_group')
})

test('serving an order paid online settles it; one paid at the counter waits for its bill', () => {
  const at = '2026-11-04T02:00:00.000Z'
  const prepaid = applyStatus(order({ status: 'ready', paidOnlineAt: '2026-11-04T01:00:00.000Z' }), 'served', at)
  assert.deepEqual([prepaid.status, prepaid.servedAt, prepaid.paidAt], ['paid', at, at])
  const counter = applyStatus(order({ status: 'ready' }), 'served', at)
  assert.deepEqual([counter.status, counter.servedAt, counter.paidAt], ['served', at, undefined])
  // Other moves are as usual
  assert.equal(applyStatus(order({ paidOnlineAt: at }), 'confirmed').status, 'confirmed')
})

test('freeing a table never cancels an order paid online, and only asks for unpaid money', () => {
  const paidAt = '2026-11-04T01:00:00.000Z'
  const open = [
    order({ status: 'served', total: 100 }),
    order({ status: 'served', total: 300, paidOnlineAt: paidAt }),
    order({ status: 'preparing', total: 50, paidOnlineAt: paidAt }),
    order({ status: 'pending', total: 70 }),
  ]
  const { pay, cancel, keep, payTotal } = settleTable(open)
  assert.deepEqual(pay.map(o => o.total), [100, 300])
  assert.deepEqual(cancel.map(o => o.total), [70])
  assert.deepEqual(keep.map(o => o.total), [50])
  assert.equal(payTotal, 100)
})

test('money comes in when paid online, or when marked paid at the counter', () => {
  const online = order({ status: 'pending', paidOnlineAt: '2026-11-04T01:05:00.000Z' })
  assert.equal(moneyInAt(online), '2026-11-04T01:05:00.000Z')
  assert.equal(moneyInAt({ ...online, status: 'paid', paidAt: '2026-11-04T03:00:00.000Z' }), '2026-11-04T01:05:00.000Z')
  // Cancelled after paying online: that money goes back
  assert.equal(moneyInAt({ ...online, status: 'cancelled' }), undefined)
  assert.equal(refundDue({ ...online, status: 'cancelled' }), true)
  assert.equal(refundDue({ ...order(), status: 'cancelled' }), false)
  assert.equal(moneyInAt(order({ status: 'served' })), undefined)
  assert.equal(moneyInAt(order({ status: 'paid', paidAt: '2026-11-04T04:00:00.000Z' })), '2026-11-04T04:00:00.000Z')
  assert.deepEqual(['gcash', 'paymaya', 'qrph', 'card', 'something_new', undefined].map(paymentLabel), ['GCash', 'Maya', 'QR Ph', 'Card', 'Online', 'Online'])
})

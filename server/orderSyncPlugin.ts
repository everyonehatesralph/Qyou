/**
 * The Node order server: same rules as the Supabase backend (supabase/migrations), for
 * local dev, the e2e suite and self-hosting with server/index.ts. Orders live in
 * server/orders.json.
 *
 * - GET  /api/stream?feeds=orders,board,menu,options,tables
 *                             one SSE stream per page for every live feed it follows (browsers allow only
 *                             six connections to a server, so one stream each would starve requests).
 *                             Frames are { feed, rows }; orders (every order) is staff only, board is public.
 * - POST /api/orders/place    { id, tableId, tableName, customerName, orderType, items: [{ id, quantity }], notes }
 *                             priced here from the menu; whatever the browser thinks things cost is ignored
 * - POST /api/orders/lookup   { ids }        a guest's own orders, by id
 * - POST /api/orders/cancel   { id }         guests, until the kitchen starts
 * - POST /api/orders/status   { id, status } staff only
 * - GET  /api/orders                         staff only
 * - POST /api/staff/login     { pin }        sets the staff cookie
 * - GET  /api/staff/session, POST /api/staff/logout
 * - GET  /api/menu                           the live menu, for everyone
 * - POST /api/menu/save       { id?, name, price, category, description, addon }  staff only
 * - POST /api/menu/available  { id, available }                                    staff only
 * - POST /api/menu/remove     { id }                                               staff only
 * - GET  /api/options                        option groups (size, sugar…), for everyone
 * - POST /api/options/save    { id?, name, required, multiple, choices }  staff only
 * - POST /api/options/remove  { id }                                      staff only
 * - GET  /api/tables                         the tables guests can check in at, for everyone
 * - POST /api/tables/count    { count }      staff only: tables 1..count are open
 * - POST /api/dev/seed        { orders, resetMenu, resetTables }  dev server only: e2e fixtures
 * - /api/payments/*           paying online (server/payments/service.ts): with PAYMONGO_SECRET_KEY, or
 *                             in dev with the PayMongo stand-in at /fake-paymongo (server/payments/fakePaymongo.ts)
 */

import type { Plugin, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import { randomBytes, randomUUID, timingSafeEqual } from 'crypto'
import fs from 'fs'
import path from 'path'
import { OPTION_GROUPS, SEED_MENU, type MenuItem, type OptionGroup } from '../src/constants/menu.ts'
import { RESTAURANT } from '../src/config/restaurant.ts'
import {
  ORDER_STATUSES, OrderError, applyOptionGroupSave, applyStatus, applyTableCount, isOpenOrder, isOrderId, makeTakeawayCode, priceOrder,
  restaurantDay, sortOrders, toBoardRow, withStatus,
  type DiningTable, type Order, type OrderItem, type OrderStatus, type OrderType, type PlaceOrderInput,
} from '../src/services/orderModel.ts'
import { DEFAULT_METHODS, handlePaymentsRequest, settingsFromEnv, type Checkout, type CheckoutStore, type PaymentSettings } from './payments/service.ts'
import { createFakePaymongo, type FakePaymongo } from './payments/fakePaymongo.ts'

type StoredOrder = Order & { boardId: string }
type StoredItem = MenuItem & { active: boolean }
type StoredGroup = OptionGroup & { active: boolean }

const DATA_FILE = path.resolve(process.cwd(), 'server/orders.json')
const MENU_FILE = path.resolve(process.cwd(), 'server/menu.json')
const TABLES_FILE = path.resolve(process.cwd(), 'server/tables.json')
const OPTIONS_FILE = path.resolve(process.cwd(), 'server/options.json')
const CHECKOUTS_FILE = path.resolve(process.cwd(), 'server/checkouts.json')
const COOKIE = 'qyou_staff'
const MAX_BODY = 64 * 1024

function loadOrders(): StoredOrder[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const list = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Order[]
      return list.map(o => ({ ...o, boardId: o.boardId ?? randomUUID() }))
    }
  } catch { /* noop */ }
  return []
}

function saveJson(file: string, data: unknown) {
  try {
    const dir = path.dirname(file)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('[OrderSync] Save failed:', e)
  }
}

const seedMenu = (): StoredItem[] => SEED_MENU.map(m => ({ ...m, addon: !!m.addon, optionGroupIds: m.optionGroupIds ?? [], active: true }))

const seedTables = (): DiningTable[] => RESTAURANT.tables.map(t => ({ ...t, active: true }))
const seedOptions = (): StoredGroup[] => OPTION_GROUPS.map(g => ({ ...g, active: true }))

function loadOptions(): StoredGroup[] {
  try {
    if (fs.existsSync(OPTIONS_FILE)) return JSON.parse(fs.readFileSync(OPTIONS_FILE, 'utf-8'))
  } catch { /* noop */ }
  return seedOptions()
}

function loadTables(): DiningTable[] {
  try {
    if (fs.existsSync(TABLES_FILE)) return JSON.parse(fs.readFileSync(TABLES_FILE, 'utf-8'))
  } catch { /* noop */ }
  return seedTables()
}

/** A pay-now order waiting for its payment (the checkouts table in Supabase). */
interface StoredCheckout {
  orderId: string
  /** What the phone sent, to tell a retry from a changed cart. */
  request: string
  tableId: number
  tableName: string
  customerName: string
  orderType: OrderType
  items: OrderItem[]
  total: number
  notes?: string
  sessionId?: string
  checkoutUrl?: string
  paid: boolean
  createdAt: number
}

function loadCheckouts(): Map<string, StoredCheckout> {
  try {
    if (fs.existsSync(CHECKOUTS_FILE)) {
      const list = JSON.parse(fs.readFileSync(CHECKOUTS_FILE, 'utf-8')) as StoredCheckout[]
      return new Map(list.map(c => [c.orderId, c]))
    }
  } catch { /* noop */ }
  return new Map()
}

function loadMenu(): StoredItem[] {
  try {
    if (fs.existsSync(MENU_FILE)) return JSON.parse(fs.readFileSync(MENU_FILE, 'utf-8'))
  } catch { /* noop */ }
  return seedMenu()
}

function readRaw(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
      if (body.length > MAX_BODY) { reject(new Error('too_large')); req.destroy() }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

async function readBody(req: IncomingMessage): Promise<any> {
  const body = await readRaw(req)
  try { return body ? JSON.parse(body) : {} } catch { throw new Error('invalid_json') }
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers })
  res.end(JSON.stringify(body))
}

function cookieOf(req: IncomingMessage, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return undefined
}

function samePin(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export interface OrderServerOptions {
  /** The staff PIN. Without one, staff sign-in is off. */
  staffPin?: string
  /** Allow POST /api/dev/seed. Never on a real server. */
  allowSeed?: boolean
  /**
   * Paying online: PayMongo settings (settingsFromEnv), 'fake' for the dev stand-in, or
   * null/undefined for off.
   */
  payments?: PaymentSettings | 'fake' | null
}

/**
 * Order API as plain Node middleware, so dev (Vite) and production (Express)
 * serve exactly the same endpoints.
 */
export function createOrderSyncMiddleware({ staffPin, allowSeed = false, payments = null }: OrderServerOptions = {}) {
  let orders: StoredOrder[] = loadOrders()
  const checkouts = loadCheckouts()
  let menu: StoredItem[] = loadMenu()
  let tables: DiningTable[] = loadTables()
  let options: StoredGroup[] = loadOptions()
  const sessions = new Set<string>()
  const failedLogins = new Map<string, number[]>()
  type Feed = 'orders' | 'board' | 'menu' | 'tables' | 'options'
  const FEEDS: Feed[] = ['orders', 'board', 'menu', 'tables', 'options']
  // Each open stream and the feeds it follows
  const streams = new Map<ServerResponse, Set<Feed>>()

  const isStaff = (req: IncomingMessage) => {
    const token = cookieOf(req, COOKIE)
    return !!token && sessions.has(token)
  }

  // Guests see what still holds a table or waits at the counter, from the last day
  const board = () => {
    const since = Date.now() - 86_400_000
    return orders.filter(o => new Date(o.createdAt).getTime() > since).map(toBoardRow)
  }

  const rowsOf = (feed: Feed): unknown[] =>
    feed === 'orders' ? sortOrders(orders)
    : feed === 'board' ? board()
    : feed === 'menu' ? menu
    : feed === 'options' ? options
    : tables
  const frame = (feed: Feed) => `data: ${JSON.stringify({ feed, rows: rowsOf(feed) })}\n\n`

  function push(feeds: Feed[]) {
    const frames = new Map(feeds.map(f => [f, frame(f)]))
    streams.forEach((follows, res) => {
      for (const [feed, text] of frames) {
        if (!follows.has(feed)) continue
        try { res.write(text) } catch { streams.delete(res); return }
      }
    })
  }

  function changed() {
    saveJson(DATA_FILE, orders)
    push(['orders', 'board'])
  }

  function menuChanged() {
    saveJson(MENU_FILE, menu)
    push(['menu'])
  }

  function tablesChanged() {
    saveJson(TABLES_FILE, tables)
    push(['tables'])
  }

  function optionsChanged() {
    saveJson(OPTIONS_FILE, options)
    push(['options'])
  }

  /** Groups that exist, each once, in the order given. */
  const knownGroups = (ids: unknown): number[] => Array.isArray(ids)
    ? [...new Set(ids)].filter((id): id is number => options.some(g => g.id === id && g.active))
    : []

  function updateItem(id: unknown, change: (m: StoredItem) => StoredItem): StoredItem {
    const item = menu.find(m => m.id === id && m.active)
    if (!item) throw new OrderError('unknown_item')
    const saved = change(item)
    menu = menu.map(m => (m === item ? saved : m))
    menuChanged()
    return saved
  }

  const openStream = (req: IncomingMessage, res: ServerResponse, follows: Set<Feed>) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    for (const feed of follows) res.write(frame(feed))
    streams.set(res, follows)
    req.on('close', () => streams.delete(res))
  }

  // Comment frames keep idle streams from being closed by proxies
  setInterval(() => streams.forEach((_, res) => { try { res.write(': ping\n\n') } catch { streams.delete(res) } }), 25_000).unref()

  // ─── New orders (place_order, start_checkout and insert_order in SQL) ──────
  const TEN_MINUTES = 10 * 60_000
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

  /** The checks every new order or checkout passes, and its price from the menu. */
  function checkNewOrder(body: Partial<PlaceOrderInput>): { table: DiningTable; items: OrderItem[]; total: number } {
    if (!isOrderId(body.id)) throw new OrderError('invalid_order_id')
    if (body.orderType !== 'dineIn' && body.orderType !== 'takeaway') throw new OrderError('invalid_order_type')
    // Every order comes from a table's QR code; take-away orders keep the table they were placed at.
    // The table must exist now, and its name comes from here, not from the phone.
    const table = tables.find(t => t.id === body.tableId && t.active)
    if (!table) throw new OrderError('invalid_table')
    // Spam brake: one table can't flood the kitchen (or the payment provider)
    const recent = orders.filter(o => Date.now() - new Date(o.createdAt).getTime() < TEN_MINUTES)
    const openCheckouts = [...checkouts.values()].filter(c => !c.paid && c.tableId === body.tableId && Date.now() - c.createdAt < TEN_MINUTES)
    if (recent.filter(o => o.tableId === body.tableId).length >= 30 || recent.length >= 300 || openCheckouts.length >= 30) {
      throw new OrderError('too_many_orders')
    }
    return { table, ...priceOrder(menu, body.items, options) }
  }

  /** Writes a priced order with today's next queue number. Synchronous through the push, so two can't share a number. */
  function insertOrder(o: {
    id: string; tableId: number; tableName: string; customerName: string; orderType: OrderType
    items: OrderItem[]; total: number; notes?: string; paidOnlineAt?: string; paymentMethod?: string; paymentRef?: string
  }): StoredOrder {
    const activeCodes = new Set(orders.filter(x => !['served', 'paid', 'cancelled'].includes(x.status)).map(x => x.takeawayCode))
    const orderDay = restaurantDay(new Date(), RESTAURANT.timeZone)
    const dayOf = (x: StoredOrder) => x.orderDay ?? restaurantDay(new Date(x.createdAt), RESTAURANT.timeZone)
    const number = orders.filter(x => dayOf(x) === orderDay).reduce((max, x) => Math.max(max, x.number ?? 0), 0) + 1
    const order: StoredOrder = {
      id: o.id,
      number,
      orderDay,
      boardId: randomUUID(),
      tableId: o.tableId,
      tableName: o.tableName,
      customerName: text(o.customerName, 60),
      items: o.items,
      total: o.total,
      status: 'pending',
      orderType: o.orderType,
      takeawayCode: o.orderType === 'takeaway' ? makeTakeawayCode(activeCodes) : '',
      createdAt: new Date().toISOString(),
      ...(text(o.notes, 500) ? { notes: text(o.notes, 500) } : {}),
      ...(o.paidOnlineAt ? { paidOnlineAt: o.paidOnlineAt } : {}),
      ...(o.paymentMethod ? { paymentMethod: text(o.paymentMethod, 30) } : {}),
      ...(o.paymentRef ? { paymentRef: text(o.paymentRef, 100) } : {}),
    }
    orders = [order, ...orders]
    changed()
    return order
  }

  // ─── Paying online ───────────────────────────────────────────────────────
  const checkoutsChanged = () => saveJson(CHECKOUTS_FILE, [...checkouts.values()])
  const checkoutView = (c: StoredCheckout): Checkout => ({
    orderId: c.orderId, items: c.items, total: c.total, tableName: c.tableName, paid: c.paid,
    ...(c.sessionId ? { sessionId: c.sessionId } : {}),
    ...(c.checkoutUrl ? { checkoutUrl: c.checkoutUrl } : {}),
  })

  const checkoutStore: CheckoutStore = {
    async start(input) {
      if (orders.some(o => o.id === input?.id)) throw new OrderError('already_placed')
      const request = JSON.stringify({
        tableId: input.tableId, customerName: input.customerName ?? '', orderType: input.orderType, items: input.items, notes: input.notes ?? '',
      })
      const existing = checkouts.get(input.id)
      if (existing) {
        if (existing.paid) throw new OrderError('already_placed')
        if (existing.request !== request) throw new OrderError('checkout_changed')
        return checkoutView(existing)
      }
      const { table, items, total } = checkNewOrder(input)
      if (total <= 0) throw new OrderError('nothing_to_pay')
      const checkout: StoredCheckout = {
        orderId: input.id, request, tableId: table.id, tableName: table.label, customerName: text(input.customerName, 60),
        orderType: input.orderType, items, total, ...(text(input.notes, 500) ? { notes: text(input.notes, 500) } : {}),
        paid: false, createdAt: Date.now(),
      }
      checkouts.set(checkout.orderId, checkout)
      checkoutsChanged()
      return checkoutView(checkout)
    },
    async attach(orderId, sessionId, checkoutUrl) {
      const c = checkouts.get(orderId)
      if (!c) throw new OrderError('unknown_checkout')
      if (!c.sessionId) {
        c.sessionId = sessionId
        c.checkoutUrl = checkoutUrl
        checkoutsChanged()
      }
      return checkoutView(c)
    },
    async find(orderId) {
      const c = checkouts.get(orderId)
      return c ? checkoutView(c) : null
    },
    async confirm({ orderId, sessionId, paymentRef, amountCentavos, method }) {
      const c = checkouts.get(orderId)
      if (!c) throw new OrderError('unknown_checkout')
      if (!c.sessionId || c.sessionId !== sessionId) throw new OrderError('checkout_mismatch')
      if (orders.some(o => o.id === orderId)) return
      if (amountCentavos !== Math.round(c.total * 100)) throw new OrderError('amount_mismatch')
      insertOrder({
        id: c.orderId, tableId: c.tableId, tableName: c.tableName, customerName: c.customerName, orderType: c.orderType,
        items: c.items, total: c.total, notes: c.notes, paidOnlineAt: new Date().toISOString(), paymentMethod: method, paymentRef,
      })
      c.paid = true
      checkoutsChanged()
    },
  }

  // The dev stand-in for PayMongo: same API and signed webhook, its own test checkout page
  let fake: FakePaymongo | null = null
  let paymentDeps: { store: CheckoutStore; settings: PaymentSettings } | null = null
  if (payments === 'fake') {
    const webhookSecret = 'whsk_fake_dev_only'
    fake = createFakePaymongo({
      secretKey: 'sk_test_fake_dev_only',
      webhookSecret,
      deliver: async (raw, signature) => {
        const res = await handlePaymentsRequest(new Request('http://localhost/api/payments/webhook', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Paymongo-Signature': signature }, body: raw,
        }), paymentDeps)
        if (!res.ok) throw new Error(`webhook answered ${res.status}`)
      },
    })
    paymentDeps = {
      store: checkoutStore,
      settings: {
        paymongo: { secretKey: 'sk_test_fake_dev_only', apiBase: fake.apiBase, fetch: fake.fetch },
        webhookSecret,
        methods: DEFAULT_METHODS,
      },
    }
  } else if (payments) {
    paymentDeps = { store: checkoutStore, settings: payments }
  }

  /** /api/payments/* as a web Request, answered by the shared payment code. */
  async function servePayments(req: IncomingMessage, res: ServerResponse) {
    const raw = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readRaw(req)
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
    const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, { method: req.method, headers, body: raw })
    const response = await handlePaymentsRequest(request, paymentDeps)
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(await response.text())
  }

  function update(id: string, change: (o: StoredOrder) => StoredOrder): StoredOrder | undefined {
    let saved: StoredOrder | undefined
    orders = orders.map(o => (o.id === id ? (saved = change(o)) : o))
    if (saved) changed()
    return saved
  }

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url || '/', 'http://localhost')
    const route = `${req.method} ${url.pathname}`
    if (url.pathname.startsWith('/api/payments/')) {
      try { await servePayments(req, res) } catch { send(res, 400, { error: 'bad_request' }) }
      return
    }
    if (fake && url.pathname.startsWith('/fake-paymongo/') && await fake.handle(req, res)) return
    if (!['/api/stream', '/api/orders', '/api/staff', '/api/menu', '/api/options', '/api/tables', '/api/dev'].some(prefix => url.pathname.startsWith(prefix))) {
      next()
      return
    }

    try {
      switch (route) {
        case 'GET /api/stream': {
          const asked = (url.searchParams.get('feeds') ?? '').split(',').filter((f): f is Feed => FEEDS.includes(f as Feed))
          if (asked.length === 0) { send(res, 400, { error: 'no_feeds' }); return }
          // Every order is for staff only; the rest is public
          if (asked.includes('orders') && !isStaff(req)) { send(res, 401, { error: 'staff_only' }); return }
          openStream(req, res, new Set(asked))
          return
        }

        case 'GET /api/orders': {
          if (!isStaff(req)) { send(res, 401, { error: 'staff_only' }); return }
          send(res, 200, sortOrders(orders))
          return
        }

        case 'POST /api/orders/place': {
          const body = await readBody(req)
          if (!isOrderId(body.id)) throw new OrderError('invalid_order_id')
          // The same id again is a retry of a request that already went through
          const existing = orders.find(o => o.id === body.id)
          if (existing) { send(res, 200, { order: existing }); return }
          // An order being paid online is placed by its payment, not by this
          if (checkouts.has(body.id)) throw new OrderError('checkout_open')
          const { table, items, total } = checkNewOrder(body)
          send(res, 200, { order: insertOrder({
            id: body.id, tableId: table.id, tableName: table.label, customerName: body.customerName, orderType: body.orderType,
            items, total, notes: body.notes,
          }) })
          return
        }

        case 'POST /api/orders/lookup': {
          const { ids } = await readBody(req)
          const wanted = new Set(Array.isArray(ids) ? ids.slice(0, 50) : [])
          send(res, 200, { orders: sortOrders(orders.filter(o => wanted.has(o.id))) })
          return
        }

        case 'POST /api/orders/cancel': {
          const { id } = await readBody(req)
          const order = orders.find(o => o.id === id)
          // Money came in for it: only staff can call it off, and they refund it
          if (order?.paidOnlineAt) throw new OrderError('paid_online')
          if (!order || !['pending', 'confirmed'].includes(order.status)) throw new OrderError('not_cancellable')
          send(res, 200, { order: update(id, o => withStatus(o, 'cancelled')) })
          return
        }

        case 'POST /api/orders/status': {
          if (!isStaff(req)) { send(res, 401, { error: 'staff_only' }); return }
          const { id, status } = await readBody(req)
          if (!ORDER_STATUSES.includes(status)) throw new OrderError('invalid_status')
          const saved = update(id, o => applyStatus(o, status as OrderStatus) as StoredOrder)
          if (!saved) { send(res, 404, { error: 'order_not_found' }); return }
          send(res, 200, { order: saved })
          return
        }

        case 'POST /api/staff/login': {
          const ip = req.socket.remoteAddress ?? ''
          const fails = (failedLogins.get(ip) ?? []).filter(t => Date.now() - t < 10 * 60_000)
          if (fails.length >= 10) { send(res, 429, { error: 'too_many_attempts' }); return }
          const { pin } = await readBody(req)
          if (!staffPin) console.warn('[OrderSync] Staff sign-in is off: set QYOU_STAFF_PIN')
          if (!staffPin || typeof pin !== 'string' || !samePin(pin, staffPin)) {
            failedLogins.set(ip, [...fails, Date.now()])
            send(res, 401, { error: 'wrong_pin' })
            return
          }
          const token = randomBytes(32).toString('hex')
          sessions.add(token)
          send(res, 200, { ok: true }, {
            'Set-Cookie': `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${60 * 60 * 24 * 30}`,
          })
          return
        }

        case 'GET /api/staff/session': {
          if (!isStaff(req)) { send(res, 401, { error: 'staff_only' }); return }
          send(res, 200, { ok: true })
          return
        }

        case 'POST /api/staff/logout': {
          const token = cookieOf(req, COOKIE)
          if (token) sessions.delete(token)
          send(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0` })
          return
        }

        case 'GET /api/menu': {
          send(res, 200, { menu })
          return
        }

        case 'POST /api/menu/save': {
          if (!isStaff(req)) { send(res, 401, { error: 'staff_only' }); return }
          const body = await readBody(req)
          const name = typeof body.name === 'string' ? body.name.trim() : ''
          const category = typeof body.category === 'string' ? body.category.trim() : ''
          const price = body.price
          if (name.length < 1 || name.length > 60) throw new OrderError('invalid_name')
          if (category.length < 1 || category.length > 30) throw new OrderError('invalid_category')
          if (typeof price !== 'number' || !(price >= 0 && price <= 100000) || Math.round(price * 100) !== price * 100) {
            throw new OrderError('invalid_price')
          }
          const description = typeof body.description === 'string' ? body.description.trim().slice(0, 200) : ''
          const fields = { name, category, price, description }
          if (body.id === null || body.id === undefined) {
            const item: StoredItem = {
              id: menu.reduce((max, m) => Math.max(max, m.id), 0) + 1,
              ...fields, addon: !!body.addon, optionGroupIds: knownGroups(body.optionGroupIds), available: true, active: true,
            }
            menu = [...menu, item]
            menuChanged()
            send(res, 200, { item })
          } else {
            send(res, 200, { item: updateItem(body.id, m => ({
              ...m, ...fields,
              addon: typeof body.addon === 'boolean' ? body.addon : m.addon,
              optionGroupIds: Array.isArray(body.optionGroupIds) ? knownGroups(body.optionGroupIds) : m.optionGroupIds,
            })) })
          }
          return
        }

        case 'POST /api/menu/available': {
          if (!isStaff(req)) { send(res, 401, { error: 'staff_only' }); return }
          const { id, available } = await readBody(req)
          send(res, 200, { item: updateItem(id, m => ({ ...m, available: available !== false })) })
          return
        }

        case 'POST /api/menu/remove': {
          if (!isStaff(req)) { send(res, 401, { error: 'staff_only' }); return }
          const { id } = await readBody(req)
          send(res, 200, { item: updateItem(id, m => ({ ...m, active: false })) })
          return
        }

        case 'GET /api/options': {
          send(res, 200, { options })
          return
        }

        case 'POST /api/options/save': {
          if (!isStaff(req)) { send(res, 401, { error: 'staff_only' }); return }
          const saved = applyOptionGroupSave(options, await readBody(req))
          options = saved.groups
          optionsChanged()
          send(res, 200, { group: saved.group })
          return
        }

        case 'POST /api/options/remove': {
          if (!isStaff(req)) { send(res, 401, { error: 'staff_only' }); return }
          const { id } = await readBody(req)
          const group = options.find(g => g.id === id && g.active)
          if (!group) throw new OrderError('unknown_option_group')
          const removed = { ...group, active: false }
          options = options.map(g => (g === group ? removed : g))
          optionsChanged()
          send(res, 200, { group: removed })
          return
        }

        case 'GET /api/tables': {
          send(res, 200, { tables })
          return
        }

        case 'POST /api/tables/count': {
          if (!isStaff(req)) { send(res, 401, { error: 'staff_only' }); return }
          const { count } = await readBody(req)
          const busy = new Set(orders.filter(isOpenOrder).map(o => o.tableId))
          tables = applyTableCount(tables, count, busy)
          tablesChanged()
          send(res, 200, { tables })
          return
        }

        case 'POST /api/dev/seed': {
          if (!allowSeed) break
          const { orders: seed = [], resetMenu, resetTables } = await readBody(req) as { orders?: Order[]; resetMenu?: boolean; resetTables?: boolean }
          const ids = new Set(seed.map(o => o.id))
          orders = [...seed.map(o => ({ ...o, boardId: o.boardId ?? randomUUID() })), ...orders.filter(o => !ids.has(o.id))]
          changed()
          if (resetMenu) { menu = seedMenu(); menuChanged(); options = seedOptions(); optionsChanged() }
          if (resetTables) { tables = seedTables(); tablesChanged() }
          send(res, 200, { ok: true })
          return
        }
      }
    } catch (err) {
      const code = err instanceof OrderError ? err.code : err instanceof Error ? err.message : 'bad_request'
      const status = code === 'not_cancellable' || code === 'paid_online' || code === 'checkout_open' || code.startsWith('table_in_use') ? 409
        : code === 'unknown_item' && route.startsWith('POST /api/menu') ? 404 : 400
      send(res, status, { error: code })
      return
    }

    send(res, 404, { error: 'not_found' })
  }
}

export default function orderSyncPlugin(): Plugin {
  return {
    name: 'qyou-order-sync',
    configureServer(server: ViteDevServer) {
      // Add middleware BEFORE Vite's own middleware
      // Paying online: PayMongo test keys from the shell's environment, or else the stand-in at
      // /fake-paymongo. Off when the app runs against Supabase: its orders would land here, not
      // there (paying online with Supabase runs on Vercel, in api/payments).
      const env = server.config.env
      const clientUsesSupabase = env.VITE_ORDER_BACKEND
        ? env.VITE_ORDER_BACKEND === 'supabase'
        : !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
      const real = settingsFromEnv(process.env)
      server.middlewares.use(createOrderSyncMiddleware({
        staffPin: process.env.QYOU_STAFF_PIN || '123456',
        allowSeed: true,
        payments: clientUsesSupabase ? null : real ?? 'fake',
      }))

      console.log('  ⚡ Order sync API ready (SSE + REST). Staff PIN: QYOU_STAFF_PIN or 123456')
      console.log(`  ⚡ Paying online: ${clientUsesSupabase ? 'off (Supabase backend: runs on Vercel)'
        : real ? 'PayMongo (PAYMONGO_SECRET_KEY)' : 'test checkout at /fake-paymongo, no money moves'}`)
    },
  }
}

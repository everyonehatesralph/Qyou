/**
 * The Node order server: same rules as the Supabase backend (supabase/migrations), for
 * local dev, the e2e suite and self-hosting with server/index.ts. Orders live in
 * server/orders.json.
 *
 * - GET  /api/orders/stream?feed=orders|board  SSE snapshots: every order (staff) or the public board
 * - POST /api/orders/place    { id, tableId, tableName, customerName, orderType, items: [{ id, quantity }], notes }
 *                             priced here from the menu; whatever the browser thinks things cost is ignored
 * - POST /api/orders/lookup   { ids }        a guest's own orders, by id
 * - POST /api/orders/cancel   { id }         guests, until the kitchen starts
 * - POST /api/orders/status   { id, status } staff only
 * - GET  /api/orders                         staff only
 * - POST /api/staff/login     { pin }        sets the staff cookie
 * - GET  /api/staff/session, POST /api/staff/logout
 * - POST /api/dev/seed        { orders }     dev server only: writes orders as given (e2e fixtures)
 */

import type { Plugin, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import { randomBytes, randomUUID, timingSafeEqual } from 'crypto'
import fs from 'fs'
import path from 'path'
import { MENU_ITEMS } from '../src/constants/menu.ts'
import {
  ORDER_STATUSES, OrderError, isOrderId, makeTakeawayCode, priceOrder, sortOrders, toBoardRow, withStatus,
  type Order, type OrderStatus,
} from '../src/services/orderModel.ts'

type StoredOrder = Order & { boardId: string }

const DATA_FILE = path.resolve(process.cwd(), 'server/orders.json')
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

function saveOrders(orders: StoredOrder[]) {
  try {
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2))
  } catch (e) {
    console.error('[OrderSync] Save failed:', e)
  }
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
      if (body.length > MAX_BODY) { reject(new Error('too_large')); req.destroy() }
    })
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) } catch { reject(new Error('invalid_json')) }
    })
    req.on('error', reject)
  })
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
}

/**
 * Order API as plain Node middleware, so dev (Vite) and production (Express)
 * serve exactly the same endpoints.
 */
export function createOrderSyncMiddleware({ staffPin, allowSeed = false }: OrderServerOptions = {}) {
  let orders: StoredOrder[] = loadOrders()
  const sessions = new Set<string>()
  const failedLogins = new Map<string, number[]>()
  const streams = new Map<ServerResponse, 'orders' | 'board'>()

  const isStaff = (req: IncomingMessage) => {
    const token = cookieOf(req, COOKIE)
    return !!token && sessions.has(token)
  }

  // Guests see what still holds a table or waits at the counter, from the last day
  const board = () => {
    const since = Date.now() - 86_400_000
    return orders.filter(o => new Date(o.createdAt).getTime() > since).map(toBoardRow)
  }

  const frame = (feed: 'orders' | 'board') =>
    `data: ${JSON.stringify(feed === 'orders' ? { orders: sortOrders(orders) } : { board: board() })}\n\n`

  function changed() {
    saveOrders(orders)
    const frames = { orders: frame('orders'), board: frame('board') }
    streams.forEach((feed, res) => {
      try { res.write(frames[feed]) } catch { streams.delete(res) }
    })
  }

  // Comment frames keep idle streams from being closed by proxies
  setInterval(() => streams.forEach((_, res) => { try { res.write(': ping\n\n') } catch { streams.delete(res) } }), 25_000).unref()

  function update(id: string, change: (o: StoredOrder) => StoredOrder): StoredOrder | undefined {
    let saved: StoredOrder | undefined
    orders = orders.map(o => (o.id === id ? (saved = change(o)) : o))
    if (saved) changed()
    return saved
  }

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url || '/', 'http://localhost')
    const route = `${req.method} ${url.pathname}`
    if (!url.pathname.startsWith('/api/orders') && !url.pathname.startsWith('/api/staff') && !url.pathname.startsWith('/api/dev')) {
      next()
      return
    }

    try {
      switch (route) {
        case 'GET /api/orders/stream': {
          const feed = url.searchParams.get('feed') === 'orders' && isStaff(req) ? 'orders' : 'board'
          if (url.searchParams.get('feed') === 'orders' && feed !== 'orders') {
            send(res, 401, { error: 'staff_only' })
            return
          }
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
          res.write(frame(feed))
          streams.set(res, feed)
          req.on('close', () => streams.delete(res))
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
          if (body.orderType !== 'dineIn' && body.orderType !== 'takeaway') throw new OrderError('invalid_order_type')
          if (!Number.isInteger(body.tableId) || body.tableId < 0) throw new OrderError('invalid_table')

          const { items, total } = priceOrder(MENU_ITEMS, body.items)
          const recent = orders.filter(o => Date.now() - new Date(o.createdAt).getTime() < 10 * 60_000)
          if (recent.filter(o => o.tableId === body.tableId).length >= 30 || recent.length >= 300) {
            throw new OrderError('too_many_orders')
          }
          const activeCodes = new Set(orders.filter(o => !['served', 'paid', 'cancelled'].includes(o.status)).map(o => o.takeawayCode))
          const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
          const order: StoredOrder = {
            id: body.id,
            number: orders.reduce((max, o) => Math.max(max, o.number ?? 0), 0) + 1,
            boardId: randomUUID(),
            tableId: body.tableId,
            tableName: text(body.tableName, 40) || `Table ${body.tableId}`,
            customerName: text(body.customerName, 60),
            items,
            total,
            status: 'pending',
            orderType: body.orderType,
            takeawayCode: body.orderType === 'takeaway' ? makeTakeawayCode(activeCodes) : '',
            createdAt: new Date().toISOString(),
            ...(text(body.notes, 500) ? { notes: text(body.notes, 500) } : {}),
          }
          orders = [order, ...orders]
          changed()
          send(res, 200, { order })
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
          if (!order || !['pending', 'confirmed'].includes(order.status)) throw new OrderError('not_cancellable')
          send(res, 200, { order: update(id, o => withStatus(o, 'cancelled')) })
          return
        }

        case 'POST /api/orders/status': {
          if (!isStaff(req)) { send(res, 401, { error: 'staff_only' }); return }
          const { id, status } = await readBody(req)
          if (!ORDER_STATUSES.includes(status)) throw new OrderError('invalid_status')
          const saved = update(id, o => withStatus(o, status as OrderStatus))
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

        case 'POST /api/dev/seed': {
          if (!allowSeed) break
          const { orders: seed } = await readBody(req) as { orders: Order[] }
          const ids = new Set(seed.map(o => o.id))
          orders = [...seed.map(o => ({ ...o, boardId: o.boardId ?? randomUUID() })), ...orders.filter(o => !ids.has(o.id))]
          changed()
          send(res, 200, { ok: true })
          return
        }
      }
    } catch (err) {
      const code = err instanceof OrderError ? err.code : err instanceof Error ? err.message : 'bad_request'
      send(res, err instanceof OrderError && code === 'not_cancellable' ? 409 : 400, { error: code })
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
      server.middlewares.use(createOrderSyncMiddleware({
        staffPin: process.env.QYOU_STAFF_PIN || '123456',
        allowSeed: true,
      }))

      console.log('  ⚡ Order sync API ready (SSE + REST). Staff PIN: QYOU_STAFF_PIN or 123456')
    },
  }
}

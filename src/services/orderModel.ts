// Order shapes and the rules both order backends share: how an order is priced,
// what the public order board shows and what a guest's phone gets to see.
// No imports, so the Node order server can load this file as-is.

export interface OrderItem {
  id: number
  name: string
  price: number
  quantity: number
  /** Menu category when the order was placed ("Add-ons" for extras). Older orders may lack it. */
  category?: string
  addon?: boolean
}
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled'
export type OrderType = 'dineIn' | 'takeaway'
export interface Order {
  /** Random UUID made by the guest's phone; it is also the guest's key to the order. */
  id: string
  /** Today's queue number from the server (Nº 042), what staff call out. Starts again at 1
   *  every day, so it only identifies an order together with orderDay; `id` is the real key. */
  number?: number
  /** The restaurant's calendar day the number belongs to, YYYY-MM-DD. */
  orderDay?: string
  /** Public id of this order on the order board (see BoardRow). */
  boardId?: string
  tableId: number
  tableName: string
  customerName: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  orderType: OrderType
  takeawayCode: string
  createdAt: string
  notes?: string
  confirmedAt?: string
  preparingAt?: string
  readyAt?: string
  servedAt?: string
  paidAt?: string
  cancelledAt?: string
}

/** What anyone may see about an order: enough for table check-in and the pickup screen. */
export interface BoardRow {
  boardId: string
  tableId: number
  tableName: string
  orderType: OrderType
  takeawayCode: string
  /** Take-away orders only; empty for dine-in. */
  customerName: string
  status: OrderStatus
  createdAt: string
  confirmedAt?: string
  preparingAt?: string
  readyAt?: string
  servedAt?: string
  paidAt?: string
  cancelledAt?: string
}

/** What a phone sends to place an order. Prices are never sent: the server looks them up. */
export interface PlaceOrderInput {
  id: string
  tableId: number
  tableName: string
  customerName: string
  orderType: OrderType
  items: { id: number; quantity: number }[]
  notes?: string
}

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled']

/** The timestamp each status stamps when an order moves into it. */
export const STAGE_TIMESTAMP: Partial<Record<OrderStatus, keyof Order & keyof BoardRow>> = {
  confirmed: 'confirmedAt',
  preparing: 'preparingAt',
  ready:     'readyAt',
  served:    'servedAt',
  paid:      'paidAt',
  cancelled: 'cancelledAt',
}
const STAGE_KEYS = ['confirmedAt', 'preparingAt', 'readyAt', 'servedAt', 'paidAt', 'cancelledAt'] as const

/** Orders that still hold a table or wait at the pickup counter. */
const ON_BOARD: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'served']

export function withStatus<T extends Order | BoardRow>(o: T, status: OrderStatus, at = new Date().toISOString()): T {
  const key = STAGE_TIMESTAMP[status]
  return { ...o, status, ...(key ? { [key]: at } : {}) } as T
}

export function toBoardRow(o: Order & { boardId: string }): BoardRow {
  const row: BoardRow = {
    boardId: o.boardId,
    tableId: o.tableId,
    tableName: o.tableName,
    orderType: o.orderType,
    takeawayCode: o.takeawayCode,
    customerName: o.orderType === 'takeaway' ? o.customerName : '',
    status: o.status,
    createdAt: o.createdAt,
  }
  for (const k of STAGE_KEYS) if (o[k]) row[k] = o[k]
  return row
}

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

/**
 * A guest's phone: its own orders in full, with status kept current from the board,
 * plus other people's active orders as board-only entries (no items, no total).
 */
export function guestView(own: Order[], board: BoardRow[]): Order[] {
  const rows = new Map(board.map(r => [r.boardId, r]))
  const ownBoardIds = new Set<string>()
  const mine = own.map(o => {
    if (!o.boardId) return o
    ownBoardIds.add(o.boardId)
    const row = rows.get(o.boardId)
    if (!row) return o
    const live: Order = { ...o, status: row.status }
    for (const k of STAGE_KEYS) if (row[k]) live[k] = row[k]
    return live
  })
  const others: Order[] = board
    .filter(r => !ownBoardIds.has(r.boardId) && ON_BOARD.includes(r.status))
    .map(r => ({ ...r, id: `board:${r.boardId}`, items: [], total: 0 }))
  return [...mine, ...others].sort(newestFirst)
}

export function sortOrders(orders: Iterable<Order>): Order[] {
  return [...orders].sort(newestFirst)
}

// ─── Tables ──────────────────────────────────────────────────────────────────
/** A table guests can check in at. Removed tables stay (inactive) so old orders keep theirs. */
export interface DiningTable {
  id: number
  label: string
  active: boolean
}

export const MAX_TABLES = 200

/**
 * Staff set how many tables there are: tables 1..count are on, the rest off. Refuses to switch
 * off a table that still has open orders (the order server; Supabase does the same in SQL).
 */
export function applyTableCount(tables: DiningTable[], count: unknown, busyTableIds: Set<number>): DiningTable[] {
  if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > MAX_TABLES) {
    throw new OrderError('invalid_table_count')
  }
  const n = count as number
  const busy = tables.filter(t => t.active && t.id > n && busyTableIds.has(t.id)).map(t => t.id)
  if (busy.length > 0) throw new OrderError(`table_in_use:${Math.min(...busy)}`)
  const byId = new Map(tables.map(t => [t.id, t]))
  for (let id = 1; id <= n; id++) byId.set(id, { id, label: byId.get(id)?.label ?? `Table ${id}`, active: true })
  for (const t of byId.values()) if (t.id > n) byId.set(t.id, { ...t, active: false })
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

/** An order still holds its table until it is paid or cancelled. */
export function isOpenOrder(o: Pick<Order, 'status'>): boolean {
  return o.status !== 'paid' && o.status !== 'cancelled'
}

export function openOrdersByTable(orders: Order[]): Map<number, Order[]> {
  const map = new Map<number, Order[]>()
  for (const o of orders) {
    if (!isOpenOrder(o)) continue
    map.set(o.tableId, [...(map.get(o.tableId) ?? []), o])
  }
  return map
}

/**
 * Freeing a table: what the guests got (ready or served) is paid, what the kitchen
 * hasn't finished is cancelled, so it never counts as a sale.
 */
export function settleTable(open: Order[]): { pay: Order[]; cancel: Order[]; payTotal: number } {
  const pay = open.filter(o => o.status === 'ready' || o.status === 'served')
  const cancel = open.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing')
  return { pay, cancel, payTotal: pay.reduce((s, o) => s + o.total, 0) }
}

// ─── Pricing (the Node order server; Supabase does the same in SQL) ──────────
export interface MenuPrice {
  id: number
  name: string
  price: number
  available: boolean
  category?: string
  addon?: boolean
  /** False once staff remove the item; it stays only so old orders keep their ids. */
  active?: boolean
}

export class OrderError extends Error {
  code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}

const MAX_LINES = 30
const MAX_PER_ITEM = 50

export function priceOrder(menu: MenuPrice[], lines: unknown): { items: OrderItem[]; total: number } {
  if (!Array.isArray(lines) || lines.length === 0) throw new OrderError('empty_order')
  if (lines.length > MAX_LINES) throw new OrderError('too_many_items')
  const wanted = new Map<number, number>()
  for (const line of lines as { id?: unknown; quantity?: unknown }[]) {
    const { id, quantity } = line ?? {}
    if (!Number.isInteger(id) || (id as number) < 1 || !Number.isInteger(quantity) || (quantity as number) < 1) {
      throw new OrderError('invalid_items')
    }
    wanted.set(id as number, (wanted.get(id as number) ?? 0) + (quantity as number))
  }
  const items: OrderItem[] = []
  for (const [id, quantity] of wanted) {
    const item = menu.find(m => m.id === id && m.active !== false)
    if (!item) throw new OrderError('unknown_item')
    if (!item.available) throw new OrderError('item_unavailable')
    if (quantity > MAX_PER_ITEM) throw new OrderError('too_many_items')
    items.push({
      id, name: item.name, price: item.price, quantity,
      ...(item.category ? { category: item.category } : {}),
      ...(item.addon ? { addon: true } : {}),
    })
  }
  return { items, total: items.reduce((s, i) => s + i.price * i.quantity, 0) }
}

/** Pickup code like "T-4KQ9"; no 0/O or 1/I so it reads cleanly off a screen. */
export function makeTakeawayCode(taken: Set<string> = new Set()): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let tries = 0; ; tries++) {
    let code = 'T-'
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
    if (!taken.has(code) || tries >= 20) return code
  }
}

// ─── Ids ─────────────────────────────────────────────────────────────────────
/** What people see and say: the queue number as "042". Orders from before numbers existed show their old id. */
export function orderRef(o: Pick<Order, 'id' | 'number'>): string {
  if (o.number) return String(o.number).padStart(3, '0')
  return o.id.length <= 8 ? o.id : o.id.slice(0, 6).toUpperCase()
}

/** The calendar day at `at` in `timeZone`, as YYYY-MM-DD (what queue numbers count within). */
export function restaurantDay(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isOrderId(id: unknown): id is string {
  return typeof id === 'string' && UUID.test(id)
}

/** Random v4 UUID. Falls back to getRandomValues on plain-http LAN addresses, where randomUUID is missing. */
export function newOrderId(): string {
  const c = globalThis.crypto
  if (typeof c.randomUUID === 'function') return c.randomUUID()
  const b = c.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// ─── Error text ──────────────────────────────────────────────────────────────
const ERROR_TEXT: Record<string, string> = {
  empty_order:      'Your cart is empty.',
  unknown_item:     'Something in your cart is no longer on the menu. Remove it and try again.',
  item_unavailable: 'Something in your cart just sold out. Remove it and try again.',
  invalid_items:    'Something in your cart looks wrong. Remove it and add it again.',
  too_many_items:   'That order is too big for one ticket. Split it into smaller orders.',
  too_many_orders:  'Lots of orders from this table just now. Ask the staff for help.',
  invalid_table:    'Scan the QR code on your table to order.',
  invalid_name:     'Give the item a name of up to 60 characters.',
  invalid_category: 'Pick a category for the item.',
  invalid_price:    'Enter a price from 0 to 100,000, with at most two decimals.',
  invalid_table_count: 'Pick between 1 and 200 tables.',
  not_cancellable:  'The kitchen has started on this order, so it can no longer be cancelled.',
  staff_only:       'Sign in as staff to change orders.',
}

/** Words for a guest or staff member, from an error code (or any thrown value). */
export function orderErrorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const busy = /table_in_use:(\d+)/.exec(message)
  if (busy) return `Table ${busy[1]} still has open orders. Free it before removing it.`
  const code = Object.keys(ERROR_TEXT).find(k => message.includes(k))
  return code ? ERROR_TEXT[code] : 'Could not reach the restaurant. Check your connection and try again.'
}

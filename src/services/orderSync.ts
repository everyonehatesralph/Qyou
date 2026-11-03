/**
 * Shared orders: one client, two backends.
 *
 *   Supabase (production): Postgres prices and stores orders, Realtime pushes changes.
 *   Order server (local dev, e2e, self-hosting): server/orderSyncPlugin.ts over REST + SSE.
 *
 * Supabase is used when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set;
 * VITE_ORDER_BACKEND=server|supabase overrides that.
 *
 * Staff devices follow every order. Guest devices follow the public order board and
 * load their own orders by id, so a guest never receives another guest's items or name.
 */
import type { MenuItem } from '../constants/menu'
import { SUPABASE_CONFIGURED } from './supabaseClient'
import { supabaseTransport } from './supabaseTransport'
import { serverTransport } from './serverTransport'
import {
  guestView, isOrderId, sortOrders, withStatus,
  type BoardRow, type DiningTable, type Order, type OrderStatus, type PlaceOrderInput,
} from './orderModel'

export type StaffSignIn = 'ok' | 'wrong_pin' | 'not_staff' | 'too_many_attempts' | 'offline'

export interface FeedHandlers<T> {
  /** The whole feed, sent on every (re)connect; the server transport sends one per change. */
  snapshot(rows: T[]): void
  /** One changed row. */
  change(row: T): void
  down(): void
}

export type Feed = 'orders' | 'board'
export type FeedRow<F extends Feed> = F extends 'orders' ? Order : BoardRow

/** A menu row as the backend keeps it; removed items stay (inactive) so old orders resolve. */
export type LiveMenuItem = MenuItem & { addon: boolean; active: boolean }
export interface MenuItemInput {
  /** Leave out to add a new item. */
  id?: number
  name: string
  price: number
  category: string
  description: string
  addon?: boolean
}

export interface Transport {
  /** Staff follow 'orders' (needs a staff session), guests follow 'board'. */
  subscribe<F extends Feed>(feed: F, on: FeedHandlers<FeedRow<F>>): () => void
  getOrders(ids: string[]): Promise<Order[]>
  placeOrder(input: PlaceOrderInput): Promise<Order>
  setStatus(id: string, status: OrderStatus): Promise<Order>
  cancelOrder(id: string): Promise<Order>
  /** The tables guests can check in at: everyone follows them, staff set how many. */
  tables: {
    subscribe(on: FeedHandlers<DiningTable>): () => void
    /** Tables 1..count open, the rest switched off. Refused while a removed table has open orders. */
    setCount(count: number): Promise<DiningTable[]>
  }
  /** The live menu: everyone follows it, staff change it. */
  menu: {
    subscribe(on: FeedHandlers<LiveMenuItem>): () => void
    save(item: MenuItemInput): Promise<LiveMenuItem>
    setAvailable(id: number, available: boolean): Promise<LiveMenuItem>
    remove(id: number): Promise<LiveMenuItem>
  }
  staff: {
    /** Quick local check, so pages that never see staff never load the auth SDK. */
    mightHaveSession(): boolean
    restore(): Promise<boolean>
    signIn(pin: string): Promise<StaffSignIn>
    signOut(): Promise<void>
  }
}

// ─── This phone's own orders ─────────────────────────────────────────────────
const LS_MY_ORDERS = 'qyou_my_orders'

export function getMyOrderIds(): string[] {
  try {
    const raw = localStorage.getItem(LS_MY_ORDERS)
    if (raw) return JSON.parse(raw)
  } catch { /* noop */ }
  return []
}

function rememberMyOrder(orderId: string) {
  try {
    const ids = getMyOrderIds()
    if (!ids.includes(orderId)) {
      ids.unshift(orderId)
      localStorage.setItem(LS_MY_ORDERS, JSON.stringify(ids.slice(0, 20)))
    }
  } catch { /* noop */ }
}

// ─── Client ──────────────────────────────────────────────────────────────────
type Listener = (orders: Order[], connected: boolean) => void
export type SyncRole = 'staff' | 'guest'

const backend = import.meta.env.VITE_ORDER_BACKEND as string | undefined
const useSupabase = backend ? backend === 'supabase' : SUPABASE_CONFIGURED

class OrderSyncClient {
  readonly mode: 'supabase' | 'server' = useSupabase ? 'supabase' : 'server'
  private transport: Transport = useSupabase ? supabaseTransport : serverTransport
  private role: SyncRole = 'guest'
  /** Staff: every order. Guest: this phone's orders. */
  private orders = new Map<string, Order>()
  /** Guest only: the public order board. */
  private board = new Map<string, BoardRow>()
  private connected = false
  private listeners = new Set<Listener>()
  private stop: (() => void) | null = null
  private started = false
  /** Bumped on every resubscribe so late answers for an old feed are dropped. */
  private generation = 0
  private ownRetry: ReturnType<typeof setTimeout> | null = null

  /** Starts following orders. Called by the first page that reads them. */
  start() {
    if (this.started) return
    this.started = true
    this.resubscribe()
    // Phones drop sockets while asleep; start clean when the page has been away a while
    let hiddenAt = 0
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (Date.now() - hiddenAt > 30_000) this.resubscribe()
    })
    window.addEventListener('online', () => this.resubscribe())
  }

  setRole(role: SyncRole) {
    if (role === this.role) return
    this.role = role
    this.orders.clear()
    this.board.clear()
    this.connected = false
    if (this.started) this.resubscribe()
    this.emit()
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.visible(), this.connected)
    return () => { this.listeners.delete(listener) }
  }

  get isConnected() { return this.connected }

  private visible(): Order[] {
    return this.role === 'staff'
      ? sortOrders(this.orders.values())
      : guestView([...this.orders.values()], [...this.board.values()])
  }

  private emit() {
    const orders = this.visible()
    this.listeners.forEach(l => l(orders, this.connected))
  }

  private setConnected(connected: boolean) {
    if (connected === this.connected) return
    this.connected = connected
    this.emit()
  }

  private resubscribe() {
    this.stop?.()
    if (this.ownRetry) clearTimeout(this.ownRetry)
    const gen = ++this.generation
    const live = () => gen === this.generation

    if (this.role === 'staff') {
      this.stop = this.transport.subscribe('orders', {
        snapshot: rows => {
          if (!live()) return
          this.orders = new Map(rows.map(o => [o.id, o]))
          this.connected = true
          this.emit()
        },
        change: row => { if (live()) { this.orders.set(row.id, row); this.emit() } },
        down: () => { if (live()) this.setConnected(false) },
      })
      return
    }

    // Guests: the board is live; their own orders are reloaded whenever the feed reconnects
    let ownLoaded = false
    const loadOwn = () => {
      const ids = getMyOrderIds().filter(isOrderId)
      const done = (rows: Order[]) => {
        if (!live()) return
        this.orders = new Map(rows.map(o => [o.id, o]))
        ownLoaded = true
        this.connected = true
        this.emit()
      }
      if (ids.length === 0) { done([]); return }
      this.transport.getOrders(ids).then(done, err => {
        if (!live()) return
        console.warn('[orders] could not load this phone\'s orders', err)
        this.ownRetry = setTimeout(loadOwn, 3000)
      })
    }
    this.stop = this.transport.subscribe('board', {
      snapshot: rows => {
        if (!live()) return
        this.board = new Map(rows.map(r => [r.boardId, r]))
        if (ownLoaded) this.emit()
        else loadOwn()
      },
      change: row => { if (live()) { this.board.set(row.boardId, row); this.emit() } },
      down: () => {
        if (!live()) return
        ownLoaded = false
        this.setConnected(false)
      },
    })
  }

  // ── Writes ──

  async placeOrder(input: PlaceOrderInput): Promise<Order> {
    const order = await this.transport.placeOrder(input)
    rememberMyOrder(order.id)
    this.orders.set(order.id, order)
    this.emit()
    return order
  }

  /** Staff only; the server refuses anyone else. Shows the change at once and undoes it if refused. */
  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    const before = this.orders.get(id)
    if (before) { this.orders.set(id, withStatus(before, status)); this.emit() }
    try {
      const saved = await this.transport.setStatus(id, status)
      this.orders.set(id, saved)
      this.emit()
    } catch (err) {
      if (before) { this.orders.set(id, before); this.emit() }
      throw err
    }
  }

  async cancelOrder(id: string): Promise<void> {
    if (this.role === 'staff') return this.updateStatus(id, 'cancelled')
    const before = this.orders.get(id)
    const boardBefore = before?.boardId ? this.board.get(before.boardId) : undefined
    if (before) this.orders.set(id, withStatus(before, 'cancelled'))
    if (boardBefore) this.board.set(boardBefore.boardId, withStatus(boardBefore, 'cancelled'))
    this.emit()
    try {
      const saved = await this.transport.cancelOrder(id)
      this.orders.set(id, saved)
      this.emit()
    } catch (err) {
      if (before) this.orders.set(id, before)
      if (boardBefore) this.board.set(boardBefore.boardId, boardBefore)
      this.emit()
      throw err
    }
  }

  // ── Menu and staff sign-in ──

  get menu() { return this.transport.menu }
  get tables() { return this.transport.tables }
  get staff() { return this.transport.staff }
}

export const orderSync = new OrderSyncClient()

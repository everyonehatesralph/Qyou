// Orders over Supabase: functions in supabase/migrations do every write and price the
// order; Realtime pushes row changes (staff: public.orders, guests: public.order_board).
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase, STAFF_SESSION_KEY } from './supabaseClient'
import { RESTAURANT } from '../config/restaurant'
import type { Feed, FeedHandlers, FeedRow, StaffSignIn, Transport } from './orderSync'
import type { BoardRow, Order, OrderItem, OrderStatus, OrderType } from './orderModel'

interface StageColumns {
  confirmed_at: string | null
  preparing_at: string | null
  ready_at: string | null
  served_at: string | null
  paid_at: string | null
  cancelled_at: string | null
}
interface BoardDbRow extends StageColumns {
  board_id: string
  table_id: number
  table_name: string
  order_type: OrderType
  takeaway_code: string
  customer_name: string
  status: OrderStatus
  created_at: string
}
interface OrderDbRow extends BoardDbRow {
  id: string
  number: number | string
  items: OrderItem[]
  total: number | string
  notes: string | null
}

function stages(r: StageColumns) {
  const out: Partial<Record<'confirmedAt' | 'preparingAt' | 'readyAt' | 'servedAt' | 'paidAt' | 'cancelledAt', string>> = {}
  if (r.confirmed_at) out.confirmedAt = r.confirmed_at
  if (r.preparing_at) out.preparingAt = r.preparing_at
  if (r.ready_at)     out.readyAt     = r.ready_at
  if (r.served_at)    out.servedAt    = r.served_at
  if (r.paid_at)      out.paidAt      = r.paid_at
  if (r.cancelled_at) out.cancelledAt = r.cancelled_at
  return out
}

function boardFromRow(r: BoardDbRow): BoardRow {
  return {
    boardId: r.board_id,
    tableId: r.table_id,
    tableName: r.table_name,
    orderType: r.order_type,
    takeawayCode: r.takeaway_code,
    customerName: r.customer_name,
    status: r.status,
    createdAt: r.created_at,
    ...stages(r),
  }
}

function orderFromRow(r: OrderDbRow): Order {
  return {
    id: r.id,
    number: Number(r.number),
    boardId: r.board_id,
    tableId: r.table_id,
    tableName: r.table_name,
    customerName: r.customer_name,
    items: (r.items ?? []).map(i => ({ id: i.id, name: i.name, price: Number(i.price), quantity: i.quantity })),
    total: Number(r.total),
    status: r.status,
    orderType: r.order_type,
    takeawayCode: r.takeaway_code,
    createdAt: r.created_at,
    ...(r.notes ? { notes: r.notes } : {}),
    ...stages(r),
  }
}

let channelCount = 0

function subscribe<F extends Feed>(feed: F, on: FeedHandlers<FeedRow<F>>): () => void {
  const table = feed === 'orders' ? 'orders' : 'order_board'
  const fromRow = (feed === 'orders' ? orderFromRow : boardFromRow) as (r: never) => FeedRow<F>
  let stopped = false
  let channel: RealtimeChannel | null = null
  let retry: ReturnType<typeof setTimeout> | null = null
  /** Changes that arrive while the snapshot loads; applied on top of it. */
  let buffer: FeedRow<F>[] | null = null

  getSupabase().then(sb => {
    if (stopped) return

    const load = async () => {
      buffer = []
      let query = sb.from(table).select('*').order('created_at', { ascending: false })
      // Guests only need what still holds a table or waits at the counter
      query = feed === 'orders'
        ? query.limit(1000)
        : query.gte('created_at', new Date(Date.now() - 86_400_000).toISOString()).limit(300)
      const { data, error } = await query
      if (stopped) return
      const pending = buffer
      buffer = null
      if (error) {
        console.warn(`[orders] could not load ${table}`, error.message)
        on.down()
        retry = setTimeout(load, 3000)
        return
      }
      on.snapshot((data as never[]).map(fromRow))
      pending.forEach(row => on.change(row))
    }

    channel = sb
      .channel(`qyou-${table}-${++channelCount}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
        if (payload.eventType === 'DELETE') return
        const row = fromRow(payload.new as never)
        if (buffer) buffer.push(row)
        else on.change(row)
      })
      .subscribe(status => {
        if (stopped) return
        // Fires again after every reconnect, so a dropped connection never leaves gaps
        if (status === 'SUBSCRIBED') void load()
        else on.down()
      })
  }, err => {
    console.warn('[orders]', err instanceof Error ? err.message : err)
    on.down()
  })

  return () => {
    stopped = true
    if (retry) clearTimeout(retry)
    if (channel) void getSupabase().then(sb => sb.removeChannel(channel!))
  }
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const sb = await getSupabase()
  const { data, error } = await sb.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const supabaseTransport: Transport = {
  subscribe,

  async getOrders(ids) {
    return (await rpc<OrderDbRow[]>('get_orders', { p_ids: ids })).map(orderFromRow)
  },

  async placeOrder(input) {
    return orderFromRow(await rpc<OrderDbRow>('place_order', {
      p_id: input.id,
      p_table_id: input.tableId,
      p_table_name: input.tableName,
      p_customer_name: input.customerName,
      p_order_type: input.orderType,
      p_items: input.items,
      p_notes: input.notes ?? null,
    }))
  },

  async setStatus(id, status) {
    return orderFromRow(await rpc<OrderDbRow>('set_order_status', { p_id: id, p_status: status }))
  },

  async cancelOrder(id) {
    return orderFromRow(await rpc<OrderDbRow>('cancel_order', { p_id: id }))
  },

  staff: {
    mightHaveSession() {
      try { return localStorage.getItem(STAFF_SESSION_KEY) !== null } catch { return false }
    },

    async restore() {
      const sb = await getSupabase()
      const { data } = await sb.auth.getSession()
      if (!data.session) return false
      const { data: isStaff, error } = await sb.rpc('is_staff')
      // Offline: keep the screen up; the server still checks every change
      if (error) return true
      return isStaff === true
    },

    async signIn(pin): Promise<StaffSignIn> {
      let sb
      try { sb = await getSupabase() } catch { return 'offline' }
      const { error } = await sb.auth.signInWithPassword({ email: RESTAURANT.staffEmail, password: pin })
      if (error) {
        if (error.status === 429) return 'too_many_attempts'
        if (error.status && error.status >= 400 && error.status < 500) return 'wrong_pin'
        return 'offline'
      }
      const { data: isStaff, error: checkError } = await sb.rpc('is_staff')
      if (checkError) return 'offline'
      if (isStaff !== true) {
        await sb.auth.signOut()
        return 'not_staff'
      }
      return 'ok'
    },

    async signOut() {
      const sb = await getSupabase()
      await sb.auth.signOut()
    },
  },
}

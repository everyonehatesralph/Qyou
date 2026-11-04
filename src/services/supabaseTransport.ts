// Orders over Supabase: functions in supabase/migrations do every write and price the
// order; Realtime pushes row changes (staff: public.orders, guests: public.order_board,
// everyone: public.menu_items).
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { getSupabase, STAFF_SESSION_KEY } from './supabaseClient'
import { RESTAURANT } from '../config/restaurant'
import type { Feed, FeedHandlers, FeedRow, LiveMenuItem, LiveOptionGroup, StaffSignIn, Transport } from './orderSync'
import type { BoardRow, DiningTable, Order, OrderItem, OrderStatus, OrderType } from './orderModel'

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
  order_day: string
  items: OrderItem[]
  total: number | string
  notes: string | null
  paid_online_at: string | null
  payment_method: string | null
  payment_ref: string | null
}
interface MenuDbRow {
  id: number
  name: string
  price: number | string
  category: string
  description: string
  addon: boolean
  available: boolean
  active: boolean
  option_group_ids: number[] | null
}
interface OptionGroupDbRow {
  id: number
  name: string
  required: boolean
  multiple: boolean
  choices: { id: number; name: string; price: number | string }[]
  active: boolean
}

const groupFromRow = (r: OptionGroupDbRow): LiveOptionGroup => ({
  id: r.id,
  name: r.name,
  required: r.required,
  multiple: r.multiple,
  choices: (r.choices ?? []).map(c => ({ id: c.id, name: c.name, price: Number(c.price) })),
  active: r.active !== false,
})

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
    orderDay: r.order_day,
    boardId: r.board_id,
    tableId: r.table_id,
    tableName: r.table_name,
    customerName: r.customer_name,
    items: (r.items ?? []).map(i => ({
      id: i.id, name: i.name, price: Number(i.price), quantity: i.quantity,
      ...(i.category ? { category: i.category } : {}),
      ...(i.addon ? { addon: true } : {}),
      ...(i.options?.length ? { options: i.options.map(o => ({ group: o.group, choice: o.choice, price: Number(o.price) })) } : {}),
    })),
    total: Number(r.total),
    status: r.status,
    orderType: r.order_type,
    takeawayCode: r.takeaway_code,
    createdAt: r.created_at,
    ...(r.notes ? { notes: r.notes } : {}),
    ...stages(r),
    ...(r.paid_online_at ? { paidOnlineAt: r.paid_online_at } : {}),
    ...(r.payment_method ? { paymentMethod: r.payment_method } : {}),
    ...(r.payment_ref ? { paymentRef: r.payment_ref } : {}),
  }
}

interface TableDbRow { id: number; label: string; active: boolean }

const tableFromRow = (r: TableDbRow): DiningTable => ({ id: r.id, label: r.label, active: r.active !== false })

function menuFromRow(r: MenuDbRow): LiveMenuItem {
  return {
    id: r.id,
    name: r.name,
    price: Number(r.price),
    category: r.category,
    description: r.description ?? '',
    addon: !!r.addon,
    available: r.available !== false,
    active: r.active !== false,
    optionGroupIds: r.option_group_ids ?? [],
  }
}

type Rows = { data: unknown[] | null; error: { message: string } | null }

/** PostgREST returns at most 1000 rows per request, so long histories come in pages. */
async function allPages(page: (from: number, to: number) => PromiseLike<Rows>, max = 20_000): Promise<Rows> {
  const rows: unknown[] = []
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await page(from, from + 999)
    if (error) return { data: null, error }
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return { data: rows, error: null }
}

let channelCount = 0

/**
 * Follows one table: a snapshot on every (re)connect, then each changed row.
 * Changes that arrive while the snapshot loads are applied on top of it.
 */
function follow<T>(table: string, fromRow: (r: never) => T, load: (sb: SupabaseClient) => PromiseLike<Rows>, on: FeedHandlers<T>): () => void {
  let stopped = false
  let channel: RealtimeChannel | null = null
  let retry: ReturnType<typeof setTimeout> | null = null
  let buffer: T[] | null = null

  getSupabase().then(sb => {
    if (stopped) return

    const snapshot = async () => {
      buffer = []
      const { data, error } = await load(sb)
      if (stopped) return
      const pending = buffer
      buffer = null
      if (error) {
        console.warn(`[orders] could not load ${table}`, error.message)
        on.down()
        retry = setTimeout(snapshot, 3000)
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
        if (status === 'SUBSCRIBED') void snapshot()
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

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

function subscribe<F extends Feed>(feed: F, on: FeedHandlers<FeedRow<F>>): () => void {
  if (feed === 'orders') {
    // Staff: 90 days of orders, enough for the analytics ranges
    return follow('orders', orderFromRow, sb => allPages((from, to) =>
      sb.from('orders').select('*').gte('created_at', daysAgo(90)).order('created_at', { ascending: false }).range(from, to),
    ), on as FeedHandlers<Order>)
  }
  // Guests only need what still holds a table or waits at the counter
  return follow('order_board', boardFromRow, sb =>
    sb.from('order_board').select('*').gte('created_at', daysAgo(1)).order('created_at', { ascending: false }).limit(500),
  on as FeedHandlers<BoardRow>)
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

  tables: {
    subscribe(on) {
      return follow('restaurant_tables', tableFromRow, sb => sb.from('restaurant_tables').select('*').order('id'), on)
    },
    async setCount(count) {
      return (await rpc<TableDbRow[]>('set_table_count', { p_count: count })).map(tableFromRow)
    },
  },

  options: {
    subscribe(on) {
      return follow('option_groups', groupFromRow, sb => sb.from('option_groups').select('*').order('id'), on)
    },
    async save(group) {
      return groupFromRow(await rpc<OptionGroupDbRow>('save_option_group', {
        p_id: group.id ?? null,
        p_name: group.name,
        p_required: group.required,
        p_multiple: group.multiple,
        p_choices: group.choices,
      }))
    },
    async remove(id) {
      return groupFromRow(await rpc<OptionGroupDbRow>('remove_option_group', { p_id: id }))
    },
  },

  menu: {
    subscribe(on) {
      return follow('menu_items', menuFromRow, sb => sb.from('menu_items').select('*').order('id'), on)
    },

    async save(item) {
      return menuFromRow(await rpc<MenuDbRow>('save_menu_item', {
        p_id: item.id ?? null,
        p_name: item.name,
        p_price: item.price,
        p_category: item.category,
        p_description: item.description,
        p_addon: item.addon ?? false,
        p_option_group_ids: item.optionGroupIds ?? null,
      }))
    },

    async setAvailable(id, available) {
      return menuFromRow(await rpc<MenuDbRow>('set_menu_item_available', { p_id: id, p_available: available }))
    },

    async remove(id) {
      return menuFromRow(await rpc<MenuDbRow>('remove_menu_item', { p_id: id }))
    },
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

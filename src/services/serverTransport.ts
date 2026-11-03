// Orders over the Node order server (server/orderSyncPlugin.ts): REST for writes,
// Server-Sent Events for live snapshots. Staff sign-in is an HttpOnly cookie the server sets.
import type { Feed, FeedHandlers, FeedRow, LiveMenuItem, StaffSignIn, Transport } from './orderSync'
import type { DiningTable, Order } from './orderModel'

/** Only a hint that this device signed in; the cookie itself is unreadable from script. */
const LS_STAFF_HINT = 'qyou_staff_signed_in'

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status })
  return data as T
}

/** An SSE stream of snapshots; `pick` takes the rows out of each frame. */
function stream<T>(url: string, pick: (msg: Record<string, unknown>) => unknown, on: FeedHandlers<T>): () => void {
  let es: EventSource | null = null
  let retry: ReturnType<typeof setTimeout> | null = null
  let delay = 1000
  let stopped = false

  const open = () => {
    es = new EventSource(url)
    es.onmessage = ev => {
      try {
        const rows = pick(JSON.parse(ev.data))
        if (!Array.isArray(rows)) return
        delay = 1000
        on.snapshot(rows as T[])
      } catch { /* ignore a bad frame */ }
    }
    es.onerror = () => {
      if (stopped) return
      on.down()
      // EventSource retries a dropped stream by itself, but gives up on a bad response
      if (es && es.readyState === EventSource.CLOSED) {
        es.close()
        retry = setTimeout(open, delay)
        delay = Math.min(delay * 2, 30_000)
      }
    }
  }
  open()

  return () => {
    stopped = true
    if (retry) clearTimeout(retry)
    es?.close()
  }
}

function subscribe<F extends Feed>(feed: F, on: FeedHandlers<FeedRow<F>>): () => void {
  return stream<FeedRow<F>>(`/api/orders/stream?feed=${feed}`, msg => (feed === 'orders' ? msg.orders : msg.board), on)
}

export const serverTransport: Transport = {
  subscribe,

  async getOrders(ids) {
    return (await call<{ orders: Order[] }>('/api/orders/lookup', { ids })).orders
  },

  async placeOrder(input) {
    return (await call<{ order: Order }>('/api/orders/place', input)).order
  },

  async setStatus(id, status) {
    return (await call<{ order: Order }>('/api/orders/status', { id, status })).order
  },

  async cancelOrder(id) {
    return (await call<{ order: Order }>('/api/orders/cancel', { id })).order
  },

  tables: {
    subscribe(on) {
      return stream<DiningTable>('/api/tables/stream', msg => msg.tables, on)
    },
    async setCount(count) {
      return (await call<{ tables: DiningTable[] }>('/api/tables/count', { count })).tables
    },
  },

  menu: {
    subscribe(on) {
      return stream<LiveMenuItem>('/api/menu/stream', msg => msg.menu, on)
    },
    async save(item) {
      return (await call<{ item: LiveMenuItem }>('/api/menu/save', item)).item
    },
    async setAvailable(id, available) {
      return (await call<{ item: LiveMenuItem }>('/api/menu/available', { id, available })).item
    },
    async remove(id) {
      return (await call<{ item: LiveMenuItem }>('/api/menu/remove', { id })).item
    },
  },

  staff: {
    mightHaveSession() {
      try { return localStorage.getItem(LS_STAFF_HINT) !== null } catch { return false }
    },

    async restore() {
      try {
        await call('/api/staff/session')
        return true
      } catch (err) {
        if ((err as { status?: number }).status === 401) {
          try { localStorage.removeItem(LS_STAFF_HINT) } catch { /* noop */ }
          return false
        }
        // Offline: keep the screen up; the server still checks every change
        return true
      }
    },

    async signIn(pin): Promise<StaffSignIn> {
      try {
        await call('/api/staff/login', { pin })
        try { localStorage.setItem(LS_STAFF_HINT, '1') } catch { /* noop */ }
        return 'ok'
      } catch (err) {
        const status = (err as { status?: number }).status
        if (status === 429) return 'too_many_attempts'
        if (status === 401) return 'wrong_pin'
        return 'offline'
      }
    },

    async signOut() {
      try { localStorage.removeItem(LS_STAFF_HINT) } catch { /* noop */ }
      await call('/api/staff/logout', {}).catch(() => undefined)
    },
  },
}

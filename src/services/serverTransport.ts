// Orders over the Node order server (server/orderSyncPlugin.ts): REST for writes,
// Server-Sent Events for live snapshots. Staff sign-in is an HttpOnly cookie the server sets.
import type { Feed, FeedHandlers, FeedRow, LiveMenuItem, LiveOptionGroup, StaffSignIn, Transport } from './orderSync'
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

// ─── Live feeds: one SSE stream per page ────────────────────────────────────
// Browsers allow only six connections to a server; a stream per feed (orders, menu, options,
// tables) in two tabs would use them all and leave saves waiting. So every feed this page
// follows shares one stream, reopened when the set of feeds changes.
type StreamFeed = Feed | 'menu' | 'options' | 'tables'

const followers = new Map<StreamFeed, Set<FeedHandlers<unknown>>>()
/** The last rows of each feed, for a follower that joins an open stream. */
const latest = new Map<StreamFeed, unknown[]>()
let source: EventSource | null = null
let openFeeds = ''
let retry: ReturnType<typeof setTimeout> | null = null
let delay = 1000
let scheduled = false

const wanted = () => [...followers].filter(([, set]) => set.size > 0).map(([feed]) => feed).sort().join(',')

function connect() {
  scheduled = false
  const feeds = wanted()
  if (source && feeds === openFeeds) return
  source?.close()
  source = null
  if (retry) { clearTimeout(retry); retry = null }
  openFeeds = feeds
  latest.clear()
  if (!feeds) return

  const es = new EventSource(`/api/stream?feeds=${feeds}`)
  source = es
  es.onmessage = ev => {
    try {
      const { feed, rows } = JSON.parse(ev.data) as { feed: StreamFeed; rows: unknown }
      if (!Array.isArray(rows)) return
      delay = 1000
      latest.set(feed, rows)
      followers.get(feed)?.forEach(on => on.snapshot(rows))
    } catch { /* ignore a bad frame */ }
  }
  es.onerror = () => {
    if (source !== es) return
    followers.forEach(set => set.forEach(on => on.down()))
    // EventSource retries a dropped stream by itself, but gives up on a bad response
    if (es.readyState === EventSource.CLOSED) {
      es.close()
      source = null
      openFeeds = ''
      retry = setTimeout(connect, delay)
      delay = Math.min(delay * 2, 30_000)
    }
  }
}

/** Follows and unfollows made together (a page mounting) share one reconnect. */
function schedule() {
  if (scheduled) return
  scheduled = true
  queueMicrotask(connect)
}

function follow<T>(feed: StreamFeed, on: FeedHandlers<T>): () => void {
  let set = followers.get(feed)
  if (!set) followers.set(feed, set = new Set())
  const handler = on as FeedHandlers<unknown>
  set.add(handler)
  schedule()
  // Joining a feed that's already streaming: start from its last rows
  const rows = latest.get(feed)
  if (rows && openFeeds.split(',').includes(feed)) queueMicrotask(() => { if (set!.has(handler)) on.snapshot(rows as T[]) })
  return () => {
    set!.delete(handler)
    schedule()
  }
}

function subscribe<F extends Feed>(feed: F, on: FeedHandlers<FeedRow<F>>): () => void {
  return follow(feed, on)
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
      return follow<DiningTable>('tables', on)
    },
    async setCount(count) {
      return (await call<{ tables: DiningTable[] }>('/api/tables/count', { count })).tables
    },
  },

  options: {
    subscribe(on) {
      return follow<LiveOptionGroup>('options', on)
    },
    async save(group) {
      return (await call<{ group: LiveOptionGroup }>('/api/options/save', group)).group
    },
    async remove(id) {
      return (await call<{ group: LiveOptionGroup }>('/api/options/remove', { id })).group
    },
  },

  menu: {
    subscribe(on) {
      return follow<LiveMenuItem>('menu', on)
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

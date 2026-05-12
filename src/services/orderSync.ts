/**
 * Client-side order sync — works in TWO modes:
 *
 * MODE 1 (Local dev with Vite): SSE + REST API via the Vite plugin
 *   → Real-time push, cross-device sync on the same Wi-Fi
 *
 * MODE 2 (Vercel / static deploy): localStorage + BroadcastChannel
 *   → Cross-tab sync on the same browser, no backend needed
 *
 * The client tries SSE first. If it fails (404, no server), it silently
 * falls back to localStorage-only mode. Orders still work — they just
 * live in the browser instead of a server.
 */

type OnSyncCallback = (orders: unknown) => void

class OrderSyncClient {
  private eventSource: EventSource | null = null
  private callbacks: Set<OnSyncCallback> = new Set()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _connected = false
  private _mode: 'sse' | 'local' = 'local'
  private _sseAttempted = false
  private broadcastChannel: BroadcastChannel | null = null

  connect() {
    this.initBroadcastChannel()

    // Only attempt SSE once — if it fails, stay in local mode
    if (!this._sseAttempted) {
      this._sseAttempted = true
      this.attemptSSE()
    }
  }

  private initBroadcastChannel() {
    if (this.broadcastChannel) return
    try {
      this.broadcastChannel = new BroadcastChannel('deverse_orders_sync')
      this.broadcastChannel.onmessage = (ev) => {
        try {
          const orders = ev.data
          if (Array.isArray(orders)) {
            this.callbacks.forEach(cb => cb(orders))
          }
        } catch { /* ignore */ }
      }
    } catch { /* BroadcastChannel not supported */ }
  }

  /** Broadcast orders to other tabs */
  broadcastToTabs(orders: unknown) {
    try {
      this.broadcastChannel?.postMessage(orders)
    } catch { /* ignore */ }
  }

  private attemptSSE() {
    try {
      const es = new EventSource('/api/orders/stream')

      // If SSE doesn't connect within 3s, give up and use local mode
      const timeout = setTimeout(() => {
        if (!this._connected) {
          es.close()
          this._mode = 'local'
          this._connected = true // "connected" in local mode
          this.callbacks.forEach(cb => cb(this.loadLocalOrders()))
        }
      }, 3000)

      es.onmessage = (event) => {
        clearTimeout(timeout)
        try {
          const orders = JSON.parse(event.data)
          this._connected = true
          this._mode = 'sse'
          this.eventSource = es
          this.callbacks.forEach(cb => cb(orders))
        } catch { /* ignore */ }
      }

      es.onerror = () => {
        clearTimeout(timeout)
        es.close()
        this.eventSource = null

        if (this._mode === 'sse') {
          // Was connected via SSE, lost connection — try reconnect
          this._connected = false
          this.scheduleReconnect()
        } else {
          // Never connected via SSE — stay in local mode permanently
          this._mode = 'local'
          this._connected = true
          this.callbacks.forEach(cb => cb(this.loadLocalOrders()))
        }
      }
    } catch {
      // SSE not available at all
      this._mode = 'local'
      this._connected = true
      this.callbacks.forEach(cb => cb(this.loadLocalOrders()))
    }
  }

  private loadLocalOrders(): unknown[] {
    try {
      const raw = localStorage.getItem('deverse_orders')
      if (raw) return JSON.parse(raw)
    } catch { /* noop */ }
    return []
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.attemptSSE()
    }, 5000)
  }

  /** Send a new order to the server (SSE mode) or save locally */
  async placeOrder(order: unknown): Promise<boolean> {
    if (this._mode === 'local') {
      // In local mode, localStorage is the source of truth
      // OrderContext already saved to localStorage — just broadcast to tabs
      this.broadcastToTabs(this.loadLocalOrders())
      return true
    }

    try {
      const res = await fetch('/api/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      })
      return res.ok
    } catch {
      return false
    }
  }

  /** Update an order's status */
  async updateStatus(orderId: string, status: string): Promise<boolean> {
    if (this._mode === 'local') {
      this.broadcastToTabs(this.loadLocalOrders())
      return true
    }

    try {
      const res = await fetch('/api/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status, timestamp: new Date().toISOString() }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  /** Subscribe to state updates */
  onSync(callback: OnSyncCallback): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  get isConnected() {
    return this._connected
  }

  get mode() {
    return this._mode
  }

  destroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = null
    }
    this.callbacks.clear()
  }
}

export const orderSync = new OrderSyncClient()

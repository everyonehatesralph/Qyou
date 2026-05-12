/**
 * Client-side order sync using SSE (Server-Sent Events) + REST API.
 *
 * SSE = server pushes updates instantly to all connected clients.
 * REST = client sends mutations (place order, update status) via POST.
 *
 * This avoids WebSocket conflicts with Vite's HMR.
 * Latency: <10ms on local Wi-Fi.
 */

type OnSyncCallback = (orders: unknown) => void

class OrderSyncClient {
  private eventSource: EventSource | null = null
  private callbacks: Set<OnSyncCallback> = new Set()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connected = false

  connect() {
    if (this.eventSource) return

    try {
      this.eventSource = new EventSource('/api/orders/stream')

      this.eventSource.onmessage = (event) => {
        try {
          const orders = JSON.parse(event.data)
          this.connected = true
          this.callbacks.forEach(cb => cb(orders))
        } catch { /* ignore malformed */ }
      }

      this.eventSource.onerror = () => {
        this.connected = false
        this.eventSource?.close()
        this.eventSource = null
        // Reconnect after 2s
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            this.connect()
          }, 2000)
        }
      }
    } catch {
      // SSE not supported or connection failed
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 2000)
  }

  /** Send a new order to the server */
  async placeOrder(order: unknown): Promise<boolean> {
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
    return this.connected
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
    this.callbacks.clear()
  }
}

export const orderSync = new OrderSyncClient()

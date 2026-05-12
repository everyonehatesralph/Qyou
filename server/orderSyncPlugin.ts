/**
 * Vite Plugin: Order Sync via REST API + Server-Sent Events (SSE)
 *
 * Uses simple HTTP instead of WebSocket to avoid conflicts with Vite's HMR.
 * - POST /api/orders/place      → place a new order
 * - POST /api/orders/status     → update order status
 * - GET  /api/orders            → get all orders
 * - GET  /api/orders/stream     → SSE stream for real-time updates
 *
 * Latency: <10ms on local network (SSE push, not polling)
 */

import type { Plugin, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import fs from 'fs'
import path from 'path'

interface Order {
  id: string
  tableId: number
  tableName: string
  customerName: string
  items: { id: number; name: string; price: number; quantity: number }[]
  total: number
  status: string
  createdAt: string
  notes?: string
  confirmedAt?: string
  preparingAt?: string
  readyAt?: string
  servedAt?: string
}

const DATA_FILE = path.resolve(process.cwd(), 'server/orders.json')

function loadOrders(): Order[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    }
  } catch { /* noop */ }
  return []
}

function saveOrders(orders: Order[]) {
  try {
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2))
  } catch (e) {
    console.error('[OrderSync] Save failed:', e)
  }
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

export default function orderSyncPlugin(): Plugin {
  let orders: Order[] = loadOrders()
  const sseClients: Set<ServerResponse> = new Set()

  function broadcastSSE() {
    const data = JSON.stringify(orders)
    const msg = `data: ${data}\n\n`
    sseClients.forEach(res => {
      try { res.write(msg) } catch { sseClients.delete(res) }
    })
  }

  return {
    name: 'deverse-order-sync',
    configureServer(server: ViteDevServer) {
      // Add middleware BEFORE Vite's own middleware
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''

        // ── SSE Stream ──
        if (url === '/api/orders/stream' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          })
          // Send current state immediately
          res.write(`data: ${JSON.stringify(orders)}\n\n`)
          sseClients.add(res)
          req.on('close', () => sseClients.delete(res))
          return // keep connection open
        }

        // ── Get all orders ──
        if (url === '/api/orders' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify(orders))
          return
        }

        // ── Place order ──
        if (url === '/api/orders/place' && req.method === 'POST') {
          try {
            const order = await parseBody(req) as Order
            if (!orders.find(o => o.id === order.id)) {
              orders = [order, ...orders]
              saveOrders(orders)
            }
            broadcastSSE()
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
            res.end(JSON.stringify({ ok: true }))
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Invalid request' }))
          }
          return
        }

        // ── Update status ──
        if (url === '/api/orders/status' && req.method === 'POST') {
          try {
            const { orderId, status, timestamp } = await parseBody(req)
            const STAGE_TS: Record<string, string> = {
              confirmed: 'confirmedAt',
              preparing: 'preparingAt',
              ready: 'readyAt',
              served: 'servedAt',
            }
            orders = orders.map(o =>
              o.id === orderId
                ? { ...o, status, ...(STAGE_TS[status] ? { [STAGE_TS[status]]: timestamp } : {}) }
                : o
            )
            saveOrders(orders)
            broadcastSSE()
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
            res.end(JSON.stringify({ ok: true }))
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Invalid request' }))
          }
          return
        }

        // ── CORS preflight ──
        if (req.method === 'OPTIONS' && url.startsWith('/api/')) {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          })
          res.end()
          return
        }

        next()
      })

      console.log('  ⚡ Order sync API ready (SSE + REST)')
    },
  }
}

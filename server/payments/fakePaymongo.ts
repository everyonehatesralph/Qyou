/**
 * A stand-in for PayMongo, for local dev and the e2e suite: the same API calls (checkout
 * sessions, created and read with a secret key) and the same signed webhook, with a test
 * checkout page at /fake-paymongo/checkout/<id> where you pick a method and pay or go back.
 * No money moves and nothing leaves this computer. The dev server only (never server/index.ts).
 */
import type { IncomingMessage, ServerResponse } from 'http'
import { randomBytes } from 'node:crypto'
import { signWebhook } from './paymongo.ts'

interface FakeSession {
  id: string
  lineItems: { name: string; amount: number; quantity: number; description?: string }[]
  methods: string[]
  description: string
  referenceNumber: string
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
  checkoutUrl: string
  payments: { id: string; amount: number; method: string; paidAt: number }[]
  createdAt: number
}

export const FAKE_PAYMONGO_API = 'http://fake-paymongo.invalid/v1'

const id = (prefix: string) => `${prefix}_fake_${randomBytes(12).toString('hex')}`
const total = (s: FakeSession) => s.lineItems.reduce((sum, l) => sum + l.amount * l.quantity, 0)
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const peso = (centavos: number) => `₱${(centavos / 100).toFixed(2)}`
const LABELS: Record<string, string> = { gcash: 'GCash', paymaya: 'Maya', qrph: 'QR Ph', card: 'Card', grab_pay: 'GrabPay' }

function resource(s: FakeSession) {
  return {
    id: s.id,
    type: 'checkout_session',
    attributes: {
      checkout_url: s.checkoutUrl,
      description: s.description,
      line_items: s.lineItems.map(l => ({ ...l, currency: 'PHP' })),
      livemode: false,
      metadata: s.metadata,
      payment_method_types: s.methods,
      payments: s.payments.map(p => ({
        id: p.id,
        type: 'payment',
        attributes: { amount: p.amount, currency: 'PHP', status: 'paid', source: { id: id('src'), type: p.method }, paid_at: p.paidAt },
      })),
      reference_number: s.referenceNumber,
      status: 'active',
      success_url: s.successUrl,
      cancel_url: s.cancelUrl,
      created_at: s.createdAt,
    },
  }
}

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const error = (status: number, code: string, detail: string) => reply(status, { errors: [{ code, detail }] })

export interface FakePaymongo {
  apiBase: string
  /** Answers PayMongo API calls in-process; pass it as PayMongoConfig.fetch. */
  fetch: typeof fetch
  /** Serves the test checkout page. Returns false for anything else. */
  handle(req: IncomingMessage, res: ServerResponse): Promise<boolean>
}

/**
 * `deliver` hands a signed webhook (raw body, Paymongo-Signature) to the app, as PayMongo
 * would post it.
 */
export function createFakePaymongo({ secretKey, webhookSecret, deliver }: {
  secretKey: string
  webhookSecret: string
  deliver: (rawBody: string, signature: string) => Promise<void>
}): FakePaymongo {
  const sessions = new Map<string, FakeSession>()
  const authorized = (init?: RequestInit) =>
    new Headers(init?.headers).get('authorization') === `Basic ${btoa(`${secretKey}:`)}`

  const api = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
    if (!authorized(init)) return error(401, 'unauthorized', 'API key is invalid')
    const path = url.pathname.replace(/^\/v1/, '')

    if (init?.method === 'POST' && path === '/checkout_sessions') {
      const a = JSON.parse(String(init.body ?? '{}'))?.data?.attributes ?? {}
      if (!Array.isArray(a.line_items) || a.line_items.length === 0) return error(400, 'parameter_required', 'line_items is required')
      if (!Array.isArray(a.payment_method_types) || a.payment_method_types.length === 0) {
        return error(400, 'parameter_required', 'payment_method_types is required')
      }
      for (const l of a.line_items) {
        if (!Number.isInteger(l.amount) || l.amount < 1 || !Number.isInteger(l.quantity) || l.quantity < 1 || !l.name) {
          return error(400, 'parameter_invalid', 'line_items is invalid')
        }
      }
      const sid = id('cs')
      const session: FakeSession = {
        id: sid,
        lineItems: a.line_items.map((l: FakeSession['lineItems'][number]) => ({
          name: l.name, amount: l.amount, quantity: l.quantity, ...(l.description ? { description: l.description } : {}),
        })),
        methods: a.payment_method_types,
        description: a.description ?? '',
        referenceNumber: a.reference_number ?? '',
        metadata: a.metadata ?? {},
        successUrl: a.success_url,
        cancelUrl: a.cancel_url,
        checkoutUrl: `${new URL(a.success_url).origin}/fake-paymongo/checkout/${sid}`,
        payments: [],
        createdAt: Math.floor(Date.now() / 1000),
      }
      sessions.set(sid, session)
      return reply(200, { data: resource(session) })
    }

    const found = /^\/checkout_sessions\/([^/]+)$/.exec(path)
    if ((init?.method ?? 'GET') === 'GET' && found) {
      const session = sessions.get(decodeURIComponent(found[1]))
      return session ? reply(200, { data: resource(session) }) : error(404, 'resource_not_found', 'No such checkout session')
    }
    return error(404, 'resource_not_found', 'Not found')
  }

  function page(s: FakeSession) {
    const paid = s.payments.length > 0
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test checkout</title>
<style>
  body { font: 16px/1.45 system-ui, sans-serif; margin: 0; background: #f4f4f5; color: #18181b; }
  main { max-width: 26rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
  .note { background: #fef3c7; color: #713f12; border-radius: .75rem; padding: .75rem 1rem; font-size: .9rem; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; background: #fff; border-radius: .75rem; overflow: hidden; }
  td { padding: .6rem .9rem; border-top: 1px solid #e4e4e7; vertical-align: top; }
  td:last-child { text-align: right; white-space: nowrap; }
  small { color: #52525b; display: block; }
  .total td { font-weight: 600; }
  button { font: inherit; width: 100%; min-height: 3rem; border-radius: .75rem; border: 0; margin-top: .6rem; cursor: pointer; }
  .pay { background: #1d4ed8; color: #fff; font-weight: 600; }
  .back { background: transparent; color: #1d4ed8; text-decoration: underline; }
  label { display: flex; gap: .5rem; align-items: center; margin-top: 1rem; font-size: .9rem; }
</style></head><body><main>
<p class="note">Test checkout. This stands in for PayMongo on this computer: no money moves.</p>
<h1>${esc(s.description || 'Checkout')}</h1>
<table>
${s.lineItems.map(l => `<tr><td>${l.quantity}× ${esc(l.name)}${l.description ? `<small>${esc(l.description)}</small>` : ''}</td><td>${peso(l.amount * l.quantity)}</td></tr>`).join('\n')}
<tr class="total"><td>Total</td><td>${peso(total(s))}</td></tr>
</table>
${paid ? '<p>This checkout is paid.</p>' : `<form method="post" action="/fake-paymongo/checkout/${esc(s.id)}/pay">
${s.methods.map(m => `<button class="pay" name="method" value="${esc(m)}">Pay ${peso(total(s))} with ${esc(LABELS[m] ?? m)}</button>`).join('\n')}
<label><input type="checkbox" name="webhook" value="1" checked> Tell the shop by webhook</label>
</form>`}
<form method="post" action="/fake-paymongo/checkout/${esc(s.id)}/cancel"><button class="back">Back to the shop</button></form>
</main></body></html>`
  }

  const readForm = (req: IncomingMessage) => new Promise<URLSearchParams>((resolve, reject) => {
    let body = ''
    req.on('data', (c: Buffer) => { body += c.toString(); if (body.length > 10_000) req.destroy() })
    req.on('end', () => resolve(new URLSearchParams(body)))
    req.on('error', reject)
  })

  const redirect = (res: ServerResponse, to: string) => { res.writeHead(303, { Location: to }); res.end() }

  return {
    apiBase: FAKE_PAYMONGO_API,
    fetch: api as typeof fetch,
    async handle(req, res) {
      const url = new URL(req.url || '/', 'http://localhost')
      const m = /^\/fake-paymongo\/checkout\/([^/]+)(?:\/(pay|cancel))?$/.exec(url.pathname)
      if (!m) return false
      const session = sessions.get(m[1])
      if (!session) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('No such checkout')
        return true
      }
      if (req.method === 'GET' && !m[2]) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
        res.end(page(session))
        return true
      }
      if (req.method === 'POST' && m[2] === 'cancel') {
        redirect(res, session.cancelUrl)
        return true
      }
      if (req.method === 'POST' && m[2] === 'pay') {
        const form = await readForm(req)
        const method = form.get('method') ?? ''
        if (!session.methods.includes(method)) {
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('Pick a payment method')
          return true
        }
        if (session.payments.length === 0) {
          session.payments.push({ id: id('pay'), amount: total(session), method, paidAt: Math.floor(Date.now() / 1000) })
          if (form.get('webhook') === '1') {
            const raw = JSON.stringify({
              data: {
                id: id('evt'),
                type: 'event',
                attributes: { type: 'checkout_session.payment.paid', livemode: false, data: resource(session), created_at: Math.floor(Date.now() / 1000) },
              },
            })
            await deliver(raw, signWebhook(raw, webhookSecret)).catch(err => console.warn('[fake-paymongo] webhook failed:', err))
          }
        }
        redirect(res, session.successUrl)
        return true
      }
      res.writeHead(405, { 'Content-Type': 'text/plain' })
      res.end('Method not allowed')
      return true
    },
  }
}

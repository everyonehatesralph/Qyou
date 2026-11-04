/**
 * PayMongo, the payment provider: hosted checkout sessions (GCash, Maya, QR Ph, cards) and the
 * signed webhooks it sends when one is paid. Docs: https://docs.paymongo.com
 *
 * Plain fetch, no SDK, so the same file runs on Vercel and in the Node order server.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export interface PayMongoConfig {
  /** sk_test_… or sk_live_… */
  secretKey: string
  /** PayMongo's API unless set; the dev server points it at its stand-in (fakePaymongo.ts). */
  apiBase?: string
  fetch?: typeof fetch
}

export const PAYMONGO_API = 'https://api.paymongo.com/v1'

/** One line on the checkout page. `amount` is the price of one, in centavos. */
export interface CheckoutLine {
  name: string
  amount: number
  quantity: number
  description?: string
}

export interface NewCheckoutSession {
  orderId: string
  lines: CheckoutLine[]
  description: string
  successUrl: string
  cancelUrl: string
  /** PayMongo method names: gcash, paymaya, qrph, card… */
  methods: string[]
}

export interface SessionPayment {
  id: string
  /** Centavos. */
  amount: number
  /** paid, failed, pending… */
  status: string
  /** gcash, paymaya, qrph, card… */
  method?: string
}

export interface CheckoutSession {
  id: string
  checkoutUrl: string
  /** Ours, from the session's metadata. */
  orderId?: string
  payments: SessionPayment[]
}

export class PayMongoError extends Error {
  status: number
  constructor(status: number, detail: string) {
    super(`paymongo_${status}: ${detail}`)
    this.status = status
  }
}

const isLive = (secretKey: string) => secretKey.startsWith('sk_live_')

async function call(cfg: PayMongoConfig, method: 'GET' | 'POST', path: string, body?: unknown): Promise<any> {
  const res = await (cfg.fetch ?? fetch)(`${cfg.apiBase ?? PAYMONGO_API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${cfg.secretKey}:`)}`,
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = Array.isArray(json?.errors)
      ? json.errors.map((e: { code?: string; detail?: string }) => e.detail ?? e.code).join('; ')
      : `HTTP ${res.status}`
    throw new PayMongoError(res.status, detail)
  }
  return json
}

/** A checkout session resource (also what a checkout_session.payment.paid event carries). */
export function sessionFrom(resource: any): CheckoutSession {
  const a = resource?.attributes ?? {}
  return {
    id: String(resource?.id ?? ''),
    checkoutUrl: String(a.checkout_url ?? ''),
    orderId: a.metadata?.order_id ?? a.reference_number ?? undefined,
    payments: (Array.isArray(a.payments) ? a.payments : []).map((p: any) => ({
      id: String(p?.id ?? ''),
      amount: Number(p?.attributes?.amount),
      status: String(p?.attributes?.status ?? ''),
      method: p?.attributes?.source?.type ?? a.payment_method_used ?? undefined,
    })),
  }
}

/** The payment that paid a session, if one did (PayMongo allows at most one). */
export const paidPayment = (session: CheckoutSession): SessionPayment | undefined =>
  session.payments.find(p => p.status === 'paid')

export async function createCheckoutSession(cfg: PayMongoConfig, s: NewCheckoutSession): Promise<CheckoutSession> {
  const json = await call(cfg, 'POST', '/checkout_sessions', {
    data: {
      attributes: {
        line_items: s.lines.map(l => ({
          name: l.name.slice(0, 255),
          amount: l.amount,
          currency: 'PHP',
          quantity: l.quantity,
          ...(l.description ? { description: l.description.slice(0, 255) } : {}),
        })),
        payment_method_types: s.methods,
        description: s.description,
        reference_number: s.orderId,
        metadata: { order_id: s.orderId },
        success_url: s.successUrl,
        cancel_url: s.cancelUrl,
        show_line_items: true,
        show_description: true,
        send_email_receipt: false,
      },
    },
  })
  return sessionFrom(json?.data)
}

export async function getCheckoutSession(cfg: PayMongoConfig, id: string): Promise<CheckoutSession> {
  const json = await call(cfg, 'GET', `/checkout_sessions/${encodeURIComponent(id)}`)
  return sessionFrom(json?.data)
}

// ─── Webhooks ────────────────────────────────────────────────────────────────
/**
 * Checks the Paymongo-Signature header ("t=…,te=…,li=…"): an HMAC-SHA256, keyed with the
 * webhook's secret, of "<t>.<raw body>". `te` signs test-mode events and `li` live ones, so a
 * live key only accepts `li` and a test key only `te`.
 *
 * The timestamp isn't checked for age: PayMongo retries a webhook for hours, and a replayed one
 * can do nothing, because a webhook only makes us ask PayMongo about the payment ourselves.
 */
export function verifySignature(
  header: string | null | undefined,
  rawBody: string,
  webhookSecret: string,
  { secretKey }: { secretKey: string },
): boolean {
  if (!header || !webhookSecret) return false
  const parts = new Map(header.split(',').map(p => {
    const i = p.indexOf('=')
    return [p.slice(0, i).trim(), p.slice(i + 1).trim()] as const
  }))
  const t = parts.get('t') ?? ''
  const signature = parts.get(isLive(secretKey) ? 'li' : 'te') ?? ''
  if (!/^\d+$/.test(t) || !/^[0-9a-f]{64}$/i.test(signature)) return false
  const expected = createHmac('sha256', webhookSecret).update(`${t}.${rawBody}`).digest()
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'))
}

/** Signs a webhook body the way PayMongo does (for the dev stand-in and tests). */
export function signWebhook(rawBody: string, webhookSecret: string, { live = false, at = Date.now() } = {}): string {
  const t = Math.floor(at / 1000)
  const sig = createHmac('sha256', webhookSecret).update(`${t}.${rawBody}`).digest('hex')
  return `t=${t},te=${live ? '' : sig},li=${live ? sig : ''}`
}

export interface WebhookEvent {
  id: string
  type: string
  livemode: boolean
  /** The resource the event is about, e.g. a checkout session. */
  data: any
}

export function parseEvent(rawBody: string): WebhookEvent | null {
  try {
    const json = JSON.parse(rawBody)
    const a = json?.data?.attributes
    if (!a || typeof a.type !== 'string') return null
    return { id: String(json.data.id ?? ''), type: a.type, livemode: a.livemode === true, data: a.data }
  } catch {
    return null
  }
}

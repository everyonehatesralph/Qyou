/**
 * Paying online, the same for every backend: Vercel (api/payments, orders in Supabase) and the
 * Node order server (orders in memory). Each passes its own CheckoutStore.
 *
 *   GET  /api/payments/config    { enabled, methods }     whether guests can pay now
 *   POST /api/payments/checkout  PlaceOrderInput          → { checkoutUrl } or { paid: true }
 *   POST /api/payments/confirm   { id }                   → { state: 'paid' | 'waiting' | 'unknown' }
 *   POST /api/payments/webhook   PayMongo's signed event  → 200 once handled
 *
 * Whether something is paid is only ever decided by asking PayMongo with our secret key. The
 * webhook and the guest's phone coming back from the payment page are just two reasons to ask,
 * so a payment counts even if the webhook never arrives (a protected preview, a dropped call)
 * or the guest closes the page.
 */
import { RESTAURANT } from '../../src/config/restaurant.ts'
import {
  OrderError, isOrderId, optionsText,
  type CheckoutStarted, type CheckoutState, type OrderItem, type PlaceOrderInput,
} from '../../src/services/orderModel.ts'
import {
  PayMongoError, createCheckoutSession, getCheckoutSession, paidPayment, parseEvent, verifySignature,
  type PayMongoConfig,
} from './paymongo.ts'

/** A pay-now order, priced, waiting for its payment (or paid). */
export interface Checkout {
  orderId: string
  items: OrderItem[]
  total: number
  tableName: string
  sessionId?: string
  checkoutUrl?: string
  paid: boolean
}

/** Where checkouts and orders live: Supabase in production, the order server's memory in dev. */
export interface CheckoutStore {
  /**
   * Checks and prices a pay-now order by the same rules as placing one, or hands back the
   * checkout already started for this id and this cart. Throws OrderError codes.
   */
  start(input: PlaceOrderInput): Promise<Checkout>
  /** Records the provider's session. The first one recorded wins and is what comes back. */
  attach(orderId: string, sessionId: string, checkoutUrl: string): Promise<Checkout>
  find(orderId: string): Promise<Checkout | null>
  /** The money is in: makes the order (once) with today's next queue number. */
  confirm(p: { orderId: string; sessionId: string; paymentRef: string; amountCentavos: number; method?: string }): Promise<void>
}

export interface PaymentSettings {
  paymongo: PayMongoConfig
  /** The webhook's own secret (whsk_…). Without it webhooks are refused, and the phone's check still works. */
  webhookSecret?: string
  /** PayMongo method names offered on the checkout page. */
  methods: string[]
  /** Where the payment page sends guests back to; the request's own address unless set. */
  siteUrl?: string
}

export const DEFAULT_METHODS = ['gcash', 'paymaya', 'qrph', 'card']

/** Payment settings from environment variables, or null when paying online is off. */
export function settingsFromEnv(env: Record<string, string | undefined>): PaymentSettings | null {
  const secretKey = env.PAYMONGO_SECRET_KEY?.trim()
  if (!secretKey) return null
  const methods = (env.PAYMONGO_METHODS ?? '').split(',').map(m => m.trim()).filter(Boolean)
  return {
    paymongo: { secretKey, ...(env.PAYMONGO_API_BASE ? { apiBase: env.PAYMONGO_API_BASE } : {}) },
    webhookSecret: env.PAYMONGO_WEBHOOK_SECRET?.trim() || undefined,
    methods: methods.length ? methods : DEFAULT_METHODS,
    siteUrl: env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') || undefined,
  }
}

const centavos = (pesos: number) => Math.round(pesos * 100)

/** Asks PayMongo whether this checkout's session is paid, and if so makes the order. */
async function settle(store: CheckoutStore, settings: PaymentSettings, checkout: Checkout): Promise<boolean> {
  if (checkout.paid) return true
  if (!checkout.sessionId) return false
  const session = await getCheckoutSession(settings.paymongo, checkout.sessionId)
  const payment = paidPayment(session)
  if (!payment) return false
  await store.confirm({
    orderId: checkout.orderId,
    sessionId: checkout.sessionId,
    paymentRef: payment.id,
    amountCentavos: payment.amount,
    method: payment.method,
  })
  return true
}

export async function startCheckout(
  store: CheckoutStore, settings: PaymentSettings, input: PlaceOrderInput, origin: string,
): Promise<CheckoutStarted> {
  if (!isOrderId(input?.id)) throw new OrderError('invalid_order_id')
  const checkout = await store.start(input)
  if (checkout.paid) return { paid: true }
  if (checkout.sessionId && checkout.checkoutUrl) {
    // Started before: the guest came back from the payment page. It may be paid by now.
    if (await settle(store, settings, checkout)) return { paid: true }
    return { checkoutUrl: checkout.checkoutUrl }
  }

  const lines = checkout.items.map(i => ({
    name: i.name,
    amount: centavos(i.price),
    quantity: i.quantity,
    description: optionsText(i) || undefined,
  }))
  // The payment page totals the lines; it must come to exactly what the order costs
  if (lines.reduce((s, l) => s + l.amount * l.quantity, 0) !== centavos(checkout.total)) {
    throw new Error('checkout lines do not add up to the total')
  }
  const site = settings.siteUrl ?? origin
  const session = await createCheckoutSession(settings.paymongo, {
    orderId: checkout.orderId,
    lines,
    description: `${RESTAURANT.name} · ${checkout.tableName}`,
    successUrl: `${site}/order/${checkout.orderId}`,
    cancelUrl: `${site}/cart?payment=cancelled`,
    methods: settings.methods,
  })
  const attached = await store.attach(checkout.orderId, session.id, session.checkoutUrl)
  return { checkoutUrl: attached.checkoutUrl ?? session.checkoutUrl }
}

export async function confirmCheckout(store: CheckoutStore, settings: PaymentSettings, orderId: unknown): Promise<CheckoutState> {
  if (!isOrderId(orderId)) return 'unknown'
  const checkout = await store.find(orderId)
  if (!checkout) return 'unknown'
  return (await settle(store, settings, checkout)) ? 'paid' : 'waiting'
}

/** PayMongo's webhook. Answers 2xx once handled (or not ours); anything else makes PayMongo retry. */
export async function handleWebhook(
  store: CheckoutStore, settings: PaymentSettings, rawBody: string, signature: string | null,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!settings.webhookSecret || !verifySignature(signature, rawBody, settings.webhookSecret, settings.paymongo)) {
    return { status: 401, body: { error: 'bad_signature' } }
  }
  const event = parseEvent(rawBody)
  if (!event) return { status: 400, body: { error: 'bad_event' } }
  if (event.type !== 'checkout_session.payment.paid') return { status: 200, body: { ignored: event.type } }

  const a = event.data?.attributes ?? {}
  const orderId = a.metadata?.order_id ?? a.reference_number
  const checkout = isOrderId(orderId) ? await store.find(orderId) : null
  // Another shop's or another copy's checkout on the same PayMongo account: not ours to handle
  if (!checkout || checkout.sessionId !== event.data?.id) return { status: 200, body: { ignored: 'not_ours' } }
  // PayMongo said paid; if its API doesn't show it yet, a retry later will
  if (!(await settle(store, settings, checkout))) return { status: 503, body: { error: 'not_paid_yet' } }
  return { status: 200, body: { state: 'paid' } }
}

// ─── HTTP ────────────────────────────────────────────────────────────────────
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

/** An error code safe to hand to the phone, which turns it into words. */
function errorCode(err: unknown): { status: number; code: string } {
  if (err instanceof OrderError) return { status: err.code === 'already_placed' || err.code === 'checkout_changed' ? 409 : 400, code: err.code }
  if (err instanceof PayMongoError) return { status: 502, code: 'payment_failed' }
  return { status: 500, code: 'payment_failed' }
}

/**
 * Serves /api/payments/*. `deps` null means paying online is off (no PayMongo key): config says
 * so and everything else is refused.
 */
export async function handlePaymentsRequest(
  request: Request,
  deps: { store: CheckoutStore; settings: PaymentSettings } | null,
): Promise<Response> {
  const url = new URL(request.url)
  const action = url.pathname.replace(/\/+$/, '').split('/').pop()
  const route = `${request.method} ${action}`

  if (route === 'GET config') {
    return json(200, deps ? { enabled: true, methods: deps.settings.methods } : { enabled: false, methods: [] })
  }
  if (!deps) return json(503, { error: 'payments_off' })
  const { store, settings } = deps

  try {
    switch (route) {
      case 'POST checkout': {
        const input = await request.json().catch(() => null)
        return json(200, await startCheckout(store, settings, input, url.origin))
      }
      case 'POST confirm': {
        const body = await request.json().catch(() => null)
        return json(200, { state: await confirmCheckout(store, settings, body?.id) })
      }
      case 'POST webhook': {
        const raw = await request.text()
        const result = await handleWebhook(store, settings, raw, request.headers.get('paymongo-signature'))
        if (result.status >= 500) console.warn('[payments] webhook will be retried:', result.body)
        return json(result.status, result.body)
      }
    }
  } catch (err) {
    const { status, code } = errorCode(err)
    if (status >= 500) console.error(`[payments] ${route} failed:`, err)
    return json(status, { error: code })
  }
  return json(404, { error: 'not_found' })
}

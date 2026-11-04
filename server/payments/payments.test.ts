import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OrderError, type OrderItem, type PlaceOrderInput } from '../../src/services/orderModel.ts'
import { createCheckoutSession, sessionFrom, signWebhook, verifySignature } from './paymongo.ts'
import { confirmCheckout, handlePaymentsRequest, settingsFromEnv, startCheckout, type Checkout, type CheckoutStore, type PaymentSettings } from './service.ts'

const ORDER_ID = '0b9f3c2e-6a51-4d7e-9c1a-2f4e8b7d6c5a'
const WEBHOOK_SECRET = 'whsk_test_secret'

// ─── Signatures ──────────────────────────────────────────────────────────────
test('a webhook signed with the secret is accepted; anything else is refused', () => {
  const body = '{"data":{"id":"evt_1"}}'
  const header = signWebhook(body, WEBHOOK_SECRET)
  assert.equal(verifySignature(header, body, WEBHOOK_SECRET, { secretKey: 'sk_test_x' }), true)
  assert.equal(verifySignature(header, body + ' ', WEBHOOK_SECRET, { secretKey: 'sk_test_x' }), false, 'body changed')
  assert.equal(verifySignature(header, body, 'whsk_other', { secretKey: 'sk_test_x' }), false, 'other secret')
  assert.equal(verifySignature(null, body, WEBHOOK_SECRET, { secretKey: 'sk_test_x' }), false, 'no header')
  assert.equal(verifySignature('t=1,te=zz,li=', body, WEBHOOK_SECRET, { secretKey: 'sk_test_x' }), false, 'garbage')
  assert.equal(verifySignature(header, body, '', { secretKey: 'sk_test_x' }), false, 'no secret configured')
  // A test-mode signature doesn't pass for a live key, and the other way round
  assert.equal(verifySignature(header, body, WEBHOOK_SECRET, { secretKey: 'sk_live_x' }), false)
  const live = signWebhook(body, WEBHOOK_SECRET, { live: true })
  assert.equal(verifySignature(live, body, WEBHOOK_SECRET, { secretKey: 'sk_live_x' }), true)
  assert.equal(verifySignature(live, body, WEBHOOK_SECRET, { secretKey: 'sk_test_x' }), false)
})

// ─── PayMongo requests ───────────────────────────────────────────────────────
test('a checkout session asks PayMongo for exactly the priced lines, in centavos', async () => {
  let seen: { url: string; init: RequestInit } | null = null
  const fetchStub = (async (url: string, init: RequestInit) => {
    seen = { url, init }
    return Response.json({ data: { id: 'cs_1', attributes: { checkout_url: 'https://checkout.paymongo.com/cs_1', payments: [] } } })
  }) as typeof fetch
  const session = await createCheckoutSession({ secretKey: 'sk_test_abc', fetch: fetchStub }, {
    orderId: ORDER_ID,
    lines: [{ name: 'Caramel Macchiato', amount: 19500, quantity: 2, description: 'Large · Hot' }],
    description: 'Qyou · Table 5',
    successUrl: 'https://shop.example/order/x',
    cancelUrl: 'https://shop.example/cart',
    methods: ['gcash', 'qrph'],
  })
  assert.deepEqual(session, { id: 'cs_1', checkoutUrl: 'https://checkout.paymongo.com/cs_1', orderId: undefined, payments: [] })
  assert.equal(seen!.url, 'https://api.paymongo.com/v1/checkout_sessions')
  assert.equal(new Headers(seen!.init.headers).get('authorization'), `Basic ${btoa('sk_test_abc:')}`)
  const attrs = JSON.parse(String(seen!.init.body)).data.attributes
  assert.deepEqual(attrs.line_items, [{ name: 'Caramel Macchiato', amount: 19500, currency: 'PHP', quantity: 2, description: 'Large · Hot' }])
  assert.deepEqual(attrs.payment_method_types, ['gcash', 'qrph'])
  assert.equal(attrs.reference_number, ORDER_ID)
  assert.deepEqual(attrs.metadata, { order_id: ORDER_ID })
  assert.equal(attrs.success_url, 'https://shop.example/order/x')
})

test('a session resource gives its paid payment, amount and method', () => {
  const s = sessionFrom({
    id: 'cs_2',
    attributes: {
      checkout_url: 'u', metadata: { order_id: ORDER_ID },
      payments: [{ id: 'pay_1', attributes: { amount: 48500, status: 'paid', source: { id: 'src_1', type: 'gcash' } } }],
    },
  })
  assert.deepEqual(s.payments, [{ id: 'pay_1', amount: 48500, status: 'paid', method: 'gcash' }])
  assert.equal(s.orderId, ORDER_ID)
})

// ─── The payment flow, against a stand-in PayMongo and store ─────────────────
const ITEMS: OrderItem[] = [{ id: 2, name: 'Caramel Macchiato', price: 195, quantity: 2 }, { id: 7, name: 'Butter Croissant', price: 95, quantity: 1 }]
const INPUT: PlaceOrderInput = { id: ORDER_ID, tableId: 5, tableName: 'Table 5', customerName: 'Bea', orderType: 'dineIn', items: [{ id: 2, quantity: 2 }, { id: 7, quantity: 1 }] }

function world() {
  const sessions = new Map<string, { paid?: { id: string; amount: number; method: string } }>()
  let created = 0
  const fetchStub = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname
    if (init.method === 'POST' && path === '/v1/checkout_sessions') {
      const id = `cs_${++created}`
      sessions.set(id, {})
      return Response.json({ data: { id, attributes: { checkout_url: `https://pay.example/${id}`, payments: [] } } })
    }
    const id = path.split('/').pop()!
    const s = sessions.get(id)
    if (!s) return Response.json({ errors: [{ code: 'resource_not_found' }] }, { status: 404 })
    const payments = s.paid ? [{ id: s.paid.id, attributes: { amount: s.paid.amount, status: 'paid', source: { type: s.paid.method } } }] : []
    return Response.json({ data: { id, attributes: { checkout_url: `https://pay.example/${id}`, payments } } })
  }) as typeof fetch

  let checkout: Checkout | null = null
  const confirmed: unknown[] = []
  const store: CheckoutStore = {
    async start(input) {
      if (input.items.length === 0) throw new OrderError('empty_order')
      checkout ??= { orderId: input.id, items: ITEMS, total: 485, tableName: 'Table 5', paid: false }
      return { ...checkout }
    },
    async attach(_id, sessionId, checkoutUrl) {
      checkout = { ...checkout!, sessionId: checkout!.sessionId ?? sessionId, checkoutUrl: checkout!.checkoutUrl ?? checkoutUrl }
      return { ...checkout }
    },
    async find(id) { return checkout && checkout.orderId === id ? { ...checkout } : null },
    async confirm(p) {
      if (p.amountCentavos !== 48500) throw new OrderError('amount_mismatch')
      confirmed.push(p)
      checkout = { ...checkout!, paid: true }
    },
  }
  const settings: PaymentSettings = { paymongo: { secretKey: 'sk_test_x', fetch: fetchStub }, webhookSecret: WEBHOOK_SECRET, methods: ['gcash'] }
  return {
    store, settings, confirmed, sessions,
    get created() { return created },
    pay: (id: string, amount = 48500) => { sessions.get(id)!.paid = { id: `pay_${id}`, amount, method: 'gcash' } },
  }
}

const event = (sessionId: string, type = 'checkout_session.payment.paid', orderId = ORDER_ID) => JSON.stringify({
  data: { id: 'evt_1', type: 'event', attributes: { type, livemode: false, data: { id: sessionId, attributes: { metadata: { order_id: orderId } } } } },
})

test('starting to pay opens one checkout session, and coming back reuses it', async () => {
  const w = world()
  assert.deepEqual(await startCheckout(w.store, w.settings, INPUT, 'https://shop.example'), { checkoutUrl: 'https://pay.example/cs_1' })
  assert.deepEqual(await startCheckout(w.store, w.settings, INPUT, 'https://shop.example'), { checkoutUrl: 'https://pay.example/cs_1' })
  assert.equal(w.created, 1)
  // Paid meanwhile: coming back says so instead of sending the guest to pay twice
  w.pay('cs_1')
  assert.deepEqual(await startCheckout(w.store, w.settings, INPUT, 'https://shop.example'), { paid: true })
  assert.deepEqual(w.confirmed, [{ orderId: ORDER_ID, sessionId: 'cs_1', paymentRef: 'pay_cs_1', amountCentavos: 48500, method: 'gcash' }])
})

test('the phone asking makes the order once PayMongo shows the payment', async () => {
  const w = world()
  await startCheckout(w.store, w.settings, INPUT, 'https://shop.example')
  assert.equal(await confirmCheckout(w.store, w.settings, ORDER_ID), 'waiting')
  w.pay('cs_1')
  assert.equal(await confirmCheckout(w.store, w.settings, ORDER_ID), 'paid')
  assert.equal(await confirmCheckout(w.store, w.settings, ORDER_ID), 'paid')
  assert.equal(w.confirmed.length, 1, 'confirmed once')
  assert.equal(await confirmCheckout(w.store, w.settings, 'not-an-id'), 'unknown')
  assert.equal(await confirmCheckout(w.store, w.settings, '1b9f3c2e-6a51-4d7e-9c1a-2f4e8b7d6c5a'), 'unknown')
})

test('a short payment makes no order', async () => {
  const w = world()
  await startCheckout(w.store, w.settings, INPUT, 'https://shop.example')
  w.pay('cs_1', 100)
  await assert.rejects(confirmCheckout(w.store, w.settings, ORDER_ID), /amount_mismatch/)
  assert.equal(w.confirmed.length, 0)
})

test('the webhook: signed, ours and paid, or it is refused or ignored', async () => {
  const w = world()
  await startCheckout(w.store, w.settings, INPUT, 'https://shop.example')
  const post = (body: string, signature: string | null) => handlePaymentsRequest(new Request('https://shop.example/api/payments/webhook', {
    method: 'POST', body, headers: signature ? { 'Paymongo-Signature': signature } : {},
  }), { store: w.store, settings: w.settings })

  const paid = event('cs_1')
  assert.equal((await post(paid, null)).status, 401)
  assert.equal((await post(paid, signWebhook(paid, 'whsk_wrong'))).status, 401)
  // Signed, but PayMongo's API doesn't show it paid (yet): PayMongo should retry
  assert.equal((await post(paid, signWebhook(paid, WEBHOOK_SECRET))).status, 503)
  assert.equal(w.confirmed.length, 0)
  // Other events and other people's sessions are fine to ignore
  const other = event('cs_1', 'payment.failed')
  assert.equal((await post(other, signWebhook(other, WEBHOOK_SECRET))).status, 200)
  const notOurs = event('cs_999')
  assert.equal((await post(notOurs, signWebhook(notOurs, WEBHOOK_SECRET))).status, 200)
  assert.equal(w.confirmed.length, 0)

  w.pay('cs_1')
  const res = await post(paid, signWebhook(paid, WEBHOOK_SECRET))
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { state: 'paid' })
  assert.equal(w.confirmed.length, 1)
})

test('the payment API refuses cleanly when off or when something fails', async () => {
  const off = await handlePaymentsRequest(new Request('https://shop.example/api/payments/config'), null)
  assert.deepEqual(await off.json(), { enabled: false, methods: [] })
  const refused = await handlePaymentsRequest(new Request('https://shop.example/api/payments/checkout', { method: 'POST', body: '{}' }), null)
  assert.equal(refused.status, 503)
  assert.deepEqual(await refused.json(), { error: 'payments_off' })

  const w = world()
  const deps = { store: w.store, settings: w.settings }
  const config = await handlePaymentsRequest(new Request('https://shop.example/api/payments/config'), deps)
  assert.deepEqual(await config.json(), { enabled: true, methods: ['gcash'] })
  // An order rule: its code goes back for the phone to put into words
  const empty = await handlePaymentsRequest(new Request('https://shop.example/api/payments/checkout', {
    method: 'POST', body: JSON.stringify({ ...INPUT, items: [] }),
  }), deps)
  assert.equal(empty.status, 400)
  assert.deepEqual(await empty.json(), { error: 'empty_order' })
  // PayMongo down: one plain code, no details
  const down = await handlePaymentsRequest(new Request('https://shop.example/api/payments/checkout', {
    method: 'POST', body: JSON.stringify(INPUT),
  }), { store: w.store, settings: { ...w.settings, paymongo: { secretKey: 'sk_test_x', fetch: (async () => Response.json({ errors: [{ code: 'x' }] }, { status: 500 })) as typeof fetch } } })
  assert.equal(down.status, 502)
  assert.deepEqual(await down.json(), { error: 'payment_failed' })
})

test('paying online is on only with a PayMongo key', () => {
  assert.equal(settingsFromEnv({}), null)
  const s = settingsFromEnv({ PAYMONGO_SECRET_KEY: ' sk_test_x ', PAYMONGO_METHODS: 'gcash, qrph', PUBLIC_SITE_URL: 'https://cafe.example/' })!
  assert.equal(s.paymongo.secretKey, 'sk_test_x')
  assert.deepEqual(s.methods, ['gcash', 'qrph'])
  assert.equal(s.siteUrl, 'https://cafe.example')
  assert.deepEqual(settingsFromEnv({ PAYMONGO_SECRET_KEY: 'sk_test_x' })!.methods, ['gcash', 'paymaya', 'qrph', 'card'])
})

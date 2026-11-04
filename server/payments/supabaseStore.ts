/**
 * Checkouts in Supabase, for api/payments on Vercel. Uses the service role key, the only key
 * the checkout functions in supabase/migrations accept; it never leaves the server.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { OrderError, type OrderItem, type PlaceOrderInput } from '../../src/services/orderModel.ts'
import type { Checkout, CheckoutStore } from './service.ts'

interface CheckoutRow {
  order_id: string
  items: OrderItem[]
  total: number | string
  table_name: string
  session_id: string | null
  checkout_url: string | null
  status: 'open' | 'paid'
}

const fromRow = (r: CheckoutRow): Checkout => ({
  orderId: r.order_id,
  items: (r.items ?? []).map(i => ({ ...i, price: Number(i.price) })),
  total: Number(r.total),
  tableName: r.table_name,
  ...(r.session_id ? { sessionId: r.session_id } : {}),
  ...(r.checkout_url ? { checkoutUrl: r.checkout_url } : {}),
  paid: r.status === 'paid',
})

/** Database errors are raised with a short code as the message (see the migration). */
function fail(error: { message?: string }): never {
  const code = error.message ?? ''
  if (/^[a-z_]+$/.test(code)) throw new OrderError(code)
  throw new Error(`supabase: ${code}`)
}

export function supabaseStore(url: string, serviceKey: string): CheckoutStore {
  const sb: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
    const { data, error } = await sb.rpc(fn, args)
    if (error) fail(error)
    return data as T
  }

  return {
    async start(input: PlaceOrderInput) {
      const row = await rpc<CheckoutRow>('start_checkout', {
        p_id: input.id,
        p_table_id: input.tableId,
        p_customer_name: input.customerName ?? '',
        p_order_type: input.orderType,
        p_items: input.items,
        p_notes: input.notes ?? null,
      })
      return fromRow(row)
    },
    async attach(orderId, sessionId, checkoutUrl) {
      return fromRow(await rpc<CheckoutRow>('attach_checkout', { p_id: orderId, p_session_id: sessionId, p_checkout_url: checkoutUrl }))
    },
    async find(orderId) {
      const { data, error } = await sb.from('checkouts').select('*').eq('order_id', orderId).maybeSingle()
      if (error) fail(error)
      return data ? fromRow(data as CheckoutRow) : null
    },
    async confirm({ orderId, sessionId, paymentRef, amountCentavos, method }) {
      await rpc('confirm_checkout', {
        p_id: orderId,
        p_session_id: sessionId,
        p_payment_ref: paymentRef,
        p_amount_centavos: amountCentavos,
        p_method: method ?? null,
      })
    },
  }
}

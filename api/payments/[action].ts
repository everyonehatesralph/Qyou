/**
 * Vercel Function for /api/payments/* (config, checkout, confirm, webhook): paying online with
 * PayMongo, orders in Supabase. See server/payments/service.ts.
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   PAYMONGO_SECRET_KEY        sk_test_… / sk_live_…   without it, paying online is off
 *   PAYMONGO_WEBHOOK_SECRET    whsk_…                  the webhook's secret (optional, recommended)
 *   PAYMONGO_METHODS           gcash,paymaya,qrph,card (optional)
 *   SUPABASE_SERVICE_ROLE_KEY  the service role (or secret) key; never a VITE_ variable
 *   SUPABASE_URL               optional; VITE_SUPABASE_URL is used otherwise
 */
import { handlePaymentsRequest, settingsFromEnv } from '../../server/payments/service.ts'
import { supabaseStore } from '../../server/payments/supabaseStore.ts'

function deps() {
  const env = process.env
  const settings = settingsFromEnv(env)
  if (!settings) return null
  const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    console.error('[payments] PAYMONGO_SECRET_KEY is set but SUPABASE_SERVICE_ROLE_KEY or the Supabase URL is not; paying online stays off')
    return null
  }
  return { settings, store: supabaseStore(url, key) }
}

let cached: ReturnType<typeof deps> | undefined
const handle = (request: Request) => handlePaymentsRequest(request, cached === undefined ? (cached = deps()) : cached)

export const GET = handle
export const POST = handle

/// <reference types="vite/client" />
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const SUPABASE_CONFIGURED = !!(supabaseUrl && supabaseAnonKey)

/** Where the staff sign-in is kept on this device. */
export const STAFF_SESSION_KEY = 'qyou_staff_session'

let client: Promise<SupabaseClient> | null = null

/** The SDK is loaded on first use, so the landing page never downloads it. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!SUPABASE_CONFIGURED) return Promise.reject(new Error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'))
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { storageKey: STAFF_SESSION_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    }),
  )
  return client
}

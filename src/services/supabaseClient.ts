/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js'
const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL     as string
const supabaseAnonKey= import.meta.env.VITE_SUPABASE_ANON_KEY as string
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}
export const supabase: SupabaseClient = createClient(
  supabaseUrl    || '',
  supabaseAnonKey|| ''
)

export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('tables').select('count')
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    console.log('✅ Supabase connected')
    return true
  } catch (err) {
    console.error('❌ Supabase connection failed:', err)
    return false
  }
}

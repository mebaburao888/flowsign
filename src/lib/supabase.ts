import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321').trim()
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'missing-anon-key').trim()
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'missing-service-role-key').trim()

// Client-side (browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side (API routes) — bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

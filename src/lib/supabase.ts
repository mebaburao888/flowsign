import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()

// Client-side (browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side (API routes) — bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

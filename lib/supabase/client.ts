import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Message = {
  id: string
  room: string
  username: string
  user_color: string
  message: string
  created_at: string
}

export type TypingIndicator = {
  id: string
  room: string
  username: string
  user_color: string
  updated_at: string
}

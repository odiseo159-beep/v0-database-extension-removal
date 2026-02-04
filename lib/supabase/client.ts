import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

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

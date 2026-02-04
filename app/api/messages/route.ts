import { NextRequest, NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// In-memory storage as fallback when database schema cache is not ready
interface Message {
  id: string
  room: string
  username: string
  user_color: string
  message: string
  created_at: string
}

const inMemoryMessages: Message[] = []
let dbAvailable = false

async function tryDatabase(room: string): Promise<Message[] | null> {
  // Skip database entirely if service key is not available
  if (!SUPABASE_SERVICE_KEY || !SUPABASE_URL) {
    return null
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?room=eq.${encodeURIComponent(room)}&order=created_at.asc&limit=100`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    )

    // Any non-2xx response means DB not ready, use fallback
    if (!res.ok) {
      return null
    }

    const data = await res.json()
    // Check if response is actually an error object
    if (data && data.code) {
      return null
    }

    dbAvailable = true
    return data
  } catch {
    return null
  }
}

async function insertToDatabase(msg: Omit<Message, "id" | "created_at">): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(msg),
    })

    if (!res.ok) {
      const errorText = await res.text()
      if (errorText.includes("schema cache")) {
        return false
      }
      return false
    }

    dbAvailable = true
    return true
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room") || "lobby"

  // Try database first
  const dbMessages = await tryDatabase(room)
  if (dbMessages !== null) {
    return NextResponse.json(dbMessages)
  }

  // Fallback to in-memory
  const roomMessages = inMemoryMessages.filter(m => m.room === room)
  return NextResponse.json(roomMessages)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room, username, user_color, message } = body

    // Try database first
    const dbSuccess = await insertToDatabase({ room, username, user_color, message })
    
    if (!dbSuccess) {
      // Fallback to in-memory
      const newMessage: Message = {
        id: crypto.randomUUID(),
        room,
        username,
        user_color,
        message,
        created_at: new Date().toISOString(),
      }
      inMemoryMessages.push(newMessage)
      
      // Keep only last 500 messages in memory
      if (inMemoryMessages.length > 500) {
        inMemoryMessages.shift()
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: "Failed to insert message" }, { status: 500 })
  }
}

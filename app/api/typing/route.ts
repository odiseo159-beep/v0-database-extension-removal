import { NextRequest, NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// In-memory storage as fallback
interface TypingIndicator {
  id: string
  room: string
  username: string
  user_color: string
  updated_at: string
}

const inMemoryTyping: Map<string, TypingIndicator> = new Map()

function cleanOldTyping() {
  const tenSecondsAgo = Date.now() - 10000
  for (const [key, indicator] of inMemoryTyping.entries()) {
    if (new Date(indicator.updated_at).getTime() < tenSecondsAgo) {
      inMemoryTyping.delete(key)
    }
  }
}

async function tryGetTyping(room: string): Promise<TypingIndicator[] | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/typing_indicators?room=eq.${encodeURIComponent(room)}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      if (errorText.includes("schema cache")) {
        return null
      }
      return null
    }

    return await res.json()
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room") || "lobby"

  // Try database first
  const dbTyping = await tryGetTyping(room)
  if (dbTyping !== null) {
    return NextResponse.json(dbTyping)
  }

  // Fallback to in-memory
  cleanOldTyping()
  const roomTyping = Array.from(inMemoryTyping.values()).filter(t => t.room === room)
  return NextResponse.json(roomTyping)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room, username, user_color } = body

    // Try database
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/typing_indicators?room=eq.${encodeURIComponent(room)}&username=eq.${encodeURIComponent(username)}`,
        {
          method: "DELETE",
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      )

      await fetch(`${SUPABASE_URL}/rest/v1/typing_indicators`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ room, username, user_color }),
      })
    } catch {
      // Ignore database errors
    }

    // Always update in-memory as backup
    const key = `${room}:${username}`
    inMemoryTyping.set(key, {
      id: crypto.randomUUID(),
      room,
      username,
      user_color,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room")
  const username = searchParams.get("username")

  if (!room || !username) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  // Try database
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/typing_indicators?room=eq.${encodeURIComponent(room)}&username=eq.${encodeURIComponent(username)}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    )
  } catch {
    // Ignore database errors
  }

  // Always update in-memory
  const key = `${room}:${username}`
  inMemoryTyping.delete(key)

  return NextResponse.json({ success: true })
}

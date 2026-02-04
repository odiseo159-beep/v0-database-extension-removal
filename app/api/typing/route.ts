import { NextRequest, NextResponse } from "next/server"

// Simple in-memory storage for typing indicators
interface TypingIndicator {
  id: string
  room: string
  username: string
  user_color: string
  updated_at: string
}

// Global in-memory store for typing indicators
const typingStore: Map<string, TypingIndicator> = new Map()

function cleanOldTypingIndicators(): void {
  const tenSecondsAgo = Date.now() - 10000
  
  for (const [key, indicator] of typingStore.entries()) {
    const updatedAt = new Date(indicator.updated_at).getTime()
    if (updatedAt < tenSecondsAgo) {
      typingStore.delete(key)
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room") || "lobby"

  // Clean old typing indicators first
  cleanOldTypingIndicators()

  // Get typing users for this room
  const typingUsers = Array.from(typingStore.values()).filter(t => t.room === room)
  
  return NextResponse.json(typingUsers)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room = "lobby", username, user_color } = body

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 })
    }

    const key = `${room}:${username}`
    
    const indicator: TypingIndicator = {
      id: `typing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      room,
      username,
      user_color: user_color || "#000000",
      updated_at: new Date().toISOString(),
    }

    typingStore.set(key, indicator)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update typing" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room") || "lobby"
  const username = searchParams.get("username")

  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 })
  }

  const key = `${room}:${username}`
  typingStore.delete(key)

  return NextResponse.json({ success: true })
}

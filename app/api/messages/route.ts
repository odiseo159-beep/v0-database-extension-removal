import { NextRequest, NextResponse } from "next/server"

// Simple in-memory storage for messages
interface Message {
  id: string
  room: string
  username: string
  user_color: string
  message: string
  created_at: string
}

// Global in-memory store
const messagesStore: Map<string, Message[]> = new Map()

function getMessagesForRoom(room: string): Message[] {
  if (!messagesStore.has(room)) {
    messagesStore.set(room, [])
  }
  return messagesStore.get(room)!
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room") || "lobby"

  const messages = getMessagesForRoom(room)
  
  // Return only the last 100 messages
  const recentMessages = messages.slice(-100)
  
  return NextResponse.json(recentMessages)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room = "lobby", username, user_color, message } = body

    if (!username || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      room,
      username,
      user_color: user_color || "#000000",
      message,
      created_at: new Date().toISOString(),
    }

    const messages = getMessagesForRoom(room)
    messages.push(newMessage)

    // Keep only the last 500 messages per room to prevent memory issues
    if (messages.length > 500) {
      messagesStore.set(room, messages.slice(-500))
    }

    return NextResponse.json({ success: true, message: newMessage })
  } catch (error) {
    return NextResponse.json({ error: "Failed to insert message" }, { status: 500 })
  }
}

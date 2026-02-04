import { Redis } from "@upstash/redis"
import { NextRequest, NextResponse } from "next/server"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

interface Message {
  id: string
  room: string
  username: string
  user_color: string
  message: string
  created_at: string
}

// Rate limiting constants
const RATE_LIMIT_SECONDS = 10

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room") || "lobby"

  try {
    // Get messages from Redis sorted set
    const messages = await redis.zrange<Message[]>(`messages:${room}`, 0, 99, {
      rev: true,
    })

    // Reverse to get chronological order
    return NextResponse.json(messages.reverse())
  } catch (error) {
    console.error("[v0] Error fetching messages:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room, username, user_color, message } = body

    if (!username || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check rate limit
    const rateLimitKey = `ratelimit:${room}:${username}`
    const lastMessageTime = await redis.get<number>(rateLimitKey)
    const now = Date.now()

    if (lastMessageTime) {
      const timeSinceLastMessage = now - lastMessageTime
      if (timeSinceLastMessage < RATE_LIMIT_SECONDS * 1000) {
        const waitTime = Math.ceil((RATE_LIMIT_SECONDS * 1000 - timeSinceLastMessage) / 1000)
        return NextResponse.json(
          { error: `Espera ${waitTime} segundos antes de enviar otro mensaje`, waitTime },
          { status: 429 }
        )
      }
    }

    // Create message
    const newMessage: Message = {
      id: crypto.randomUUID(),
      room,
      username,
      user_color,
      message,
      created_at: new Date().toISOString(),
    }

    // Store message in sorted set with timestamp as score
    await redis.zadd(`messages:${room}`, {
      score: now,
      member: JSON.stringify(newMessage),
    })

    // Set rate limit
    await redis.set(rateLimitKey, now, { ex: RATE_LIMIT_SECONDS })

    // Keep only last 100 messages
    await redis.zremrangebyrank(`messages:${room}`, 0, -101)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error inserting message:", error)
    return NextResponse.json({ error: "Failed to insert message" }, { status: 500 })
  }
}

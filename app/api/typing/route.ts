import { Redis } from "@upstash/redis"
import { NextRequest, NextResponse } from "next/server"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

interface TypingIndicator {
  id: string
  room: string
  username: string
  user_color: string
  updated_at: string
}

const TYPING_EXPIRATION_SECONDS = 10

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room") || "lobby"

  try {
    // Get all typing indicators for this room
    const typingKey = `typing:${room}`
    const typingData = await redis.hgetall<Record<string, string>>(typingKey)

    if (!typingData) {
      return NextResponse.json([])
    }

    // Convert to array and filter expired ones
    const now = Date.now()
    const typingUsers: TypingIndicator[] = []

    for (const [username, data] of Object.entries(typingData)) {
      const indicator = JSON.parse(data) as TypingIndicator
      const updatedAt = new Date(indicator.updated_at).getTime()
      
      // Remove if older than 10 seconds
      if (now - updatedAt > TYPING_EXPIRATION_SECONDS * 1000) {
        await redis.hdel(typingKey, username)
      } else {
        typingUsers.push(indicator)
      }
    }

    return NextResponse.json(typingUsers)
  } catch (error) {
    console.error("[v0] Error fetching typing:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room, username, user_color } = body

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 })
    }

    const typingIndicator: TypingIndicator = {
      id: crypto.randomUUID(),
      room,
      username,
      user_color,
      updated_at: new Date().toISOString(),
    }

    // Store in hash with username as field
    await redis.hset(`typing:${room}`, {
      [username]: JSON.stringify(typingIndicator),
    })

    // Set expiration on the entire hash
    await redis.expire(`typing:${room}`, TYPING_EXPIRATION_SECONDS * 2)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating typing:", error)
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

  try {
    await redis.hdel(`typing:${room}`, username)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error removing typing:", error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

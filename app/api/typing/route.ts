import { NextRequest, NextResponse } from "next/server"
import postgres from "postgres"

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || "", {
  ssl: { rejectUnauthorized: false },
  max: 1,
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room") || "lobby"

  try {
    // Clean up old typing indicators first (older than 10 seconds)
    await sql`
      DELETE FROM typing_indicators
      WHERE updated_at < NOW() - INTERVAL '10 seconds'
    `

    const typingUsers = await sql`
      SELECT id, room, username, user_color, updated_at
      FROM typing_indicators
      WHERE room = ${room}
    `

    return NextResponse.json(typingUsers)
  } catch (err) {
    console.error("[v0] Error fetching typing:", err)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room, username, user_color } = body

    // Upsert typing indicator
    await sql`
      INSERT INTO typing_indicators (room, username, user_color, updated_at)
      VALUES (${room}, ${username}, ${user_color}, NOW())
      ON CONFLICT (room, username)
      DO UPDATE SET updated_at = NOW(), user_color = ${user_color}
    `

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[v0] Error updating typing:", err)
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
    await sql`
      DELETE FROM typing_indicators
      WHERE room = ${room} AND username = ${username}
    `

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[v0] Error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

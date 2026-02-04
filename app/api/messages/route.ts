import { NextRequest, NextResponse } from "next/server"
import postgres from "postgres"

// Direct PostgreSQL connection using the connection string
const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.SUPABASE_DB_URL || 
  `postgresql://postgres.${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')}:${process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || "", {
  ssl: { rejectUnauthorized: false },
  max: 1,
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room") || "lobby"

  try {
    const messages = await sql`
      SELECT id, room, username, user_color, message, created_at
      FROM messages
      WHERE room = ${room}
      ORDER BY created_at ASC
      LIMIT 100
    `
    return NextResponse.json(messages)
  } catch (err) {
    console.error("[v0] Error fetching messages:", err)
    // Return empty array instead of error to prevent UI breaking
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room, username, user_color, message } = body

    await sql`
      INSERT INTO messages (room, username, user_color, message)
      VALUES (${room}, ${username}, ${user_color}, ${message})
    `

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[v0] Error inserting message:", err)
    return NextResponse.json({ error: "Failed to insert message" }, { status: 500 })
  }
}

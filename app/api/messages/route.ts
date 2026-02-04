import { NextRequest, NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room") || "lobby"

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

    if (!res.ok) {
      const errorText = await res.text()
      console.log("[v0] Supabase REST error:", res.status, errorText)
      return NextResponse.json([])
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.log("[v0] Error fetching messages:", err)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room, username, user_color, message } = body

    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        room,
        username,
        user_color,
        message,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.log("[v0] Insert error:", res.status, errorText)
      return NextResponse.json({ error: "Failed to insert" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.log("[v0] Error inserting message:", err)
    return NextResponse.json({ error: "Failed to insert message" }, { status: 500 })
  }
}

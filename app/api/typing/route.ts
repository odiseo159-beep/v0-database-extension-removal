import { NextRequest, NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room") || "lobby"

  try {
    // Clean old typing indicators
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString()
    await fetch(
      `${SUPABASE_URL}/rest/v1/typing_indicators?updated_at=lt.${encodeURIComponent(tenSecondsAgo)}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    // Get current typing users
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
      return NextResponse.json([])
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.log("[v0] Error fetching typing:", err)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room, username, user_color } = body

    // Delete existing first
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

    // Insert new
    await fetch(`${SUPABASE_URL}/rest/v1/typing_indicators`, {
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
      }),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.log("[v0] Error updating typing:", err)
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

    return NextResponse.json({ success: true })
  } catch (err) {
    console.log("[v0] Error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

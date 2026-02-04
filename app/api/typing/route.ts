import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public'
    }
  }
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room") || "lobby"

  try {
    // Clean up old typing indicators first (older than 10 seconds)
    await supabaseAdmin
      .from('typing_indicators')
      .delete()
      .lt('updated_at', new Date(Date.now() - 10000).toISOString())

    const { data, error } = await supabaseAdmin
      .from('typing_indicators')
      .select('*')
      .eq('room', room)

    if (error) {
      console.error("Error fetching typing:", error)
      return NextResponse.json([])
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room, username, user_color } = body

    // Delete existing then insert new
    await supabaseAdmin
      .from('typing_indicators')
      .delete()
      .eq('room', room)
      .eq('username', username)

    const { error } = await supabaseAdmin
      .from('typing_indicators')
      .insert({ room, username, user_color })

    if (error) {
      console.error("Error updating typing:", error)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error:", err)
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
    await supabaseAdmin
      .from('typing_indicators')
      .delete()
      .eq('room', room)
      .eq('username', username)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

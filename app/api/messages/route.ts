import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// Use service role key to bypass RLS and schema cache issues
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
    // Use raw SQL query to bypass schema cache entirely
    const { data, error } = await supabaseAdmin.rpc('get_messages', {
      room_name: room,
      message_limit: 100
    })

    if (error) {
      // Fallback to direct SQL if RPC fails
      const { data: sqlData, error: sqlError } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('room', room)
        .order('created_at', { ascending: true })
        .limit(100)

      if (sqlError) {
        console.error("SQL Error:", sqlError)
        return NextResponse.json({ error: sqlError.message }, { status: 500 })
      }

      return NextResponse.json(sqlData || [])
    }

    // RPC returns in DESC order, so reverse it
    return NextResponse.json((data || []).reverse())
  } catch (err) {
    console.error("Error fetching messages:", err)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room, username, user_color, message } = body

    // Try RPC first
    const { error } = await supabaseAdmin.rpc('insert_message', {
      room_name: room,
      user_name: username,
      user_color_val: user_color,
      message_text: message
    })

    if (error) {
      // Fallback to direct insert
      const { error: insertError } = await supabaseAdmin
        .from('messages')
        .insert({ room, username, user_color, message })

      if (insertError) {
        console.error("Insert Error:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error inserting message:", err)
    return NextResponse.json({ error: "Failed to insert message" }, { status: 500 })
  }
}

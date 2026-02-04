"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, UserPlus, Settings, Mail, Phone, Video, ImageIcon, Smile, Loader2, Zap } from "lucide-react"
import Image from "next/image"
import { Modal } from "@/components/modal"
import { EmojiPicker } from "@/components/emoji-picker"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface Message {
  id: string
  room: string
  username: string
  user_color: string
  message: string
  created_at: string
}

interface TypingIndicator {
  id: string
  room: string
  username: string
  user_color: string
  updated_at: string
}

// Helper functions for direct REST API calls (bypasses schema cache)
async function fetchMessagesAPI(room: string): Promise<Message[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/messages?room=eq.${room}&order=created_at.asc&limit=100`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  )
  if (!res.ok) throw new Error("Failed to fetch messages")
  return res.json()
}

async function insertMessageAPI(room: string, username: string, userColor: string, message: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      room,
      username,
      user_color: userColor,
      message,
    }),
  })
}

async function updateTypingAPI(room: string, username: string, userColor: string): Promise<void> {
  // First try to delete existing, then insert new
  await fetch(
    `${SUPABASE_URL}/rest/v1/typing_indicators?room=eq.${room}&username=eq.${username}`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  )
  await fetch(`${SUPABASE_URL}/rest/v1/typing_indicators`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      room,
      username,
      user_color: userColor,
    }),
  })
}

async function removeTypingAPI(room: string, username: string): Promise<void> {
  await fetch(
    `${SUPABASE_URL}/rest/v1/typing_indicators?room=eq.${room}&username=eq.${username}`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  )
}

async function fetchTypingUsersAPI(room: string): Promise<TypingIndicator[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/typing_indicators?room=eq.${room}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  )
  if (!res.ok) return []
  return res.json()
}

const EMOJI_SHORTCUTS: Record<string, string> = {
  ":rocket:": "🚀",
  ":fire:": "🔥",
  ":heart:": "❤️",
  ":smile:": "😊",
  ":laugh:": "😂",
  ":cool:": "😎",
  ":thumbsup:": "👍",
  ":thumbsdown:": "👎",
  ":clap:": "👏",
  ":party:": "🎉",
}

const PROFANITY_WORDS = ["fuck", "shit", "bitch", "ass", "damn", "hell", "crap"]

const CRYPTO_MEME_NAMES = [
  "Hodler",
  "DiamondHands",
  "ToTheMoon",
  "Degen",
  "Ape",
  "Whale",
  "Shrimp",
  "Moonboy",
  "Bagholder",
  "Gigachad",
  "Wojak",
  "Pepe",
  "Bobo",
  "Wagmi",
  "Ngmi",
  "Gm",
  "Ser",
  "Anon",
  "Fren",
  "Rekt",
  "Pump",
  "Dump",
  "Shill",
  "Fud",
  "Fomo",
  "Yolo",
  "Lambo",
  "Wen",
  "Cope",
  "Hopium",
]

function filterProfanity(text: string): string {
  let filtered = text
  PROFANITY_WORDS.forEach((word) => {
    const regex = new RegExp(word, "gi")
    filtered = filtered.replace(regex, "*".repeat(word.length))
  })
  return filtered
}

function replaceEmojiShortcuts(text: string): string {
  let result = text
  Object.entries(EMOJI_SHORTCUTS).forEach(([shortcut, emoji]) => {
    result = result.replace(new RegExp(shortcut, "g"), emoji)
  })
  return result
}

export default function ForssengerPage() {
  const supabase = createClient()
  const [activeContact, setActiveContact] = useState<number | null>(null)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentRoom, setCurrentRoom] = useState("lobby")
  const [username, setUsername] = useState("")
  const [userColor, setUserColor] = useState("")
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isNudging, setIsNudging] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const { toast } = useToast()
  const [showUsernameModal, setShowUsernameModal] = useState(true)
  const [tempUsername, setTempUsername] = useState("")

  // Generate random username and color on mount
  useEffect(() => {
    const randomName = CRYPTO_MEME_NAMES[Math.floor(Math.random() * CRYPTO_MEME_NAMES.length)]
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`
    setTempUsername(randomName)
    setUserColor(randomColor)
  }, [])

  // Fetch initial messages
  useEffect(() => {
    if (!username) return

    const fetchMessages = async () => {
      try {
        const data = await fetchMessagesAPI(currentRoom)
        setMessages(data)
      } catch (error) {
        console.error("Error fetching messages:", error)
      }
    }

    fetchMessages()
  }, [username, currentRoom])

  // Subscribe to new messages
  useEffect(() => {
    if (!username) return

    const channel = supabase
      .channel(`room:${currentRoom}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room=eq.${currentRoom}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => [...prev, newMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [username, currentRoom])

  // Subscribe to typing indicators
  useEffect(() => {
    if (!username) return

    const fetchTypingUsers = async () => {
      try {
        const data = await fetchTypingUsersAPI(currentRoom)
        setTypingUsers(data.filter((t) => t.username !== username))
      } catch (error) {
        console.error("Error fetching typing users:", error)
      }
    }

    fetchTypingUsers()

    const channel = supabase
      .channel(`typing:${currentRoom}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `room=eq.${currentRoom}`,
        },
        () => {
          fetchTypingUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [username, currentRoom])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Update typing indicator
  const updateTypingIndicator = useCallback(async () => {
    if (!username) return

    await updateTypingAPI(currentRoom, username, userColor)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await removeTypingAPI(currentRoom, username)
    }, 3000)
  }, [username, currentRoom, userColor])

  const handleSendMessage = async () => {
    if (!message.trim() || !username) return

    const processedMessage = replaceEmojiShortcuts(filterProfanity(message.trim()))

    await insertMessageAPI(currentRoom, username, userColor, processedMessage)

    // Remove typing indicator
    await removeTypingAPI(currentRoom, username)

    setMessage("")
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const handleNudge = () => {
    if (isNudging) return

    setIsNudging(true)
    toast({
      title: "Nudge sent! 👋",
      description: "Everyone in the room has been nudged!",
    })

    setTimeout(() => {
      setIsNudging(false)
    }, 5000)
  }

  const handleUsernameSubmit = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim())
      setShowUsernameModal(false)
    }
  }

  const contacts = [
    { id: 1, name: "Elon", avatar: "/avatars/elon.png", status: "Online", room: "elon" },
    { id: 2, name: "Vitalik", avatar: "/avatars/vitalik.png", status: "Online", room: "vitalik" },
    { id: 3, name: "CZ", avatar: "/avatars/cz.png", status: "Online", room: "cz" },
    { id: 4, name: "SBF", avatar: "/avatars/sbf.png", status: "Offline", room: "sbf" },
    { id: 5, name: "Saylor", avatar: "/avatars/saylor.png", status: "Online", room: "saylor" },
    { id: 6, name: "Jack Dorsey", avatar: "/avatars/dorsey.png", status: "Online", room: "dorsey" },
    { id: 7, name: "Naval", avatar: "/avatars/naval.png", status: "Online", room: "naval" },
    { id: 8, name: "Balaji", avatar: "/avatars/balaji.png", status: "Online", room: "balaji" },
    { id: 9, name: "Marc Andreessen", avatar: "/avatars/marc.png", status: "Online", room: "marc" },
    { id: 10, name: "Chamath", avatar: "/avatars/chamath.png", status: "Online", room: "chamath" },
    { id: 11, name: "Cathie Wood", avatar: "/avatars/kathy.png", status: "Online", room: "kathy" },
    { id: 12, name: "Brian Armstrong", avatar: "/avatars/brian.png", status: "Online", room: "brian" },
    { id: 13, name: "Sam Altman", avatar: "/avatars/sam-altman.png", status: "Online", room: "sam" },
    { id: 14, name: "Linus", avatar: "/avatars/linus.png", status: "Online", room: "linus" },
    { id: 15, name: "Donald Trump", avatar: "/avatars/trump.png", status: "Online", room: "trump" },
    { id: 16, name: "Joe Biden", avatar: "/avatars/biden.png", status: "Online", room: "biden" },
    { id: 17, name: "Gary Gensler", avatar: "/avatars/gensler.png", status: "Online", room: "gensler" },
    { id: 18, name: "Jerome Powell", avatar: "/avatars/powell.png", status: "Online", room: "powell" },
    { id: 19, name: "Janet Yellen", avatar: "/avatars/yellen.png", status: "Online", room: "yellen" },
    { id: 20, name: "Nayib Bukele", avatar: "/avatars/bukele.png", status: "Online", room: "bukele" },
  ]

  return (
    <div
      className="flex h-screen overflow-hidden font-sans"
      style={{ background: "linear-gradient(to bottom, #2dd881, #0d7a3f)" }}
    >
      <Modal isOpen={showUsernameModal} onClose={() => {}}>
        <div className="p-6">
          <h2 className="mb-4 text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {"Choose your username"}
          </h2>
          <input
            type="text"
            value={tempUsername}
            onChange={(e) => setTempUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleUsernameSubmit()
              }
            }}
            className="mb-4 w-full rounded border border-gray-300 px-3 py-2 focus:border-[var(--msn-blue-500)] focus:outline-none"
            placeholder="Enter username..."
            autoFocus
          />
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {"Your color:"}
            </span>
            <div
              className="h-6 w-6 rounded-full border border-gray-300"
              style={{ backgroundColor: userColor }}
            />
          </div>
          <button
            onClick={handleUsernameSubmit}
            className="w-full rounded px-4 py-2 font-semibold text-white"
            style={{ background: "var(--msn-blue-500)" }}
          >
            {"Join Chat"}
          </button>
        </div>
      </Modal>

      {/* Left sidebar */}
      <div
        className="flex w-64 flex-col border-r"
        style={{
          borderColor: "var(--msn-border)",
          background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 border-b px-4 py-3"
          style={{
            borderColor: "var(--msn-border)",
          }}
        >
          <Image src="/4ssenger-logo.png" alt="4ssenger" width={24} height={24} className="flex-shrink-0" />
          <span style={{ color: "var(--text-primary)", fontWeight: "600", fontSize: "15px" }}>4ssenger</span>
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center justify-between border-b px-4 py-2"
          style={{
            borderColor: "var(--msn-border)",
          }}
        >
          <div className="flex gap-1">
            <button
              className="rounded p-1 transition-colors"
              style={{
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Search"
            >
              <Search size={16} style={{ color: "var(--text-primary)" }} />
            </button>
            <button
              className="rounded p-1 transition-colors"
              style={{
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Add contact"
            >
              <UserPlus size={16} style={{ color: "var(--text-primary)" }} />
            </button>
          </div>
          <button
            className="rounded p-1 transition-colors"
            style={{
              background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
              border: "1px solid var(--msn-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
            }}
            aria-label="Settings"
          >
            <Settings size={16} style={{ color: "var(--text-primary)" }} />
          </button>
        </div>

        {/* User info */}
        <div
          className="border-b px-4 py-3"
          style={{
            borderColor: "var(--msn-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Image
                src="/4ssenger-logo.png"
                alt="User"
                width={32}
                height={32}
                className="rounded-full border"
                style={{ borderColor: "var(--msn-border)" }}
              />
              <div
                className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white"
                style={{ backgroundColor: "var(--success-green)" }}
              />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {username || "Guest"}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {"Online"}
              </div>
            </div>
          </div>
        </div>

        {/* Contacts list */}
        <ScrollArea className="flex-1" style={{ background: "linear-gradient(to bottom, #ecfdf5, #FFFFFF)" }}>
          <div className="p-2">
            {contacts.map((contact, i) => (
              <button
                key={contact.id}
                onClick={() => setCurrentRoom(contact.room)}
                className="mb-1 flex w-full items-center gap-3 rounded px-3 py-2 text-left transition-colors"
                style={{
                  background: "#ecfdf5",
                  border: currentRoom === contact.room ? "1px solid var(--msn-blue-500)" : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f0fdf4"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ecfdf5"
                }}
              >
                <div className="relative">
                  <Image
                    src={contact.avatar || "/placeholder.svg"}
                    alt={contact.name}
                    width={32}
                    height={32}
                    className="rounded-full border"
                    style={{ borderColor: "var(--msn-border)" }}
                  />
                  {contact.status === "Online" && (
                    <div
                      className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white"
                      style={{ backgroundColor: "var(--success-green)" }}
                    />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {contact.name}
                  </div>
                  <div className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                    {contact.status}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Chat header */}
        <div
          className="flex items-center justify-between border-b px-4 py-2"
          style={{
            borderColor: "var(--msn-border)",
            background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
          }}
        >
          <div className="flex items-center gap-3">
            <Image
              src="/4ssenger-logo.png"
              alt={currentRoom}
              width={32}
              height={32}
              className="rounded-full border"
              style={{ borderColor: "var(--msn-border)" }}
            />
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {currentRoom.charAt(0).toUpperCase() + currentRoom.slice(1)}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {"Online"}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded p-2 transition-colors"
              style={{
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Email"
            >
              <Mail size={16} style={{ color: "var(--text-primary)" }} />
            </button>
            <button
              className="rounded p-2 transition-colors"
              style={{
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Call"
            >
              <Phone size={16} style={{ color: "var(--text-primary)" }} />
            </button>
            <button
              className="rounded p-2 transition-colors"
              style={{
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Video call"
            >
              <Video size={16} style={{ color: "var(--text-primary)" }} />
            </button>
          </div>
        </div>

        {/* Live banner */}
        <div
          className={`flex items-center gap-2 px-4 py-1.5 ${isNudging ? "animate-bounce" : ""}`}
          style={{
            background: "linear-gradient(to right, var(--msn-blue-500), #10b981)",
          }}
        >
          <Zap size={14} className="text-white" fill="white" />
          <div className="text-xs font-bold text-white flex-1">4ssenger Live</div>
          <Image
            src="/4ssenger-logo.png"
            alt="4ssenger"
            width={16}
            height={16}
            className="rounded-full"
            style={{ border: "1px solid white" }}
          />
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden bg-white">
          <ScrollArea className="h-full px-4 py-2">
            <div className="space-y-1">
              {messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className="flex items-start gap-2 rounded px-2 py-1 text-sm"
                  style={{
                    background: i % 2 === 0 ? "transparent" : "#f0fdf4",
                  }}
                >
                  <span className="font-bold" style={{ color: msg.user_color }}>
                    {msg.username}:
                  </span>
                  <span style={{ color: "var(--text-primary)" }}>{msg.message}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="border-t px-4 py-2 text-xs" style={{ borderColor: "var(--msn-border)" }}>
            <div className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--msn-blue-500)" }} />
              <span style={{ color: "var(--text-muted)" }}>
                {typingUsers.map((u) => u.username).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
              </span>
            </div>
          </div>
        )}

        {/* Input area */}
        <div
          className="border-t p-4"
          style={{
            borderColor: "var(--msn-border)",
            background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
          }}
        >
          <div className="mb-2 flex gap-2">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="rounded p-2 transition-colors"
              style={{
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Emoji"
            >
              <Smile size={16} style={{ color: "var(--text-primary)" }} />
            </button>
            <button
              onClick={handleNudge}
              disabled={isNudging}
              className="rounded p-2 transition-colors disabled:opacity-50"
              style={{
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
              }}
              onMouseEnter={(e) => {
                if (!isNudging) {
                  e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Nudge"
            >
              <Zap size={16} style={{ color: isNudging ? "var(--text-muted)" : "var(--text-primary)" }} />
            </button>
            <button
              className="rounded p-2 transition-colors"
              style={{
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Send image"
            >
              <ImageIcon size={16} style={{ color: "var(--text-primary)" }} />
            </button>
          </div>

          {showEmojiPicker && (
            <div className="mb-2">
              <EmojiPicker
                onEmojiSelect={(emoji) => {
                  setMessage((prev) => prev + emoji)
                  setShowEmojiPicker(false)
                }}
              />
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                updateTypingIndicator()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Type a message..."
              className="flex-1 rounded border px-3 py-2 text-sm focus:outline-none"
              style={{
                borderColor: "var(--msn-border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="rounded px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{
                background: "var(--msn-blue-500)",
              }}
            >
              {"Send"}
            </button>
          </div>

          <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {"Tip: Use :emoji: shortcuts like :rocket: :fire: :heart:"}
          </div>
        </div>
      </div>
    </div>
  )
}

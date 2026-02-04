"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, UserPlus, Settings, Mail, Send, ImageIcon, Smile, Loader2, Zap, Phone, Video } from "lucide-react"
import Image from "next/image"
import { Modal } from "@/components/modal"
import { EmojiPicker } from "@/components/emoji-picker"
import { useToast } from "@/hooks/use-toast"
// No database dependencies - using in-memory storage via API routes

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

// API functions using Next.js API routes (bypasses schema cache completely)
async function fetchMessagesAPI(room: string): Promise<Message[]> {
  const res = await fetch(`/api/messages?room=${encodeURIComponent(room)}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Failed to fetch messages")
  }
  return res.json()
}

async function insertMessageAPI(room: string, username: string, userColor: string, message: string): Promise<void> {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room, username, user_color: userColor, message }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || "Failed to send message")
  }
}

async function updateTypingAPI(room: string, username: string, userColor: string): Promise<void> {
  await fetch("/api/typing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room, username, user_color: userColor }),
  })
}

async function removeTypingAPI(room: string, username: string): Promise<void> {
  await fetch(`/api/typing?room=${encodeURIComponent(room)}&username=${encodeURIComponent(username)}`, {
    method: "DELETE",
  })
}

async function fetchTypingUsersAPI(room: string): Promise<TypingIndicator[]> {
  const res = await fetch(`/api/typing?room=${encodeURIComponent(room)}`)
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

function replaceEmojiShortcuts(text: string): string {
  let result = text
  Object.entries(EMOJI_SHORTCUTS).forEach(([shortcut, emoji]) => {
    result = result.replace(new RegExp(shortcut, "g"), emoji)
  })
  return result
}

export default function ForssengerPage() {
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
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)
  const rateLimitIntervalRef = useRef<NodeJS.Timeout>()

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

  // Poll for new messages every 2 seconds
  useEffect(() => {
    if (!username) return

    const pollMessages = async () => {
      try {
        const data = await fetchMessagesAPI(currentRoom)
        // Only update if different to prevent unnecessary re-renders
        setMessages((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) {
            return prev
          }
          return data
        })
      } catch (error) {
        // Silently ignore polling errors
      }
    }

    const interval = setInterval(pollMessages, 2000)

    return () => {
      clearInterval(interval)
    }
  }, [username, currentRoom])

  // Poll for typing indicators every 3 seconds
  useEffect(() => {
    if (!username) return

    const fetchTypingUsers = async () => {
      try {
        const data = await fetchTypingUsersAPI(currentRoom)
        setTypingUsers(data.filter((t) => t.username !== username))
      } catch (error) {
        // Silently ignore polling errors
      }
    }

    fetchTypingUsers()
    const interval = setInterval(fetchTypingUsers, 3000)

    return () => {
      clearInterval(interval)
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
    if (!message.trim() || !username || rateLimitSeconds > 0) return

    const processedMessage = replaceEmojiShortcuts(message.trim())

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: currentRoom, username, user_color: userColor, message: processedMessage }),
      })

      if (!res.ok) {
        const err = await res.json()
        if (res.status === 429 && err.waitTime) {
          // Rate limited - start countdown
          setRateLimitSeconds(err.waitTime)
          if (rateLimitIntervalRef.current) {
            clearInterval(rateLimitIntervalRef.current)
          }
          rateLimitIntervalRef.current = setInterval(() => {
            setRateLimitSeconds((prev) => {
              if (prev <= 1) {
                clearInterval(rateLimitIntervalRef.current)
                return 0
              }
              return prev - 1
            })
          }, 1000)
          toast({
            title: "Rate limit",
            description: err.error,
            variant: "destructive",
          })
          return
        }
        throw new Error(err.error || "Failed to send message")
      }

      // Successfully sent - start 10 second cooldown
      setRateLimitSeconds(10)
      if (rateLimitIntervalRef.current) {
        clearInterval(rateLimitIntervalRef.current)
      }
      rateLimitIntervalRef.current = setInterval(() => {
        setRateLimitSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(rateLimitIntervalRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Remove typing indicator
      await removeTypingAPI(currentRoom, username)

      setMessage("")
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      })
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
          
          {/* Contract Address */}
          <div className="flex-1 mx-4 hidden md:flex items-center justify-center">
            <div 
              className="px-4 py-1.5 rounded-full border flex items-center gap-2 max-w-md"
              style={{
                background: "linear-gradient(to right, #f0fdf4, #ecfdf5)",
                borderColor: "var(--msn-border)",
              }}
            >
              <span className="text-xs font-mono truncate" style={{ color: "var(--text-primary)" }}>
                CA: 0x1234...5678
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("0x1234567890abcdef1234567890abcdef12345678")
                  toast({
                    title: "Copiado!",
                    description: "Contrato copiado al portapapeles",
                  })
                }}
                className="text-xs px-2 py-0.5 rounded transition-colors hover:bg-green-200"
                style={{ color: "var(--text-primary)" }}
              >
                Copy
              </button>
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
            <a
              href="https://t.me/your_telegram_channel"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-2 transition-colors inline-flex items-center justify-center"
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
              aria-label="Telegram"
            >
              <Send size={16} style={{ color: "var(--text-primary)" }} />
            </a>
            <a
              href="https://x.com/your_twitter_handle"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-2 transition-colors inline-flex items-center justify-center"
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
              aria-label="X (Twitter)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-primary)" }}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
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
              disabled={!message.trim() || rateLimitSeconds > 0}
              className="rounded px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{
                background: rateLimitSeconds > 0 ? "#6b7280" : "var(--msn-blue-500)",
              }}
            >
              {rateLimitSeconds > 0 ? `Espera ${rateLimitSeconds}s` : "Send"}
            </button>
          </div>

          <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {rateLimitSeconds > 0
              ? `Puedes enviar otro mensaje en ${rateLimitSeconds} segundos`
              : "Tip: Use :emoji: shortcuts like :rocket: :fire: :heart:"}
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, UserPlus, Settings, Mail, Phone, Video, ImageIcon, Smile, Loader2, Zap } from "lucide-react"
import Image from "next/image"
import { Modal } from "@/components/modal"
import { EmojiPicker } from "@/components/emoji-picker"
import { useToast } from "@/hooks/use-toast"

type Message = {
  id: string
  username: string
  user_color: string
  message: string
  created_at: string
  room: string
}

type TypingIndicator = {
  username: string
  user_color: string
  updated_at?: string
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
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentRoom, setCurrentRoom] = useState("lobby")
  const [username, setUsername] = useState("")
  const [userColor, setUserColor] = useState("")
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isNudging, setIsNudging] = useState(false)
  const [inMemoryMessages, setInMemoryMessages] = useState<Record<string, Message[]>>({
    lobby: [],
    bnb: [],
    usa: [],
    dev: [],
  })

  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [filesModalOpen, setFilesModalOpen] = useState(false)
  const [activitiesModalOpen, setActivitiesModalOpen] = useState(false)
  const [webcamModalOpen, setWebcamModalOpen] = useState(false)
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [addContactModalOpen, setAddContactModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

  const { toast } = useToast()
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const lastMessageTimeRef = useRef<number[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const randomName = CRYPTO_MEME_NAMES[Math.floor(Math.random() * CRYPTO_MEME_NAMES.length)]
    const randomNum = Math.floor(Math.random() * 10000)
    const randomColor = `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`
    setUsername(`${randomName}${randomNum}`)
    setUserColor(randomColor)
  }, [])

  useEffect(() => {
    setMessages(inMemoryMessages[currentRoom] || [])
  }, [currentRoom, inMemoryMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const checkRateLimit = useCallback(() => {
    const now = Date.now()
    const recentMessages = lastMessageTimeRef.current.filter((time) => now - time < 5000)

    if (recentMessages.length >= 3) {
      toast({
        title: "Slow down!",
        description: "You're sending messages too quickly. Please wait a moment.",
        variant: "destructive",
      })
      return false
    }

    lastMessageTimeRef.current = [...recentMessages, now]
    return true
  }, [toast])

  const handleSend = async () => {
    if (!message.trim() || !username) return
    if (!checkRateLimit()) return

    const processedMessage = replaceEmojiShortcuts(filterProfanity(message.trim()))

    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      room: currentRoom,
      username,
      user_color: userColor,
      message: processedMessage,
      created_at: new Date().toISOString(),
    }

    setInMemoryMessages((prev) => ({
      ...prev,
      [currentRoom]: [...(prev[currentRoom] || []), newMessage],
    }))
    setMessage("")
  }

  const handleNudge = () => {
    setIsNudging(true)
    setTimeout(() => setIsNudging(false), 500)
    toast({
      title: "Nudge!",
      description: "You sent a nudge to the chat room!",
    })
  }

  const handleFakeAction = async (actionName: string) => {
    setModalLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setModalLoading(false)
    toast({
      title: "Success!",
      description: `${actionName} completed successfully.`,
    })
    // Close all modals
    setInviteModalOpen(false)
    setFilesModalOpen(false)
    setActivitiesModalOpen(false)
    setWebcamModalOpen(false)
    setCallModalOpen(false)
    setAddContactModalOpen(false)
    setSettingsModalOpen(false)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "i") {
        e.preventDefault()
        setInviteModalOpen(true)
      }
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault()
        setFilesModalOpen(true)
      }
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault()
        handleNudge()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const contactGroups = [
    {
      label: "Online (6)",
      contacts: [
        { name: "CZ (Binance)", status: "online", message: "Building quietly. BUIDL 🧱", avatar: "/avatars/cz.png" },
        { name: "Elon Musk", status: "online", message: "Sending memes to Mars 🚀", avatar: "/avatars/elon.png" },
        {
          name: "Vitalik Buterin",
          status: "online",
          message: "Thinking in quadratic funding",
          avatar: "/avatars/vitalik.png",
        },
        { name: "Nayib Bukele", status: "online", message: "Volcano node is warm 🌋", avatar: "/avatars/bukele.png" },
        {
          name: "Brian Armstrong",
          status: "online",
          message: "On-ramping humans → crypto",
          avatar: "/avatars/brian.png",
        },
        { name: "Balaji S.", status: "online", message: "Network state musings", avatar: "/avatars/balaji.png" },
      ],
    },
    {
      label: "Away (4)",
      contacts: [
        { name: "Donald Trump", status: "away", message: "BRB, posting on X", avatar: "/avatars/trump.png" },
        { name: "Joe Biden", status: "away", message: "In a briefing…", avatar: "/avatars/biden.png" },
        { name: "Jack Dorsey", status: "away", message: "Decentralize all the things", avatar: "/avatars/dorsey.png" },
        { name: "Michael Saylor", status: "away", message: "Energy for sound money ⚡", avatar: "/avatars/saylor.png" },
      ],
    },
    {
      label: "Busy (4)",
      contacts: [
        { name: "Janet Yellen", status: "busy", message: "Macro meeting in progress", avatar: "/avatars/yellen.png" },
        { name: "Gensler (SEC)", status: "busy", message: "Reviewing filings…", avatar: "/avatars/gensler.png" },
        { name: "Kathy Wood", status: "busy", message: "Updating ARK thesis", avatar: "/avatars/kathy.png" },
        { name: "J. Powell", status: "busy", message: "Watching CPI charts", avatar: "/avatars/powell.png" },
      ],
    },
    {
      label: "Offline (6)",
      contacts: [
        { name: "SBF", status: "offline", message: "", avatar: "/avatars/sbf.png" },
        { name: "Sam Altman", status: "offline", message: "", avatar: "/avatars/sam-altman.png" },
        { name: "Naval Ravikant", status: "offline", message: "", avatar: "/avatars/naval.png" },
        { name: "Chamath P.", status: "offline", message: "", avatar: "/avatars/chamath.png" },
        { name: "Marc Andreessen", status: "offline", message: "", avatar: "/avatars/marc.png" },
        { name: "Linus Torvalds", status: "offline", message: "", avatar: "/avatars/linus.png" },
      ],
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "var(--success-green)"
      case "away":
        return "var(--alert-orange)"
      case "busy":
        return "#E74C3C"
      case "offline":
        return "#95A5A6"
      default:
        return "var(--success-green)"
    }
  }

  const rooms = [
    { id: "lobby", label: "Lobby" },
    { id: "bnb", label: "BNB" },
    { id: "usa", label: "USA" },
    { id: "dev", label: "Dev" },
  ]

  return (
    <div
      className={`h-screen flex p-2 ${isNudging ? "animate-shake" : ""}`}
      style={{ background: "linear-gradient(to bottom, #2dd881, #0d7a3f)" }}
    >
      {/* Left Sidebar - Contacts */}
      <div
        className="w-80 bg-white flex flex-col overflow-hidden"
        style={{
          borderRadius: "10px",
          border: "1px solid var(--msn-border)",
          boxShadow: "0 2px 6px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.7)",
        }}
      >
        {/* Header */}
        <div
          className="p-3 flex items-center gap-2"
          style={{
            background: "linear-gradient(to bottom, var(--msn-blue-200), var(--msn-blue-100))",
            borderBottom: "1px solid var(--msn-border)",
          }}
        >
                <Image src="/4ssenger-logo.png" alt="4ssenger" width={24} height={24} className="flex-shrink-0" />
                <span style={{ color: "var(--text-primary)", fontWeight: "600", fontSize: "15px" }}>4ssenger</span>
        </div>

        {/* Toolbar */}
        <div
          className="p-2 flex gap-1"
          style={{
            background: "var(--msn-silver-200)",
            borderBottom: "1px solid var(--msn-border)",
          }}
        >
          <button
            className="h-8 w-8 flex items-center justify-center transition-all"
            style={{
              borderRadius: "6px",
              background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
              border: "1px solid var(--msn-border)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              e.currentTarget.style.outline = "1px solid var(--msn-blue-500)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              e.currentTarget.style.outline = "none"
            }}
            aria-label="Mail"
          >
            <Mail className="h-4 w-4" style={{ color: "var(--msn-blue-700)" }} />
          </button>
          <button
            className="h-8 w-8 flex items-center justify-center transition-all"
            style={{
              borderRadius: "6px",
              background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
              border: "1px solid var(--msn-border)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              e.currentTarget.style.outline = "1px solid var(--msn-blue-500)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              e.currentTarget.style.outline = "none"
            }}
            aria-label="Phone"
          >
            <Phone className="h-4 w-4" style={{ color: "var(--msn-blue-700)" }} />
          </button>
          <button
            className="h-8 w-8 flex items-center justify-center transition-all"
            style={{
              borderRadius: "6px",
              background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
              border: "1px solid var(--msn-border)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              e.currentTarget.style.outline = "1px solid var(--msn-blue-500)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              e.currentTarget.style.outline = "none"
            }}
            aria-label="Video"
          >
            <Video className="h-4 w-4" style={{ color: "var(--msn-blue-700)" }} />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setSettingsModalOpen(true)}
            title="Settings"
            className="h-8 w-8 flex items-center justify-center transition-all"
            style={{
              borderRadius: "6px",
              background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
              border: "1px solid var(--msn-border)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              e.currentTarget.style.outline = "1px solid var(--msn-blue-500)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              e.currentTarget.style.outline = "none"
            }}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" style={{ color: "var(--msn-blue-700)" }} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3" style={{ borderBottom: "1px solid var(--msn-silver-200)" }}>
          <div className="relative">
            <input
              placeholder="Find a contact..."
              className="w-full h-8 pr-16 text-sm transition-all outline-none"
              style={{
                borderRadius: "16px",
                border: "1px solid var(--msn-border)",
                paddingLeft: "12px",
                paddingRight: "64px",
                fontSize: "13px",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,.08)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = "2px solid rgba(90,161,227,.4)"
                e.currentTarget.style.outlineOffset = "0px"
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = "none"
              }}
            />
            <div className="absolute right-1 top-1 flex gap-1">
              <button
                onClick={() => setAddContactModalOpen(true)}
                title="Add contact"
                className="h-6 w-6 flex items-center justify-center transition-all"
                style={{
                  borderRadius: "6px",
                  background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                  border: "1px solid var(--msn-border)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
                }}
                aria-label="Add contact"
              >
                <UserPlus className="h-3 w-3" style={{ color: "var(--success-green)" }} />
              </button>
              <button
                className="h-6 w-6 flex items-center justify-center transition-all"
                style={{
                  borderRadius: "6px",
                  background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                  border: "1px solid var(--msn-border)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
                }}
                aria-label="Search"
              >
                <Search className="h-3 w-3" style={{ color: "var(--msn-blue-700)" }} />
              </button>
            </div>
          </div>
        </div>

        {/* Contacts List */}
        <ScrollArea className="flex-1" style={{ background: "linear-gradient(to bottom, #ecfdf5, #FFFFFF)" }}>
          <div className="p-2">
            {contactGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-2">
                <div
                  className="text-xs font-semibold mb-2 flex items-center gap-1 px-2 py-1"
                  style={{
                    background: "#ecfdf5",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                  }}
                >
                  <span style={{ fontSize: "10px" }}>▼</span>
                  <span>{group.label}</span>
                </div>
                {group.contacts.map((contact, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 cursor-pointer transition-all"
                    style={{ borderRadius: "8px" }}
                    onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f0fdf4"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent"
                    }}
                  >
                    <div className="relative">
                      {contact.avatar.startsWith("/avatars/") ? (
                        <Image
                          src={contact.avatar || "/placeholder.svg"}
                          alt={contact.name}
                          width={24}
                          height={24}
                          className="rounded-full object-cover"
                          style={{
                            border: "1px solid rgba(0,0,0,.1)",
                          }}
                        />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{
                            background: "linear-gradient(to bottom right, #43B649, #5AA1E3)",
                            border: "1px solid rgba(0,0,0,.1)",
                          }}
                        />
                      )}
                      {contact.status !== "offline" && (
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                          style={{
                            background: getStatusColor(contact.status),
                            border: "1px solid white",
                            boxShadow: "0 0 2px rgba(0,0,0,.2)",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold" style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                        {contact.name}
                      </div>
                      {contact.message && (
                        <div className="truncate" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {contact.message}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Advertisement */}
        <div className="p-2" style={{ borderTop: "1px solid var(--msn-border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            Advertisement
          </div>
          <div
            className="rounded p-2 flex items-center gap-2"
            style={{
              background: "linear-gradient(to right, var(--msn-blue-500), #10b981)",
              border: "1px solid var(--msn-border)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)",
            }}
          >
                <div className="text-xs font-bold text-white flex-1">4ssenger Live</div>
                <Image
                  src="/4ssenger-logo.png"
                  alt="4ssenger"
              width={32}
              height={32}
              className="flex-shrink-0 rounded"
              style={{
                border: "1px solid rgba(255,255,255,.3)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        className="flex-1 ml-2 bg-white flex flex-col overflow-hidden"
        style={{
          borderRadius: "10px",
          border: "1px solid var(--msn-border)",
          boxShadow: "0 2px 6px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.7)",
        }}
      >
        {/* Chat Header */}
        <div
          className="p-2 flex items-center justify-between"
          style={{
            background: "linear-gradient(to bottom, var(--msn-blue-200), var(--msn-blue-100))",
            borderBottom: "1px solid var(--msn-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInviteModalOpen(true)}
              title="Invite (Ctrl+I)"
              className="h-8 w-8 flex items-center justify-center transition-all"
              style={{
                borderRadius: "6px",
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Invite"
            >
              <Mail className="h-4 w-4" style={{ color: "var(--msn-blue-700)" }} />
            </button>
            <button
              onClick={() => setFilesModalOpen(true)}
              title="Send Files (Ctrl+F)"
              className="h-8 w-8 flex items-center justify-center transition-all"
              style={{
                borderRadius: "6px",
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Send Files"
            >
              <ImageIcon className="h-4 w-4" style={{ color: "var(--msn-blue-700)" }} />
            </button>
            <button
              onClick={() => setWebcamModalOpen(true)}
              title="Webcam"
              className="h-8 w-8 flex items-center justify-center transition-all"
              style={{
                borderRadius: "6px",
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Webcam"
            >
              <Video className="h-4 w-4" style={{ color: "var(--msn-blue-700)" }} />
            </button>
            <button
              onClick={() => setCallModalOpen(true)}
              title="Call"
              className="h-8 w-8 flex items-center justify-center transition-all"
              style={{
                borderRadius: "6px",
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Call"
            >
              <Phone className="h-4 w-4" style={{ color: "var(--msn-blue-700)" }} />
            </button>
            <button
              onClick={handleNudge}
              title="Nudge (Ctrl+N)"
              className="h-8 w-8 flex items-center justify-center transition-all"
              style={{
                borderRadius: "6px",
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Nudge"
            >
              <Zap className="h-4 w-4" style={{ color: "var(--alert-orange)" }} />
            </button>
          </div>
          <div className="flex gap-2">
            <Image
              src="/4ssenger-logo.png"
              alt="Profile"
              width={40}
              height={40}
              className="rounded object-cover"
              style={{
                border: "2px solid rgba(255,255,255,.8)",
                boxShadow: "0 1px 3px rgba(0,0,0,.2)",
              }}
            />
            <Image
              src="/4ssenger-logo.png"
              alt="Profile"
              width={40}
              height={40}
              className="rounded object-cover"
              style={{
                border: "2px solid rgba(255,255,255,.8)",
                boxShadow: "0 1px 3px rgba(0,0,0,.2)",
              }}
            />
          </div>
        </div>

        <div
          className="px-4 py-2 flex items-center justify-end"
          style={{
            background: "var(--msn-blue-100)",
            borderBottom: "1px solid var(--msn-blue-200)",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            You are: <span style={{ color: userColor, fontWeight: "600" }}>{username}</span>
          </span>
        </div>

        {/* Messages Area */}
        <ScrollArea
          className="flex-1 p-4"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E6EEF7",
          }}
        >
          <div className="space-y-0">
            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className="py-1 px-2"
                style={{
                  fontSize: "13px",
                  background: i % 2 === 0 ? "transparent" : "#f0fdf4",
                }}
              >
                <span style={{ fontWeight: "600", color: msg.user_color }}>{msg.username}:</span>{" "}
                <span style={{ color: "var(--text-primary)" }}>{msg.message}</span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginLeft: "8px",
                  }}
                >
                  {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {typingUsers.length > 0 && (
            <div className="py-2 px-2 text-xs italic" style={{ color: "var(--text-muted)" }}>
              {typingUsers
                .map((user) => (
                  <span key={user.username} style={{ color: user.user_color }}>
                    {user.username}
                  </span>
                ))
                .reduce((prev, curr) => [prev, ", ", curr] as any)}{" "}
              {typingUsers.length === 1 ? "is" : "are"} typing...
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-3" style={{ borderTop: "1px solid var(--msn-border)" }}>
          <div
            className="flex gap-1 mb-2 p-1"
            style={{
              background: "var(--msn-silver-100)",
              borderRadius: "6px",
            }}
          >
            <button
              className="h-7 px-2 flex items-center justify-center transition-all text-xs font-semibold"
              style={{
                borderRadius: "4px",
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
                color: "var(--text-primary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
              aria-label="Font"
            >
              Font
            </button>
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="h-7 w-7 flex items-center justify-center transition-all"
                style={{
                  borderRadius: "4px",
                  background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                  border: "1px solid var(--msn-border)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
                }}
                aria-label="Emoticons"
              >
                <Smile className="h-4 w-4" style={{ color: "var(--alert-orange)" }} />
              </button>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={(emoji) => setMessage((prev) => prev + emoji)}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>
            <button
              onClick={() => setMessage((prev) => prev + "😊")}
              className="h-7 w-7 flex items-center justify-center transition-all"
              style={{
                borderRadius: "4px",
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
            >
              <span style={{ fontSize: "14px" }}>😊</span>
            </button>
            <button
              onClick={() => setMessage((prev) => prev + "😂")}
              className="h-7 w-7 flex items-center justify-center transition-all"
              style={{
                borderRadius: "4px",
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
            >
              <span style={{ fontSize: "14px" }}>😂</span>
            </button>
            <button
              onClick={() => setMessage((prev) => prev + "😎")}
              className="h-7 w-7 flex items-center justify-center transition-all"
              style={{
                borderRadius: "4px",
                background: "linear-gradient(to bottom, #FFFFFF, #f0fdf4)",
                border: "1px solid var(--msn-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #f0fdf4, #d1fae5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, #FFFFFF, #f0fdf4)"
              }}
            >
              <span style={{ fontSize: "14px" }}>😎</span>
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend()
                }
              }}
              placeholder="Type your message here..."
              className="flex-1 h-10 px-3 text-sm transition-all outline-none"
              style={{
                borderRadius: "16px",
                border: "1px solid var(--msn-border)",
                fontSize: "13px",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,.08)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = "2px solid rgba(90,161,227,.4)"
                e.currentTarget.style.outlineOffset = "0px"
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = "none"
              }}
            />
            <button
              onClick={handleSend}
              className="h-10 px-6 flex items-center justify-center transition-all font-semibold text-sm"
              style={{
                borderRadius: "16px",
                background: "linear-gradient(to bottom, var(--msn-blue-600), var(--msn-blue-700))",
                border: "1px solid var(--msn-blue-800)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.3), 0 2px 4px rgba(0,0,0,.1)",
                color: "white",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, var(--msn-blue-700), var(--msn-blue-800))"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(to bottom, var(--msn-blue-600), var(--msn-blue-700))"
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Room Selector */}
      <div
        className="w-48 ml-2 bg-white flex flex-col overflow-hidden"
        style={{
          borderRadius: "10px",
          border: "1px solid var(--msn-border)",
          boxShadow: "0 2px 6px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.7)",
        }}
      >
        <div
          className="p-3"
          style={{
            background: "linear-gradient(to bottom, var(--msn-blue-200), var(--msn-blue-100))",
            borderBottom: "1px solid var(--msn-border)",
          }}
        >
          <span style={{ color: "var(--text-primary)", fontWeight: "600", fontSize: "15px" }}>Chat Rooms</span>
        </div>
        <div className="p-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setCurrentRoom(room.id)}
              className="w-full text-left p-3 mb-1 transition-all"
              style={{
                borderRadius: "8px",
                background: currentRoom === room.id ? "var(--msn-blue-100)" : "transparent",
                border: "1px solid",
                borderColor: currentRoom === room.id ? "var(--msn-blue-300)" : "transparent",
                color: currentRoom === room.id ? "var(--msn-blue-700)" : "var(--text-primary)",
                fontWeight: currentRoom === room.id ? "600" : "normal",
              }}
              onMouseEnter={(e) => {
                if (currentRoom !== room.id) {
                  e.currentTarget.style.background = "#F5FAFF"
                }
              }}
              onMouseLeave={(e) => {
                if (currentRoom !== room.id) {
                  e.currentTarget.style.background = "transparent"
                }
              }}
            >
              {room.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Contact"
        onAction={() => handleFakeAction("Invitation sent")}
        isLoading={modalLoading}
        actionText="Send Invite"
      >
        <p className="text-sm mb-4" style={{ color: "var(--text-primary)" }}>
          Enter the email address of the person you'd like to invite to this conversation.
        </p>
        <input
          placeholder="friend@example.com"
          className="w-full h-9 px-3 text-sm transition-all outline-none"
          style={{
            borderRadius: "6px",
            border: "1px solid var(--msn-border)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,.08)",
            color: "var(--text-primary)",
          }}
        />
      </Modal>

      <Modal
        isOpen={filesModalOpen}
        onClose={() => setFilesModalOpen(false)}
        title="Send Files"
        onAction={() => handleFakeAction("Files shared")}
        isLoading={modalLoading}
        actionText="Share Files"
      >
        <p className="text-sm mb-4" style={{ color: "var(--text-primary)" }}>
          Select files to share in the conversation.
        </p>
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center"
          style={{ borderColor: "var(--msn-border)", color: "var(--text-muted)" }}
        >
          <ImageIcon className="h-12 w-12 mx-auto mb-2" style={{ color: "var(--msn-blue-500)" }} />
          <p className="text-sm">Drag and drop files here or click to browse</p>
        </div>
      </Modal>

      <Modal
        isOpen={activitiesModalOpen}
        onClose={() => setActivitiesModalOpen(false)}
        title="Activities"
        onAction={() => handleFakeAction("Activity started")}
        isLoading={modalLoading}
        actionText="Start Activity"
      >
        <p className="text-sm mb-4" style={{ color: "var(--text-primary)" }}>
          Choose an activity to start with your contact.
        </p>
        <div className="space-y-2">
          {["Games", "Watch Together", "Whiteboard", "Screen Share"].map((activity) => (
            <button
              key={activity}
              className="w-full text-left p-3 transition-all"
              style={{
                borderRadius: "6px",
                background: "var(--msn-silver-100)",
                border: "1px solid var(--msn-border)",
                color: "var(--text-primary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--msn-blue-100)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--msn-silver-100)"
              }}
            >
              {activity}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={webcamModalOpen}
        onClose={() => setWebcamModalOpen(false)}
        title="Webcam"
        onAction={() => handleFakeAction("Webcam started")}
        isLoading={modalLoading}
        actionText="Start Webcam"
      >
        <div
          className="rounded-lg overflow-hidden mb-4"
          style={{
            background: "var(--msn-silver-200)",
            aspectRatio: "16/9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Video className="h-16 w-16" style={{ color: "var(--msn-blue-500)" }} />
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Share your webcam feed with your contact.
        </p>
      </Modal>

      <Modal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        title="Start Call"
        onAction={() => handleFakeAction("Call started")}
        isLoading={modalLoading}
        actionText="Call Now"
      >
        <p className="text-sm mb-4" style={{ color: "var(--text-primary)" }}>
          Start a voice call with your contact.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            className="flex flex-col items-center gap-2 p-4 transition-all"
            style={{
              borderRadius: "8px",
              background: "var(--msn-silver-100)",
              border: "1px solid var(--msn-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--msn-blue-100)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--msn-silver-100)"
            }}
          >
            <Phone className="h-8 w-8" style={{ color: "var(--msn-blue-700)" }} />
            <span className="text-xs" style={{ color: "var(--text-primary)" }}>
              Voice Call
            </span>
          </button>
          <button
            className="flex flex-col items-center gap-2 p-4 transition-all"
            style={{
              borderRadius: "8px",
              background: "var(--msn-silver-100)",
              border: "1px solid var(--msn-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--msn-blue-100)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--msn-silver-100)"
            }}
          >
            <Video className="h-8 w-8" style={{ color: "var(--msn-blue-700)" }} />
            <span className="text-xs" style={{ color: "var(--text-primary)" }}>
              Video Call
            </span>
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={addContactModalOpen}
        onClose={() => setAddContactModalOpen(false)}
        title="Add Contact"
        onAction={() => handleFakeAction("Contact added")}
        isLoading={modalLoading}
        actionText="Add Contact"
      >
        <p className="text-sm mb-4" style={{ color: "var(--text-primary)" }}>
          Enter the email address of the contact you'd like to add.
        </p>
        <input
          placeholder="contact@example.com"
          className="w-full h-9 px-3 text-sm transition-all outline-none"
          style={{
            borderRadius: "6px",
            border: "1px solid var(--msn-border)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,.08)",
            color: "var(--text-primary)",
          }}
        />
      </Modal>

      <Modal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title="Settings"
        onAction={() => handleFakeAction("Settings saved")}
        isLoading={modalLoading}
        actionText="Save Settings"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--text-primary)" }}>
              Display Name
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-9 px-3 text-sm transition-all outline-none"
              style={{
                borderRadius: "6px",
                border: "1px solid var(--msn-border)",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,.08)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--text-primary)" }}>
              Color
            </label>
            <input
              type="color"
              value={userColor}
              onChange={(e) => setUserColor(e.target.value)}
              className="w-full h-9"
              style={{
                borderRadius: "6px",
                border: "1px solid var(--msn-border)",
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Send, User, Bot, Trash2 } from "lucide-react"
import { askCopilot, type CopilotTurn } from "@/lib/api"
import { cn } from "@/lib/utils"
import { renderInlineMarkdown, splitIntoSentences } from "@/lib/markdown"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  /** True only for the local "couldn't reach the model" fallback message --
   * never sent back as a real prior turn (see buildHistory). */
  isError?: boolean
}

const SEED_MESSAGE: ChatMessage = {
  id: "seed",
  role: "assistant",
  text: "Hi, I'm your FarmTwin copilot. Ask me about any asset, alert, or recommendation and I'll explain the reasoning behind it.",
}

// sessionStorage (not localStorage) -- survives navigating away and back
// within the same tab/session, but a fresh tab or browser restart starts
// clean, matching the "plain discard on Clear" scope (no server-side archive).
const STORAGE_KEY = "farmtwin_copilot_messages"

const SUGGESTIONS = [
  "What needs my attention today?",
  "Why is the tilapia pond flagged?",
  "When should I harvest the mango orchard?",
  "Summarize this week's egg production",
]

/** Real (question, answer) turns to send as conversation memory -- skips
 * the seed greeting (no preceding user question) and any error fallback
 * message (never a real answer from the agent). */
function buildHistory(messages: ChatMessage[]): CopilotTurn[] {
  const turns: CopilotTurn[] = []
  for (let i = 0; i < messages.length - 1; i++) {
    const question = messages[i]
    const answer = messages[i + 1]
    if (question.role === "user" && answer.role === "assistant" && !answer.isError) {
      turns.push({ question: question.text, answer: answer.text })
    }
  }
  return turns
}

export function CopilotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([SEED_MESSAGE])
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextIdRef = useRef(0)
  const hydratedRef = useRef(false)

  // Restore a persisted conversation client-side only, after the initial
  // mount -- always rendering the fresh seed on the very first pass (server
  // and client alike) avoids a hydration mismatch, the same class of bug
  // this codebase already hit once in lib/useApiData.ts.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          nextIdRef.current = parsed.length
          // Deferred so setState doesn't run synchronously within the effect
          // body (react-hooks/set-state-in-effect) -- same pattern this
          // codebase already established in lib/useApiData.ts and HealthGauge.tsx.
          queueMicrotask(() => setMessages(parsed))
        }
      }
    } catch {
      // Corrupt/unavailable storage -- keep the fresh seed conversation.
    }
    hydratedRef.current = true
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // Persistence is a nice-to-have, not required for the chat to work.
    }
  }, [messages])

  function nextId(prefix: string) {
    nextIdRef.current += 1
    return `${prefix}-${nextIdRef.current}`
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  function clearConversation() {
    setMessages([SEED_MESSAGE])
    nextIdRef.current = 0
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to clean up if storage was never written.
    }
  }

  async function send(question: string) {
    const q = question.trim()
    if (!q || pending) return
    // Snapshot conversation memory BEFORE adding this turn's own messages.
    const history = buildHistory(messages)
    const userMsg: ChatMessage = { id: nextId("u"), role: "user", text: q }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setPending(true)
    scrollToBottom()
    try {
      const { answer } = await askCopilot(q, history)
      setMessages((prev) => [...prev, { id: nextId("a"), role: "assistant", text: answer }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("e"),
          role: "assistant",
          isError: true,
          text: "I couldn't reach the farm model just now. Try again in a moment.",
        },
      ])
    } finally {
      setPending(false)
      scrollToBottom()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <h2 className="font-serif text-lg font-semibold leading-tight">Farm Copilot</h2>
          <p className="text-xs text-muted-foreground">Grounded in your live twin data</p>
        </div>
        {messages.length > 1 && (
          <button
            type="button"
            onClick={clearConversation}
            disabled={pending}
            title="Clear conversation"
            aria-label="Clear conversation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex items-start gap-3", msg.role === "user" && "flex-row-reverse")}
          >
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                msg.role === "assistant" ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground",
              )}
            >
              {msg.role === "assistant" ? (
                <Bot className="h-4 w-4" aria-hidden="true" />
              ) : (
                <User className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "assistant"
                  ? "rounded-tl-sm bg-secondary text-secondary-foreground space-y-1.5"
                  : "rounded-tr-sm bg-primary text-primary-foreground",
              )}
            >
              {msg.role === "assistant"
                ? splitIntoSentences(msg.text).map((sentence, i) => (
                    <p key={i}>{renderInlineMarkdown(sentence)}</p>
                  ))
                : msg.text}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-secondary px-4 py-3">
              <Dot delay="0ms" />
              <Dot delay="150ms" />
              <Dot delay="300ms" />
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex items-center gap-2 border-t border-border px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="Ask about an asset, alert, or task..."
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
          aria-label="Ask the farm copilot a question"
        />
        <button
          type="submit"
          disabled={!input.trim() || pending}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
      style={{ animationDelay: delay }}
    />
  )
}

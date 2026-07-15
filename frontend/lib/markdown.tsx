import type { ReactNode } from "react"

/**
 * Minimal **bold**-only markdown rendering + sentence splitting for
 * Cortex Agent prose (briefing summaries, copilot answers). The agent
 * only ever emits inline bold here -- no headings/lists/links -- so a
 * full markdown library isn't warranted; this is rendering-only, it does
 * not alter the agent's actual words.
 */

const BOLD_RE = /(\*\*[^*]+\*\*)/g

/** Turns "**Tilapia Pond A**" into a real <strong>, not raw asterisks. */
export function renderInlineMarkdown(text: string): ReactNode {
  return text.split(BOLD_RE).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

// Splits on sentence-ending punctuation followed by whitespace and a
// capital letter or a bold marker. Requiring the whitespace means a
// decimal like "3.5 mg/L" is never split (no space directly after the
// first period), while "...normal range. **Approved** actions..." is.
const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+(?=[A-Z*])/

/** Splits AI-generated prose into sentence-level paragraphs for
 * scanability. Each sentence in this agent's summaries tends to already
 * be one logical unit (the primary incident, approved actions, rejected
 * items, risk context), so this alone produces sensible section breaks
 * without needing to parse the content itself. */
export function splitIntoSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT_RE)
    .map((s) => s.trim())
    .filter(Boolean)
}

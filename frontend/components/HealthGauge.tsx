"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

// Session-scoped previous score (feat-037): no backend history table exists
// for this derived metric, so the trend is intentionally per-browser-session.
let lastSeenScore: number | null = null

function bandColor(score: number) {
  if (score >= 80) return "var(--healthy)"
  if (score >= 60) return "var(--warning)"
  return "var(--critical)"
}

export function HealthGauge({ score, size = 132 }: { score: number; size?: number }) {
  const [trend, setTrend] = useState<"up" | "down" | "flat">("flat")
  const capturedFor = useRef<number | null>(null)

  useEffect(() => {
    if (capturedFor.current === score) return
    capturedFor.current = score
    let next: "up" | "down" | "flat" = "flat"
    if (lastSeenScore !== null) {
      if (score > lastSeenScore) next = "up"
      else if (score < lastSeenScore) next = "down"
    }
    lastSeenScore = score
    // Deferred so setState doesn't run synchronously within the effect body
    // (react-hooks/set-state-in-effect) -- same pattern lib/useApiData.ts uses.
    queueMicrotask(() => setTrend(next))
  }, [score])

  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, score))
  const dash = (clamped / 100) * c
  const color = bandColor(clamped)

  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus
  const trendClass =
    trend === "up" ? "text-healthy" : trend === "down" ? "text-critical" : "text-muted-foreground"

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            style={{ transition: "stroke-dasharray 700ms ease, stroke 400ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tabular-nums" style={{ color }}>
            {clamped}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            / 100
          </span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold">Farm Health</p>
        <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", trendClass)}>
          <TrendIcon className="size-3.5" aria-hidden="true" />
          {trend === "up" ? "Improving" : trend === "down" ? "Declining" : "Steady"}
          <span className="sr-only"> since last check this session</span>
        </p>
      </div>
    </div>
  )
}

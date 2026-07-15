"use client"

import { useEffect, useState } from "react"
import { getDashboardSummary } from "@/lib/api"
import { useApiData } from "@/lib/useApiData"
import type { DashboardSummary } from "@/lib/types"

/**
 * pointer-events-none overlay reusing the 'dashboard-summary' cache key —
 * zero extra network calls (feat-028). Sun tint scales with temp_c, clouds
 * drift, and rain animates only when rainfall_mm > 0.5.
 */
export function WeatherAmbience() {
  const { data } = useApiData<DashboardSummary>("dashboard-summary", getDashboardSummary)
  // Weather visuals derive from async client data, so they differ between the
  // server render and the client's first paint. Gate on mount to avoid a
  // hydration mismatch — this overlay is purely decorative (aria-hidden).
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // Deferred so setState doesn't run synchronously within the effect body
    // (react-hooks/set-state-in-effect) -- same pattern lib/useApiData.ts uses.
    queueMicrotask(() => setMounted(true))
  }, [])

  const weather = data?.weather
  const temp = weather?.temp_c ?? 26
  const rain = weather?.rainfall_mm ?? 0

  // Warmer temp -> stronger golden sun tint.
  const sunOpacity = Math.max(0, Math.min(0.45, (temp - 15) / 45))
  const raining = rain > 0.5

  if (!mounted) {
    return <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" />
  }

  const drops = Array.from({ length: 26 })
  const clouds = [
    { top: "8%", size: 90, dur: 34, delay: 0, opacity: 0.75 },
    { top: "18%", size: 60, dur: 46, delay: 8, opacity: 0.6 },
    { top: "5%", size: 120, dur: 58, delay: 20, opacity: 0.5 },
  ]

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* sun tint */}
      <div
        className="absolute -right-10 -top-10 size-64 rounded-full blur-2xl"
        style={{ background: "radial-gradient(circle, #fde68a, transparent 70%)", opacity: sunOpacity }}
      />
      {/* drifting clouds */}
      {clouds.map((c, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: c.top,
            left: 0,
            opacity: c.opacity,
            animation: `cloud-drift ${c.dur}s linear ${c.delay}s infinite`,
          }}
        >
          <Cloud size={c.size} />
        </div>
      ))}
      {/* rain */}
      {raining &&
        drops.map((_, i) => (
          <span
            key={i}
            className="absolute top-0 block w-px rounded-full bg-water"
            style={{
              left: `${(i / drops.length) * 100}%`,
              height: `${10 + (i % 4) * 4}px`,
              opacity: 0.5,
              animation: `rain-fall ${0.7 + (i % 5) * 0.12}s linear ${(i % 7) * 0.1}s infinite`,
            }}
          />
        ))}
    </div>
  )
}

function Cloud({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 100 60" fill="#ffffff">
      <ellipse cx="35" cy="38" rx="26" ry="18" />
      <ellipse cx="58" cy="34" rx="24" ry="20" />
      <ellipse cx="72" cy="42" rx="18" ry="14" />
      <rect x="30" y="40" width="50" height="16" rx="8" />
    </svg>
  )
}

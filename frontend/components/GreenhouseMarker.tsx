import type { Asset } from "@/lib/types"

/** Plant height/color keys off the real growth_stage (0-4), same scale as RiceFieldMarker. */
export function GreenhouseMarker({ asset }: { asset: Asset }) {
  const stage = asset.visual.growth_stage ?? 2
  const t = Math.max(0, Math.min(4, stage)) / 4
  const plantHeight = 4 + t * 12
  const plant = t > 0.7 ? "#22c55e" : t > 0.4 ? "#4ade80" : "#86efac"

  const rows = [16, 24, 32, 40]

  return (
    <svg viewBox="0 0 56 56" className="size-12" role="img" aria-hidden="true">
      {/* frame */}
      <path d="M8 44 L8 24 L28 10 L48 24 L48 44 Z" fill="#e0f2fe" opacity="0.35" />
      <path d="M8 44 L8 24 L28 10 L48 24 L48 44 Z" fill="none" stroke="#64748b" strokeWidth="2" />
      {/* roof ridge + panel lines */}
      <path d="M28 10 L28 44" stroke="#64748b" strokeWidth="1.5" opacity="0.6" />
      <path d="M8 24 L48 24" stroke="#64748b" strokeWidth="1.5" opacity="0.6" />
      <path d="M18 17 L18 44" stroke="#64748b" strokeWidth="1" opacity="0.4" />
      <path d="M38 17 L38 44" stroke="#64748b" strokeWidth="1" opacity="0.4" />
      {/* door */}
      <rect x="24" y="34" width="8" height="10" fill="#94a3b8" opacity="0.5" />
      {/* rows of plants inside, height/color from real growth_stage */}
      {rows.map((x, i) => (
        <rect
          key={x}
          x={x - 1.5}
          y={44 - plantHeight * (i % 2 === 0 ? 1 : 0.85)}
          width="3"
          height={plantHeight * (i % 2 === 0 ? 1 : 0.85)}
          rx="1.5"
          fill={plant}
        />
      ))}
    </svg>
  )
}

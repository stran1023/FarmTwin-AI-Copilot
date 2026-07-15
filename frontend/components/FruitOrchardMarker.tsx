import type { Asset } from "@/lib/types"

/** Orchard fruit-dot count/color scale off real harvest_readiness_pct. */
export function FruitOrchardMarker({ asset }: { asset: Asset }) {
  const readiness = asset.visual.harvest_readiness_pct ?? 50
  const t = Math.max(0, Math.min(100, readiness)) / 100
  const fruitCount = Math.round(2 + t * 6) // more visible fruit as it ripens
  // Under-ripe green -> ripe golden-orange.
  const fruit = t > 0.75 ? "#f59e0b" : t > 0.5 ? "#facc15" : "#84cc16"

  // Deterministic fruit positions within the canopy.
  const spots = [
    [22, 20],
    [34, 22],
    [28, 28],
    [19, 30],
    [37, 30],
    [28, 18],
    [24, 34],
    [33, 34],
  ] as const

  return (
    <svg viewBox="0 0 56 56" className="size-12" role="img" aria-hidden="true">
      {/* trunk */}
      <rect x="25" y="34" width="6" height="14" rx="2" fill="#7c4a1e" />
      {/* canopy */}
      <circle cx="28" cy="26" r="16" fill="#3f9142" />
      <circle cx="20" cy="30" r="10" fill="#4ba350" />
      <circle cx="37" cy="29" r="9" fill="#357a38" />
      {/* fruit */}
      {spots.slice(0, fruitCount).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.4" fill={fruit} stroke="#00000022" strokeWidth="0.5" />
      ))}
    </svg>
  )
}

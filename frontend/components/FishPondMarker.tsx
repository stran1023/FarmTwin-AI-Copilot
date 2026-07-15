import type { Asset } from "@/lib/types"

/** Water tints murky/still vs bright/clear off the real risk-derived clarity. */
export function FishPondMarker({ asset }: { asset: Asset }) {
  const clarity = asset.visual.water_clarity ?? 0.6
  // Clear -> bright blue; murky -> desaturated green-brown.
  const water = clarity > 0.6 ? "#38bdf8" : clarity > 0.4 ? "#4a9db0" : "#6b8e6b"
  const waterDark = clarity > 0.6 ? "#0ea5e9" : clarity > 0.4 ? "#3a7d8c" : "#556b55"

  return (
    <svg viewBox="0 0 56 56" className="size-12" role="img" aria-hidden="true">
      {/* pond basin */}
      <ellipse cx="28" cy="34" rx="22" ry="15" fill={waterDark} />
      <ellipse cx="28" cy="32" rx="20" ry="13" fill={water} />
      {/* shimmer */}
      <ellipse
        cx="22"
        cy="28"
        rx="7"
        ry="2.4"
        fill="#ffffff"
        opacity="0.55"
        style={{ animation: "water-shimmer 2.4s ease-in-out infinite" }}
      />
      {/* fish */}
      <g fill="#f97316">
        <ellipse cx="24" cy="34" rx="4" ry="2.2" />
        <path d="M20 34 l-3 -2 v4 z" />
      </g>
      <g fill="#fbbf24">
        <ellipse cx="34" cy="30" rx="3" ry="1.7" />
        <path d="M37 30 l3 -1.5 v3 z" />
      </g>
      {/* little dock */}
      <rect x="30" y="18" width="14" height="3" rx="1" fill="#a16207" />
      <rect x="31" y="21" width="2" height="7" fill="#854d0e" />
      <rect x="41" y="21" width="2" height="7" fill="#854d0e" />
    </svg>
  )
}

import type { Asset } from "@/lib/types"

export function ChickenCoopMarker({ asset }: { asset: Asset }) {
  // A calmer coop when healthy; a slightly ruffled bird when not.
  const agitated = asset.status !== "healthy"
  return (
    <svg viewBox="0 0 56 56" className="size-12" role="img" aria-hidden="true">
      {/* coop body */}
      <rect x="10" y="26" width="36" height="20" rx="2" fill="#d97706" />
      <rect x="10" y="26" width="36" height="20" rx="2" fill="#000" opacity="0.08" />
      {/* roof */}
      <path d="M7 27 L28 12 L49 27 Z" fill="#b91c1c" />
      <path d="M7 27 L28 12 L49 27 Z" fill="#000" opacity="0.06" />
      {/* door */}
      <rect x="24" y="34" width="8" height="12" rx="1" fill="#7c2d12" />
      {/* window */}
      <circle cx="17" cy="34" r="3" fill="#fde68a" />
      {/* chicken */}
      <g style={agitated ? { animation: "gentle-sway 0.7s ease-in-out infinite" } : undefined}>
        <ellipse cx="38" cy="42" rx="5" ry="4.5" fill="#fafafa" />
        <circle cx="41" cy="37.5" r="3" fill="#fafafa" />
        <path d="M41 34.5 l1.5 -2 l1.5 2 z" fill="#dc2626" />
        <path d="M44 37.5 l3 1 l-3 1 z" fill="#f59e0b" />
        <circle cx="42" cy="37" r="0.7" fill="#1c1917" />
      </g>
    </svg>
  )
}

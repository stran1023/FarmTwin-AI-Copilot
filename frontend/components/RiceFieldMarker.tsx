import type { Asset } from "@/lib/types"

/** Rice blades' height/color key off the real growth_stage (0-4). */
export function RiceFieldMarker({ asset }: { asset: Asset }) {
  const stage = asset.visual.growth_stage ?? 2
  const t = Math.max(0, Math.min(4, stage)) / 4
  const bladeHeight = 6 + t * 16 // taller as it matures
  // Young = fresh green, mature/heading = golden green.
  const blade = t > 0.7 ? "#a3b545" : t > 0.4 ? "#7bb04a" : "#5fa83d"
  const baseY = 44

  const columns = [12, 20, 28, 36, 44]

  return (
    <svg viewBox="0 0 56 56" className="size-12" role="img" aria-hidden="true">
      {/* flooded paddy water */}
      <ellipse cx="28" cy="46" rx="24" ry="8" fill="#7dd3fc" opacity="0.6" />
      {/* paddy soil bund */}
      <rect x="6" y="43" width="44" height="6" rx="3" fill="#78350f" opacity="0.35" />
      {columns.map((x, i) => {
        const h = bladeHeight * (i % 2 === 0 ? 1 : 0.85)
        return (
          <g key={x} style={{ transformOrigin: `${x}px ${baseY}px`, animation: `gentle-sway ${1.8 + i * 0.2}s ease-in-out infinite` }}>
            <path d={`M${x} ${baseY} q -3 ${-h * 0.6} -1 ${-h}`} stroke={blade} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d={`M${x} ${baseY} q 3 ${-h * 0.6} 1 ${-h}`} stroke={blade} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d={`M${x} ${baseY} v ${-h}`} stroke={blade} strokeWidth="2" fill="none" strokeLinecap="round" />
            {t > 0.6 && <circle cx={x} cy={baseY - h} r="1.6" fill="#eab308" />}
          </g>
        )
      })}
    </svg>
  )
}

import { GRID, TILE_H, TILE_W, WORLD_H, WORLD_W, isoToXY, tilePoints } from "@/lib/iso"

const FARMHOUSE = { gx: 5, gy: 5 }

export interface TerrainTile {
  gx: number
  gy: number
}

// Decorative scenery — never blocks a marker (pointer-events-none on the layer).
const TREES = [
  { gx: 0, gy: 6 },
  { gx: 1, gy: 9 },
  { gx: 10, gy: 4 },
  { gx: 6, gy: 0 },
  { gx: 9, gy: 10 },
]
const BUSHES = [
  { gx: 4, gy: 1 },
  { gx: 0, gy: 2 },
  { gx: 10, gy: 7 },
  { gx: 5, gy: 10 },
]

function grassShade(gx: number, gy: number) {
  const v = (gx * 2 + gy * 3) % 3
  if (v === 0) return "var(--grass-light)"
  if (v === 1) return "var(--grass-mid)"
  return "var(--grass-dark)"
}

export function FarmTerrain({ assetTiles = [] }: { assetTiles?: TerrainTile[] }) {
  const tiles = []
  for (let gx = 0; gx < GRID; gx++) {
    for (let gy = 0; gy < GRID; gy++) {
      tiles.push({ gx, gy })
    }
  }

  const house = isoToXY(FARMHOUSE.gx, FARMHOUSE.gy)

  return (
    <svg
      viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* grass tiles */}
      {tiles.map(({ gx, gy }) => (
        <polygon
          key={`${gx}-${gy}`}
          points={tilePoints(gx, gy)}
          fill={grassShade(gx, gy)}
          stroke="#00000010"
          strokeWidth="1"
        />
      ))}

      {/* dirt paths from farmhouse to each asset, terminating in a landing pad
          that sits exactly under the marker's ground anchor */}
      {assetTiles.map(({ gx, gy }, i) => {
        const p = isoToXY(gx, gy)
        return (
          <g key={i}>
            {/* soft path shadow for depth */}
            <line
              x1={house.x}
              y1={house.y + 2}
              x2={p.x}
              y2={p.y + 2}
              stroke="#00000022"
              strokeWidth="16"
              strokeLinecap="round"
            />
            <line
              x1={house.x}
              y1={house.y}
              x2={p.x}
              y2={p.y}
              stroke="var(--soil)"
              strokeWidth="13"
              strokeLinecap="round"
              opacity="0.7"
            />
            {/* landing pad exactly on the asset tile — the marker anchors here */}
            <ellipse cx={p.x} cy={p.y} rx="18" ry="9" fill="var(--soil)" opacity="0.85" />
            <ellipse cx={p.x} cy={p.y} rx="11" ry="5.5" fill="#00000026" />
          </g>
        )
      })}

      {/* scenery trees */}
      {TREES.map(({ gx, gy }, i) => {
        const { x, y } = isoToXY(gx, gy)
        return (
          <g key={`t-${i}`}>
            <ellipse cx={x} cy={y + 6} rx="12" ry="5" fill="#00000018" />
            <rect x={x - 2.5} y={y - 6} width="5" height="14" rx="2" fill="#7c4a1e" />
            <circle cx={x} cy={y - 14} r="12" fill="#3f9142" />
            <circle cx={x - 7} cy={y - 10} r="8" fill="#4ba350" />
            <circle cx={x + 7} cy={y - 11} r="7" fill="#357a38" />
          </g>
        )
      })}

      {/* scenery bushes */}
      {BUSHES.map(({ gx, gy }, i) => {
        const { x, y } = isoToXY(gx, gy)
        return (
          <g key={`b-${i}`}>
            <ellipse cx={x} cy={y + 4} rx="9" ry="4" fill="#00000015" />
            <circle cx={x - 5} cy={y} r="6" fill="#4ba350" />
            <circle cx={x + 5} cy={y} r="6" fill="#3f9142" />
            <circle cx={x} cy={y - 3} r="7" fill="#48a04d" />
          </g>
        )
      })}

      {/* well */}
      <Well x={isoToXY(3, 5).x} y={isoToXY(3, 5).y} />

      {/* farmhouse at (5,5) */}
      <g>
        <ellipse cx={house.x} cy={house.y + 14} rx={TILE_W / 2} ry={TILE_H / 3} fill="#00000022" />
        {/* base */}
        <rect x={house.x - 26} y={house.y - 14} width="52" height="30" rx="3" fill="#e7d3a1" />
        <rect x={house.x - 26} y={house.y - 14} width="52" height="30" rx="3" fill="#00000010" />
        {/* roof */}
        <path d={`M${house.x - 32} ${house.y - 12} L${house.x} ${house.y - 34} L${house.x + 32} ${house.y - 12} Z`} fill="#b45309" />
        {/* door + window */}
        <rect x={house.x - 6} y={house.y - 2} width="12" height="18" rx="2" fill="#7c2d12" />
        <rect x={house.x - 20} y={house.y - 6} width="9" height="9" rx="1" fill="#93c5fd" />
        <rect x={house.x + 11} y={house.y - 6} width="9" height="9" rx="1" fill="#93c5fd" />
      </g>
    </svg>
  )
}

function Well({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 6} rx="11" ry="5" fill="#00000018" />
      <ellipse cx={x} cy={y} rx="10" ry="5" fill="#78716c" />
      <ellipse cx={x} cy={y} rx="7" ry="3.4" fill="#1c1917" />
      <rect x={x - 9} y={y - 16} width="3" height="16" fill="#7c4a1e" />
      <rect x={x + 6} y={y - 16} width="3" height="16" fill="#7c4a1e" />
      <path d={`M${x - 11} ${y - 16} L${x} ${y - 22} L${x + 11} ${y - 16} Z`} fill="#b91c1c" />
    </g>
  )
}

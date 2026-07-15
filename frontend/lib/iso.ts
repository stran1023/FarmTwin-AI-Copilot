// Standard 2:1 isometric projection shared by the terrain and the markers so
// they can never drift out of alignment.

export const GRID = 11 // 0..10
export const TILE_W = 92
export const TILE_H = 46

export const WORLD_W = 1012
// Taller than the terrain needs so there's sky headroom baked into the map's
// own coordinate space — floating marker cards near the back of the field then
// always have room above them, even when the wide map is scaled/centered.
export const WORLD_H = 690

const ORIGIN_X = 10 * (TILE_W / 2) + TILE_W / 2 // shift so min x is positive
const ORIGIN_Y = TILE_H + 100

export function isoToXY(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2) + ORIGIN_X,
    y: (gx + gy) * (TILE_H / 2) + ORIGIN_Y,
  }
}

/** Diamond tile polygon points string for an SVG <polygon>. */
export function tilePoints(gx: number, gy: number): string {
  const { x, y } = isoToXY(gx, gy)
  const hw = TILE_W / 2
  const hh = TILE_H / 2
  return `${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}`
}

"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Maximize2, Minus, Plus } from "lucide-react"
import type { Asset, AssetType } from "@/lib/types"
import { getAssets } from "@/lib/api"
import { useApiData } from "@/lib/useApiData"
import { WORLD_H, WORLD_W, isoToXY } from "@/lib/iso"
import { FarmTerrain } from "./FarmTerrain"
import { MarkerFrame } from "./MarkerFrame"
import { WeatherAmbience } from "./WeatherAmbience"
import { topPriorityAssetId } from "./StatusIndicators"
import { FishPondMarker } from "./FishPondMarker"
import { ChickenCoopMarker } from "./ChickenCoopMarker"
import { RiceFieldMarker } from "./RiceFieldMarker"
import { FruitOrchardMarker } from "./FruitOrchardMarker"

/**
 * Measures the available container and returns the scale factor needed to fit
 * the fixed-size world stage inside it. Terrain and markers live inside that
 * stage, so scaling it keeps every element proportional at any viewport size.
 */
function useFitScale() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width === 0 || height === 0) return
      setScale(Math.min(width / WORLD_W, height / WORLD_H))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { containerRef, scale }
}

const MIN_ZOOM = 0.6
const MAX_ZOOM = 3.5
const ZOOM_STEP = 0.35

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

/**
 * Pan + zoom camera layered on top of the fit scale. Pan is tracked in screen
 * pixels (applied after scale in the transform), so dragging feels 1:1 with the
 * cursor at any zoom level. Wheel zoom keeps the point under the cursor fixed.
 */
function useMapCamera(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)

  const reset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Zoom around a focal point (px relative to the container center). dx/dy = 0
  // zooms around the center (used by the +/- buttons).
  const zoomTo = useCallback((next: number, dx = 0, dy = 0) => {
    setZoom((prev) => {
      const clamped = clampZoom(next)
      const ratio = clamped / prev
      setPan((p) => ({
        x: dx * (1 - ratio) + p.x * ratio,
        y: dy * (1 - ratio) + p.y * ratio,
      }))
      return clamped
    })
  }, [])

  const zoomIn = useCallback(() => zoomTo(zoom + ZOOM_STEP), [zoom, zoomTo])
  const zoomOut = useCallback(() => zoomTo(zoom - ZOOM_STEP), [zoom, zoomTo])

  // Native non-passive wheel listener so we can preventDefault the page scroll.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const dx = e.clientX - rect.left - rect.width / 2
      const dy = e.clientY - rect.top - rect.height / 2
      const delta = -e.deltaY * 0.0015
      setZoom((prev) => {
        const clamped = clampZoom(prev * (1 + delta))
        const ratio = clamped / prev
        setPan((p) => ({ x: dx * (1 - ratio) + p.x * ratio, y: dy * (1 - ratio) + p.y * ratio }))
        return clamped
      })
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [containerRef])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      drag.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
      setDragging(true)
    },
    [pan.x, pan.y],
  )

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    setPan({ x: d.panX + (e.clientX - d.startX), y: d.panY + (e.clientY - d.startY) })
  }, [])

  const endDrag = useCallback(() => {
    drag.current = null
    setDragging(false)
  }, [])

  return {
    zoom,
    pan,
    dragging,
    reset,
    zoomIn,
    zoomOut,
    handlers: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerLeave: endDrag },
  }
}

function MarkerIllustration({ asset }: { asset: Asset }) {
  const map: Record<AssetType, React.ReactNode> = {
    fish_pond: <FishPondMarker asset={asset} />,
    chicken_coop: <ChickenCoopMarker asset={asset} />,
    rice_field: <RiceFieldMarker asset={asset} />,
    fruit_orchard: <FruitOrchardMarker asset={asset} />,
  }
  return <>{map[asset.type]}</>
}

interface DigitalTwinMapProps {
  selectedAssetId: string | null
  highlightedAssetId: string | null
  onSelectAsset: (id: string) => void
}

export function DigitalTwinMap({
  selectedAssetId,
  highlightedAssetId,
  onSelectAsset,
}: DigitalTwinMapProps) {
  const { data: assets, loading } = useApiData<Asset[]>("assets", getAssets)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const spotlightId = topPriorityAssetId(assets ?? [])
  const { containerRef, scale } = useFitScale()
  const { zoom, pan, dragging, reset, zoomIn, zoomOut, handlers } = useMapCamera(containerRef)

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden touch-none select-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      {...handlers}
    >
      {/* sky gradient backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklch, var(--water) 22%, var(--background)) 0%, var(--background) 60%)",
        }}
        aria-hidden="true"
      />

      {/* Fixed-size world stage — terrain and markers share these native pixel
          dimensions, then the whole stage is scaled to fit the container so
          markers stay proportional to the terrain at every size. */}
      <div
        className="relative"
        role="group"
        aria-label="Digital twin farm map"
        style={{
          width: WORLD_W,
          height: WORLD_H,
          // translate (screen px pan) is applied after scale, so panning is 1:1
          // with the cursor regardless of zoom.
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale * zoom})`,
          transformOrigin: "center",
        }}
      >
        <FarmTerrain assetTiles={(assets ?? []).map((a) => ({ gx: a.grid_x, gy: a.grid_y }))} />
        <WeatherAmbience />

        {(assets ?? []).map((asset) => {
          const { x, y } = isoToXY(asset.grid_x, asset.grid_y)
          const isActive =
            selectedAssetId === asset.id ||
            highlightedAssetId === asset.id ||
            hoveredId === asset.id ||
            spotlightId === asset.id
          return (
            <div
              key={asset.id}
              className="absolute"
              style={{
                left: `${(x / WORLD_W) * 100}%`,
                top: `${(y / WORLD_H) * 100}%`,
                // Anchor the marker's ground pad center on the tile point so the
                // path landing pad, stem, and floating card read as one unit.
                transform: "translate(-50%, calc(-100% + 7px))",
                // Base stacking follows depth (front tiles overlap back tiles),
                // but an active/hovered marker jumps to the top so overlapping
                // cards can always be surfaced.
                zIndex: isActive ? 1000 : 10 + asset.grid_x + asset.grid_y,
              }}
            >
              <MarkerFrame
                asset={asset}
                selected={selectedAssetId === asset.id}
                spotlight={spotlightId === asset.id}
                highlighted={highlightedAssetId === asset.id || hoveredId === asset.id}
                onSelect={() => onSelectAsset(asset.id)}
                onHover={(h) => setHoveredId(h ? asset.id : null)}
              >
                <MarkerIllustration asset={asset} />
              </MarkerFrame>
            </div>
          )
        })}
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow">
            Loading farm map…
          </span>
        </div>
      )}

      {/* zoom + reset controls */}
      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-xl border border-border bg-card/85 backdrop-blur-sm">
        <ControlButton label="Zoom in" onClick={zoomIn}>
          <Plus className="size-4" aria-hidden="true" />
        </ControlButton>
        <ControlButton label="Zoom out" onClick={zoomOut} className="border-t border-border">
          <Minus className="size-4" aria-hidden="true" />
        </ControlButton>
        <ControlButton label="Reset view" onClick={reset} className="border-t border-border">
          <Maximize2 className="size-4" aria-hidden="true" />
        </ControlButton>
      </div>

      {/* legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/85 px-3 py-2 text-xs backdrop-blur-sm">
        <LegendDot className="bg-critical" label="Critical" />
        <LegendDot className="bg-warning" label="Attention" />
        <LegendDot className="bg-healthy" label="Healthy" />
      </div>
    </div>
  )
}

function ControlButton({
  label,
  onClick,
  className = "",
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      // Prevent the click from starting a map pan.
      onPointerDown={(e) => e.stopPropagation()}
      className={`flex size-9 items-center justify-center text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${className}`}
    >
      {children}
    </button>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 font-medium">
      <span className={`size-2.5 rounded-full ${className}`} aria-hidden="true" />
      {label}
    </span>
  )
}

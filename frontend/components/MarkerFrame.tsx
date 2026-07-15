"use client"

import type { ReactNode } from "react"
import type { Asset, AssetType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { StatusBadge, ringColor } from "./StatusIndicators"

const TYPE_LABEL: Record<AssetType, string> = {
  fish_pond: "fish pond",
  chicken_coop: "chicken coop",
  rice_field: "rice field",
  fruit_orchard: "fruit orchard",
}

const STATUS_LABEL: Record<Asset["status"], string> = {
  critical: "critical",
  needs_attention: "needs attention",
  healthy: "healthy",
}

interface MarkerFrameProps {
  asset: Asset
  selected: boolean
  spotlight: boolean
  highlighted: boolean
  onSelect: () => void
  onHover: (hovering: boolean) => void
  children: ReactNode
}

export function MarkerFrame({
  asset,
  selected,
  spotlight,
  highlighted,
  onSelect,
  onHover,
  children,
}: MarkerFrameProps) {
  const ring = ringColor(asset.status)

  return (
    <div className="group relative flex flex-col items-center">
      {/* Card + halos + tooltip live in their own relative box so the pulses
          stay centered on the card, not the ground pad below. */}
      <div className="relative flex items-center justify-center">
        {/* Spotlight halo — only the single top-priority asset (feat-034) */}
        {spotlight && (
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: ring, animation: "spotlight-pulse 1.8s ease-out infinite" }}
            aria-hidden="true"
          />
        )}
        {/* Hover-driven highlight outline (feat-035), distinct from selection */}
        {highlighted && !selected && (
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 size-[5.5rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-[3px]"
            style={{ borderColor: ring, animation: "highlight-ring 1s ease-in-out infinite" }}
            aria-hidden="true"
          />
        )}

        <button
          type="button"
          onClick={onSelect}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
          onFocus={() => onHover(true)}
          onBlur={() => onHover(false)}
          aria-label={`${asset.name}, ${TYPE_LABEL[asset.type]}, ${STATUS_LABEL[asset.status]}`}
          aria-pressed={selected}
          className={cn(
            "relative flex size-20 items-center justify-center rounded-2xl border-2 bg-card/90 shadow-lg backdrop-blur-sm transition-transform duration-150",
            "hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-ring/50",
            selected && "-translate-y-1 ring-4 ring-offset-2 ring-offset-transparent",
          )}
          style={{
            borderColor: ring,
            ...(selected ? ({ "--tw-ring-color": ring } as React.CSSProperties) : {}),
          }}
        >
          {children}
          <span className="absolute -right-1.5 -top-1.5">
            <StatusBadge status={asset.status} />
          </span>
          {/* Pointer notch under the card, aimed at the stem */}
          <span
            className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-[2px] border-b-2 border-r-2 bg-card/90"
            style={{ borderColor: ring }}
            aria-hidden="true"
          />
        </button>

        {/* Name tooltip on hover/focus — above the card so it never covers the pin */}
        <span
          className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          aria-hidden="true"
        >
          {asset.name}
        </span>
      </div>

      {/* Connecting stem: physically ties the floating card to its ground pad */}
      <span
        className="mt-1 w-1.5 rounded-full transition-all duration-150 group-hover:h-4"
        style={{ height: 12, background: ring }}
        aria-hidden="true"
      />

      {/* Ground pad — sits exactly on the path landing pad in the terrain */}
      <span className="relative -mt-0.5 flex items-center justify-center" aria-hidden="true">
        <span className="block h-2 w-8 rounded-[50%]" style={{ background: ring, opacity: 0.35 }} />
        <span
          className="absolute size-2.5 rounded-full border-2 border-card"
          style={{ background: ring }}
        />
      </span>
    </div>
  )
}

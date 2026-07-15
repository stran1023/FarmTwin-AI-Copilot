import { AlertTriangle, Check } from "lucide-react"
import type { Asset, AssetStatus } from "@/lib/types"

const SEVERITY_RANK: Record<AssetStatus, number> = {
  critical: 3,
  needs_attention: 2,
  healthy: 1,
}

/**
 * Farm-wide highest-priority asset. Severity-ranked with a health-score
 * tie-break. Only ever one asset gets the spotlight halo.
 */
export function topPriorityAssetId(assets: Asset[]): string | null {
  if (assets.length === 0) return null
  const sorted = [...assets].sort((a, b) => {
    const rank = SEVERITY_RANK[b.status] - SEVERITY_RANK[a.status]
    if (rank !== 0) return rank
    return a.health_score - b.health_score
  })
  // Don't spotlight a fully healthy farm.
  return sorted[0].status === "healthy" ? null : sorted[0].id
}

/**
 * Status badge distinguishable WITHOUT color (feat-034, color-blind safe):
 * a bouncing "!" for critical, an amber warning triangle for needs_attention,
 * a green check for healthy.
 */
export function StatusBadge({ status }: { status: AssetStatus }) {
  if (status === "critical") {
    return (
      <span
        className="flex size-5 items-center justify-center rounded-full bg-critical text-critical-foreground shadow-md ring-2 ring-card"
        style={{ animation: "marker-bounce 0.9s ease-in-out infinite" }}
        aria-hidden="true"
      >
        <span className="text-xs font-black leading-none">!</span>
      </span>
    )
  }
  if (status === "needs_attention") {
    return (
      <span
        className="flex size-5 items-center justify-center rounded-full bg-warning text-warning-foreground shadow-md ring-2 ring-card"
        aria-hidden="true"
      >
        <AlertTriangle className="size-3" />
      </span>
    )
  }
  return (
    <span
      className="flex size-5 items-center justify-center rounded-full bg-healthy text-healthy-foreground shadow-md ring-2 ring-card"
      aria-hidden="true"
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  )
}

export function ringColor(status: AssetStatus): string {
  if (status === "critical") return "var(--critical)"
  if (status === "needs_attention") return "var(--warning)"
  return "var(--healthy)"
}

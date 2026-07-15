import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react"
import type { AssetStatus, Priority } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_META: Record<
  AssetStatus,
  { label: string; classes: string; Icon: typeof AlertOctagon }
> = {
  critical: {
    label: "Critical",
    classes: "bg-critical/15 text-critical border-critical/30",
    Icon: AlertOctagon,
  },
  needs_attention: {
    label: "Needs attention",
    classes: "bg-warning/20 text-warning-foreground border-warning/40",
    Icon: AlertTriangle,
  },
  healthy: {
    label: "Healthy",
    classes: "bg-healthy/15 text-healthy border-healthy/30",
    Icon: CheckCircle2,
  },
}

export function RiskBadge({ status, className }: { status: AssetStatus; className?: string }) {
  const meta = STATUS_META[status]
  const { Icon } = meta
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        meta.classes,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

const PRIORITY_META: Record<Priority, { label: string; classes: string }> = {
  high: { label: "High priority", classes: "bg-critical/15 text-critical border-critical/30" },
  medium: {
    label: "Medium priority",
    classes: "bg-warning/20 text-warning-foreground border-warning/40",
  },
  low: { label: "Low priority", classes: "bg-secondary text-secondary-foreground border-border" },
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const meta = PRIORITY_META[priority]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        meta.classes,
        className,
      )}
    >
      {meta.label}
    </span>
  )
}

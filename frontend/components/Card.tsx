import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode
  className?: string
  as?: "div" | "section" | "article"
}) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({
  title,
  icon,
  action,
  className,
}: {
  title: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-4 pt-4", className)}>
      <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight">
        {icon}
        {title}
      </h3>
      {action}
    </div>
  )
}

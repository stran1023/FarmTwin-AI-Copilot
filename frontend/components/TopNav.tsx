"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sprout, LayoutGrid, MessageSquareText, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/", label: "Farm", icon: LayoutGrid, match: (p: string) => p === "/" || p.startsWith("/assets") },
  { href: "/copilot", label: "Copilot", icon: MessageSquareText, match: (p: string) => p.startsWith("/copilot") },
  { href: "/briefing", label: "Briefing", icon: FileText, match: (p: string) => p.startsWith("/briefing") },
]

export function TopNav() {
  const pathname = usePathname()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sprout className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="font-serif text-lg font-semibold tracking-tight">FarmTwin</span>
      </Link>

      <nav className="flex items-center gap-1" aria-label="Primary">
        {LINKS.map((link) => {
          const active = link.match(pathname)
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}

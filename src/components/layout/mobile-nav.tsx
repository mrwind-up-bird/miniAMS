"use client"

import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Link, usePathname } from "@/i18n/navigation"

const mobileNavItems = [
  { href: "/" as const, icon: LayoutDashboard, labelKey: "dashboard" as const },
  { href: "/customers" as const, icon: Users, labelKey: "customers" as const },
  { href: "/time" as const, icon: Clock, labelKey: "time" as const },
  { href: "/invoices" as const, icon: FileText, labelKey: "invoices" as const },
  {
    href: "/projects" as const,
    icon: MoreHorizontal,
    labelKey: "more" as const,
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const t = useTranslations("nav")

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {mobileNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.labelKey}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

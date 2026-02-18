"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Clock,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Link, usePathname } from "@/i18n/navigation"

const navItems = [
  { href: "/" as const, icon: LayoutDashboard, labelKey: "dashboard" as const },
  { href: "/customers" as const, icon: Users, labelKey: "customers" as const },
  {
    href: "/projects" as const,
    icon: FolderKanban,
    labelKey: "projects" as const,
  },
  { href: "/time" as const, icon: Clock, labelKey: "time" as const },
  { href: "/invoices" as const, icon: FileText, labelKey: "invoices" as const },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const t = useTranslations("nav")

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen flex-col border-r bg-sidebar transition-all md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <span className="text-lg font-bold">miniAMS</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("ml-auto", collapsed && "mx-auto")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                collapsed && "justify-center px-2",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-2">
        <Link
          href={"/settings" as "/customers"}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50",
            collapsed && "justify-center px-2",
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{t("settings")}</span>}
        </Link>
      </div>
    </aside>
  )
}

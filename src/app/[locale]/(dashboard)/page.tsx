import { auth } from "@/lib/auth"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, FileText, Clock, FolderKanban, AlertTriangle } from "lucide-react"
import { getDashboardStats } from "@/lib/actions/dashboard"

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(amount)
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default async function DashboardPage() {
  const session = await auth()
  const t = await getTranslations("dashboard")
  const ti = await getTranslations("invoices")
  const stats = await getDashboardStats()

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("welcome", { name: session?.user?.name || "" })}
      </h1>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("revenueThisMonth")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(stats.revenueThisMonth)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("openInvoices")}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(stats.openInvoicesAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.openInvoicesCount} {t("openInvoices").toLowerCase()}
              {stats.overdueCount > 0 && (
                <span className="text-destructive ml-2">
                  ({stats.overdueCount} {t("overdue")})
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("trackedThisWeek")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatHours(stats.trackedThisWeekMinutes)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("activeProjects")}
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjectsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("recentInvoices")}</CardTitle>
              <Link
                href="/invoices"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("viewAll")}
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noRecentInvoices")}</p>
            ) : (
              <div className="space-y-3">
                {stats.recentInvoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between gap-2 py-1 hover:bg-muted/50 rounded -mx-2 px-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-sm font-medium">{inv.number}</span>
                      <p className="text-xs text-muted-foreground truncate">
                        {inv.customerName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(inv.total, inv.currency)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`ml-2 text-xs ${
                          inv.status === "paid"
                            ? "text-green-600 border-green-200"
                            : inv.status === "overdue"
                              ? "text-red-600 border-red-200"
                              : inv.status === "sent"
                                ? "text-blue-600 border-blue-200"
                                : "text-gray-600 border-gray-200"
                        }`}
                      >
                        {ti(`status${inv.status.charAt(0).toUpperCase()}${inv.status.slice(1)}`)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Time Entries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("recentTimeEntries")}</CardTitle>
              <Link
                href="/time"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("viewAll")}
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentTimeEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noRecentEntries")}</p>
            ) : (
              <div className="space-y-3">
                {stats.recentTimeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 py-1"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {entry.description || entry.projectName}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.projectName}</p>
                    </div>
                    <span className="text-sm font-medium tabular-nums shrink-0">
                      {formatHours(entry.duration)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

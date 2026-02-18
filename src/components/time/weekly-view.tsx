"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getWeeklyOverview } from "@/lib/actions/time-entries"
import { getWeekStart, formatDuration, formatShortDate } from "@/lib/format"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

interface WeeklyViewProps {
  initialData?: {
    projects: {
      projectId: string
      projectName: string
      days: Record<number, number>
      total: number
    }[]
    grandTotal: number
    weekStart: string
    weekEnd: string
  }
}

export function WeeklyView({ initialData }: WeeklyViewProps) {
  const t = useTranslations("time")

  const [weekStart, setWeekStart] = useState<Date>(() => {
    if (initialData?.weekStart) return new Date(initialData.weekStart)
    return getWeekStart(new Date())
  })

  const [data, setData] = useState(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)

  async function loadWeek(start: Date) {
    setLoading(true)
    try {
      const result = await getWeeklyOverview(start.toISOString().slice(0, 10))
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  function goToPrev() {
    const prev = new Date(weekStart)
    prev.setDate(prev.getDate() - 7)
    setWeekStart(prev)
    loadWeek(prev)
  }

  function goToNext() {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + 7)
    setWeekStart(next)
    loadWeek(next)
  }

  function goToThisWeek() {
    const curr = getWeekStart(new Date())
    setWeekStart(curr)
    loadWeek(curr)
  }

  // Build the 7-day column headers with dates
  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const isCurrentWeek =
    getWeekStart(new Date()).toISOString().slice(0, 10) ===
    weekStart.toISOString().slice(0, 10)

  // Daily totals across all projects
  const dailyTotals = Array.from({ length: 7 }, (_, day) =>
    (data?.projects ?? []).reduce((sum, p) => sum + (p.days[day] ?? 0), 0)
  )

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={goToPrev} className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNext} className="h-9 w-9">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm font-medium text-center flex-1">
          {formatShortDate(dayDates[0])} — {formatShortDate(dayDates[6])}
        </div>
        {!isCurrentWeek && (
          <Button variant="outline" size="sm" onClick={goToThisWeek} className="min-h-9">
            {t("thisWeek")}
          </Button>
        )}
        {isCurrentWeek && <div className="w-[80px]" />}
      </div>

      {/* Weekly total summary */}
      {data && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2">
          <span className="text-sm text-muted-foreground">{t("totalHours")}</span>
          <span className="text-sm font-semibold tabular-nums">
            {formatDuration(data.grandTotal)}
          </span>
        </div>
      )}

      {/* Grid — horizontally scrollable on mobile, sticky first column */}
      <Card>
        <CardHeader className="pb-0 pt-0" />
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b">
                {/* Sticky project column */}
                <th className="sticky left-0 z-10 bg-card text-left px-4 py-3 font-medium text-muted-foreground min-w-[140px] w-[160px]">
                  {t("project")}
                </th>
                {dayDates.map((date, i) => (
                  <th key={i} className="px-3 py-3 text-center font-medium text-muted-foreground min-w-[80px]">
                    <div>{DAY_LABELS[i]}</div>
                    <div className="text-xs font-normal">{formatShortDate(date)}</div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-muted-foreground min-w-[72px]">
                  {t("totalHours")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-muted-foreground text-sm"
                  >
                    {t("title")}...
                  </td>
                </tr>
              ) : !data || data.projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-muted-foreground text-sm"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                <>
                  {data.projects.map((project) => (
                    <tr key={project.projectId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium truncate max-w-[160px]">
                        {project.projectName}
                      </td>
                      {Array.from({ length: 7 }, (_, day) => {
                        const mins = project.days[day] ?? 0
                        return (
                          <td key={day} className="px-3 py-3 text-center tabular-nums">
                            {mins > 0 ? (
                              <span className="text-foreground font-medium">
                                {formatDuration(mins)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatDuration(project.total)}
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {/* Daily totals row */}
              {data && data.projects.length > 0 && (
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-muted-foreground">
                    {t("totalHours")}
                  </td>
                  {dailyTotals.map((total, day) => (
                    <td key={day} className="px-3 py-3 text-center tabular-nums">
                      {total > 0 ? (
                        <span>{formatDuration(total)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatDuration(data.grandTotal)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

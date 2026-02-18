"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, CheckSquare } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { deleteTimeEntry, approveTimeEntries, unapproveTimeEntries } from "@/lib/actions/time-entries"
import { formatDuration, formatDateRelative } from "@/lib/format"
import { cn } from "@/lib/utils"

interface TimeEntry {
  id: string
  projectId: string
  description: string | null
  startTime: Date | string | null
  endTime: Date | string | null
  duration: number
  billable: boolean
  status: string
  tags: string[]
  project: { id: string; name: string }
  createdAt: Date | string
}

interface TimeEntryListProps {
  entries: TimeEntry[]
  onEdit?: (entry: TimeEntry) => void
}

type TimeEntryStatus = "draft" | "approved" | "invoiced"

const statusStyles: Record<TimeEntryStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  approved: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  invoiced: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const styles = statusStyles[status as TimeEntryStatus] ?? statusStyles.draft
  return (
    <Badge variant="outline" className={cn("border font-medium text-xs", styles)}>
      {label}
    </Badge>
  )
}

function groupByDate(entries: TimeEntry[]): Map<string, TimeEntry[]> {
  const groups = new Map<string, TimeEntry[]>()
  for (const entry of entries) {
    const date = new Date(entry.startTime ?? entry.createdAt)
    const key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(entry)
  }
  return groups
}

export function TimeEntryList({ entries, onEdit }: TimeEntryListProps) {
  const t = useTranslations("time")
  const tc = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(entryIds: string[]) {
    setSelected((prev) => {
      const allSelected = entryIds.every((id) => prev.has(id))
      const next = new Set(prev)
      if (allSelected) {
        entryIds.forEach((id) => next.delete(id))
      } else {
        entryIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  async function handleDelete() {
    if (!deleteId) return
    const result = await deleteTimeEntry(deleteId)
    if (result && "error" in result) {
      toast.error(String(result.error))
    } else {
      toast.success(t("deleted"))
      setSelected((prev) => { const n = new Set(prev); n.delete(deleteId); return n })
      router.refresh()
    }
  }

  async function handleApprove() {
    const ids = Array.from(selected)
    const result = await approveTimeEntries(ids)
    if (result && "error" in result) {
      toast.error(String(result.error))
    } else {
      toast.success(t("approveSelected"))
      setSelected(new Set())
      router.refresh()
    }
  }

  async function handleUnapprove() {
    const ids = Array.from(selected)
    const result = await unapproveTimeEntries(ids)
    if (result && "error" in result) {
      toast.error(String(result.error))
    } else {
      toast.success(t("unapproveSelected"))
      setSelected(new Set())
      router.refresh()
    }
  }

  function statusLabel(status: string) {
    const map: Record<string, string> = {
      draft: t("draft"),
      approved: t("approved"),
      invoiced: t("invoiced"),
    }
    return map[status] ?? status
  }

  if (entries.length === 0) return null

  const grouped = groupByDate(entries)
  const allIds = entries.map((e) => e.id)

  const selectedEntries = entries.filter((e) => selected.has(e.id))
  const hasApproved = selectedEntries.some((e) => e.status === "approved")
  const hasDraft = selectedEntries.some((e) => e.status === "draft")

  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-2 rounded-lg border bg-background/95 backdrop-blur px-4 py-2 shadow-sm">
          <span className="text-sm font-medium flex-1">
            {selected.size} selected
          </span>
          {hasDraft && (
            <Button size="sm" variant="outline" onClick={handleApprove} className="min-h-9 gap-1">
              <CheckSquare className="h-4 w-4" />
              {t("approveSelected")}
            </Button>
          )}
          {hasApproved && (
            <Button size="sm" variant="outline" onClick={handleUnapprove} className="min-h-9">
              {t("unapproveSelected")}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="min-h-9">
            {tc("cancel")}
          </Button>
        </div>
      )}

      {/* Mobile card view */}
      <div className="space-y-6 md:hidden pb-20">
        {Array.from(grouped.entries()).map(([dateKey, dayEntries]) => {
          const date = new Date(dateKey)
          const label = formatDateRelative(date, locale)
          const dayTotal = dayEntries.reduce((sum, e) => sum + e.duration, 0)

          return (
            <div key={dateKey}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">{formatDuration(dayTotal)}</span>
              </div>
              <div className="space-y-2">
                {dayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border bg-card shadow-sm p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <Checkbox
                          checked={selected.has(entry.id)}
                          onCheckedChange={() => toggleSelect(entry.id)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{entry.project.name}</p>
                          {entry.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {entry.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit?.(entry)}
                          disabled={entry.status !== "draft"}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(entry.id)}
                          disabled={entry.status !== "draft"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pl-6">
                      <span className="text-sm font-medium tabular-nums">
                        {formatDuration(entry.duration)}
                      </span>
                      <StatusBadge status={entry.status} label={statusLabel(entry.status)} />
                      {entry.billable ? (
                        <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-400">
                          {t("billable")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {t("nonBillable")}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allIds.length > 0 && allIds.every((id) => selected.has(id))}
                  onCheckedChange={() => toggleAll(allIds)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("project")}</TableHead>
              <TableHead>{t("description")}</TableHead>
              <TableHead>{t("duration")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("billable")}</TableHead>
              <TableHead className="w-20">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const date = new Date(entry.startTime ?? entry.createdAt)
              const label = formatDateRelative(date, locale)
              return (
                <TableRow key={entry.id} className={selected.has(entry.id) ? "bg-muted/40" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(entry.id)}
                      onCheckedChange={() => toggleSelect(entry.id)}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {label}
                  </TableCell>
                  <TableCell className="font-medium">{entry.project.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px]">
                    <span className="truncate block">{entry.description ?? "—"}</span>
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatDuration(entry.duration)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={entry.status} label={statusLabel(entry.status)} />
                  </TableCell>
                  <TableCell>
                    {entry.billable ? (
                      <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-400">
                        {t("billable")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {t("nonBillable")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit?.(entry)}
                        disabled={entry.status !== "draft"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(entry.id)}
                        disabled={entry.status !== "draft"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title={tc("delete") + " " + t("title")}
        description={t("deleted") + "?"}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { getApprovedTimeEntriesForInvoice } from "@/lib/actions/invoices"

interface ProjectGroup {
  projectId: string
  projectName: string
  totalMinutes: number
  entries: Array<{
    id: string
    description: string | null
    duration: number
    createdAt: string | Date
  }>
}

interface TimeEntryPickerProps {
  customerId: string
  onImport: (
    items: Array<{
      description: string
      quantity: number
      unitPrice: number
      taxRate: number
      timeEntryId: string
    }>
  ) => void
  onClose: () => void
}

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1) + "h"
}

export function TimeEntryPicker({ customerId, onImport, onClose }: TimeEntryPickerProps) {
  const t = useTranslations("invoices")

  const [projects, setProjects] = useState<ProjectGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getApprovedTimeEntriesForInvoice(customerId)
    if ("error" in result) {
      toast.error(String(result.error))
      onClose()
      return
    }
    setProjects(result.projects)
    setLoading(false)
  }, [customerId, onClose])

  useEffect(() => {
    load()
  }, [load])

  function toggleEntry(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleProject(entries: Array<{ id: string }>) {
    const ids = entries.map((e) => e.id)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  function handleImport() {
    const items: Array<{
      description: string
      quantity: number
      unitPrice: number
      taxRate: number
      timeEntryId: string
    }> = []

    for (const project of projects) {
      for (const entry of project.entries) {
        if (selected.has(entry.id)) {
          const desc = entry.description
            ? `${project.projectName}: ${entry.description}`
            : project.projectName
          items.push({
            description: desc,
            quantity: Math.round((entry.duration / 60) * 100) / 100,
            unitPrice: 0,
            taxRate: 19,
            timeEntryId: entry.id,
          })
        }
      }
    }

    onImport(items)
  }

  if (loading) {
    return (
      <div className="rounded-lg border p-6 text-center text-muted-foreground text-sm">
        {t("loadingTimeEntries")}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">{t("noApprovedEntries")}</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          {t("back")}
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="space-y-3">
        {projects.map((project) => {
          const allSelected = project.entries.every((e) => selected.has(e.id))
          return (
            <div key={project.projectId} className="space-y-1.5">
              <label className="flex items-center gap-2 font-medium text-sm cursor-pointer">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => toggleProject(project.entries)}
                />
                <span>{project.projectName}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatHours(project.totalMinutes)}
                </span>
              </label>
              <div className="ml-6 space-y-0.5">
                {project.entries.map((entry) => (
                  <label
                    key={entry.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={selected.has(entry.id)}
                      onCheckedChange={() => toggleEntry(entry.id)}
                    />
                    <span className="flex-1 truncate">
                      {entry.description || t("noDescription")}
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {formatHours(entry.duration)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Separator />

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onClose} className="min-h-9">
          {t("back")}
        </Button>
        <Button
          size="sm"
          onClick={handleImport}
          disabled={selected.size === 0}
          className="min-h-9"
        >
          {t("importSelected")} ({selected.size})
        </Button>
      </div>
    </div>
  )
}

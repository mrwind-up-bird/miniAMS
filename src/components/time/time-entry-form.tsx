"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { createTimeEntry, updateTimeEntry } from "@/lib/actions/time-entries"
import { getProjects } from "@/lib/actions/projects"

interface Project {
  id: string
  name: string
}

interface TimeEntry {
  id: string
  projectId: string
  description: string | null
  startTime: Date | string | null
  endTime: Date | string | null
  duration: number
  billable: boolean
  tags: string[]
  project: { id: string; name: string }
}

interface TimeEntryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: TimeEntry
  projects?: Project[]
  onSuccess?: () => void
}

type FieldErrors = Record<string, string[] | undefined>

function toTimeString(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = new Date(date)
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

function toDateString(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString().slice(0, 10)
  return new Date(date).toISOString().slice(0, 10)
}

function calcDuration(date: string, start: string, end: string): number {
  if (!date || !start || !end) return 0
  const startDt = new Date(`${date}T${start}`)
  const endDt = new Date(`${date}T${end}`)
  const diff = Math.round((endDt.getTime() - startDt.getTime()) / 60000)
  return Math.max(0, diff)
}

export function TimeEntryForm({
  open,
  onOpenChange,
  entry,
  projects: initialProjects,
  onSuccess,
}: TimeEntryFormProps) {
  const t = useTranslations("time")
  const tc = useTranslations("common")

  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [projects, setProjects] = useState<Project[]>(initialProjects ?? [])

  const [form, setForm] = useState({
    projectId: entry?.projectId ?? "",
    date: toDateString(entry?.startTime),
    startTime: toTimeString(entry?.startTime),
    endTime: toTimeString(entry?.endTime),
    duration: entry?.duration?.toString() ?? "",
    description: entry?.description ?? "",
    billable: entry?.billable ?? true,
    tags: entry?.tags?.join(", ") ?? "",
  })

  useEffect(() => {
    if (initialProjects) return
    getProjects({ pageSize: 100 }).then(({ projects }) => setProjects(projects))
  }, [initialProjects])

  useEffect(() => {
    setForm({
      projectId: entry?.projectId ?? "",
      date: toDateString(entry?.startTime),
      startTime: toTimeString(entry?.startTime),
      endTime: toTimeString(entry?.endTime),
      duration: entry?.duration?.toString() ?? "",
      description: entry?.description ?? "",
      billable: entry?.billable ?? true,
      tags: entry?.tags?.join(", ") ?? "",
    })
    setFieldErrors({})
  }, [entry])

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // Auto-calculate duration from start+end times
      if (field === "startTime" || field === "endTime") {
        const s = field === "startTime" ? (value as string) : prev.startTime
        const e = field === "endTime" ? (value as string) : prev.endTime
        if (s && e) {
          const dur = calcDuration(next.date, s, e)
          if (dur > 0) next.duration = dur.toString()
        }
      }
      return next
    })
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    const startDt = form.startTime
      ? new Date(`${form.date}T${form.startTime}`)
      : undefined
    const endDt = form.endTime
      ? new Date(`${form.date}T${form.endTime}`)
      : undefined

    const parsedDuration = form.duration ? parseInt(form.duration, 10) : NaN

    // For create, duration is required; for update it's optional
    if (!entry && (isNaN(parsedDuration) || parsedDuration < 1)) {
      setFieldErrors({ duration: ["Duration is required (min 1 minute)"] })
      setLoading(false)
      return
    }

    const data = {
      projectId: form.projectId,
      description: form.description || undefined,
      startTime: startDt,
      endTime: endDt,
      duration: !isNaN(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined,
      billable: form.billable,
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    }

    try {
      const result = entry
        ? await updateTimeEntry(entry.id, data)
        : await createTimeEntry(data)

      if (result && "error" in result) {
        if (typeof result.error === "object" && result.error !== null) {
          setFieldErrors(result.error as FieldErrors)
        } else {
          toast.error(String(result.error))
        }
        return
      }

      toast.success(t("saved"))
      onOpenChange(false)
      onSuccess?.()
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!loading) {
      onOpenChange(open)
      if (!open && !entry) {
        setForm({
          projectId: "",
          date: new Date().toISOString().slice(0, 10),
          startTime: "",
          endTime: "",
          duration: "",
          description: "",
          billable: true,
          tags: "",
        })
        setFieldErrors({})
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col h-full">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>
            {entry ? tc("edit") : tc("create")} {t("title").replace(/\s.*/, " Entry")}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Project */}
            <div className="space-y-1.5">
              <Label htmlFor="entry-project">{t("project")} *</Label>
              <Select value={form.projectId} onValueChange={(v) => set("projectId", v)}>
                <SelectTrigger
                  id="entry-project"
                  className={`h-11 w-full ${fieldErrors.projectId ? "border-destructive" : ""}`}
                >
                  <SelectValue placeholder={t("noProject")} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.projectId && (
                <p className="text-xs text-destructive">{fieldErrors.projectId[0]}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="entry-date">{t("date")}</Label>
              <Input
                id="entry-date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="h-11"
              />
            </div>

            {/* Start + End time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="entry-start">{t("startTime")}</Label>
                <Input
                  id="entry-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="entry-end">{t("endTime")}</Label>
                <Input
                  id="entry-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label htmlFor="entry-duration">{t("duration")} ({t("minutes")})</Label>
              <Input
                id="entry-duration"
                type="number"
                min={1}
                value={form.duration}
                onChange={(e) => set("duration", e.target.value)}
                placeholder="e.g. 90"
                className="h-11"
              />
              {fieldErrors.duration && (
                <p className="text-xs text-destructive">{fieldErrors.duration[0]}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="entry-description">{t("description")}</Label>
              <Textarea
                id="entry-description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Billable */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="entry-billable"
                checked={form.billable}
                onCheckedChange={(v) => set("billable", v === true)}
              />
              <Label htmlFor="entry-billable" className="cursor-pointer">
                {t("billable")}
              </Label>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="entry-tags">Tags</Label>
              <Input
                id="entry-tags"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="e.g. design, review"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="flex-1 min-h-11"
            >
              {tc("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.projectId}
              className="flex-1 min-h-11"
            >
              {loading ? tc("loading") : tc("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { createProject, updateProject } from "@/lib/actions/projects"
import { getCustomers } from "@/lib/actions/customers"

interface Customer {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
  customerId: string
  type: string
  status: string
  budget: number | null
  hourlyRate: number | null
  startDate: Date | string | null
  endDate: Date | string | null
  tags: string[]
}

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
  defaultCustomerId?: string
  onSuccess?: () => void
}

type FieldErrors = Record<string, string[] | undefined>

const TYPES = [
  { value: "retainer", labelKey: "typeRetainer" },
  { value: "fixed", labelKey: "typeFixed" },
  { value: "time_material", labelKey: "typeTimeMaterial" },
] as const

const STATUSES = [
  { value: "planned", labelKey: "statusPlanned" },
  { value: "active", labelKey: "statusActive" },
  { value: "on_hold", labelKey: "statusOnHold" },
  { value: "completed", labelKey: "statusCompleted" },
  { value: "cancelled", labelKey: "statusCancelled" },
] as const

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  return d.toISOString().split("T")[0]
}

export function ProjectForm({
  open,
  onOpenChange,
  project,
  defaultCustomerId,
  onSuccess,
}: ProjectFormProps) {
  const t = useTranslations("projects")
  const tc = useTranslations("common")

  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [customers, setCustomers] = useState<Customer[]>([])

  const [form, setForm] = useState({
    name: project?.name ?? "",
    customerId: project?.customerId ?? defaultCustomerId ?? "",
    type: project?.type ?? "time_material",
    status: project?.status ?? "planned",
    budget: project?.budget?.toString() ?? "",
    hourlyRate: project?.hourlyRate?.toString() ?? "",
    startDate: toDateInputValue(project?.startDate),
    endDate: toDateInputValue(project?.endDate),
    tags: project?.tags?.join(", ") ?? "",
  })

  // Load customers when sheet opens
  useEffect(() => {
    if (open) {
      getCustomers({ pageSize: 200 }).then(({ customers }) => {
        setCustomers(customers.map((c) => ({ id: c.id, name: c.name })))
      })
    }
  }, [open])

  // Sync form when project prop changes
  useEffect(() => {
    setForm({
      name: project?.name ?? "",
      customerId: project?.customerId ?? defaultCustomerId ?? "",
      type: project?.type ?? "time_material",
      status: project?.status ?? "planned",
      budget: project?.budget?.toString() ?? "",
      hourlyRate: project?.hourlyRate?.toString() ?? "",
      startDate: toDateInputValue(project?.startDate),
      endDate: toDateInputValue(project?.endDate),
      tags: project?.tags?.join(", ") ?? "",
    })
  }, [project, defaultCustomerId])

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})

    const data = {
      name: form.name,
      customerId: form.customerId,
      type: form.type || undefined,
      status: form.status || undefined,
      budget: form.budget ? parseFloat(form.budget) : undefined,
      hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
      startDate: form.startDate ? new Date(form.startDate) : undefined,
      endDate: form.endDate ? new Date(form.endDate) : undefined,
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    }

    try {
      const result = project
        ? await updateProject(project.id, data)
        : await createProject(data)

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
      if (!open) {
        setFieldErrors({})
        if (!project) {
          setForm({
            name: "",
            customerId: defaultCustomerId ?? "",
            type: "time_material",
            status: "planned",
            budget: "",
            hourlyRate: "",
            startDate: "",
            endDate: "",
            tags: "",
          })
        }
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col h-full"
      >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>
            {project ? tc("edit") : tc("create")} {t("title").replace(/s$/, "")}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("name")} *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                aria-invalid={!!fieldErrors.name}
                className="h-11"
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Customer */}
            <div className="space-y-1.5">
              <Label htmlFor="customerId">{t("customer")} *</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => set("customerId", v)}
                required
              >
                <SelectTrigger id="customerId" className="h-11 w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.customerId && (
                <p className="text-xs text-destructive">{fieldErrors.customerId[0]}</p>
              )}
            </div>

            {/* Type + Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="type">{t("type")}</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger id="type" className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {t(s.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">{t("status")}</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger id="status" className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {t(s.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget + Hourly rate row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="budget">{t("budget")}</Label>
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.budget}
                  onChange={(e) => set("budget", e.target.value)}
                  className="h-11"
                />
                {fieldErrors.budget && (
                  <p className="text-xs text-destructive">{fieldErrors.budget[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hourlyRate">{t("hourlyRate")}</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.hourlyRate}
                  onChange={(e) => set("hourlyRate", e.target.value)}
                  className="h-11"
                />
                {fieldErrors.hourlyRate && (
                  <p className="text-xs text-destructive">{fieldErrors.hourlyRate[0]}</p>
                )}
              </div>
            </div>

            {/* Start date + End date row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">{t("startDate")}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate">{t("endDate")}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="e.g. q1, priority"
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
              disabled={loading}
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

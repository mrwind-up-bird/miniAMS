"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { FolderKanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProjectList } from "@/components/projects/project-list"
import { ProjectForm } from "@/components/projects/project-form"
import { SearchBar } from "@/components/shared/search-bar"
import { EmptyState } from "@/components/shared/empty-state"

interface Project {
  id: string
  name: string
  status: string
  type: string
  budget: number | null
  hourlyRate: number | null
  startDate: Date | null
  endDate: Date | null
  tags: string[]
  customerId: string
  customer: { id: string; name: string }
}

interface ProjectPageClientProps {
  projects: Project[]
  total: number
  canDelete?: boolean
}

const ALL_VALUE = "__all__"

export function ProjectPageClient({ projects, canDelete = false }: ProjectPageClientProps) {
  const t = useTranslations("projects")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | undefined>()

  function openCreate() {
    setEditingProject(undefined)
    setSheetOpen(true)
  }

  function openEdit(project: Project) {
    setEditingProject(project)
    setSheetOpen(true)
  }

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== ALL_VALUE) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`)
  }

  const currentStatus = searchParams.get("status") ?? ""
  const currentType = searchParams.get("type") ?? ""

  return (
    <>
      <div className="space-y-4 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <Button onClick={openCreate} className="min-h-11 shrink-0">
            {t("addProject")}
          </Button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchBar placeholder={t("title")} paramName="search" />
          <div className="flex gap-2 shrink-0">
            <Select
              value={currentStatus || ALL_VALUE}
              onValueChange={(v) => setFilter("status", v)}
            >
              <SelectTrigger className="h-11 w-[130px]">
                <SelectValue placeholder={t("status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t("status")}</SelectItem>
                <SelectItem value="planned">{t("statusPlanned")}</SelectItem>
                <SelectItem value="active">{t("statusActive")}</SelectItem>
                <SelectItem value="on_hold">{t("statusOnHold")}</SelectItem>
                <SelectItem value="completed">{t("statusCompleted")}</SelectItem>
                <SelectItem value="cancelled">{t("statusCancelled")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={currentType || ALL_VALUE}
              onValueChange={(v) => setFilter("type", v)}
            >
              <SelectTrigger className="h-11 w-[130px]">
                <SelectValue placeholder={t("type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t("type")}</SelectItem>
                <SelectItem value="retainer">{t("typeRetainer")}</SelectItem>
                <SelectItem value="fixed">{t("typeFixed")}</SelectItem>
                <SelectItem value="time_material">{t("typeTimeMaterial")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List or empty state */}
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={t("empty")}
            description={t("emptyDescription")}
            action={
              <Button onClick={openCreate} className="min-h-11">
                {t("addProject")}
              </Button>
            }
          />
        ) : (
          <ProjectList projects={projects} onEdit={openEdit} canDelete={canDelete} />
        )}
      </div>

      <ProjectForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        project={editingProject}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}

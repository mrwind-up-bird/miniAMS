"use client"

import { useTranslations } from "next-intl"
import { FolderKanban, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Link } from "@/i18n/navigation"

interface Project {
  id: string
  name: string
  status: string
  type: string
  budget: number | null
  startDate: Date | null
  endDate: Date | null
}

interface CustomerProjectsTabProps {
  customerId: string
  projects: Project[]
}

const typeLabels: Record<string, string> = {
  retainer: "Retainer",
  fixed: "Fixed",
  time_material: "T&M",
}

export function CustomerProjectsTab({
  customerId,
  projects,
}: CustomerProjectsTabProps) {
  const t = useTranslations("projects")

  const statusLabelMap: Record<string, string> = {
    planned: t("statusPlanned"),
    active: t("statusActive"),
    on_hold: t("statusOnHold"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title={t("empty")}
        description={t("emptyDescription")}
        action={
          <Button asChild size="sm">
            <Link href={`/projects?customerId=${customerId}` as "/projects"}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("addProject")}
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}` as "/projects"}
          className="block"
        >
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{project.name}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {typeLabels[project.type] || project.type}
                    {project.budget && (
                      <span className="ml-2">
                        {t("budget")}: €
                        {Number(project.budget).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge
                  status={project.status}
                  type="project"
                  label={statusLabelMap[project.status] ?? project.status}
                />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

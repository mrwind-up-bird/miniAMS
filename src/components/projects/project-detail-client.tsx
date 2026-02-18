"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ProjectForm } from "@/components/projects/project-form"
import { ProjectInfoTab } from "@/components/projects/project-info-tab"
import { ProjectMembersTab } from "@/components/projects/project-members-tab"
import { deleteProject } from "@/lib/actions/projects"

interface Member {
  id: string
  role: string
  hourlyRate: number | null
  user: { id: string; name: string; email: string; role: string }
}

interface Project {
  id: string
  name: string
  customerId: string
  type: string
  status: string
  budget: number | null
  hourlyRate: number | null
  startDate: Date | null
  endDate: Date | null
  tags: string[]
  customer: { id: string; name: string }
  members: Member[]
  _count: { timeEntries: number }
}

interface ProjectDetailClientProps {
  project: Project
  userRole: string
}

export function ProjectDetailClient({ project, userRole }: ProjectDetailClientProps) {
  const t = useTranslations("projects")
  const tc = useTranslations("common")
  const router = useRouter()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const canDelete = userRole === "owner" || userRole === "admin"

  const statusLabelMap: Record<string, string> = {
    planned: t("statusPlanned"),
    active: t("statusActive"),
    on_hold: t("statusOnHold"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
  }

  async function handleDelete() {
    const result = await deleteProject(project.id)
    if (result && "error" in result) {
      toast.error(String(result.error))
      return
    }
    toast.success(t("deleted"))
    router.push("/projects")
  }

  return (
    <>
      <div className="space-y-4 pb-20 md:pb-6">
        {/* Back link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc("back")}
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <StatusBadge
                status={project.status}
                type="project"
                label={statusLabelMap[project.status] ?? project.status}
              />
            </div>
            <Link
              href={`/customers/${project.customer.id}`}
              className="mt-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {project.customer.name}
            </Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              onClick={() => setEditOpen(true)}
              aria-label={tc("edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
                aria-label={tc("delete")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="info" className="mt-2">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="info" className="min-w-fit">
              {t("info")}
            </TabsTrigger>
            <TabsTrigger value="members" className="min-w-fit">
              {t("team")}
              {project.members.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {project.members.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="time" className="min-w-fit">
              {t("timeEntries")}
            </TabsTrigger>
            <TabsTrigger value="invoices" className="min-w-fit">
              {t("invoices")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <ProjectInfoTab project={project} />
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <ProjectMembersTab
              projectId={project.id}
              members={project.members}
            />
          </TabsContent>

          <TabsContent value="time" className="mt-4">
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <p className="text-sm text-muted-foreground">
                Time entries coming in Phase 3
              </p>
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <p className="text-sm text-muted-foreground">
                Invoices coming in Phase 4
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ProjectForm
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSuccess={() => router.refresh()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteConfirm")}
        description={t("deleteDescription")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}

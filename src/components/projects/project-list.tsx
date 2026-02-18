"use client"

import { useTranslations } from "next-intl"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Link } from "@/i18n/navigation"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { deleteProject } from "@/lib/actions/projects"

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

interface ProjectListProps {
  projects: Project[]
  onEdit?: (project: Project) => void
  canDelete?: boolean
}

export function ProjectList({ projects, onEdit, canDelete = false }: ProjectListProps) {
  const t = useTranslations("projects")
  const tc = useTranslations("common")
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const statusLabelMap: Record<string, string> = {
    planned: t("statusPlanned"),
    active: t("statusActive"),
    on_hold: t("statusOnHold"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
  }

  const typeLabelMap: Record<string, string> = {
    retainer: t("typeRetainer"),
    fixed: t("typeFixed"),
    time_material: t("typeTimeMaterial"),
  }

  async function handleDelete() {
    if (!deleteId) return
    const result = await deleteProject(deleteId)
    if (result && "error" in result) {
      toast.error(String(result.error))
    } else {
      toast.success(t("deleted"))
      router.refresh()
    }
  }

  if (projects.length === 0) return null

  return (
    <>
      {/* Mobile card grid */}
      <div className="grid gap-3 md:hidden pb-20">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}` as "/projects"}
            className="block"
          >
            <div className="rounded-xl border bg-card shadow-sm p-4 min-h-[88px] flex flex-col gap-2 active:opacity-70 transition-opacity">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-base leading-tight">{project.name}</span>
                <StatusBadge
                  status={project.status}
                  type="project"
                  label={statusLabelMap[project.status] ?? project.status}
                />
              </div>
              <span className="text-sm text-muted-foreground">{project.customer.name}</span>
              <span className="text-xs text-muted-foreground">
                {typeLabelMap[project.type] ?? project.type}
                {project.budget && ` · €${Number(project.budget).toLocaleString()}`}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("customer")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("budget")}</TableHead>
              <TableHead className="w-12">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link
                    href={`/projects/${project.id}` as "/projects"}
                    className="font-medium hover:underline underline-offset-4"
                  >
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <Link
                    href={`/customers/${project.customer.id}`}
                    className="hover:underline underline-offset-4"
                  >
                    {project.customer.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {typeLabelMap[project.type] ?? project.type}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={project.status}
                    type="project"
                    label={statusLabelMap[project.status] ?? project.status}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {project.budget ? `€${Number(project.budget).toLocaleString()}` : "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={tc("actions")}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEdit?.(project)}
                        className="gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        {tc("edit")}
                      </DropdownMenuItem>
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteId(project.id)}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            {tc("delete")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
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

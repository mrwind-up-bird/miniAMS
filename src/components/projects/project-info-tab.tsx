"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Project {
  id: string
  name: string
  type: string
  status: string
  budget: number | null
  hourlyRate: number | null
  startDate: Date | null
  endDate: Date | null
  tags: string[]
  customer: { id: string; name: string }
}

interface ProjectInfoTabProps {
  project: Project
}

function formatDate(date: Date | null): string | null {
  if (!date) return null
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

interface InfoRowProps {
  label: string
  value?: string | null
  children?: React.ReactNode
}

function InfoRow({ label, value, children }: InfoRowProps) {
  if (!value && !children) return null
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-2.5 items-baseline text-sm">
      <span className="text-muted-foreground font-medium shrink-0">{label}</span>
      {children ?? <span className="break-words">{value}</span>}
    </div>
  )
}

export function ProjectInfoTab({ project }: ProjectInfoTabProps) {
  const t = useTranslations("projects")

  const typeLabelMap: Record<string, string> = {
    retainer: t("typeRetainer"),
    fixed: t("typeFixed"),
    time_material: t("typeTimeMaterial"),
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("info")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 divide-y">
          <InfoRow label={t("customer")}>
            <Link
              href={`/customers/${project.customer.id}`}
              className="hover:underline underline-offset-4 text-sm"
            >
              {project.customer.name}
            </Link>
          </InfoRow>
          <InfoRow label={t("type")} value={typeLabelMap[project.type] ?? project.type} />
          <InfoRow
            label={t("budget")}
            value={project.budget != null ? `€${Number(project.budget).toLocaleString()}` : null}
          />
          <InfoRow
            label={t("hourlyRate")}
            value={project.hourlyRate != null ? `€${Number(project.hourlyRate)}/h` : null}
          />
          <InfoRow label={t("startDate")} value={formatDate(project.startDate)} />
          <InfoRow label={t("endDate")} value={formatDate(project.endDate)} />
        </CardContent>
      </Card>

      {project.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("tags")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}

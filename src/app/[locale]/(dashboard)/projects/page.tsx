import { ProjectStatus, ProjectType } from "@prisma/client"
import { auth } from "@/lib/auth"
import { getProjects } from "@/lib/actions/projects"
import { ProjectPageClient } from "@/components/projects/project-page-client"

const VALID_PROJECT_STATUSES = new Set<string>(Object.values(ProjectStatus))
const VALID_PROJECT_TYPES = new Set<string>(Object.values(ProjectType))

interface ProjectsPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    type?: string
    page?: string
  }>
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const status =
    params.status && VALID_PROJECT_STATUSES.has(params.status)
      ? (params.status as ProjectStatus)
      : undefined
  const type =
    params.type && VALID_PROJECT_TYPES.has(params.type)
      ? (params.type as ProjectType)
      : undefined

  const [{ projects, total }, session] = await Promise.all([
    getProjects({ search: params.search, status, type, page, pageSize: 20 }),
    auth(),
  ])

  // Serialize Decimal fields for client
  const serializedProjects = projects.map((p) => ({
    ...p,
    budget: p.budget !== null ? Number(p.budget) : null,
    hourlyRate: p.hourlyRate !== null ? Number(p.hourlyRate) : null,
  }))

  const canDelete = session?.user?.role === "owner" || session?.user?.role === "admin"

  return (
    <ProjectPageClient
      projects={serializedProjects}
      total={total}
      canDelete={canDelete}
    />
  )
}

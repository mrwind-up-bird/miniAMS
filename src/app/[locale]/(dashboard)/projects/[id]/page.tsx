import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProject } from "@/lib/actions/projects"
import { ProjectDetailClient } from "@/components/projects/project-detail-client"

interface ProjectDetailPageProps {
  params: Promise<{ id: string; locale: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params

  const [result, session] = await Promise.all([
    getProject(id),
    auth(),
  ])

  if ("error" in result) {
    notFound()
  }

  // Serialize Decimal fields for client
  const serializedProject = {
    ...result,
    budget: result.budget !== null ? Number(result.budget) : null,
    hourlyRate: result.hourlyRate !== null ? Number(result.hourlyRate) : null,
    members: result.members.map((m) => ({
      ...m,
      hourlyRate: m.hourlyRate !== null ? Number(m.hourlyRate) : null,
    })),
  }

  const userRole = session?.user?.role ?? "member"

  return <ProjectDetailClient project={serializedProject} userRole={userRole} />
}

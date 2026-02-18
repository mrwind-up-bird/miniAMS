import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getCustomer } from "@/lib/actions/customers"
import { getProjects } from "@/lib/actions/projects"
import { CustomerDetailClient } from "@/components/customers/customer-detail-client"

interface CustomerDetailPageProps {
  params: Promise<{ id: string; locale: string }>
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params

  const [result, session] = await Promise.all([
    getCustomer(id),
    auth(),
  ])

  if ("error" in result) {
    notFound()
  }

  const { projects } = await getProjects({ customerId: id, pageSize: 50 })

  // Serialize Decimal fields to number for client component
  const serializedProjects = projects.map((p) => ({
    ...p,
    budget: p.budget !== null ? Number(p.budget) : null,
    hourlyRate: p.hourlyRate !== null ? Number(p.hourlyRate) : null,
  }))

  const serializedCustomer = {
    ...result,
    paymentTermDays: result.paymentTermDays,
  }

  const userRole = session?.user?.role ?? "member"

  return (
    <CustomerDetailClient
      customer={serializedCustomer}
      projects={serializedProjects}
      userRole={userRole}
    />
  )
}

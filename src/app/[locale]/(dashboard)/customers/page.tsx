import { CustomerStatus } from "@prisma/client"
import { auth } from "@/lib/auth"
import { getCustomers } from "@/lib/actions/customers"
import { CustomerPageClient } from "@/components/customers/customer-page-client"

const VALID_CUSTOMER_STATUSES = new Set<string>(Object.values(CustomerStatus))

interface CustomersPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const status =
    params.status && VALID_CUSTOMER_STATUSES.has(params.status)
      ? (params.status as CustomerStatus)
      : undefined

  const [{ customers, total }, session] = await Promise.all([
    getCustomers({ search: params.search, status, page, pageSize: 20 }),
    auth(),
  ])

  const canDelete = session?.user?.role === "owner" || session?.user?.role === "admin"

  return (
    <CustomerPageClient
      customers={customers}
      total={total}
      canDelete={canDelete}
    />
  )
}

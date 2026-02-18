import { InvoiceStatus } from "@prisma/client"
import { getInvoices, getInvoiceStats } from "@/lib/actions/invoices"
import { getCustomers } from "@/lib/actions/customers"
import { InvoicePageClient } from "@/components/invoices/invoice-page-client"

const validStatuses = new Set(Object.values(InvoiceStatus))

export default async function InvoicesPage(props: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await props.searchParams
  const search = params.search ?? undefined
  const status = validStatuses.has(params.status as InvoiceStatus)
    ? (params.status as InvoiceStatus)
    : undefined
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)

  const [{ invoices, total }, stats, { customers }] = await Promise.all([
    getInvoices({ search, status, page, pageSize: 20 }),
    getInvoiceStats(),
    getCustomers({ pageSize: 100, status: "active" as const }),
  ])

  const serializedInvoices = invoices.map((inv) => ({
    ...inv,
    issueDate: inv.issueDate instanceof Date ? inv.issueDate.toISOString() : String(inv.issueDate),
    dueDate: inv.dueDate instanceof Date ? inv.dueDate.toISOString() : String(inv.dueDate),
  }))

  const customerList = customers.map((c) => ({ id: c.id, name: c.name }))

  return (
    <InvoicePageClient
      invoices={serializedInvoices}
      total={total}
      stats={{
        totalOutstanding: stats.totalOutstanding,
        overdueAmount: stats.overdueAmount,
        paidThisMonth: stats.paidThisMonth,
        counts: {
          draft: stats.invoiceCount.draft ?? 0,
          sent: stats.invoiceCount.sent ?? 0,
          paid: stats.invoiceCount.paid ?? 0,
          overdue: stats.invoiceCount.overdue ?? 0,
        },
      }}
      customers={customerList}
    />
  )
}

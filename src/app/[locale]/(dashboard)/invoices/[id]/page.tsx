import { notFound } from "next/navigation"
import { getInvoice } from "@/lib/actions/invoices"
import { InvoiceDetailClient } from "@/components/invoices/invoice-detail-client"

export default async function InvoiceDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const invoice = await getInvoice(id)

  if ("error" in invoice) {
    notFound()
  }

  const serialized = {
    ...invoice,
    issueDate: invoice.issueDate instanceof Date ? invoice.issueDate.toISOString() : String(invoice.issueDate),
    dueDate: invoice.dueDate instanceof Date ? invoice.dueDate.toISOString() : String(invoice.dueDate),
    paidAt: invoice.paidAt
      ? invoice.paidAt instanceof Date
        ? invoice.paidAt.toISOString()
        : String(invoice.paidAt)
      : null,
    customer: {
      id: invoice.customer.id,
      name: invoice.customer.name,
      address: invoice.customer.address ?? null,
      vatId: invoice.customer.vatId ?? null,
      email: invoice.customer.email ?? null,
    },
    items: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      total: Number(item.total),
    })),
  }

  return <InvoiceDetailClient invoice={serialized} />
}

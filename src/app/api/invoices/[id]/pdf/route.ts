import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limit"
import { InvoicePDF } from "@/lib/pdf/invoice-template"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { allowed } = rateLimit(`pdf:${session.user.id}`, { limit: 20, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const { id } = await params
  const tenantId = session.user.tenantId

  const invoice = await db.invoice.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      customer: {
        select: { name: true, address: true, email: true, vatId: true },
      },
      tenant: {
        select: { name: true },
      },
      items: {
        select: {
          description: true,
          quantity: true,
          unitPrice: true,
          taxRate: true,
          total: true,
        },
      },
    },
  })

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const pdfData = {
    number: invoice.number,
    status: invoice.status,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    subtotal: Number(invoice.subtotal),
    taxTotal: Number(invoice.taxTotal),
    total: Number(invoice.total),
    currency: invoice.currency,
    notes: invoice.notes,
    customer: {
      name: invoice.customer.name,
      address: invoice.customer.address ?? null,
      email: invoice.customer.email ?? null,
      vatId: invoice.customer.vatId ?? null,
    },
    tenant: {
      name: invoice.tenant.name,
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      total: Number(item.total),
    })),
  }

  const element = React.createElement(InvoicePDF, { data: pdfData })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)

  const filename = `${invoice.number.replace(/\s+/g, "_")}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

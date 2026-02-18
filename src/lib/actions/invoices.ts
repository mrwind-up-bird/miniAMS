"use server"

import { revalidatePath } from "next/cache"
import { InvoiceStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/tenant"
import { invoiceCreateSchema, invoiceUpdateSchema, invoiceItemSchema } from "@/lib/validations/invoice"

// ─── Helpers ──────────────────────────────────────────────────

function serializeInvoice<T extends {
  subtotal: unknown
  taxTotal: unknown
  total: unknown
  items?: Array<{
    quantity: unknown
    unitPrice: unknown
    taxRate: unknown
    total: unknown
    [key: string]: unknown
  }>
  [key: string]: unknown
}>(invoice: T) {
  return {
    ...invoice,
    subtotal: Number(invoice.subtotal),
    taxTotal: Number(invoice.taxTotal),
    total: Number(invoice.total),
    ...(invoice.items
      ? {
          items: invoice.items.map((item) => ({
            ...item,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            taxRate: Number(item.taxRate),
            total: Number(item.total),
          })),
        }
      : {}),
  }
}

async function recalculateInvoiceTotals(invoiceId: string, tenantId: string) {
  const items = await db.invoiceItem.findMany({ where: { invoiceId } })

  let subtotal = 0
  let taxTotal = 0

  for (const item of items) {
    const itemTotal = Number(item.total)
    subtotal += itemTotal
    taxTotal += itemTotal * (Number(item.taxRate) / 100)
  }

  const total = subtotal + taxTotal

  return db.invoice.update({
    where: { id: invoiceId, tenantId },
    data: { subtotal, taxTotal, total },
  })
}

// ─── Queries ───────────────────────────────────────────────────

export async function getInvoices(params: {
  customerId?: string
  status?: InvoiceStatus
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  pageSize?: number
}) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const { customerId, status, dateFrom, dateTo, search, page = 1, pageSize = 20 } = params
  const safePage = Math.max(1, Math.floor(page))
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)))
  const skip = (safePage - 1) * safePageSize

  const where = {
    tenantId,
    deletedAt: null,
    ...(customerId ? { customerId } : {}),
    ...(status ? { status } : {}),
    ...(search ? { number: { contains: search, mode: "insensitive" as const } } : {}),
    ...(dateFrom || dateTo
      ? {
          issueDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  }

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      skip,
      take: safePageSize,
      orderBy: { issueDate: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    db.invoice.count({ where }),
  ])

  return {
    invoices: invoices.map((inv) => serializeInvoice(inv)),
    total,
  }
}

export async function getInvoice(id: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const invoice = await db.invoice.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      customer: true,
      items: {
        include: {
          timeEntry: { select: { id: true, description: true, duration: true } },
          service: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!invoice) {
    return { error: "Invoice not found" }
  }

  return serializeInvoice(invoice)
}

// ─── Create ────────────────────────────────────────────────────

export async function createInvoice(data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  if (session.user.role === "viewer") {
    return { error: "Insufficient permissions" }
  }

  const parsed = invoiceCreateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Verify customer belongs to tenant
  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, tenantId, deletedAt: null },
  })
  if (!customer) {
    return { error: "Customer not found" }
  }

  // Collect and validate referenced time entries
  const timeEntryIds = parsed.data.items
    .map((i) => i.timeEntryId)
    .filter((id): id is string => Boolean(id))

  if (timeEntryIds.length > 0) {
    const entries = await db.timeEntry.findMany({
      where: { id: { in: timeEntryIds }, tenantId, status: "approved" },
      select: { id: true },
    })
    if (entries.length !== timeEntryIds.length) {
      return { error: "One or more time entries are not approved or do not belong to this tenant" }
    }
  }

  // Validate referenced services belong to tenant
  const serviceIds = parsed.data.items
    .map((i) => i.serviceId)
    .filter((id): id is string => Boolean(id))

  if (serviceIds.length > 0) {
    const services = await db.service.findMany({
      where: { id: { in: serviceIds }, tenantId },
      select: { id: true },
    })
    if (services.length !== serviceIds.length) {
      return { error: "One or more services do not belong to this tenant" }
    }
  }

  // Generate invoice number atomically via upsert + increment
  const invoice = await db.$transaction(async (tx) => {
    const seq = await tx.invoiceSequence.upsert({
      where: { tenantId_prefix: { tenantId, prefix: "RE" } },
      update: { currentNumber: { increment: 1 } },
      create: { tenantId, prefix: "RE", currentNumber: 1 },
    })

    const year = new Date().getFullYear()
    const number = `${seq.prefix}-${year}-${String(seq.currentNumber).padStart(4, "0")}`

    // Calculate per-item totals and invoice totals
    let subtotal = 0
    let taxTotal = 0

    const itemsData = parsed.data.items.map((item) => {
      const itemTotal = item.quantity * item.unitPrice
      const itemTax = itemTotal * (item.taxRate / 100)
      subtotal += itemTotal
      taxTotal += itemTax
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        total: itemTotal,
        ...(item.timeEntryId ? { timeEntryId: item.timeEntryId } : {}),
        ...(item.serviceId ? { serviceId: item.serviceId } : {}),
      }
    })

    const total = subtotal + taxTotal

    const created = await tx.invoice.create({
      data: {
        tenantId,
        customerId: parsed.data.customerId,
        number,
        status: "draft",
        issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : new Date(),
        dueDate: parsed.data.dueDate
          ? new Date(parsed.data.dueDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: parsed.data.currency ?? "EUR",
        notes: parsed.data.notes,
        subtotal,
        taxTotal,
        total,
        items: { create: itemsData },
      },
      include: {
        items: true,
      },
    })

    // Mark referenced time entries as invoiced
    if (timeEntryIds.length > 0) {
      await tx.timeEntry.updateMany({
        where: { id: { in: timeEntryIds }, tenantId },
        data: { status: "invoiced" },
      })
    }

    return created
  })

  revalidatePath("/[locale]/invoices")
  return serializeInvoice(invoice)
}

// ─── Update ────────────────────────────────────────────────────

export async function updateInvoice(id: string, data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  if (session.user.role === "viewer") {
    return { error: "Insufficient permissions" }
  }

  const existing = await db.invoice.findFirst({
    where: { id, tenantId, deletedAt: null },
  })
  if (!existing) {
    return { error: "Invoice not found" }
  }

  if (existing.status !== "draft") {
    return { error: "Only draft invoices can be edited" }
  }

  const parsed = invoiceUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Validate new customerId belongs to tenant if changing customer
  if (parsed.data.customerId && parsed.data.customerId !== existing.customerId) {
    const newCustomer = await db.customer.findFirst({
      where: { id: parsed.data.customerId, tenantId, deletedAt: null },
    })
    if (!newCustomer) {
      return { error: "Customer not found" }
    }
  }

  const invoice = await db.invoice.update({
    where: { id, tenantId },
    data: {
      ...(parsed.data.customerId ? { customerId: parsed.data.customerId } : {}),
      ...(parsed.data.issueDate ? { issueDate: new Date(parsed.data.issueDate) } : {}),
      ...(parsed.data.dueDate ? { dueDate: new Date(parsed.data.dueDate) } : {}),
      ...(parsed.data.currency ? { currency: parsed.data.currency } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    },
  })

  revalidatePath("/[locale]/invoices")
  return serializeInvoice(invoice)
}

// ─── Invoice Items ─────────────────────────────────────────────

export async function addInvoiceItem(invoiceId: string, data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  if (session.user.role === "viewer") {
    return { error: "Insufficient permissions" }
  }

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId, deletedAt: null },
  })
  if (!invoice) {
    return { error: "Invoice not found" }
  }

  if (invoice.status !== "draft") {
    return { error: "Only draft invoices can be edited" }
  }

  const parsed = invoiceItemSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Validate cross-tenant references
  if (parsed.data.timeEntryId) {
    const entry = await db.timeEntry.findFirst({
      where: { id: parsed.data.timeEntryId, tenantId, status: "approved" },
    })
    if (!entry) return { error: "Time entry not found or not approved" }
  }

  if (parsed.data.serviceId) {
    const service = await db.service.findFirst({
      where: { id: parsed.data.serviceId, tenantId },
    })
    if (!service) return { error: "Service not found" }
  }

  const itemTotal = parsed.data.quantity * parsed.data.unitPrice

  await db.invoiceItem.create({
    data: {
      invoiceId,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice,
      taxRate: parsed.data.taxRate,
      total: itemTotal,
      ...(parsed.data.timeEntryId ? { timeEntryId: parsed.data.timeEntryId } : {}),
      ...(parsed.data.serviceId ? { serviceId: parsed.data.serviceId } : {}),
    },
  })

  const updated = await recalculateInvoiceTotals(invoiceId, tenantId)

  revalidatePath("/[locale]/invoices")
  return serializeInvoice(updated)
}

export async function removeInvoiceItem(itemId: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const item = await db.invoiceItem.findFirst({
    where: { id: itemId },
    include: { invoice: { select: { id: true, tenantId: true, status: true, deletedAt: true } } },
  })

  if (!item || item.invoice.tenantId !== tenantId || item.invoice.deletedAt) {
    return { error: "Invoice item not found" }
  }

  if (item.invoice.status !== "draft") {
    return { error: "Only draft invoices can be edited" }
  }

  await db.invoiceItem.delete({ where: { id: itemId } })

  const updated = await recalculateInvoiceTotals(item.invoice.id, tenantId)

  revalidatePath("/[locale]/invoices")
  return serializeInvoice(updated)
}

// ─── Status Transitions ────────────────────────────────────────

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const role = session.user.role

  const existing = await db.invoice.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      items: { select: { timeEntryId: true } },
    },
  })
  if (!existing) {
    return { error: "Invoice not found" }
  }

  // Validate allowed status transitions
  const allowedTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
    draft: ["sent", "cancelled"],
    sent: ["paid", "overdue", "cancelled"],
    paid: [],
    overdue: ["paid", "cancelled"],
    cancelled: [],
  }

  if (!allowedTransitions[existing.status].includes(status)) {
    return {
      error: `Cannot transition from ${existing.status} to ${status}`,
    }
  }

  // Cancelling requires owner/admin
  if (status === "cancelled" && role !== "owner" && role !== "admin") {
    return { error: "Insufficient permissions" }
  }

  const timeEntryIds = existing.items
    .map((i) => i.timeEntryId)
    .filter((id): id is string => Boolean(id))

  const invoice = await db.$transaction(async (tx) => {
    // When cancelling a sent invoice, release time entries back to approved
    if (status === "cancelled" && existing.status === "sent" && timeEntryIds.length > 0) {
      await tx.timeEntry.updateMany({
        where: { id: { in: timeEntryIds }, tenantId },
        data: { status: "approved" },
      })
    }

    return tx.invoice.update({
      where: { id, tenantId },
      data: {
        status,
        ...(status === "paid" ? { paidAt: new Date() } : {}),
        ...(status === "cancelled" ? { deletedAt: new Date() } : {}),
      },
    })
  })

  revalidatePath("/[locale]/invoices")
  return serializeInvoice(invoice)
}

// ─── Delete ────────────────────────────────────────────────────

export async function deleteInvoice(id: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const role = session.user.role

  if (role !== "owner" && role !== "admin") {
    return { error: "Insufficient permissions" }
  }

  const existing = await db.invoice.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      items: { select: { timeEntryId: true } },
    },
  })
  if (!existing) {
    return { error: "Invoice not found" }
  }

  if (existing.status !== "draft") {
    return { error: "Only draft invoices can be deleted" }
  }

  const timeEntryIds = existing.items
    .map((i) => i.timeEntryId)
    .filter((id): id is string => Boolean(id))

  await db.$transaction(async (tx) => {
    // Release any referenced time entries back to approved
    if (timeEntryIds.length > 0) {
      await tx.timeEntry.updateMany({
        where: { id: { in: timeEntryIds }, tenantId },
        data: { status: "approved" },
      })
    }

    await tx.invoice.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    })
  })

  revalidatePath("/[locale]/invoices")
  return { success: true }
}

// ─── Stats ─────────────────────────────────────────────────────

export async function getInvoiceStats() {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const [sentInvoices, overdueInvoices, paidThisMonthInvoices, countByStatus] = await Promise.all([
    db.invoice.aggregate({
      where: { tenantId, status: "sent", deletedAt: null },
      _sum: { total: true },
    }),
    db.invoice.aggregate({
      where: { tenantId, status: "overdue", deletedAt: null },
      _sum: { total: true },
    }),
    db.invoice.aggregate({
      where: {
        tenantId,
        status: "paid",
        paidAt: { gte: startOfMonth, lte: endOfMonth },
        deletedAt: null,
      },
      _sum: { total: true },
    }),
    db.invoice.groupBy({
      by: ["status"],
      where: { tenantId, deletedAt: null },
      _count: { id: true },
    }),
  ])

  const invoiceCount = Object.fromEntries(
    countByStatus.map((row) => [row.status, row._count.id]),
  ) as Record<InvoiceStatus, number>

  return {
    totalOutstanding: Number(sentInvoices._sum.total ?? 0),
    overdueAmount: Number(overdueInvoices._sum.total ?? 0),
    paidThisMonth: Number(paidThisMonthInvoices._sum.total ?? 0),
    invoiceCount,
  }
}

// ─── Approved Time Entries for Invoice Creation ────────────────

export async function getApprovedTimeEntriesForInvoice(customerId: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const entries = await db.timeEntry.findMany({
    where: {
      tenantId,
      customerId,
      status: "approved",
      billable: true,
    },
    include: {
      project: { select: { id: true, name: true, hourlyRate: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  // Group by project with totals
  type ProjectGroup = {
    projectId: string
    projectName: string
    totalMinutes: number
    entries: Array<{
      id: string
      description: string | null
      duration: number
      createdAt: Date
    }>
  }

  const byProject: Record<string, ProjectGroup> = {}

  for (const entry of entries) {
    if (!byProject[entry.projectId]) {
      byProject[entry.projectId] = {
        projectId: entry.projectId,
        projectName: entry.project.name,
        totalMinutes: 0,
        entries: [],
      }
    }

    byProject[entry.projectId].totalMinutes += entry.duration
    byProject[entry.projectId].entries.push({
      id: entry.id,
      description: entry.description ?? null,
      duration: entry.duration,
      createdAt: entry.createdAt,
    })
  }

  return {
    projects: Object.values(byProject),
    totalEntries: entries.length,
  }
}

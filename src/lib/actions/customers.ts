"use server"

import { revalidatePath } from "next/cache"
import { CustomerStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/tenant"
import { customerCreateSchema, customerUpdateSchema } from "@/lib/validations/customer"

export async function getCustomers(params: {
  search?: string
  status?: CustomerStatus
  page?: number
  pageSize?: number
}) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const { search, status, page = 1, pageSize = 20 } = params
  const safePage = Math.max(1, Math.floor(page))
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)))
  const skip = (safePage - 1) * safePageSize

  const where = {
    tenantId,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      skip,
      take: safePageSize,
      orderBy: { createdAt: "desc" },
    }),
    db.customer.count({ where }),
  ])

  return { customers, total }
}

export async function getCustomer(id: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const customer = await db.customer.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      contacts: { orderBy: { isPrimary: "desc" } },
      _count: {
        select: { projects: { where: { deletedAt: null } } },
      },
    },
  })

  if (!customer) {
    return { error: "Customer not found" }
  }

  return customer
}

export async function createCustomer(data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  if (session.user.role === "viewer") {
    return { error: "Insufficient permissions" }
  }

  const parsed = customerCreateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const customer = await db.customer.create({
    data: {
      ...parsed.data,
      tenantId,
    },
  })

  revalidatePath("/[locale]/customers")
  return customer
}

export async function updateCustomer(id: string, data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  if (session.user.role === "viewer") {
    return { error: "Insufficient permissions" }
  }

  const existing = await db.customer.findFirst({
    where: { id, tenantId, deletedAt: null },
  })
  if (!existing) {
    return { error: "Customer not found" }
  }

  const parsed = customerUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const customer = await db.customer.update({
    where: { id, tenantId },
    data: parsed.data,
  })

  revalidatePath("/[locale]/customers")
  return customer
}

export async function deleteCustomer(id: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const role = session.user.role

  if (role !== "owner" && role !== "admin") {
    return { error: "Insufficient permissions" }
  }

  const existing = await db.customer.findFirst({
    where: { id, tenantId, deletedAt: null },
  })
  if (!existing) {
    return { error: "Customer not found" }
  }

  await db.customer.update({
    where: { id, tenantId },
    data: { deletedAt: new Date() },
  })

  revalidatePath("/[locale]/customers")
  return { success: true }
}

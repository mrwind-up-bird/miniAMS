"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/tenant"
import { serviceCreateSchema, serviceUpdateSchema } from "@/lib/validations/service"

export async function getServices(params: {
  search?: string
  active?: boolean
  page?: number
  pageSize?: number
}) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const { search, active, page = 1, pageSize = 20 } = params
  const safePage = Math.max(1, Math.floor(page))
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)))
  const skip = (safePage - 1) * safePageSize

  const where = {
    tenantId,
    ...(active !== undefined ? { active } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [services, total] = await Promise.all([
    db.service.findMany({
      where,
      skip,
      take: safePageSize,
      orderBy: { createdAt: "desc" },
    }),
    db.service.count({ where }),
  ])

  return {
    services: services.map((s) => ({
      ...s,
      unitPrice: Number(s.unitPrice),
      taxRate: Number(s.taxRate),
    })),
    total,
  }
}

export async function getService(id: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const service = await db.service.findFirst({
    where: { id, tenantId },
  })

  if (!service) {
    return { error: "Service not found" }
  }

  return {
    ...service,
    unitPrice: Number(service.unitPrice),
    taxRate: Number(service.taxRate),
  }
}

export async function createService(data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  if (session.user.role === "viewer") {
    return { error: "Insufficient permissions" }
  }

  const parsed = serviceCreateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const service = await db.service.create({
    data: {
      ...parsed.data,
      tenantId,
    },
  })

  revalidatePath("/[locale]/invoices")
  return {
    ...service,
    unitPrice: Number(service.unitPrice),
    taxRate: Number(service.taxRate),
  }
}

export async function updateService(id: string, data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  if (session.user.role === "viewer") {
    return { error: "Insufficient permissions" }
  }

  const existing = await db.service.findFirst({
    where: { id, tenantId },
  })
  if (!existing) {
    return { error: "Service not found" }
  }

  const parsed = serviceUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const service = await db.service.update({
    where: { id, tenantId },
    data: parsed.data,
  })

  revalidatePath("/[locale]/invoices")
  return {
    ...service,
    unitPrice: Number(service.unitPrice),
    taxRate: Number(service.taxRate),
  }
}

export async function deleteService(id: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const role = session.user.role

  if (role !== "owner" && role !== "admin") {
    return { error: "Insufficient permissions" }
  }

  const existing = await db.service.findFirst({
    where: { id, tenantId },
  })
  if (!existing) {
    return { error: "Service not found" }
  }

  await db.service.delete({ where: { id, tenantId } })

  revalidatePath("/[locale]/invoices")
  return { success: true }
}

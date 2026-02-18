"use server"

import { revalidatePath } from "next/cache"
import { ProjectStatus, ProjectType } from "@prisma/client"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/tenant"
import {
  projectCreateSchema,
  projectUpdateSchema,
  projectMemberSchema,
} from "@/lib/validations/project"

export async function getProjects(params: {
  search?: string
  customerId?: string
  status?: ProjectStatus
  type?: ProjectType
  page?: number
  pageSize?: number
}) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const { search, customerId, status, type, page = 1, pageSize = 20 } = params
  const safePage = Math.max(1, Math.floor(page))
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)))
  const skip = (safePage - 1) * safePageSize

  const where = {
    tenantId,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(customerId ? { customerId } : {}),
    ...(search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {}),
  }

  const [projects, total] = await Promise.all([
    db.project.findMany({
      where,
      skip,
      take: safePageSize,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
      },
    }),
    db.project.count({ where }),
  ])

  return { projects, total }
}

export async function getProject(id: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const project = await db.project.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      customer: true,
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      _count: {
        select: { timeEntries: true },
      },
    },
  })

  if (!project) {
    return { error: "Project not found" }
  }

  return project
}

export async function createProject(data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  if (session.user.role === "viewer") {
    return { error: "Insufficient permissions" }
  }

  const parsed = projectCreateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Verify the customerId belongs to the same tenant
  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, tenantId, deletedAt: null },
  })
  if (!customer) {
    return { error: "Customer not found" }
  }

  const project = await db.project.create({
    data: {
      ...parsed.data,
      tenantId,
    },
  })

  revalidatePath("/[locale]/projects")
  return project
}

export async function updateProject(id: string, data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  if (session.user.role === "viewer") {
    return { error: "Insufficient permissions" }
  }

  const existing = await db.project.findFirst({
    where: { id, tenantId, deletedAt: null },
  })
  if (!existing) {
    return { error: "Project not found" }
  }

  const parsed = projectUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // If the caller is changing the associated customer, verify the new customer
  // belongs to the same tenant before writing — prevents cross-tenant re-assignment.
  if (parsed.data.customerId !== undefined && parsed.data.customerId !== existing.customerId) {
    const customer = await db.customer.findFirst({
      where: { id: parsed.data.customerId, tenantId, deletedAt: null },
    })
    if (!customer) {
      return { error: "Customer not found" }
    }
  }

  const project = await db.project.update({
    where: { id, tenantId },
    data: parsed.data,
  })

  revalidatePath("/[locale]/projects")
  return project
}

export async function deleteProject(id: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const role = session.user.role

  if (role !== "owner" && role !== "admin") {
    return { error: "Insufficient permissions" }
  }

  const existing = await db.project.findFirst({
    where: { id, tenantId, deletedAt: null },
  })
  if (!existing) {
    return { error: "Project not found" }
  }

  await db.project.update({
    where: { id, tenantId },
    data: { deletedAt: new Date() },
  })

  revalidatePath("/[locale]/projects")
  return { success: true }
}

export async function addProjectMember(projectId: string, data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const project = await db.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
  })
  if (!project) {
    return { error: "Project not found" }
  }

  const parsed = projectMemberSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Verify the user belongs to the same tenant
  const user = await db.user.findFirst({
    where: { id: parsed.data.userId, tenantId },
  })
  if (!user) {
    return { error: "User not found" }
  }

  const member = await db.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: parsed.data.userId } },
    create: {
      projectId,
      userId: parsed.data.userId,
      role: parsed.data.role ?? "member",
      ...(parsed.data.hourlyRate !== undefined
        ? { hourlyRate: parsed.data.hourlyRate }
        : {}),
    },
    update: {
      role: parsed.data.role ?? "member",
      ...(parsed.data.hourlyRate !== undefined
        ? { hourlyRate: parsed.data.hourlyRate }
        : {}),
    },
  })

  revalidatePath("/[locale]/projects")
  return member
}

export async function removeProjectMember(projectId: string, userId: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const role = session.user.role

  if (role !== "owner" && role !== "admin") {
    return { error: "Insufficient permissions" }
  }

  const project = await db.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
  })
  if (!project) {
    return { error: "Project not found" }
  }

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  })
  if (!member) {
    return { error: "Member not found" }
  }

  await db.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  })

  revalidatePath("/[locale]/projects")
  return { success: true }
}

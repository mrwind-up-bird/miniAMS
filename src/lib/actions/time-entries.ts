"use server"

import { revalidatePath } from "next/cache"
import { TimeEntryStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/tenant"
import { timeEntryCreateSchema, timeEntryUpdateSchema } from "@/lib/validations/time-entry"

const timeEntryInclude = {
  project: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
} as const

export async function getTimeEntries(params: {
  userId?: string
  projectId?: string
  customerId?: string
  status?: TimeEntryStatus
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const { userId, projectId, customerId, status, dateFrom, dateTo, page = 1, pageSize = 20 } = params
  const safePage = Math.max(1, Math.floor(page))
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)))
  const skip = (safePage - 1) * safePageSize

  const dateFilter =
    dateFrom || dateTo
      ? {
          OR: [
            {
              startTime: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            },
            {
              startTime: null,
              createdAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            },
          ],
        }
      : {}

  const where = {
    tenantId,
    ...(userId ? { userId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(status ? { status } : {}),
    ...dateFilter,
  }

  const [entries, total] = await Promise.all([
    db.timeEntry.findMany({
      where,
      skip,
      take: safePageSize,
      orderBy: { createdAt: "desc" },
      include: timeEntryInclude,
    }),
    db.timeEntry.count({ where }),
  ])

  return { entries, total }
}

export async function getTimeEntry(id: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const entry = await db.timeEntry.findFirst({
    where: { id, tenantId },
    include: timeEntryInclude,
  })

  if (!entry) {
    return { error: "Time entry not found" }
  }

  return entry
}

export async function createTimeEntry(data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  const parsed = timeEntryCreateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const project = await db.project.findFirst({
    where: { id: parsed.data.projectId, tenantId, deletedAt: null },
    select: { customerId: true },
  })
  if (!project) {
    return { error: "Project not found" }
  }

  const entry = await db.timeEntry.create({
    data: {
      tenantId,
      userId,
      projectId: parsed.data.projectId,
      customerId: project.customerId,
      description: parsed.data.description,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      duration: parsed.data.duration,
      billable: parsed.data.billable ?? true,
      tags: parsed.data.tags ?? [],
    },
    include: timeEntryInclude,
  })

  revalidatePath("/[locale]/time")
  return entry
}

export async function updateTimeEntry(id: string, data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  const existing = await db.timeEntry.findFirst({
    where: { id, tenantId, userId },
  })
  if (!existing) {
    return { error: "Time entry not found" }
  }

  if (existing.status !== "draft") {
    return { error: "Only draft entries can be edited" }
  }

  const parsed = timeEntryUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // If projectId is being updated, verify it belongs to the same tenant and resolve customerId
  let customerId: string | undefined
  if (parsed.data.projectId) {
    const project = await db.project.findFirst({
      where: { id: parsed.data.projectId, tenantId, deletedAt: null },
      select: { customerId: true },
    })
    if (!project) {
      return { error: "Project not found" }
    }
    customerId = project.customerId
  }

  const entry = await db.timeEntry.update({
    where: { id, tenantId },
    data: {
      ...parsed.data,
      ...(customerId ? { customerId } : {}),
    },
    include: timeEntryInclude,
  })

  revalidatePath("/[locale]/time")
  return entry
}

export async function deleteTimeEntry(id: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  const existing = await db.timeEntry.findFirst({
    where: { id, tenantId, userId },
  })
  if (!existing) {
    return { error: "Time entry not found" }
  }

  if (existing.status !== "draft") {
    return { error: "Only draft entries can be deleted" }
  }

  await db.timeEntry.delete({ where: { id, tenantId } })

  revalidatePath("/[locale]/time")
  return { success: true }
}

export async function approveTimeEntries(ids: string[]) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const role = session.user.role

  if (role !== "owner" && role !== "admin") {
    return { error: "Insufficient permissions" }
  }

  if (!ids.length || ids.length > 200) {
    return { error: "Invalid selection" }
  }

  await db.timeEntry.updateMany({
    where: {
      id: { in: ids },
      tenantId,
      status: "draft",
    },
    data: { status: "approved" },
  })

  revalidatePath("/[locale]/time")
  return { success: true }
}

export async function unapproveTimeEntries(ids: string[]) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const role = session.user.role

  if (role !== "owner" && role !== "admin") {
    return { error: "Insufficient permissions" }
  }

  if (!ids.length || ids.length > 200) {
    return { error: "Invalid selection" }
  }

  await db.timeEntry.updateMany({
    where: {
      id: { in: ids },
      tenantId,
      status: "approved",
    },
    data: { status: "draft" },
  })

  revalidatePath("/[locale]/time")
  return { success: true }
}

export async function startTimer(data: { projectId: string; description?: string }) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  const project = await db.project.findFirst({
    where: { id: data.projectId, tenantId, deletedAt: null },
    select: { customerId: true },
  })
  if (!project) {
    return { error: "Project not found" }
  }

  // Stop any currently running timer for this user
  const runningTimer = await db.timeEntry.findFirst({
    where: { tenantId, userId, startTime: { not: null }, endTime: null },
  })
  if (runningTimer) {
    const now = new Date()
    const durationMs = now.getTime() - runningTimer.startTime!.getTime()
    const durationMinutes = Math.ceil(durationMs / 60000)
    await db.timeEntry.update({
      where: { id: runningTimer.id },
      data: { endTime: now, duration: durationMinutes },
    })
  }

  const now = new Date()
  const entry = await db.timeEntry.create({
    data: {
      tenantId,
      userId,
      projectId: data.projectId,
      customerId: project.customerId,
      description: data.description,
      startTime: now,
      duration: 0,
      billable: true,
      status: "draft",
    },
    include: timeEntryInclude,
  })

  revalidatePath("/[locale]/time")
  return entry
}

export async function stopTimer(id: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  const existing = await db.timeEntry.findFirst({
    where: { id, tenantId, userId },
  })
  if (!existing) {
    return { error: "Time entry not found" }
  }

  if (!existing.startTime) {
    return { error: "Timer has not been started" }
  }

  if (existing.endTime) {
    return { error: "Timer is already stopped" }
  }

  const now = new Date()
  const durationMs = now.getTime() - existing.startTime.getTime()
  const durationMinutes = Math.ceil(durationMs / 60000)

  const entry = await db.timeEntry.update({
    where: { id, tenantId },
    data: { endTime: now, duration: durationMinutes },
    include: timeEntryInclude,
  })

  revalidatePath("/[locale]/time")
  return entry
}

export async function getRunningTimer() {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  const entry = await db.timeEntry.findFirst({
    where: { tenantId, userId, startTime: { not: null }, endTime: null },
    include: timeEntryInclude,
  })

  return entry ?? null
}

export async function getWeeklyOverview(weekStart: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  const monday = new Date(weekStart)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const entries = await db.timeEntry.findMany({
    where: {
      tenantId,
      userId,
      OR: [
        { startTime: { gte: monday, lte: sunday } },
        { startTime: null, createdAt: { gte: monday, lte: sunday } },
      ],
    },
    include: timeEntryInclude,
    orderBy: { createdAt: "asc" },
  })

  // Group by projectId, then by day of week (0=Mon, 6=Sun)
  type DayTotals = Record<number, number>
  type ProjectGroup = {
    projectId: string
    projectName: string
    days: DayTotals
    total: number
    entries: typeof entries
  }

  const byProject: Record<string, ProjectGroup> = {}
  let grandTotal = 0

  for (const entry of entries) {
    const date = entry.startTime ?? entry.createdAt
    const dayOfWeek = ((date.getDay() + 6) % 7) // Mon=0 ... Sun=6

    if (!byProject[entry.projectId]) {
      byProject[entry.projectId] = {
        projectId: entry.projectId,
        projectName: entry.project.name,
        days: {},
        total: 0,
        entries: [],
      }
    }

    const group = byProject[entry.projectId]
    group.days[dayOfWeek] = (group.days[dayOfWeek] ?? 0) + entry.duration
    group.total += entry.duration
    group.entries.push(entry)
    grandTotal += entry.duration
  }

  return {
    projects: Object.values(byProject),
    grandTotal,
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
  }
}

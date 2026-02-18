"use server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/tenant"

export async function getDashboardStats() {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const userId = session.user.id

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  // Week start (Monday)
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const [
    paidThisMonth,
    openInvoices,
    overdueInvoices,
    trackedThisWeek,
    activeProjects,
    recentInvoices,
    recentTimeEntries,
  ] = await Promise.all([
    // Revenue this month (paid invoices)
    db.invoice.aggregate({
      where: {
        tenantId,
        status: "paid",
        paidAt: { gte: startOfMonth, lte: endOfMonth },
        deletedAt: null,
      },
      _sum: { total: true },
    }),

    // Open invoices (sent)
    db.invoice.aggregate({
      where: { tenantId, status: "sent", deletedAt: null },
      _sum: { total: true },
      _count: { id: true },
    }),

    // Overdue invoices
    db.invoice.aggregate({
      where: { tenantId, status: "overdue", deletedAt: null },
      _sum: { total: true },
      _count: { id: true },
    }),

    // Time tracked this week (current user)
    db.timeEntry.aggregate({
      where: {
        tenantId,
        userId,
        OR: [
          { startTime: { gte: monday, lte: sunday } },
          { startTime: null, createdAt: { gte: monday, lte: sunday } },
        ],
      },
      _sum: { duration: true },
    }),

    // Active projects
    db.project.count({
      where: { tenantId, status: "active", deletedAt: null },
    }),

    // Recent invoices (last 5)
    db.invoice.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        customer: { select: { name: true } },
      },
    }),

    // Recent time entries (last 5, current user)
    db.timeEntry.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        project: { select: { name: true } },
      },
    }),
  ])

  return {
    revenueThisMonth: Number(paidThisMonth._sum.total ?? 0),
    openInvoicesAmount: Number(openInvoices._sum.total ?? 0),
    openInvoicesCount: openInvoices._count.id,
    overdueAmount: Number(overdueInvoices._sum.total ?? 0),
    overdueCount: overdueInvoices._count.id,
    trackedThisWeekMinutes: trackedThisWeek._sum.duration ?? 0,
    activeProjectsCount: activeProjects,
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      total: Number(inv.total),
      currency: inv.currency,
      customerName: inv.customer.name,
      dueDate: inv.dueDate.toISOString(),
    })),
    recentTimeEntries: recentTimeEntries.map((entry) => ({
      id: entry.id,
      description: entry.description,
      duration: entry.duration,
      projectName: entry.project.name,
      date: (entry.startTime ?? entry.createdAt).toISOString(),
    })),
  }
}

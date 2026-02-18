"use server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/tenant"

export async function getUsers() {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const users = await db.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  })

  return users
}

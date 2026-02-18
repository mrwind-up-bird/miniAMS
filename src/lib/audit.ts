"use server"

import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"

interface AuditEntry {
  tenantId: string
  userId: string
  action: string
  entity: string
  entityId?: string
  meta?: Prisma.InputJsonValue
}

/**
 * Write an audit log entry for a financial or sensitive operation.
 * Fire-and-forget: errors are logged but do not block the caller.
 */
export async function audit(entry: AuditEntry) {
  try {
    await db.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        meta: entry.meta ?? {},
      },
    })
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err)
  }
}

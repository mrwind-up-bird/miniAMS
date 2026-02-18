"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/tenant"
import { contactCreateSchema, contactUpdateSchema } from "@/lib/validations/contact"

export async function getContacts(customerId: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const contacts = await db.contact.findMany({
    where: { customerId, tenantId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  })

  return contacts
}

export async function createContact(data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const parsed = contactCreateSchema.safeParse(data)
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

  const contact = await db.contact.create({
    data: {
      ...parsed.data,
      tenantId,
    },
  })

  revalidatePath(`/[locale]/customers/${parsed.data.customerId}`)
  return contact
}

export async function updateContact(id: string, data: unknown) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId

  const existing = await db.contact.findFirst({
    where: { id, tenantId },
  })
  if (!existing) {
    return { error: "Contact not found" }
  }

  const parsed = contactUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Prevent re-assigning a contact to a different (potentially cross-tenant) customer.
  // customerId is immutable after creation; strip it from the update payload.
  const { customerId: _customerId, ...updateData } = parsed.data

  // If caller explicitly supplied a customerId that differs from the existing one,
  // reject the request rather than silently ignoring it.
  if (_customerId !== undefined && _customerId !== existing.customerId) {
    return { error: "customerId cannot be changed" }
  }

  const contact = await db.contact.update({
    where: { id },
    data: updateData,
  })

  revalidatePath(`/[locale]/customers/${existing.customerId}`)
  return contact
}

export async function deleteContact(id: string) {
  const session = await requireAuth()
  const tenantId = session.user.tenantId
  const role = session.user.role

  if (role !== "owner" && role !== "admin") {
    return { error: "Insufficient permissions" }
  }

  const existing = await db.contact.findFirst({
    where: { id, tenantId },
  })
  if (!existing) {
    return { error: "Contact not found" }
  }

  await db.contact.delete({ where: { id } })

  revalidatePath(`/[locale]/customers/${existing.customerId}`)
  return { success: true }
}

"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/tenant"

// ─── Profile ──────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  locale: z.enum(["en", "de"]),
})

export async function getProfile() {
  const session = await requireAuth()
  const user = await db.user.findFirst({
    where: { id: session.user.id, tenantId: session.user.tenantId },
    select: { id: true, name: true, email: true, locale: true, role: true },
  })
  if (!user) return { error: "User not found" }
  return user
}

export async function updateProfile(data: unknown) {
  const session = await requireAuth()
  const parsed = profileSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  // Check email uniqueness within tenant
  const existing = await db.user.findFirst({
    where: {
      tenantId: session.user.tenantId,
      email: parsed.data.email,
      id: { not: session.user.id },
    },
  })
  if (existing) return { error: "Email already in use" }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  })

  revalidatePath("/[locale]/settings")
  return { id: user.id, name: user.name, email: user.email, locale: user.locale }
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
})

export async function changePassword(data: unknown) {
  const session = await requireAuth()
  const parsed = passwordSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const user = await db.user.findFirst({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })
  if (!user) return { error: "User not found" }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!valid) return { error: "Current password is incorrect" }

  const hash = await bcrypt.hash(parsed.data.newPassword, 12)
  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: hash },
  })

  return { success: true }
}

// ─── Company ──────────────────────────────────────────────────

const companySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
})

export async function getCompanySettings() {
  const session = await requireAuth()
  const tenant = await db.tenant.findFirst({
    where: { id: session.user.tenantId },
    select: { id: true, name: true, slug: true, plan: true, settings: true },
  })
  if (!tenant) return { error: "Tenant not found" }
  return tenant
}

export async function updateCompanySettings(data: unknown) {
  const session = await requireAuth()
  const role = session.user.role

  if (role !== "owner" && role !== "admin") {
    return { error: "Insufficient permissions" }
  }

  const parsed = companySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  // Check slug uniqueness
  const existing = await db.tenant.findFirst({
    where: { slug: parsed.data.slug, id: { not: session.user.tenantId } },
  })
  if (existing) return { error: "Company slug already taken" }

  const tenant = await db.tenant.update({
    where: { id: session.user.tenantId },
    data: parsed.data,
  })

  revalidatePath("/[locale]/settings")
  return { id: tenant.id, name: tenant.name, slug: tenant.slug }
}

// ─── Team ─────────────────────────────────────────────────────

export async function getTeamMembers() {
  const session = await requireAuth()
  const members = await db.user.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  return members
}

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "admin", "member", "viewer"]),
})

export async function updateMemberRole(data: unknown) {
  const session = await requireAuth()
  const role = session.user.role

  if (role !== "owner") {
    return { error: "Only owners can change roles" }
  }

  const parsed = updateRoleSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  // Prevent changing own role
  if (parsed.data.userId === session.user.id) {
    return { error: "Cannot change your own role" }
  }

  const user = await db.user.findFirst({
    where: { id: parsed.data.userId, tenantId: session.user.tenantId },
  })
  if (!user) return { error: "User not found" }

  await db.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  })

  revalidatePath("/[locale]/settings")
  return { success: true }
}

export async function removeMember(userId: string) {
  const session = await requireAuth()
  const role = session.user.role

  if (role !== "owner") {
    return { error: "Only owners can remove members" }
  }

  if (userId === session.user.id) {
    return { error: "Cannot remove yourself" }
  }

  const user = await db.user.findFirst({
    where: { id: userId, tenantId: session.user.tenantId },
  })
  if (!user) return { error: "User not found" }

  await db.user.delete({ where: { id: userId } })

  revalidatePath("/[locale]/settings")
  return { success: true }
}

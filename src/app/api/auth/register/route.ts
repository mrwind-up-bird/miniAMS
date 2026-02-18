import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  companyName: z.string().min(1).max(100),
})

export async function POST(req: Request) {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { name, email, password, companyName } = parsed.data

    const existingUser = await db.user.findFirst({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 },
      )
    }

    const slug =
      companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Date.now()

    const tenant = await db.tenant.create({
      data: {
        name: companyName,
        slug,
        users: {
          create: {
            name,
            email,
            passwordHash: await hash(password, 12),
            role: "owner",
          },
        },
        invoiceSeqs: {
          create: {
            prefix: "RE",
          },
        },
      },
    })

    return NextResponse.json({ success: true, tenantId: tenant.id })
  } catch {
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 },
    )
  }
}

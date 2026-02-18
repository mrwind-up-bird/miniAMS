import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Clean existing data in reverse dependency order
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.timeEntry.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.service.deleteMany()
  await prisma.invoiceSequence.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()

  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Demo Agency",
      slug: "demo-agency",
      plan: "pro",
    },
  })

  // Create demo user (password: password123)
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Max Mustermann",
      email: "demo@miniams.dev",
      passwordHash: await hash("password123", 12),
      role: "owner",
      locale: "de",
    },
  })

  // Create invoice sequence
  await prisma.invoiceSequence.create({
    data: {
      tenantId: tenant.id,
      prefix: "RE",
      currentNumber: 0,
    },
  })

  // Create a demo customer
  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: "Beispiel GmbH",
      email: "info@beispiel.de",
      status: "active",
      paymentTermDays: 30,
      currency: "EUR",
    },
  })

  // Create a demo contact
  await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      name: "Anna Schmidt",
      email: "anna@beispiel.de",
      role: "CTO",
      isPrimary: true,
    },
  })

  // Create a demo service
  await prisma.service.create({
    data: {
      tenantId: tenant.id,
      name: "Softwareentwicklung",
      description: "Full-Stack Entwicklung",
      unitPrice: 120,
      unit: "hour",
      taxRate: 19,
    },
  })

  console.log("Seed completed!")
  console.log("Demo user: demo@miniams.dev / password123")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

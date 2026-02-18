import { z } from "zod"
import { CustomerStatus } from "@prisma/client"

export const customerCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  vatId: z.string().max(50).optional(),
  paymentTermDays: z.number().int().min(1).max(365).default(30).optional(),
  currency: z.string().length(3).default("EUR").optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const customerUpdateSchema = customerCreateSchema.partial()

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>

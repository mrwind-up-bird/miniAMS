import { z } from "zod"

export const serviceCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  unitPrice: z.number().min(0).max(99999999),
  unit: z.enum(["hour", "day", "flat"]).default("hour"),
  taxRate: z.number().min(0).max(100).default(19),
  sku: z.string().max(50).optional(),
  active: z.boolean().default(true),
})

export const serviceUpdateSchema = serviceCreateSchema.partial()

export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>

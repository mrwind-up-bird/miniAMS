import { z } from "zod"

export const contactCreateSchema = z.object({
  name: z.string().min(1),
  customerId: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  isPrimary: z.boolean().optional(),
})

export const contactUpdateSchema = contactCreateSchema.partial()

export type ContactCreateInput = z.infer<typeof contactCreateSchema>
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>

import { z } from "zod"

export const invoiceItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().max(999999),
  unitPrice: z.number().min(0).max(99999999),
  taxRate: z.number().min(0).max(100).default(19),
  timeEntryId: z.string().max(100).optional(),
  serviceId: z.string().max(100).optional(),
})

export const invoiceCreateSchema = z.object({
  customerId: z.string().min(1).max(100),
  issueDate: z.string().date().optional(),
  dueDate: z.string().date().optional(),
  currency: z.string().length(3).default("EUR"),
  notes: z.string().max(2000).optional(),
  items: z.array(invoiceItemSchema).min(1).max(100),
})

export const invoiceUpdateSchema = z.object({
  customerId: z.string().min(1).max(100).optional(),
  issueDate: z.string().date().optional(),
  dueDate: z.string().date().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional(),
})

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>

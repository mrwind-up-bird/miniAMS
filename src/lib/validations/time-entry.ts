import { z } from "zod"

export const timeEntryCreateSchema = z.object({
  projectId: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  duration: z.number().int().positive().max(1440),
  billable: z.boolean().default(true).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const timeEntryUpdateSchema = timeEntryCreateSchema.partial()

export type TimeEntryCreateInput = z.infer<typeof timeEntryCreateSchema>
export type TimeEntryUpdateInput = z.infer<typeof timeEntryUpdateSchema>

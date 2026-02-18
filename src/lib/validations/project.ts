import { z } from "zod"
import { ProjectType, ProjectStatus } from "@prisma/client"

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(200),
  customerId: z.string().min(1).max(100),
  type: z.nativeEnum(ProjectType).default(ProjectType.time_material).optional(),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.planned).optional(),
  budget: z.number().positive().max(99999999).optional(),
  hourlyRate: z.number().positive().max(99999).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const projectUpdateSchema = projectCreateSchema.partial()

export const projectMemberSchema = z.object({
  userId: z.string().min(1).max(100),
  role: z.string().max(50).default("member").optional(),
  hourlyRate: z.number().positive().max(99999).optional(),
})

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>
export type ProjectMemberInput = z.infer<typeof projectMemberSchema>

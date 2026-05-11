import { z } from 'zod'
import { projectNameSchema } from '@flowdesk/shared'

const SlugSchema = z
  .string()
  .regex(/^[a-z0-9-]{3,50}$/, 'Slug must be 3–50 lowercase alphanumeric characters and hyphens')
  .refine((s) => !s.startsWith('-') && !s.endsWith('-'), 'Slug must not start or end with a hyphen')

export const CreateProjectSchema = z.object({
  name: projectNameSchema,
  slug: SlugSchema,
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g. #3B82F6)').optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
})

export const UpdateProjectSchema = z
  .object({
    name: projectNameSchema.optional(),
    description: z.string().optional(),
    status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field must be provided')

export const ListProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>

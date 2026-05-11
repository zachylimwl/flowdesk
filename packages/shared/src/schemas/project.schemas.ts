import { z } from 'zod'

export const projectNameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be 100 characters or fewer')
  .trim()

import { z } from 'zod';
import { jobCreateSchema, jobIdSchema } from '../validators/job';

export const jobItemSchema = jobCreateSchema.extend({
  id: jobIdSchema, createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
}).strict();
export type JobItem = z.infer<typeof jobItemSchema>;

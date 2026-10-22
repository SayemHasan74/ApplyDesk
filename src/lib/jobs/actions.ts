import { z } from 'zod';
import { jobCreateSchema, jobIdSchema, jobPatchSchema } from '../validators/job';

export const jobActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), input: jobCreateSchema }).strict(),
  z.object({ kind: z.literal('update'), id: jobIdSchema, input: jobPatchSchema }).strict(),
  z.object({ kind: z.literal('delete'), id: jobIdSchema }).strict(),
]);
export type JobAction = z.infer<typeof jobActionSchema>;


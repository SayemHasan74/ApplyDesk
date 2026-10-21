import { z } from 'zod';
import { jobCreateSchema, jobIdSchema, jobPatchSchema } from '../validators/job';
import { todayDhaka } from '../dates';
import { jobItemSchema, type JobItem } from './items';
import { MAX_LIST } from '../constants';

export const jobActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), input: jobCreateSchema }).strict(),
  z.object({ kind: z.literal('update'), id: jobIdSchema, input: jobPatchSchema }).strict(),
  z.object({ kind: z.literal('delete'), id: jobIdSchema }).strict(),
]);
export type JobAction = z.infer<typeof jobActionSchema>;

export function optimisticJobs(items: JobItem[], action: JobAction, temporaryId: string, now: string) {
  if (action.kind === 'delete') return items.filter((job) => job.id !== action.id);
  if (action.kind === 'create') return [jobItemSchema.parse({ ...action.input, id: temporaryId, createdAt: now, updatedAt: now,
    appliedAt: action.input.status === 'applied' && !action.input.appliedAt ? todayDhaka() : action.input.appliedAt,
  }), ...items].slice(0, MAX_LIST);
  return items.map((job) => {
    if (job.id !== action.id) return job;
    const updated = { ...job, ...action.input, updatedAt: now };
    if (action.input.status === 'applied' && !updated.appliedAt) updated.appliedAt = todayDhaka();
    return jobItemSchema.parse(updated);
  });
}

export function replaceOptimisticJob(items: JobItem[], action: JobAction, temporaryId: string, result: JobItem | null) {
  if (!result) return items;
  const id = action.kind === 'create' ? temporaryId : action.id;
  return items.map((job) => job.id === id ? result : job);
}

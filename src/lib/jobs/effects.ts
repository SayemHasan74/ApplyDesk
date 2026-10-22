import { jobDedupeKey } from '../dedupe';
import { jobCreateSchema, jobPatchSchema, type JobCreate, type JobPatch } from '../validators/job';

export function prepareJobCreate(input: JobCreate, today: string) {
  const values = jobCreateSchema.parse(input);
  return { ...values, dedupeKey: jobDedupeKey(values.company, values.role),
    appliedAt: values.status === 'applied' && !values.appliedAt ? today : values.appliedAt,
  };
}
export function prepareJobPatch(current: Pick<JobCreate, 'company' | 'role' | 'appliedAt'>, patch: JobPatch, today: string) {
  const values = jobPatchSchema.parse(patch);
  const changes: JobPatch & { dedupeKey?: string } = { ...values };
  if (values.company !== undefined || values.role !== undefined) changes.dedupeKey = jobDedupeKey(values.company ?? current.company, values.role ?? current.role);
  if (values.status === 'applied' && !(values.appliedAt === undefined ? current.appliedAt : values.appliedAt)) changes.appliedAt = today;
  return changes;
}

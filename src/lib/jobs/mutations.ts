import type { JobItem } from './items';
import { MAX_LIST } from '../constants';

import type { JobAction } from './actions';
export type { JobAction } from './actions';

export function optimisticJobs(items: JobItem[], action: JobAction, temporaryId: string, now: string, today: string) {
  if (action.kind === 'delete') return items.filter((job) => job.id !== action.id);
  if (action.kind === 'create') return [{ ...action.input, id: temporaryId, createdAt: now, updatedAt: now,
    appliedAt: action.input.status === 'applied' && !action.input.appliedAt ? today : action.input.appliedAt,
  }, ...items].slice(0, MAX_LIST);
  return items.map((job) => {
    if (job.id !== action.id) return job;
    const updated = { ...job, ...action.input, updatedAt: now };
    if (action.input.status === 'applied' && !updated.appliedAt) updated.appliedAt = today;
    return updated;
  });
}

export function replaceOptimisticJob(items: JobItem[], action: JobAction, temporaryId: string, result: JobItem | null) {
  if (!result) return items;
  const id = action.kind === 'create' ? temporaryId : action.id;
  return items.map((job) => job.id === id ? result : job);
}

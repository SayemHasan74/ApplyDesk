import { apiRequest } from '../api/client';
import type { JobAction } from './mutations';
import { MAX_LIST } from '../constants';

export async function fetchJobs() {
  const { z } = await import('zod');
  const { jobItemSchema } = await import('./items');
  return z.object({ items: z.array(jobItemSchema).max(MAX_LIST) }).strict().parse(await apiRequest('/api/jobs')).items;
}

export async function sendJobAction(action: JobAction) {
  const { jobActionSchema } = await import('./actions');
  const { jobItemSchema } = await import('./items');
  action = jobActionSchema.parse(action);
  const result = await apiRequest(action.kind === 'create' ? '/api/jobs' : `/api/jobs/${action.id}`,
    action.kind === 'create' ? 'POST' : action.kind === 'update' ? 'PATCH' : 'DELETE', action.kind === 'delete' ? {} : action.input);
  return action.kind === 'delete' ? null : jobItemSchema.parse(result);
}

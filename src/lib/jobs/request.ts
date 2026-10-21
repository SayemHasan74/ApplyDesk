import { z } from 'zod';
import { jobItemSchema } from './items';
import type { JobAction } from './mutations';
import { MAX_LIST } from '../constants';

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const payload: unknown = await response.json();
  const error = z.object({ ok: z.literal(false), error: z.object({ code: z.string().max(120), message: z.string().max(4000) }).strict() }).strict().safeParse(payload);
  if (!response.ok || error.success) throw new Error(error.success ? error.data.error.message : 'Request failed. Please try again.');
  return z.object({ ok: z.literal(true), data: z.unknown() }).strict().parse(payload).data;
}

export async function fetchJobs() {
  return z.object({ items: z.array(jobItemSchema).max(MAX_LIST) }).strict().parse(await request('/api/jobs')).items;
}

export async function sendJobAction(action: JobAction) {
  const result = await request(action.kind === 'create' ? '/api/jobs' : `/api/jobs/${action.id}`, {
    method: action.kind === 'create' ? 'POST' : action.kind === 'update' ? 'PATCH' : 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action.kind === 'delete' ? {} : action.input),
  });
  return action.kind === 'delete' ? null : jobItemSchema.parse(result);
}

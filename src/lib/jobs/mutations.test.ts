import { afterEach, expect, it, vi } from 'vitest';
import { optimisticJobs, replaceOptimisticJob, type JobAction } from './mutations';
import { jobItemSchema } from './items';
import { jobCreateSchema } from '../validators/job';

const now = '2026-10-21T00:00:00Z';
const item = jobItemSchema.parse({ company: 'C', role: 'R', id: '0123456789abcdef01234567', createdAt: now, updatedAt: now });
const temporaryId = '0123456789abcdef01234568';
afterEach(() => vi.useRealTimers());
it('creates and replaces a temporary item with the authoritative server item', () => {
  const action: JobAction = { kind: 'create', input: jobCreateSchema.parse({ company: 'New', role: 'Role' }) };
  const optimistic = optimisticJobs([item], action, temporaryId, now, '2026-10-21');
  expect(optimistic[0]).toMatchObject({ id: temporaryId, company: 'New' });
  const server = { ...optimistic[0], id: '0123456789abcdef01234569', company: 'Server-normalized' };
  expect(replaceOptimisticJob(optimistic, action, temporaryId, server)).toEqual([server, item]);
  expect(optimisticJobs(Array.from({ length: 500 }, () => item), action, temporaryId, now, '2026-10-21')).toHaveLength(500);
});
it('optimistically patches and deletes items without touching unrelated items', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(now));
  const action: JobAction = { kind: 'update', id: item.id, input: { status: 'applied' } };
  const updated = optimisticJobs([item], action, temporaryId, now, '2026-10-21');
  expect(updated[0]).toMatchObject({ status: 'applied', appliedAt: '2026-10-21' });
  expect(item.status).toBe('saved');
  expect(optimisticJobs(updated, { kind: 'delete', id: item.id }, temporaryId, now, '2026-10-21')).toEqual([]);
});

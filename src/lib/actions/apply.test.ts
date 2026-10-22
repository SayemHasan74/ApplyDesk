import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ connect: vi.fn(), expiry: vi.fn() }));
vi.mock('../db', () => ({ connectDb: mocks.connect }));
vi.mock('../auth/expiry', () => ({ getExpiryFor: mocks.expiry }));
import { applyActions } from './apply';
import { undoActions } from './undo';
import { createHarness, owner, visitor, demoExpiry } from './test-harness';
import { Job } from '../models/jobs';
import { Certification } from '../models/certifications';
import { Todo } from '../models/todos';
import { ActionLog } from '../models/action-logs';

let harness: ReturnType<typeof createHarness>;
beforeEach(() => {
  vi.restoreAllMocks(); harness = createHarness(); mocks.connect.mockResolvedValue(harness.db);
  mocks.expiry.mockImplementation(async (_, role) => role === 'demo' ? demoExpiry : null);
});
it('processes sequentially, keeps validation failures independent and logs successful snapshots once', async () => {
  const job = harness.seed('job', { company: 'C', role: 'R', dedupeKey: 'c|r' });
  const result = await applyActions(owner, { items: [
    { kind: 'update', entity: 'job', id: String(job._id), patch: { status: 'applied' } },
    { kind: 'update', entity: 'job', id: String(job._id), patch: { userId: visitor.userId } },
    { kind: 'append_note', entity: 'job', id: String(job._id), text: 'Follow up' },
    { kind: 'create', entity: 'todo', data: { title: 'Prepare CV', status: 'done' } },
  ] });
  expect(result.results.map((row) => row.ok)).toEqual([true, false, true, true]);
  expect(result.results[1]).toMatchObject({ index: 1, error: { code: 'VALIDATION' } });
  const logs = harness.rows('logs', { batchId: result.batchId });
  expect(logs.map((row) => row.seq)).toEqual([0, 1, 2]); expect(ActionLog.insertMany).toHaveBeenCalledTimes(1);
  expect(logs[1].before).toMatchObject({ status: 'applied' }); expect(logs[1].after).toMatchObject({ notes: 'Follow up' });
  expect(harness.rows('todo', {})[0]).toMatchObject({ status: 'done', createdFrom: 'text', completedAt: expect.any(Date) });
  expect(logs.every((row) => row.expiresAt instanceof Date && row.expiresAt.getTime() - Date.now() > 29 * 86400_000)).toBe(true);
});
it('rolls back a duplicate bulk item, keeps other successes and writes an accurate audit trail', async () => {
  const first = harness.seed('job', { company: 'C', role: 'One', dedupeKey: 'c|one' });
  const second = harness.seed('job', { company: 'C', role: 'Two', dedupeKey: 'c|two' });
  const result = await applyActions(owner, { items: [
    { kind: 'create', entity: 'todo', data: { title: 'Survives retry' } },
    { kind: 'bulk_update', entity: 'job', ids: [String(first._id), String(second._id)], patch: { role: 'Same' } },
    { kind: 'create', entity: 'todo', data: { title: 'Next item' } },
  ] });
  expect(result.results.map((row) => row.ok)).toEqual([true, false, true]); expect(result.results[1]).toMatchObject({ error: { code: 'CONFLICT' } });
  expect(harness.rows('job', {}).map((row) => row.role)).toEqual(['One', 'Two']);
  expect(harness.rows('todo', {})).toHaveLength(2); expect(harness.rows('logs', {})).toHaveLength(2);
  expect(ActionLog.insertMany).toHaveBeenCalledTimes(1); expect(harness.controls.transactions).toBe(2);
});
it('loads one scoped query and uses one bulkWrite for 25 updates; missing/foreign IDs fail the whole item', async () => {
  const jobs = Array.from({ length: 25 }, (_, i) => harness.seed('job', { company: `C${i}`, role: 'R', dedupeKey: `c${i}|r` }));
  const ids = jobs.map((row) => String(row._id));
  const success = await applyActions(owner, { items: [{ kind: 'bulk_update', entity: 'job', ids, patch: { status: 'applied' } }] });
  expect(success.results[0].ok).toBe(true); expect(Job.find).toHaveBeenCalledTimes(1); expect(Job.bulkWrite).toHaveBeenCalledTimes(1);
  expect(Job.find).toHaveBeenCalledWith({ userId: owner.userId, _id: { $in: ids } });
  const foreign = harness.seed('job', { company: 'Other', role: 'R', dedupeKey: 'other|r' }, visitor.userId);
  const failed = await applyActions(owner, { items: [{ kind: 'bulk_update', entity: 'job', ids: [ids[0], String(foreign._id)], patch: { status: 'offer' } }] });
  expect(failed.results[0]).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  expect(harness.rows('job', { userId: owner.userId })[0].status).toBe('applied');
});
it('verifies linked items once per bulk and rejects references owned by another tenant', async () => {
  const job = harness.seed('job', { company: 'C', role: 'R', dedupeKey: 'c|r' }, visitor.userId);
  const todos = [harness.seed('todo', { title: 'A' }), harness.seed('todo', { title: 'B' })];
  const result = await applyActions(owner, { items: [
    { kind: 'bulk_update', entity: 'todo', ids: todos.map((row) => String(row._id)), patch: { linkedJobId: String(job._id) } },
    { kind: 'create', entity: 'todo', data: { title: 'Bad link', linkedJobId: String(job._id) } },
  ] });
  expect(result.results.every((row) => !row.ok && row.error.code === 'VALIDATION')).toBe(true);
  expect(Todo.bulkWrite).not.toHaveBeenCalled(); expect(Job.findOne).toHaveBeenCalledTimes(2);
});
it('enforces notes limits and admin-only kinds while keeping the rest of a demo batch usable', async () => {
  const job = harness.seed('job', { company: 'C', role: 'R', dedupeKey: 'c|r', notes: 'a'.repeat(3999) }, visitor.userId);
  const result = await applyActions(visitor, { items: [
    { kind: 'setting', key: 'groundingEnabled', value: false }, { kind: 'suggestion', id: 'c'.repeat(24), decision: 'accept' },
    { kind: 'append_note', entity: 'job', id: String(job._id), text: 'b' }, { kind: 'create', entity: 'todo', data: { title: 'Allowed' } },
  ] });
  expect(result.results.map((row) => row.ok ? 'OK' : row.error.code)).toEqual(['FORBIDDEN', 'FORBIDDEN', 'VALIDATION', 'OK']);
  expect(harness.rows('todo', {})[0]).toHaveProperty('expiresAt', demoExpiry);
  const adminResult = await applyActions(owner, { items: [{ kind: 'suggestion', id: 'c'.repeat(24), decision: 'dismiss' }] });
  expect(adminResult.results[0]).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
});
it('caps demo documents at 150 across all collections and frees capacity after a deletion in the same batch', async () => {
  const todo = harness.seed('todo', { title: 'Delete me' }, visitor.userId);
  for (let i = 0; i < 149; i++) harness.seed('todo', { title: `Task ${i}` }, visitor.userId);
  const result = await applyActions(visitor, { items: [
    { kind: 'create', entity: 'todo', data: { title: 'Over cap' } },
    { kind: 'delete', entity: 'todo', id: String(todo._id) },
    { kind: 'create', entity: 'job', data: { company: 'C', role: 'R' } },
  ] });
  expect(result.results.map((row) => row.ok)).toEqual([false, true, true]);
  expect(result.results[0]).toMatchObject({ error: { code: 'RATE_LIMITED', message: 'Demo limit reached.' } });
  expect(harness.rows('todo', { userId: visitor.userId }).length + harness.rows('job', { userId: visitor.userId }).length).toBe(150);
});
it('rolls back every entity write if the audit insert fails', async () => {
  harness.controls.failAudit = true;
  await expect(applyActions(owner, { items: [{ kind: 'create', entity: 'todo', data: { title: 'Must not persist' } }] })).rejects.toThrow('Private log failure');
  expect(harness.rows('todo', {})).toEqual([]); expect(harness.rows('logs', {})).toEqual([]);
});
it('round-trips a mixed batch with full snapshots and original IDs/timestamps', async () => {
  const job = harness.seed('job', { company: 'C', role: 'R', dedupeKey: 'c|r', fieldSources: { deadline: 'text' }, gmailThreadIds: ['thread-1'] });
  const cert = harness.seed('certification', { name: 'Cloud', provider: 'Academy', dedupeKey: 'academy|cloud', notes: 'Original' });
  const result = await applyActions(owner, { items: [
    { kind: 'create', entity: 'todo', data: { title: 'New task' } },
    { kind: 'update', entity: 'job', id: String(job._id), patch: { deadline: '2026-11-01' } },
    { kind: 'delete', entity: 'certification', id: String(cert._id) },
  ] });
  expect(result.results.every((row) => row.ok)).toBe(true);
  expect(harness.rows('certification', {})).toEqual([]);
  expect(await undoActions(owner, { batchId: result.batchId })).toMatchObject({ reverted: 3, skipped: 0 });
  expect(harness.rows('job', {})[0]).toEqual(job); expect(harness.rows('certification', {})[0]).toEqual(cert); expect(harness.rows('todo', {})).toEqual([]);
  expect(Certification.insertMany).toHaveBeenCalledWith([cert], expect.objectContaining({ timestamps: false }));
});
it('deletes a bulk selection with one scoped delete and restores every original ID on undo', async () => {
  const certs = Array.from({ length: 3 }, (_, i) => harness.seed('certification', { name: `Course ${i}`, provider: 'Academy', dedupeKey: `academy|course ${i}` }));
  const ids = certs.map((cert) => String(cert._id));
  const batch = await applyActions(owner, { items: [{ kind: 'bulk_delete', entity: 'certification', ids }] });
  expect(Certification.deleteMany).toHaveBeenCalledExactlyOnceWith({ _id: { $in: ids }, userId: owner.userId }, expect.anything());
  expect(harness.rows('logs', {})).toHaveLength(3); expect(harness.rows('certification', {})).toEqual([]);
  expect(await undoActions(owner, { batchId: batch.batchId })).toMatchObject({ reverted: 3 });
  expect(harness.rows('certification', {}).map((cert) => String(cert._id)).sort()).toEqual(ids.sort());
});

import { beforeEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ connect: vi.fn(), expiry: vi.fn() }));
vi.mock('../db', () => ({ connectDb: mocks.connect }));
vi.mock('../auth/expiry', () => ({ getExpiryFor: mocks.expiry }));
import { applyActions } from './apply';
import { undoActions } from './undo';
import { createHarness, owner, visitor, demoExpiry } from './test-harness';
import { Todo } from '../models/todos';
import { User } from '../models/users';

let harness: ReturnType<typeof createHarness>;
beforeEach(() => {
  vi.restoreAllMocks(); harness = createHarness(); mocks.connect.mockResolvedValue(harness.db);
  mocks.expiry.mockImplementation(async (_, role) => role === 'demo' ? demoExpiry : null);
});
it('reverts create+update+delete snapshots for the same document in reverse seq order', async () => {
  const original = harness.seed('todo', { title: 'Original' });
  harness.collection('todo').clear();
  const updated = { ...original, title: 'Changed', updatedAt: new Date() };
  const batchId = randomUUID();
  for (const [seq, op, before, after] of [[0, 'create', null, original], [1, 'update', original, updated], [2, 'delete', updated, null]] as const) {
    const _id = new Types.ObjectId();
    harness.collection('logs').set(String(_id), { _id, userId: owner.userId, batchId, seq, entity: 'todo', docId: String(original._id), op, before, after, undone: false, createdAt: new Date() });
  }
  expect(await undoActions(owner, { batchId })).toEqual({ batchId, reverted: 3, skipped: 0 });
  expect(harness.rows('todo', {})).toEqual([]);
  expect(Todo.insertMany).toHaveBeenCalledWith([updated], expect.objectContaining({ timestamps: false }));
  expect(Todo.replaceOne).toHaveBeenCalledWith({ _id: String(original._id), userId: owner.userId }, original, expect.objectContaining({ timestamps: false }));
  expect(harness.rows('logs', {}).every(({ undone }) => undone)).toBe(true);
});
it('undoes only the selected/latest tenant batch and reports nothing to undo after all handled rows', async () => {
  const first = await applyActions(owner, { items: [{ kind: 'create', entity: 'todo', data: { title: 'First' } }] });
  const second = await applyActions(owner, { items: [{ kind: 'create', entity: 'todo', data: { title: 'Second' } }] });
  expect(await undoActions(owner, {})).toMatchObject({ batchId: second.batchId, reverted: 1 });
  expect(harness.rows('todo', {})[0].title).toBe('First');
  await expect(undoActions(visitor, { batchId: first.batchId })).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'Nothing to undo.' });
  expect(await undoActions(owner, {})).toMatchObject({ batchId: first.batchId, reverted: 1 });
  await expect(undoActions(owner, {})).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'Nothing to undo.' });
});
it('skips an already-gone create and a deletion whose original ID already exists without overwriting it', async () => {
  const task = harness.seed('todo', { title: 'Original' });
  const deleted = await applyActions(owner, { items: [{ kind: 'delete', entity: 'todo', id: String(task._id) }] });
  harness.collection('todo').set(String(task._id), { ...task, title: 'Already restored' });
  expect(await undoActions(owner, { batchId: deleted.batchId })).toMatchObject({ reverted: 0, skipped: 1 });
  expect(harness.rows('todo', {})[0].title).toBe('Already restored');
  const created = await applyActions(owner, { items: [{ kind: 'create', entity: 'todo', data: { title: 'Gone' } }] });
  const result = created.results[0];
  if (!result.ok || !result.id) throw new Error('Expected created item');
  harness.collection('todo').delete(result.id);
  expect(await undoActions(owner, { batchId: created.batchId })).toMatchObject({ reverted: 0, skipped: 1 });
  await expect(undoActions(owner, { batchId: created.batchId })).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
it('snapshots settings without user secrets and restores the previous values in reverse order', async () => {
  const result = await applyActions(owner, { items: [{ kind: 'setting', key: 'aiDailyLimit', value: 25 }, { kind: 'setting', key: 'groundingEnabled', value: false }] });
  expect(result.results.every((row) => row.ok)).toBe(true);
  expect(harness.rows('logs', {})[0]).toMatchObject({ entity: 'setting', before: { groundingEnabled: true, aiDailyLimit: 18, key: 'aiDailyLimit' } });
  expect(await undoActions(owner, { batchId: result.batchId })).toMatchObject({ reverted: 2 });
  expect(harness.rows('users', { _id: owner.userId })[0].settings).toEqual({ groundingEnabled: true, aiDailyLimit: 18 });
  expect(User.findOneAndUpdate).toHaveBeenLastCalledWith({ _id: owner.userId, role: 'admin' }, { $set: { 'settings.aiDailyLimit': 18 } }, expect.anything());
});
it('never restores a snapshot to another tenant or lets demo undo an admin-only setting log', async () => {
  const task = harness.seed('todo', { title: 'Owned by admin' });
  const batchId = randomUUID(), _id = new Types.ObjectId();
  harness.collection('logs').set(String(_id), { _id, userId: visitor.userId, batchId, seq: 0, entity: 'todo', op: 'update', docId: String(task._id), before: task, undone: false, createdAt: new Date() });
  await expect(undoActions(visitor, { batchId })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  expect(harness.rows('todo', {})[0]).toEqual(task);
  harness.collection('logs').set(String(_id), { ...harness.rows('logs', {})[0], entity: 'setting', op: 'setting', before: { key: 'aiDailyLimit', groundingEnabled: true, aiDailyLimit: 18 } });
  await expect(undoActions(visitor, { batchId })).rejects.toMatchObject({ code: 'FORBIDDEN' });
});
it('prevents old undo batches from bypassing the demo document cap and keeps their logs retryable', async () => {
  const task = harness.seed('todo', { title: 'Old task' }, visitor.userId);
  const deleted = await applyActions(visitor, { items: [{ kind: 'delete', entity: 'todo', id: String(task._id) }] });
  for (let i = 0; i < 150; i++) harness.seed('todo', { title: `Current ${i}` }, visitor.userId);
  await expect(undoActions(visitor, { batchId: deleted.batchId })).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  expect(harness.rows('logs', {})[0].undone).toBe(false);
  expect(harness.rows('todo', {})).toHaveLength(150);
});

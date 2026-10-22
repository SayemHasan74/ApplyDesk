import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { actionItemSchema, applyBodySchema, undoBodySchema } from './schema';
import { jobPatchSchema } from '../validators/job';
import { certPatchSchema } from '../validators/certification';
import { todoPatchSchema } from '../validators/todo';

const id = 'a'.repeat(24);
it.each(['userId', 'dedupeKey', '$set', '_id', 'createdAt'])('rejects protected patch key %s in every manual and action schema', (key) => {
  for (const [entity, schema] of [['job', jobPatchSchema], ['certification', certPatchSchema], ['todo', todoPatchSchema]] as const) {
    expect(schema.safeParse({ [key]: 'forged' }).success).toBe(false);
    for (const kind of ['update', 'bulk_update']) expect(actionItemSchema.safeParse({ kind, entity, ...(kind === 'update' ? { id } : { ids: [id] }), patch: { [key]: 'forged' } }).success).toBe(false);
  }
});
it('enforces 30 items, strict envelopes, unique bulk IDs and the 25-ID cap', () => {
  expect(applyBodySchema.safeParse({ items: [{}] }).success).toBe(true);
  for (const value of [{ items: [] }, { items: Array(31).fill({}) }, { items: [{}], extra: true }]) expect(applyBodySchema.safeParse(value).success).toBe(false);
  const make = (ids: string[]) => ({ kind: 'bulk_delete', entity: 'todo', ids });
  expect(actionItemSchema.safeParse(make(Array.from({ length: 25 }, (_, i) => (i + 1).toString(16).padStart(24, '0')))).success).toBe(true);
  for (const ids of [[], [id, id], Array.from({ length: 26 }, (_, i) => (i + 1).toString(16).padStart(24, '0')), ['bad']]) expect(actionItemSchema.safeParse(make(ids)).success).toBe(false);
});
it('defaults AI creates to text and rejects manual/email origins and URL origins for to-dos', () => {
  const create = (data: Record<string, unknown>) => actionItemSchema.safeParse({ kind: 'create', entity: 'job', data: { company: 'C', role: 'R', ...data } });
  expect(create({})).toMatchObject({ success: true, data: { data: { createdFrom: 'text' } } });
  for (const createdFrom of ['text', 'image', 'voice', 'url']) expect(create({ createdFrom }).success).toBe(true);
  for (const createdFrom of ['manual', 'email', 'unknown']) expect(create({ createdFrom }).success).toBe(false);
  expect(actionItemSchema.safeParse({ kind: 'create', entity: 'todo', data: { title: 'Task', createdFrom: 'url' } }).success).toBe(false);
});
it('enforces manual field constraints, setting types, note limits and strict undo input', () => {
  for (const item of [
    { kind: 'update', entity: 'job', id, patch: { deadline: '2026-02-30' } },
    { kind: 'update', entity: 'certification', id, patch: { progressPercent: 101 } },
    { kind: 'update', entity: 'todo', id, patch: { linkedJobId: 'bad' } },
    { kind: 'setting', key: 'aiDailyLimit', value: true }, { kind: 'setting', key: 'aiDailyLimit', value: 101 },
    { kind: 'setting', key: 'groundingEnabled', value: 1 }, { kind: 'append_note', entity: 'todo', id, text: 'No' },
    { kind: 'append_note', entity: 'job', id, text: 'a'.repeat(1001) },
  ]) expect(actionItemSchema.safeParse(item).success).toBe(false);
  expect(undoBodySchema.safeParse({}).success).toBe(true);
  expect(undoBodySchema.safeParse({ batchId: 'bad' }).success).toBe(false);
  expect(undoBodySchema.safeParse({ userId: id }).success).toBe(false);
});

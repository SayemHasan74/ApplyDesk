import { expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
vi.mock('server-only', () => ({}));
import { appendNote, prepareCreate, preparePatch } from './prepare';
import { prepareJobPatch } from '../jobs/effects';
import { prepareCertPatch } from '../certifications/writes';
import { applyTodoStatusEffects } from '../todos/effects';
import { jobCreateSchema } from '../validators/job';
import { certCreateSchema } from '../validators/certification';
import { todoCreateSchema } from '../validators/todo';

const now = new Date('2026-10-22T06:30:00.000Z'), today = '2026-10-22';
const metadata = { _id: new Types.ObjectId(), userId: 'a'.repeat(24), createdAt: now, updatedAt: now };
it('uses the same job status and dedupe rules as manual writes', () => {
  const current = jobCreateSchema.parse({ company: 'C', role: 'R' });
  const patch = { company: 'New Company', status: 'applied' as const };
  expect(preparePatch('job', { ...metadata, ...current }, patch, today, now)).toEqual(prepareJobPatch(current, patch, today));
  expect(preparePatch('job', { ...metadata, ...current }, patch, today, now)).toMatchObject({ appliedAt: today, dedupeKey: 'new company|r' });
  expect(prepareJobPatch({ ...current, appliedAt: '2026-10-01' }, { status: 'applied' }, today)).toEqual({ status: 'applied' });
  expect(prepareCreate('job', { company: 'C', role: 'R', status: 'applied' }, today, now)).toMatchObject({ appliedAt: today, dedupeKey: 'c|r' });
});
it('uses certification completion/progress and identity rules for creates and updates', () => {
  const current = certCreateSchema.parse({ name: 'Cloud', provider: 'Academy', progressPercent: 20 });
  const patch = { provider: 'New Academy', status: 'completed' as const };
  expect(preparePatch('certification', { ...metadata, ...current }, patch, today, now)).toEqual(prepareCertPatch(current, patch, today));
  expect(preparePatch('certification', { ...metadata, ...current }, patch, today, now)).toMatchObject({ completedAt: today, progressPercent: 100, dedupeKey: 'new academy|cloud' });
  expect(prepareCreate('certification', { name: 'C', provider: 'P', status: 'completed', progressPercent: 30 }, today, now)).toMatchObject({ completedAt: today, progressPercent: 30 });
});
it('preserves exact to-do transitions including repeated done and reopening', () => {
  const current = todoCreateSchema.parse({ title: 'Task' });
  const before = { ...metadata, ...current, completedAt: null };
  expect(preparePatch('todo', before, { status: 'done' }, today, now)).toEqual(applyTodoStatusEffects({ status: 'todo', completedAt: null }, { status: 'done' }, now.toISOString()));
  expect(preparePatch('todo', { ...before, status: 'done', completedAt: now }, { status: 'done' }, today, now)).toEqual({ status: 'done' });
  expect(preparePatch('todo', { ...before, status: 'done', completedAt: now }, { status: 'todo' }, today, now)).toEqual({ status: 'todo', completedAt: null });
  expect(prepareCreate('todo', { title: 'Task', status: 'done' }, today, now)).toHaveProperty('completedAt', now.toISOString());
});
it('appends notes without an initial newline and enforces the combined 4000-character bound', () => {
  expect(appendNote('', 'First')).toBe('First'); expect(appendNote('First', 'Second')).toBe('First\nSecond');
  expect(appendNote('a'.repeat(3998), 'b')).toHaveLength(4000);
  expect(() => appendNote('a'.repeat(3999), 'b')).toThrow('4000');
});

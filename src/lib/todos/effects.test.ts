import { expect, it } from 'vitest';
import { applyTodoStatusEffects } from './effects';

const now = '2026-10-21T18:30:00.000Z';
it('sets completion only when entering done and clears it when reopening', () => {
  expect(applyTodoStatusEffects({ status: 'doing', completedAt: null }, { status: 'done' }, now)).toEqual({ status: 'done', completedAt: now });
  expect(applyTodoStatusEffects({ status: 'done', completedAt: now }, { status: 'todo' }, now)).toEqual({ status: 'todo', completedAt: null });
  expect(applyTodoStatusEffects({ status: 'done', completedAt: now }, { status: 'doing' }, now)).toEqual({ status: 'doing', completedAt: null });
});
it('preserves timestamps on repeated done updates and unrelated edits', () => {
  expect(applyTodoStatusEffects({ status: 'done', completedAt: now }, { status: 'done' }, '2026-10-22T00:00:00Z')).toEqual({ status: 'done' });
  expect(applyTodoStatusEffects({ status: 'todo', completedAt: null }, { title: 'New' }, now)).toEqual({ title: 'New' });
  expect(applyTodoStatusEffects({ status: 'todo', completedAt: null }, { status: 'doing' }, now)).toEqual({ status: 'doing' });
});

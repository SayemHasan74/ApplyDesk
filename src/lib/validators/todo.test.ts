import { expect, it } from 'vitest';
import { todoCreateSchema, todoPatchSchema } from './todo';

it('creates backlog items by default and never inserts defaults into patches', () => {
  expect(todoCreateSchema.parse({ title: ' Task ' })).toMatchObject({ title: 'Task', dueDate: null, status: 'todo', priority: 'medium' });
  expect(todoPatchSchema.parse({ status: 'done' })).toEqual({ status: 'done' });
  expect(todoPatchSchema.parse({})).toEqual({});
});
it.each([
  { title: '' }, { title: '   ' }, { title: 'x'.repeat(201) }, { details: 'x'.repeat(4001) }, { tag: 'x'.repeat(41) },
  { dueDate: '2026-02-29' }, { dueDate: '2026-04-31' }, { dueDate: 'tomorrow' }, { linkedJobId: 'bad' },
  { linkedCertId: 'ABCDEF0123456789ABCDEF01' }, { linkedJobId: { $ne: null } }, { $set: {} },
  { 'title.x': 'a' }, { userId: 'a'.repeat(24) }, { completedAt: '2026-10-21T00:00:00Z' },
])('rejects invalid to-do input %j', (values) => {
  expect(todoCreateSchema.safeParse({ title: 'Task', ...values }).success).toBe(false);
  expect(todoPatchSchema.safeParse(values).success).toBe(false);
});
it('accepts optional links, null dates, and max-length tags', () => {
  expect(todoCreateSchema.safeParse({ title: 'Task', linkedJobId: '0123456789abcdef01234567', linkedCertId: null, dueDate: null, tag: 'x'.repeat(40) }).success).toBe(true);
  expect(todoPatchSchema.safeParse({ createdFrom: 'manual' }).success).toBe(false);
});

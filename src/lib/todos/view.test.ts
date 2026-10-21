import { expect, it } from 'vitest';
import { todoItemSchema } from './items';
import { todoSections, todoTags } from './view';
import { toTodoForm, changedTodoFields } from './form';
import { optimisticTodos, replaceTodo } from './mutations';
import { todoCreateSchema } from '../validators/todo';

const now = '2026-10-21T00:00:00.000Z';
const item = todoItemSchema.parse({ title: 'Task', id: '0123456789abcdef01234567', createdAt: now, updatedAt: now, completedAt: null });
it('groups in exact section order, keeps done out of overdue, and sorts by priority', () => {
  const items = [null, '2026-10-20', '2026-10-21', '2026-10-22'].map((dueDate) => ({ ...item, dueDate }));
  const high = { ...item, priority: 'high' as const, tag: 'study' };
  const sections = todoSections([...items, high, { ...item, status: 'done', dueDate: '2026-10-19' }], '2026-10-21');
  expect(Object.keys(sections)).toEqual(['overdue', 'today', 'upcoming', 'backlog', 'done']);
  expect(sections.overdue).toHaveLength(1); expect(sections.today).toHaveLength(1); expect(sections.upcoming).toHaveLength(1); expect(sections.done).toHaveLength(1);
  expect(sections.backlog[0]).toBe(high);
  expect(todoSections([item, high], '2026-10-21', 'study').backlog).toEqual([high]);
  expect(todoTags([item, high, { ...high }, { ...item, tag: 'job' }])).toEqual(['job', 'study']);
});
it('round trips full details without resetting dates or linked IDs', () => {
  expect(changedTodoFields(item, toTodoForm(item))).toEqual({});
  expect(changedTodoFields(item, { ...toTodoForm(item), details: 'Full text', linkedJobId: '0123456789abcdef01234568' })).toEqual({ details: 'Full text', linkedJobId: '0123456789abcdef01234568' });
});
it('moves checked tasks instantly and preserves the snapshot for rollback', () => {
  const snapshot = [item];
  const done = optimisticTodos(snapshot, { kind: 'update', id: item.id, input: { status: 'done' } }, item.id, now);
  expect(todoSections(done, '2026-10-21').done).toHaveLength(1); expect(done[0].completedAt).toBe(now);
  expect(item.status).toBe('todo'); expect(item.completedAt).toBeNull();
  expect(optimisticTodos(done, { kind: 'clear' }, item.id, now)).toEqual([]);
  expect(optimisticTodos(done, { kind: 'update', id: item.id, input: { status: 'todo' } }, item.id, now)[0].completedAt).toBeNull();
});
it('creates backlog tasks, replaces server items, and clears only completed records', () => {
  const create = { kind: 'create' as const, input: todoCreateSchema.parse({ title: 'New' }) };
  const optimistic = optimisticTodos([item], create, '0123456789abcdef01234568', now);
  expect(optimistic[0].dueDate).toBeNull();
  const server = { ...optimistic[0], id: '0123456789abcdef01234569' };
  expect(replaceTodo(optimistic, create, optimistic[0].id, server)).toEqual([server, item]);
  expect(optimisticTodos([item, { ...server, status: 'done' }], { kind: 'clear' }, item.id, now)).toEqual([item]);
});

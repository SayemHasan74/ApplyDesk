import { expect, it } from 'vitest';
import { deriveCert, deriveJob, todoView } from './derive';

it.each([
  ['2026-10-20', -1, 'closed'], ['2026-10-21', 0, 'critical'],
  ['2026-10-24', 3, 'critical'], ['2026-10-25', 4, 'soon'],
  ['2026-10-28', 7, 'soon'], ['2026-10-29', 8, 'ok'],
] as const)('derives deadline %s', (deadline, daysLeft, badge) => {
  expect(deriveJob({ status: 'saved', deadline }, '2026-10-21')).toEqual({ daysLeft, badge });
  expect(deriveCert({ status: 'planned', registrationDeadline: deadline }, '2026-10-21')).toEqual({ daysLeft, badge });
});
it('retains day differences without active badges', () => {
  expect(deriveJob({ status: 'applied', deadline: '2026-10-20' }, '2026-10-21')).toEqual({ daysLeft: -1, badge: 'none' });
  expect(deriveCert({ status: 'completed', registrationDeadline: '2026-10-22' }, '2026-10-21')).toEqual({ daysLeft: 1, badge: 'none' });
  expect(deriveCert({ status: 'wishlist', registrationDeadline: null }, '2026-10-21')).toEqual({ daysLeft: null, badge: 'none' });
  expect(deriveJob({ status: 'saved', deadline: null }, '2026-10-21')).toEqual({ daysLeft: null, badge: 'none' });
});
it('categorizes to-dos with done taking precedence', () => {
  expect(todoView({ status: 'done', dueDate: '2026-10-20' }, '2026-10-21')).toBe('done');
  expect(todoView({ status: 'todo', dueDate: null }, '2026-10-21')).toBe('backlog');
  expect(todoView({ status: 'doing', dueDate: '2026-10-20' }, '2026-10-21')).toBe('overdue');
  expect(todoView({ status: 'todo', dueDate: '2026-10-21' }, '2026-10-21')).toBe('today');
  expect(todoView({ status: 'todo', dueDate: '2026-10-22' }, '2026-10-21')).toBe('upcoming');
});

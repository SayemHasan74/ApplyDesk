import { expect, it } from 'vitest';
import { compareCerts, compareJobs, compareTodos } from './sort';

const dates = { createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-02-01') };
const job = (status: Parameters<typeof compareJobs>[0]['status'], deadline: string | null = null) => ({ ...dates, status, deadline });
const cert = (status: Parameters<typeof compareCerts>[0]['status'], registrationDeadline: string | null = null) => ({ ...dates, status, registrationDeadline });

it('sorts all job groups with their specified time order', () => {
  const rows = [job('rejected'), job('interview'), job('saved'), job('saved', '2026-12-01'), job('saved', '2026-01-01')];
  expect([...rows].sort(compareJobs)).toEqual([rows[4], rows[3], rows[2], rows[1], rows[0]]);
  expect(compareJobs({ ...job('saved'), createdAt: new Date('2026-03-01') }, job('saved'))).toBeLessThan(0);
  expect(compareJobs({ ...job('offer'), updatedAt: new Date('2026-03-01') }, job('applied'))).toBeLessThan(0);
  expect(compareJobs(job('withdrawn'), { ...job('rejected'), updatedAt: new Date('2026-03-01') })).toBeGreaterThan(0);
  expect(compareJobs(job('saved', '2026-01-01'), job('saved', '2026-01-01'))).toBe(0);
});
it('sorts certification ranks and newest first within non-deadline groups', () => {
  const rows = [cert('dropped'), cert('enrolled'), cert('wishlist'), cert('planned', '2026-12-01'), cert('wishlist', '2026-01-01')];
  expect([...rows].sort(compareCerts)).toEqual([rows[4], rows[3], rows[2], rows[1], rows[0]]);
  expect(compareCerts({ ...cert('planned'), createdAt: new Date('2026-03-01') }, cert('wishlist'))).toBeLessThan(0);
  expect(compareCerts({ ...cert('exam_scheduled'), updatedAt: new Date('2026-03-01') }, cert('in_progress'))).toBeLessThan(0);
  expect(compareCerts(cert('completed'), { ...cert('dropped'), updatedAt: new Date('2026-03-01') })).toBeGreaterThan(0);
});
it('sorts todos by priority, due date with null last, then oldest creation', () => {
  const base = { ...dates, priority: 'high' as const, dueDate: '2026-01-02' };
  expect(compareTodos(base, { ...base, priority: 'medium', dueDate: '2026-01-01' })).toBeLessThan(0);
  expect(compareTodos(base, { ...base, dueDate: null })).toBeLessThan(0);
  expect(compareTodos({ ...base, dueDate: '2026-01-01' }, base)).toBeLessThan(0);
  expect(compareTodos(base, { ...base, createdAt: new Date('2026-03-01') })).toBeLessThan(0);
  expect(compareTodos(base, base)).toBe(0);
});

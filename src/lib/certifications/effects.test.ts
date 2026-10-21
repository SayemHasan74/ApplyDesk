import { expect, it } from 'vitest';
import { applyCertStatusEffects } from './effects';

const current = { completedAt: null, progressPercent: 25 };
it('sets Dhaka completion date and progress when omitted in a completion patch', () => {
  expect(applyCertStatusEffects(current, { status: 'completed' }, '2026-10-22')).toEqual({ status: 'completed', completedAt: '2026-10-22', progressPercent: 100 });
  expect(current).toEqual({ completedAt: null, progressPercent: 25 });
});
it('preserves explicit progress and existing or explicit dates', () => {
  expect(applyCertStatusEffects({ completedAt: '2026-10-01', progressPercent: 100 }, { status: 'completed' }, '2026-10-22')).toEqual({ status: 'completed' });
  expect(applyCertStatusEffects(current, { status: 'completed', progressPercent: 50, completedAt: '2026-10-20' }, '2026-10-22')).toEqual({ status: 'completed', progressPercent: 50, completedAt: '2026-10-20' });
  expect(applyCertStatusEffects(current, { status: 'completed', completedAt: null }, '2026-10-22').completedAt).toBe('2026-10-22');
});
it('never changes completion fields for unrelated patches or reopening', () => {
  expect(applyCertStatusEffects(current, { notes: 'updated' }, '2026-10-22')).toEqual({ notes: 'updated' });
  expect(applyCertStatusEffects(current, { status: 'in_progress' }, '2026-10-22')).toEqual({ status: 'in_progress' });
});

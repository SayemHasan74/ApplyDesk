import { expect, it } from 'vitest';
import { certItemSchema } from './items';
import { certsSummary, visibleCerts } from './view';
import { toCertForm, formInput, changedCertFields } from './form';
import { optimisticCerts, replaceCert } from './mutations';
import { certCreateSchema } from '../validators/certification';

const now = '2026-10-21T00:00:00.000Z';
const item = certItemSchema.parse({ name: 'Cloud', provider: 'Academy', id: '0123456789abcdef01234567', createdAt: now, updatedAt: now, registrationDeadline: '2026-10-24' });
it('filters locally and orders nearest, no-deadline, then finished items', () => {
  const none = { ...item, id: '0123456789abcdef01234568', registrationDeadline: null };
  const completed = { ...item, id: '0123456789abcdef01234569', status: 'completed' as const };
  expect(visibleCerts([completed, none, item], '', 'all').map((cert) => cert.id)).toEqual([item.id, none.id, completed.id]);
  expect(visibleCerts([item], ' academy ', 'wishlist')).toEqual([item]);
  expect(visibleCerts([item], '', 'completed')).toEqual([]);
});
it('counts only active registration deadlines in the inclusive seven-day window', () => {
  const items = ['2026-10-20', '2026-10-21', '2026-10-28', '2026-10-29'].map((date) => ({ ...item, registrationDeadline: date }));
  expect(certsSummary([...items, { ...item, status: 'completed' }], '2026-10-21').due).toBe(2);
  expect(certsSummary(Array.from({ length: 8 }, () => item), '2026-10-21').closest).toHaveLength(5);
});
it('round trips all form fields and sends only changed values', () => {
  const form = toCertForm(item);
  expect(changedCertFields(item, form)).toEqual({});
  expect(changedCertFields(item, { ...form, progressPercent: '34', prerequisites: 'A\nB' })).toEqual({ progressPercent: 34, prerequisites: ['A', 'B'] });
  expect(certCreateSchema.safeParse(formInput(toCertForm())).success).toBe(false);
  expect(certCreateSchema.parse(formInput({ ...toCertForm(), name: 'Name', provider: 'Provider' })).status).toBe('wishlist');
});
it('applies optimistic completion, respects explicit progress, replaces creates and removes deletes', () => {
  const update = { kind: 'update' as const, id: item.id, input: { status: 'completed' as const } };
  const done = optimisticCerts([item], update, item.id, now, '2026-10-21')[0];
  expect(done.progressPercent).toBe(100); expect(done.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const create = { kind: 'create' as const, input: certCreateSchema.parse({ name: 'N', provider: 'P' }) };
  const optimistic = optimisticCerts([item], create, '0123456789abcdef01234568', now, '2026-10-21');
  const server = { ...optimistic[0], id: '0123456789abcdef01234569' };
  expect(replaceCert(optimistic, create, optimistic[0].id, server)).toEqual([server, item]);
  expect(optimisticCerts([item], { kind: 'delete', id: item.id }, item.id, now, '2026-10-21')).toEqual([]);
  expect(item.progressPercent).toBe(0);
});

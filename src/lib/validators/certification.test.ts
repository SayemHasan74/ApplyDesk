import { expect, it } from 'vitest';
import { certCreateSchema, certPatchSchema } from './certification';

const valid = { name: 'Cloud Fundamentals', provider: 'Training' };
it('defaults create fields but keeps patches sparse', () => {
  expect(certCreateSchema.parse(valid)).toMatchObject({ progressPercent: 0, status: 'wishlist', sourceUrls: [] });
  expect(certPatchSchema.parse({ status: 'completed' })).toEqual({ status: 'completed' });
  expect(certPatchSchema.parse({})).toEqual({});
});
it.each([
  { name: '' }, { provider: 'x'.repeat(121) }, { name: 'x'.repeat(201) }, { notes: 'x'.repeat(4001) },
  { registrationDeadline: '2026-02-29' }, { startDate: '2026-13-01' }, { completedAt: '2026-2-01' },
  { url: 'javascript:alert(1)' }, { credentialUrl: 'ftp://example.com' }, { sourceUrls: ['file:///etc/passwd'] },
  { prerequisites: Array(21).fill('a') }, { progressPercent: -1 }, { progressPercent: 101 }, { progressPercent: 4.5 },
  { $set: { status: 'completed' } }, { 'name.value': 'a' }, { userId: '0123456789abcdef01234567' },
  { fieldSources: {} }, { dedupeKey: 'key' }, { expiresAt: '2026-10-21' },
])('rejects invalid certification input %j', (patch) => {
  expect(certCreateSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
});
it('rejects non-editable metadata and supports real leap dates and HTTP URLs', () => {
  for (const key of ['createdFrom', 'createdAt', 'updatedAt', 'userId', 'dedupeKey', 'fieldSources']) expect(certPatchSchema.safeParse({ [key]: 'manual' }).success).toBe(false);
  expect(certCreateSchema.safeParse({ ...valid, examDate: '2028-02-29', url: 'https://example.com', progressPercent: 100 }).success).toBe(true);
});

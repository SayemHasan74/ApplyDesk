import { expect, it } from 'vitest';
import { jobCreateSchema, jobIdSchema, jobPatchSchema } from './job';

it('defaults new jobs but never adds defaults to a sparse patch', () => {
  expect(jobCreateSchema.parse({ company: ' Company ', role: ' Engineer ' })).toMatchObject({ company: 'Company', role: 'Engineer', status: 'saved', deadline: null, requirements: [], notes: '' });
  expect(jobPatchSchema.parse({ status: 'applied' })).toEqual({ status: 'applied' });
  expect(jobPatchSchema.parse({})).toEqual({});
});
it.each([
  { $set: { role: 'admin' } }, { 'company.name': 'bad' }, { unexpected: true },
  { deadline: '2026-02-30' }, { openDate: '2025-02-29' }, { deadline: '2026-1-01' },
  { applyUrl: 'javascript:alert(1)' }, { applyUrl: 'ftp://example.com' }, { sourceUrls: ['file:///etc/passwd'] },
  { company: 'x'.repeat(121) }, { role: 'x'.repeat(201) }, { notes: 'x'.repeat(4001) },
  { requirements: Array.from({ length: 21 }, () => 'item') }, { requirements: [{ $gt: '' }] },
  { interviewAt: '2026-02-30T15:00:00+06:00' }, { interviewAt: '2026-10-21T15:00:00' },
])('rejects invalid job inputs %j', (patch) => expect(jobCreateSchema.safeParse({ company: 'C', role: 'R', ...patch }).success).toBe(false));
it.each(['dedupeKey', 'userId', 'createdAt', 'updatedAt', 'createdFrom', 'fieldSources', 'expiresAt'])('rejects non-editable patch field %s', (key) => expect(jobPatchSchema.safeParse({ [key]: 'bad' }).success).toBe(false));
it('accepts real leap days, http(s) links and offset interviews', () => {
  expect(jobCreateSchema.safeParse({ company: 'C', role: 'R', deadline: '2024-02-29', applyUrl: 'https://example.com/apply', sourceUrls: ['http://example.com'], interviewAt: '2026-10-21T15:00:00+06:00' }).success).toBe(true);
  expect(jobIdSchema.safeParse('0123456789abcdef01234567').success).toBe(true);
  expect(jobIdSchema.safeParse('INVALID')).toMatchObject({ success: false });
});

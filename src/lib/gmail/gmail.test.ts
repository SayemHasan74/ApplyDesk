import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { extractMessage, mapFive } from './extract';
import { eventStatus, emailSuggestions, matchCompany } from './mapping';
import { classifierSchema, type EmailClassification } from './schema';
import { stateMatches } from './oauth';

const encoded = (text: string) => Buffer.from(text).toString('base64url');
const message = (payload: unknown) => extractMessage({ id: 'm1', threadId: 't1', internalDate: '1792548000000', payload });
const email = message({ mimeType: 'text/plain', body: { data: encoded('Interview on 2026-11-12 at 15:00.') } });
const classified: EmailClassification = { message_id: 'm1', is_job_related: true, company: 'Contoso Labs', role: 'Engineer', event: 'interview_invite', interview_at: '2026-11-12T15:00:00+06:00', new_jobs: [], confidence: 'high' };
it('extracts plain, html-only and nested multipart bodies, preferring plain and limiting length', () => {
  expect(message({ mimeType: 'text/plain', body: { data: encoded('hello') } }).body).toBe('hello');
  expect(message({ mimeType: 'text/html', body: { data: encoded('<style>bad</style><p>Hello &amp; welcome</p><script>bad</script>') } }).body).toBe('Hello & welcome');
  const plain = { mimeType: 'text/plain', body: { data: encoded('Plain body') } };
  expect(message({ parts: [{ parts: [{ mimeType: 'text/html', body: { data: encoded('<b>HTML body</b>') } }, plain] }] }).body).toBe('Plain body');
  expect(message({ mimeType: 'text/plain', body: { data: encoded('x'.repeat(4000)) } }).body).toHaveLength(3000);
});
it('fetches at most five messages concurrently and preserves order', async () => {
  let active = 0, peak = 0;
  const output = await mapFive(Array.from({ length: 13 }, (_, i) => i), async (i) => { active++; peak = Math.max(peak, active); await Promise.resolve(); active--; return i; });
  expect(peak).toBe(5); expect(output).toEqual(Array.from({ length: 13 }, (_, i) => i));
});
it('maps events and matches exact/contains companies without fuzzy short-name collisions', () => {
  expect(['application_confirmation', 'assessment_invite', 'interview_invite', 'rejection', 'offer', 'job_alert', 'other'].map((event) => eventStatus(event as EmailClassification['event']))).toEqual(['applied', 'assessment', 'interview', 'rejected', 'offer', null, null]);
  const jobs = [{ id: '1', company: 'Contoso Labs' }, { id: '2', company: 'IBM' }];
  expect(matchCompany('CONTOSO LABS!', jobs)).toHaveLength(1); expect(matchCompany('Contoso', jobs)).toHaveLength(1);
  expect(matchCompany('IB', jobs)).toEqual([]); expect(matchCompany('IBM', jobs)).toHaveLength(1);
  expect(matchCompany('Contoso', [...jobs, { id: '3', company: 'Contoso Inc' }])).toHaveLength(2);
});
it('produces status updates, skips ambiguous jobs and preserves only explicit interview times', () => {
  const jobs = [{ id: 'a'.repeat(24), company: 'Contoso Labs' }];
  expect(emailSuggestions(email, classified, jobs)[0]).toMatchObject({ type: 'status_update', payload: { status: 'interview', interviewAt: classified.interview_at } });
  expect(emailSuggestions({ ...email, body: 'Interview soon' }, classified, jobs)[0].payload).not.toHaveProperty('interviewAt');
  expect(emailSuggestions(email, classified, [...jobs, { id: 'b'.repeat(24), company: 'Contoso Labs' }])).toEqual([]);
  expect(emailSuggestions(email, { ...classified, is_job_related: false }, [])).toEqual([]);
  const drafts = emailSuggestions(email, { ...classified, event: 'job_alert', new_jobs: [{ company: 'A', role: 'R', apply_url: null, location: null, deadline: null }, { company: 'A', role: 'S', apply_url: null, location: null, deadline: null }] }, []);
  expect(drafts).toHaveLength(2); expect(drafts[0].suggestionKey).not.toBe(drafts[1].suggestionKey); expect(drafts[0].payload).toMatchObject({ createdFrom: 'email', deadline: null });
});
it('validates classifier bounds, dates, keys and states without unsafe comparisons', () => {
  expect(classifierSchema.safeParse({ emails: [classified] }).success).toBe(true);
  for (const change of [{ event: 'send_email' }, { interview_at: 'tomorrow' }, { company: 'x'.repeat(121) }, { $set: {} }]) expect(classifierSchema.safeParse({ emails: [{ ...classified, ...change }] }).success).toBe(false);
  expect(classifierSchema.safeParse({ emails: Array(11).fill(classified) }).success).toBe(false);
  expect(stateMatches('a'.repeat(43), 'a'.repeat(43))).toBe(true);
  for (const state of [null, '', 'a'.repeat(42), 'b'.repeat(43), 'é'.repeat(43)]) expect(stateMatches(state, 'a'.repeat(43))).toBe(false);
});

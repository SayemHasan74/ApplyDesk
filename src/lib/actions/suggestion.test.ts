import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ connect: vi.fn(), expiry: vi.fn() }));
vi.mock('../db', () => ({ connectDb: mocks.connect }));
vi.mock('../auth/expiry', () => ({ getExpiryFor: mocks.expiry }));
import { createHarness, owner, visitor } from './test-harness';
import { applyActions } from './apply';
import { undoActions } from './undo';
let harness: ReturnType<typeof createHarness>;
beforeEach(() => { vi.restoreAllMocks(); harness = createHarness(); mocks.connect.mockResolvedValue(harness.db); mocks.expiry.mockResolvedValue(null); });
function suggestion(payload: Record<string, unknown>, jobId: string | null = null) {
  return harness.seed('suggestion', { type: jobId ? 'status_update' : 'new_job', jobId, gmailMessageId: 'm1', gmailThreadId: 't1', emailSubject: 'Application', emailFrom: 'jobs@example.test', emailDate: new Date(), payload, confidence: 'high', suggestionKey: 'key' });
}
it('accepts through job side effects, logs suggestion separately, and restores both snapshots on undo', async () => {
  const job = harness.seed('job', { company: 'Contoso', role: 'Engineer', dedupeKey: 'contoso|engineer' });
  const row = suggestion({ status: 'applied' }, String(job._id));
  const result = await applyActions(owner, { items: [{ kind: 'suggestion', id: String(row._id), decision: 'accept' }] });
  expect(result.results[0].ok).toBe(true); expect(harness.rows('job', {})[0]).toMatchObject({ status: 'applied', gmailThreadIds: ['t1'] });
  expect(harness.rows('job', {})[0].appliedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(harness.rows('suggestion', {})[0].state).toBe('accepted');
  expect(harness.rows('logs', {}).map((log) => log.entity)).toEqual(['job', 'suggestion']);
  await undoActions(owner, { batchId: result.batchId }); expect(harness.rows('job', {})[0]).toEqual(job); expect(harness.rows('suggestion', {})[0]).toEqual(row);
});
it('creates email-sourced jobs, restores dismissed suggestions and rejects duplicates independently', async () => {
  const row = suggestion({ company: 'Contoso', role: 'Engineer', createdFrom: 'email' });
  const accepted = await applyActions(owner, { items: [{ kind: 'suggestion', id: String(row._id), decision: 'accept' }] });
  expect(accepted.results[0].ok).toBe(true); expect(harness.rows('job', {})[0]).toMatchObject({ createdFrom: 'email', gmailThreadIds: ['t1'] });
  await undoActions(owner, { batchId: accepted.batchId }); expect(harness.rows('job', {})).toEqual([]);
  const dismissed = await applyActions(owner, { items: [{ kind: 'suggestion', id: String(row._id), decision: 'dismiss' }] });
  expect(harness.rows('suggestion', {})[0].state).toBe('dismissed'); await undoActions(owner, { batchId: dismissed.batchId }); expect(harness.rows('suggestion', {})[0]).toEqual(row);
  harness.seed('job', { company: 'Contoso', role: 'Engineer', dedupeKey: 'contoso|engineer' });
  const duplicate = await applyActions(owner, { items: [{ kind: 'suggestion', id: String(row._id), decision: 'accept' }] });
  expect(duplicate.results[0]).toMatchObject({ ok: false, error: { code: 'CONFLICT' } }); expect(harness.rows('suggestion', {})[0].state).toBe('pending');
});
it('rejects demo access, foreign IDs, repeated decisions and unsafe stored payloads', async () => {
  const row = suggestion({ company: 'Contoso', role: 'Engineer', createdFrom: 'email' });
  const decision = { kind: 'suggestion', id: String(row._id), decision: 'dismiss' };
  expect((await applyActions(visitor, { items: [decision] })).results[0]).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  const foreign = harness.seed('suggestion', { type: 'new_job', payload: { company: 'Other', role: 'R' }, gmailMessageId: 'other', gmailThreadId: 't2', emailSubject: 'Other', emailFrom: 'other@example.test', emailDate: new Date(), confidence: 'high', suggestionKey: 'other' }, visitor.userId);
  expect((await applyActions(owner, { items: [{ ...decision, id: String(foreign._id) }] })).results[0]).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  await applyActions(owner, { items: [decision] }); expect((await applyActions(owner, { items: [decision] })).results[0]).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  const invalid = suggestion({ company: 'C', role: 'R', userId: visitor.userId, createdFrom: 'email' });
  expect((await applyActions(owner, { items: [{ ...decision, id: String(invalid._id), decision: 'accept' }] })).results[0].ok).toBe(false);
});
it('validates thread limits before writing and does not partially accept a failed suggestion', async () => {
  const job = harness.seed('job', { company: 'C', role: 'R', dedupeKey: 'c|r', gmailThreadIds: Array.from({ length: 20 }, (_, i) => `thread-${i}`) });
  const row = suggestion({ status: 'applied' }, String(job._id));
  const result = await applyActions(owner, { items: [{ kind: 'suggestion', id: String(row._id), decision: 'accept' }] });
  expect(result.results[0]).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
  expect(harness.rows('job', {})[0]).toEqual(job); expect(harness.rows('suggestion', {})[0]).toEqual(row); expect(harness.rows('logs', {})).toEqual([]);
});

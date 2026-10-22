import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { modelOutputSchema } from './schema';
import { validateOutput, validatePatch, validDate } from './validate';
import { fixtureContext, evidence } from './test-fixtures';

const context = fixtureContext();
function validated(extra: Record<string, unknown>) {
  return validateOutput(modelOutputSchema.parse({ intent: 'act', assistant_message: 'Proposed.', ...extra }), evidence, context);
}
it('rejects drafts with missing core fields, unknown keys or invalid optional enums', () => {
  for (const draft of [{ company: '', role: 'Engineer' }, { company: 'X', role: 'Y', ignored: true }, { company: 'X', role: 'Y', work_mode: 'invented' }]) expect(modelOutputSchema.safeParse({ intent: 'act', assistant_message: 'Proposed.', job_drafts: [draft] }).success).toBe(false);
});
it('validates calendar dates and exact inclusive deadline horizons', () => {
  for (const value of ['2026-02-30', 'N/A', '2024-10-21', '2029-10-23']) expect(validDate(value, evidence.today, true)).toBeNull();
  for (const value of ['2024-10-22', '2029-10-22']) expect(validDate(value, evidence.today, true)).toBe(value);
  expect(validDate('2035-01-01', evidence.today)).toBe('2035-01-01');
});
it('bounds valid summaries and limits source requirements', () => {
  const { draft } = validated({ job_drafts: [{ company: 'X', role: 'Y', description_summary: 'a'.repeat(4000), location: null,
    requirements: ['a'.repeat(121), ...Array.from({ length: 12 }, () => 'Short item')], deadline: '2099-01-01' }] }).drafts[0];
  expect(draft).toMatchObject({ descriptionSummary: 'a'.repeat(600), location: null, deadline: null, requirements: Array(8).fill('Short item') });
});
it('requires http links and evidence for primary URLs, allows supplied sources and literal typed URLs', () => {
  const base = { company: 'X', role: 'Y', apply_url: 'https://official.com/apply', source_urls: ['https://source.com'] };
  expect(validated({ job_drafts: [base] }).drafts[0].draft).toMatchObject({ applyUrl: null, sourceUrls: ['https://source.com'] });
  for (const support of [{ ...evidence, text: 'https://official.com/apply' }, { ...evidence, sources: ['https://official.com/apply'] }]) {
    const output = modelOutputSchema.parse({ intent: 'act', assistant_message: 'Proposed.', job_drafts: [base] });
    expect(validateOutput(output, support, context).drafts[0].draft).toHaveProperty('applyUrl', base.apply_url);
  }
  expect(validated({ cert_drafts: [{ name: 'Cloud', provider: 'X', url: 'https://source.com', source_urls: ['https://source.com'] }] }).drafts[0].draft).toHaveProperty('url', 'https://source.com');
});
it('downgrades unsupported pay/cost but retains explicit wording or provenance', () => {
  expect(validated({ job_drafts: [{ company: 'X', role: 'Y', compensation_status: 'paid' }] }).drafts[0].draft).toHaveProperty('compensationStatus', 'unknown');
  expect(validated({ job_drafts: [{ company: 'X', role: 'Y', compensation_status: 'unpaid', field_sources: { compensation_status: 'image' } }] }).drafts[0].draft).toHaveProperty('compensationStatus', 'unpaid');
  expect(validated({ cert_drafts: [{ name: 'Cloud', provider: 'X', cost_status: 'free' }] }).drafts[0].draft).toHaveProperty('costStatus', 'unknown');
  expect(validated({ cert_drafts: [{ name: 'Cloud', provider: 'X', cost_status: 'paid', cost_text: 'Certificate costs $10' }] }).drafts[0].draft).toHaveProperty('costStatus', 'paid');
});
it('checks linked IDs against provided tenant lists and drops unknown action targets', () => {
  const result = validated({ todo_drafts: [{ title: 'Study', linked_job_id: context.jobs[0].id, linked_cert_id: 'f'.repeat(24) }],
    actions: [{ type: 'delete', entity: 'job', id: 'f'.repeat(24) }, { type: 'update', entity: 'job' }] });
  expect(result.drafts[0].draft).toMatchObject({ linkedJobId: context.jobs[0].id, linkedCertId: null });
  expect(result.actions).toEqual([]);
});
it('keeps to-do source types within the existing model when the request also contains a webpage', () => {
  const output = modelOutputSchema.parse({ intent: 'act', assistant_message: 'Review.', todo_drafts: [{ title: 'Read course page' }] });
  expect(validateOutput(output, { ...evidence, createdFrom: 'url' }, context).drafts[0].draft).toMatchObject({ title: 'Read course page', createdFrom: 'text' });
});
it('mechanically maps sparse patches, drops invalid/unsafe/unknown fields and reports them', () => {
  const result = validatePatch('job', { deadline: '2026-02-30', job_type: 'internship', status: 'offer', admin: true, 'company.x': 'no', $set: { role: 'evil' }, notes: { $gt: '' } }, evidence, context);
  expect(result.patch).toEqual({ deadline: null, jobType: 'internship', status: 'offer' });
  expect(result.notes).toContain('admin'); expect(result.notes).toContain('$set'); expect(result.notes).toContain('company.x');
  expect(validatePatch('todo', { title: 'a'.repeat(201), due_date: '2026-10-23', priority: 'wrong' }, evidence, context).patch).toEqual({ dueDate: '2026-10-23' });
  expect(validatePatch('certification', { progress_percent: 101, registration_deadline: '2099-01-01' }, evidence, context).patch).toEqual({ registrationDeadline: null });
  const inherited = validatePatch('job', { constructor: 'no', toString: 'no', status: 'applied' }, evidence, context);
  expect(inherited.patch).toEqual({ status: 'applied' }); expect(inherited.notes).toContain('constructor');
});

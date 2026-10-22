import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { modelOutputSchema, filterSchema } from './schema';
import { validateOutput } from './validate';
import { resolveProposals } from './resolve';
import { proposalSchema, aiResponseSchema } from './proposals';
import { fixtureContext, evidence } from './test-fixtures';
import { matchesFilter } from './filter';

function resolve(extra: Record<string, unknown>, count = 1, role: 'admin' | 'demo' = 'admin') {
  const context = fixtureContext(count);
  const output = modelOutputSchema.parse({ intent: 'act', assistant_message: 'Proposed.', ...extra });
  return resolveProposals(validateOutput(output, evidence, context), context, evidence, role);
}
it('detects duplicates by normalized keys and emits camelCase drafts', () => {
  const result = resolve({ job_drafts: [{ company: 'company 0', role: 'ENGINEER', job_type: 'internship' }],
    cert_drafts: [{ name: 'CLOUD', provider: 'academy' }], todo_drafts: [{ title: 'Study' }] });
  expect(result.proposals).toHaveLength(3);
  for (const proposal of result.proposals) {
    expect(proposalSchema.safeParse(proposal).success).toBe(true);
    expect(proposal).toHaveProperty('duplicateOfId');
  }
  expect(result.proposals[0]).toMatchObject({ kind: 'create', entity: 'job', draft: { jobType: 'internship' } });
});
it('resolves sparse updates with before values and discards hallucinated IDs', () => {
  const result = resolve({ actions: [{ type: 'update', entity: 'job', id: fixtureContext().jobs[0].id, patch: { status: 'applied', ignored: true } }, { type: 'delete', entity: 'job', id: 'f'.repeat(24) }] });
  expect(result.proposals).toHaveLength(1);
  expect(result.proposals[0]).toMatchObject({ kind: 'update', before: { status: 'saved' }, patch: { status: 'applied' }, notes: 'Ignored fields: ignored' });
});
it('resolves bulk actions to concrete IDs, caps at 25 and reports no matches', () => {
  const action = { type: 'bulk_update', entity: 'job', filter: { statuses: ['saved'] }, patch: { status: 'applied' } };
  const allowed = resolve({ actions: [action] }, 25);
  expect(allowed.proposals[0]).toHaveProperty('items', expect.arrayContaining([{ id: '1'.padStart(24, '0'), label: 'Company 0, Engineer' }]));
  expect(proposalSchema.safeParse(allowed.proposals[0]).success).toBe(true);
  const denied = resolve({ actions: [action] }, 26);
  expect(denied.proposals).toEqual([]); expect(denied.assistantMessage).toBe('That would change more than 25 items. Please narrow it down.');
  expect(resolve({ actions: [{ ...action, filter: { statuses: ['rejected'] } }] }).assistantMessage).toBe('Nothing matched.');
  expect(resolve({ actions: [{ ...action, filter: null }] }).proposals).toEqual([]);
});
it('applies filters deterministically without treating invalid dates as unbounded matches', () => {
  const row = fixtureContext().todos[0];
  expect(matchesFilter(row, filterSchema.parse({ view: 'overdue', text_contains: 'study' }), evidence.today)).toBe(true);
  for (const filter of [{ view: 'today' }, { tag: 'work' }, { due_after: '2026-10-21' }]) expect(matchesFilter(row, filterSchema.parse(filter), evidence.today)).toBe(false);
  expect(resolve({ actions: [{ type: 'bulk_delete', entity: 'todo', filter: { due_before: 'invalid-date' } }] }).proposals).toEqual([]);
});
it('answers queries entirely from sorted user lists and discards writes for query/chat intents', () => {
  const result = resolve({ intent: 'query', query: { entity: 'job', deadline_before: '2026-10-29', sort: 'name' }, job_drafts: [{ company: 'New', role: 'Role' }] }, 3);
  expect(result.proposals).toEqual([]);
  expect(result.queryResult).toMatchObject({ entity: 'job', items: [{ id: '1'.padStart(24, '0'), label: 'Company 0, Engineer', detail: '25 Oct 2026 (3 days left)' }, expect.anything(), expect.anything()] });
  expect(result.queryResult?.text).toContain('3 matching jobs');
  expect(aiResponseSchema.safeParse({ ...result, remaining: 3 }).success).toBe(true);
  expect(resolve({ intent: 'chat', actions: [{ type: 'undo_last' }] }).proposals).toEqual([]);
});
it('allows admin-only proposal kinds only for admin, keeps undo for demo', () => {
  const actions = [{ type: 'undo_last' }, { type: 'sync_gmail' }, { type: 'update_setting', setting: { key: 'aiDailyLimit', value: 10 } }, { type: 'accept_suggestion', suggestion_id: 'e'.repeat(24) }, { type: 'dismiss_suggestion', suggestion_id: 'f'.repeat(24) }];
  const adminResult = resolve({ actions });
  expect(adminResult.proposals.map(({ kind }) => kind)).toEqual(['undo_last', 'run_sync_gmail', 'setting', 'suggestion']);
  adminResult.proposals.forEach((proposal) => expect(proposalSchema.safeParse(proposal).success).toBe(true));
  expect(resolve({ actions }, 1, 'demo').proposals.map(({ kind }) => kind)).toEqual(['undo_last']);
  expect(resolve({ actions: [{ type: 'update_setting', setting: { key: 'aiDailyLimit', value: 101 } }] }).proposals).toEqual([]);
});
it('resolves delete, append-note and bulk-delete shapes without writing anything', () => {
  const target = fixtureContext().todos[0].id;
  const result = resolve({ actions: [{ type: 'delete', entity: 'todo', id: target }, { type: 'append_note', entity: 'todo', id: target, note_text: 'Prepare CV' }, { type: 'bulk_delete', entity: 'todo', filter: { view: 'overdue' } }] });
  expect(result.proposals.map(({ kind }) => kind)).toEqual(['delete', 'append_note', 'bulk_delete']);
  result.proposals.forEach((proposal) => expect(proposalSchema.safeParse(proposal).success).toBe(true));
});

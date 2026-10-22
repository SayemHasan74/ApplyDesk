import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { confirmableEntries, duplicateUpdate, multipartInput, reviewEntry, toApplyItem } from './ai-client';
import { actionItemSchema } from '../actions/schema';
import type { Proposal } from './ai-contract';

const id = 'a'.repeat(24), proposalId = 'b9f817b5-2907-4534-a7c7-83a34aac28a1';
function item(proposal: Proposal) { return toApplyItem(reviewEntry(proposal)); }
it('converts all supported proposal kinds directly to the Part 7 format', () => {
  const proposals: Proposal[] = [
    { id: proposalId, kind: 'create', entity: 'job', draft: { company: 'C', role: 'R', createdFrom: 'image' } },
    { id: proposalId, kind: 'create', entity: 'certification', draft: { name: 'Cloud', provider: 'Academy' } },
    { id: proposalId, kind: 'create', entity: 'todo', draft: { title: 'Prepare CV' } },
    { id: proposalId, kind: 'update', entity: 'job', targetId: id, label: 'C', before: {}, patch: { deadline: '2026-11-01' } },
    { id: proposalId, kind: 'update', entity: 'certification', targetId: id, label: 'Cloud', before: {}, patch: { progressPercent: 40 } },
    { id: proposalId, kind: 'append_note', entity: 'job', targetId: id, label: 'C', text: 'Follow up' },
    { id: proposalId, kind: 'delete', entity: 'todo', targetId: id, label: 'Task' },
    { id: proposalId, kind: 'setting', key: 'groundingEnabled', before: true, value: false },
    { id: proposalId, kind: 'setting', key: 'aiDailyLimit', before: 18, value: 20 },
    { id: proposalId, kind: 'suggestion', suggestionId: id, decision: 'accept', label: 'Email' },
  ];
  for (const proposal of proposals) expect(actionItemSchema.safeParse(item(proposal)).success).toBe(true);
  expect(item(proposals[0])).toMatchObject({ data: { createdFrom: 'image', company: 'C' } });
  expect(item(proposals[2])).toMatchObject({ data: { dueDate: null, createdFrom: 'text' } });
  expect(item({ id: proposalId, kind: 'undo_last' })).toBeNull(); expect(item({ id: proposalId, kind: 'run_sync_gmail' })).toBeNull();
});
it('uses only checked bulk IDs and disables empty selections', () => {
  for (const kind of ['bulk_delete', 'bulk_update'] as const) {
    const base = { id: proposalId, entity: 'todo' as const, items: [{ id, label: 'A' }, { id: 'b'.repeat(24), label: 'B' }], description: 'Two tasks' };
    const proposal: Proposal = kind === 'bulk_update' ? { ...base, kind, patch: { dueDate: '2026-11-01' } } : { ...base, kind };
    const entry = { ...reviewEntry(proposal), selectedIds: [id, 'f'.repeat(24)] };
    expect(toApplyItem(entry)).toMatchObject({ kind, ids: [id] }); expect(toApplyItem({ ...entry, selectedIds: [] })).toBeNull();
  }
});
it('excludes saved, discarded and edited-invalid proposals from Confirm all', () => {
  const entry = reviewEntry({ id: proposalId, kind: 'create', entity: 'todo', draft: { title: 'Task' } });
  expect(confirmableEntries([entry, { ...entry, saved: true }, { ...entry, discarded: true }, { ...entry, invalid: true }, { ...entry, proposal: { ...entry.proposal, kind: 'create', entity: 'todo', draft: { title: '' } } }])).toHaveLength(1);
});
it('converts duplicate drafts to validated patches without immutable createdFrom', () => {
  const proposal = duplicateUpdate({ id: proposalId, kind: 'create', entity: 'job', duplicateOfId: id, draft: { company: 'C', role: 'R', createdFrom: 'voice' } });
  expect(proposal).toMatchObject({ kind: 'update', targetId: id, patch: { company: 'C', role: 'R' } });
  if (proposal.kind !== 'update') throw new Error('Expected update'); expect(proposal.patch).not.toHaveProperty('createdFrom');
});
it('enforces multipart byte limits including UTF-8 and sends only supplied fields', () => {
  const form = multipartInput('hello'); expect([...form.keys()]).toEqual(['text']);
  expect(() => multipartInput('a', new File([new Uint8Array(3_799_999)], 'image'))).toThrow('Too large');
  expect(() => multipartInput('বাংলা'.repeat(4000))).toThrow(); expect(() => multipartInput('')).toThrow();
  expect(multipartInput('a'.repeat(15000)).get('text')).toHaveLength(15000);
});

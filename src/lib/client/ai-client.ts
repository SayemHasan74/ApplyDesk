import type { Entity } from '../constants';
import { AI_CREATE_SOURCES } from '../constants';
import { z } from 'zod';
import type { ActionItem } from '../actions/schema';
import { jobCreateSchema, jobPatchSchema } from '../validators/job';
import { certCreateSchema, certPatchSchema } from '../validators/certification';
import { todoCreateSchema, todoPatchSchema } from '../validators/todo';
import { settingsPatchSchema } from '../validators/settings';
import { objectId } from '../validators/fields';
import { proposalSchema, type Proposal } from './ai-contract';

export const reviewEntrySchema = z.object({ proposal: proposalSchema, saved: z.boolean(), discarded: z.boolean(), invalid: z.boolean(), editing: z.boolean(), selectedIds: z.array(objectId).max(25), error: z.string().max(4000).optional() }).strict();
export type ReviewEntry = z.infer<typeof reviewEntrySchema>;
export function reviewEntry(proposal: Proposal): ReviewEntry {
  return { proposal, saved: false, discarded: false, invalid: false, editing: false, selectedIds: 'items' in proposal ? proposal.items.map(({ id }) => id) : [] };
}
export function createSchema(entity: Entity) { return entity === 'job' ? jobCreateSchema : entity === 'certification' ? certCreateSchema : todoCreateSchema; }
function patchSchema(entity: Entity) { return entity === 'job' ? jobPatchSchema : entity === 'certification' ? certPatchSchema : todoPatchSchema; }
export function toApplyItem(entry: ReviewEntry): ActionItem | null {
  const p = entry.proposal;
  if (entry.saved || entry.discarded || entry.invalid || p.kind === 'undo_last' || p.kind === 'run_sync_gmail') return null;
  if (p.kind === 'create') {
    const source = z.enum(AI_CREATE_SOURCES).parse(p.draft.createdFrom ?? 'text');
    if (p.entity === 'job') return { kind: 'create', entity: 'job', data: { ...jobCreateSchema.parse(p.draft), createdFrom: source } };
    if (p.entity === 'certification') return { kind: 'create', entity: 'certification', data: { ...certCreateSchema.parse(p.draft), createdFrom: source } };
    return { kind: 'create', entity: 'todo', data: { ...todoCreateSchema.parse(p.draft), createdFrom: z.enum(AI_CREATE_SOURCES).exclude(['url']).parse(source) } };
  }
  if (p.kind === 'update' || p.kind === 'bulk_update') {
    const target = p.kind === 'update' ? { kind: 'update' as const, id: p.targetId } : { kind: 'bulk_update' as const, ids: p.items.filter(({ id }) => entry.selectedIds.includes(id)).map(({ id }) => id) };
    if (target.kind === 'bulk_update' && !target.ids.length) return null;
    if (p.entity === 'job') return { ...target, entity: 'job', patch: jobPatchSchema.parse(p.patch) };
    if (p.entity === 'certification') return { ...target, entity: 'certification', patch: certPatchSchema.parse(p.patch) };
    return { ...target, entity: 'todo', patch: todoPatchSchema.parse(p.patch) };
  }
  if (p.kind === 'delete') return { kind: 'delete', entity: p.entity, id: p.targetId };
  if (p.kind === 'append_note') {
    if (p.entity === 'todo') throw new Error('To-do notes must be proposed as a details update');
    return { kind: 'append_note', entity: p.entity, id: p.targetId, text: z.string().trim().min(1).max(1000).parse(p.text) };
  }
  if (p.kind === 'bulk_delete') {
    const ids = p.items.filter(({ id }) => entry.selectedIds.includes(id)).map(({ id }) => id);
    return ids.length ? { kind: 'bulk_delete', entity: p.entity, ids } : null;
  }
  if (p.kind === 'setting') {
    const values = settingsPatchSchema.parse({ [p.key]: p.value });
    return p.key === 'groundingEnabled' ? { kind: 'setting', key: p.key, value: values.groundingEnabled! } : { kind: 'setting', key: p.key, value: values.aiDailyLimit! };
  }
  return { kind: 'suggestion', id: p.suggestionId, decision: p.decision };
}
export function confirmableEntries(entries: ReviewEntry[]) {
  return entries.flatMap((entry) => { try { const item = toApplyItem(entry); return item ? [{ entry, item }] : []; } catch { return []; } });
}
export function duplicateUpdate(proposal: Extract<Proposal, { kind: 'create' }>): Proposal {
  if (!proposal.duplicateOfId) throw new Error('No existing item was provided');
  const { createdFrom: source, ...fields } = proposal.draft;
  void source;
  const label = String(proposal.draft.company ?? proposal.draft.name ?? proposal.draft.title ?? 'Tracked item');
  return { id: proposal.id, kind: 'update', entity: proposal.entity, targetId: proposal.duplicateOfId, label, before: {}, patch: patchSchema(proposal.entity).parse(fields), notes: 'Review the draft values before updating the existing item.' };
}
export function multipartInput(text: string, image?: File, audio?: File) {
  if (new TextEncoder().encode(text).byteLength + (image?.size ?? 0) + (audio?.size ?? 0) >= 3_800_000) throw new Error('Too large. Use a smaller screenshot or a shorter recording.');
  if (text.length > 15000) throw new Error('Use at most 15,000 characters');
  if (!text.trim() && !image && !audio) throw new Error('Write a message or add an attachment');
  const form = new FormData(); if (text.trim()) form.set('text', text); if (image) form.set('image', image); if (audio) form.set('audio', audio);
  return form;
}

import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Role } from '../constants';
import type { AiContext } from './context';
import { entityRows, matchesFilter, rowLabel } from './filter';
import type { Action } from './schema';
import type { Proposal } from './proposals';
import { validatePatch, type Evidence } from './validate';

function specialAction(action: Action, context: AiContext, role: Role): Proposal | null {
  const id = randomUUID();
  if (action.type === 'undo_last') return { id, kind: 'undo_last' };
  if (role !== 'admin') return null;
  if (action.type === 'sync_gmail') return { id, kind: 'run_sync_gmail' };
  if (action.type === 'update_setting' && action.setting) return { id, kind: 'setting', ...action.setting, before: context.settings[action.setting.key] };
  if (action.type === 'accept_suggestion' || action.type === 'dismiss_suggestion') {
    const suggestion = context.suggestions.find((row) => row.id === action.suggestion_id);
    if (suggestion) return { id, kind: 'suggestion', suggestionId: suggestion.id, decision: action.type === 'accept_suggestion' ? 'accept' : 'dismiss', label: suggestion.subject.slice(0, 400) };
  }
  return null;
}
export function resolveAction(action: Action, context: AiContext, evidence: Evidence, role: Role): { proposal: Proposal | null; message?: string } {
  const special = specialAction(action, context, role);
  if (special) return { proposal: special };
  if (!action.entity) return { proposal: null };
  const entity = action.entity;
  const rows = entityRows(context, entity);
  const id = randomUUID();
  const { patch, notes } = validatePatch(entity, action.patch ?? {}, evidence, context);
  if (action.type === 'bulk_update' || action.type === 'bulk_delete') {
    const matches = rows.filter((row) => matchesFilter(row, action.filter, evidence.today));
    if (matches.length > 25) return { proposal: null, message: 'That would change more than 25 items. Please narrow it down.' };
    if (!matches.length) return { proposal: null, message: 'Nothing matched.' };
    const items = matches.map((row) => ({ id: row.id, label: rowLabel(row) }));
    const description = `${action.type === 'bulk_delete' ? 'Delete' : 'Update'} ${items.length} ${entity} items.${notes ? ` ${notes}` : ''}`;
    if (action.type === 'bulk_delete') return { proposal: { id, kind: 'bulk_delete', entity, items, description } };
    return { proposal: Object.keys(patch).length ? { id, kind: 'bulk_update', entity, items, patch, description } : null };
  }
  const provided = entity === 'job' ? context.lists.jobs : entity === 'certification' ? context.lists.certifications : context.lists.todos;
  if (!provided.some((row) => row.id === action.id)) return { proposal: null };
  const target = rows.find((row) => row.id === action.id);
  if (!target) return { proposal: null };
  const shared = { id, entity, targetId: target.id, label: rowLabel(target) };
  if (action.type === 'delete') return { proposal: { ...shared, kind: 'delete' } };
  if (action.type === 'append_note' && action.note_text?.trim()) {
    if (entity !== 'todo') return { proposal: { ...shared, kind: 'append_note', text: action.note_text } };
    const details = [String((target as Record<string, unknown>).details ?? ''), action.note_text].filter(Boolean).join('\n');
    if (details.length > 4000) return { proposal: null, message: 'To-do details cannot exceed 4000 characters.' };
    return { proposal: { ...shared, kind: 'update', before: { details: (target as Record<string, unknown>).details ?? '' }, patch: { details } } };
  }
  if (action.type !== 'update' || !Object.keys(patch).length) return { proposal: null };
  const before = Object.fromEntries(Object.keys(patch).map((key) => [key, (target as Record<string, unknown>)[key]]));
  return { proposal: { ...shared, kind: 'update', before, patch, ...(notes ? { notes } : {}) } };
}

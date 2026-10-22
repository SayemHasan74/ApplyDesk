import 'server-only';
import { randomUUID } from 'node:crypto';
import type { CurrentUser } from '../auth/policy';
import { getExpiryFor } from '../auth/expiry';
import { rejectUnsafeKeys } from '../api/security';
import { AppError } from '../errors';
import { getSettings, updateSettings } from '../data/users';
import { saveActionLogs, type AuditWrite } from '../data/action-log';
import { actionItemSchema, applyBodySchema, type ActionItem, type ActionResult } from './schema';
import { actionTransaction } from './transaction';
import { createActionState, type ActionState } from './state';
import { actionFailure, isDatabaseError, isTransientTransactionError, ItemDatabaseError, writeAction } from './errors';
import { writeEntity } from './write-entity';
import { writeSuggestion } from './write-suggestion';

async function applyItem(item: ActionItem, state: ActionState, index: number): Promise<AuditWrite[]> {
  if (item.kind !== 'setting' && item.kind !== 'suggestion') return writeEntity(item, state, index);
  if (state.user.role !== 'admin') throw new AppError('FORBIDDEN', 'Administrator access required');
  if (item.kind === 'suggestion') return writeSuggestion(item, state, index);
  const before = await getSettings(state.user.userId, state.session);
  const patch = item.key === 'groundingEnabled' ? { groundingEnabled: item.value } : { aiDailyLimit: item.value };
  const after = await writeAction(index, () => updateSettings(state.user.userId, patch, state.session));
  return [{ seq: 0, entity: 'setting', op: 'setting', docId: state.user.userId,
    before: { ...before, key: item.key }, after: { ...after, key: item.key },
  }];
}
async function runItems(items: unknown[], state: ActionState, failures: Map<number, ActionResult>) {
  const rows: AuditWrite[] = [];
  const results: ActionResult[] = [];
  for (const [index, raw] of items.entries()) {
    const failed = failures.get(index);
    if (failed) { results.push(failed); continue; }
    try {
      rejectUnsafeKeys(raw);
      const item = actionItemSchema.parse(raw);
      const written = await applyItem(item, state, index);
      rows.push(...written.map((row, offset) => ({ ...row, seq: rows.length + offset })));
      const id = item.kind === 'create' ? written[0]?.docId : 'id' in item && item.kind !== 'suggestion' ? item.id : undefined;
      results.push({ index, ok: true, ...(id ? { id } : {}) });
    } catch (error) {
      if (error instanceof ItemDatabaseError || isTransientTransactionError(error)) throw error;
      if (isDatabaseError(error)) throw new ItemDatabaseError(index, error);
      results.push(actionFailure(index, error));
    }
  }
  return { rows, results };
}
export async function applyActions(user: CurrentUser, input: unknown) {
  const { items } = applyBodySchema.parse(input);
  const batchId = randomUUID();
  const expiresAt = await getExpiryFor(user.userId, user.role);
  const failures = new Map<number, ActionResult>();
  for (let attempt = 0; attempt <= items.length; attempt++) {
    try {
      return await actionTransaction(async (session) => {
        const state = await createActionState(user, session, expiresAt);
        const { rows, results } = await runItems(items, state, failures);
        await saveActionLogs(user.userId, batchId, rows, session);
        return { batchId, results };
      });
    } catch (error) {
      // A failed Mongo write aborts its transaction; restart without that failed item.
      if (!(error instanceof ItemDatabaseError)) throw error;
      failures.set(error.index, actionFailure(error.index, error.failure));
    }
  }
  throw new AppError('INTERNAL', 'The action batch could not be completed');
}

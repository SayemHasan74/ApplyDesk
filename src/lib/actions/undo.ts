import 'server-only';
import type { CurrentUser } from '../auth/policy';
import { getExpiryFor } from '../auth/expiry';
import { AppError } from '../errors';
import { getUndoRows, markActionLogsUndone } from '../data/action-log';
import { updateSettings } from '../data/users';
import { actionTransaction } from './transaction';
import { createActionState, type ActionState } from './state';
import { settingSnapshotSchema, undoBodySchema } from './schema';
import { entityStore, snapshotSchema } from './store';

type UndoRow = Awaited<ReturnType<typeof getUndoRows>>['rows'][number];
async function revertRow(state: ActionState, row: UndoRow) {
  const { user, session } = state;
  if (row.entity === 'setting') {
    if (user.role !== 'admin') throw new AppError('FORBIDDEN', 'Administrator access required');
    const before = settingSnapshotSchema.parse(row.before);
    const patch = before.key === 'groundingEnabled' ? { groundingEnabled: before.groundingEnabled } : { aiDailyLimit: before.aiDailyLimit };
    await updateSettings(user.userId, patch, session);
    return true;
  }
  if (row.entity === 'suggestion' && user.role !== 'admin') throw new AppError('FORBIDDEN', 'Administrator access required');
  const model = entityStore(row.entity);
  const filter = { _id: row.docId, userId: user.userId };
  if (row.op === 'create') {
    const deleted = (await model.deleteOne(filter, { session })).deletedCount;
    state.count -= deleted;
    return deleted > 0;
  }
  const before = snapshotSchema.parse(row.before);
  if (before.userId !== user.userId || before._id.toString() !== row.docId) throw new AppError('FORBIDDEN', 'Invalid undo snapshot');
  if (row.op === 'update') {
    const result = await model.replaceOne(filter, before, { session, timestamps: false, runValidators: true });
    return result.matchedCount > 0;
  }
  if (row.op === 'delete') {
    const exists = await model.findOne(filter).select('_id').session(session).lean();
    if (exists) return false;
    if (user.role === 'demo' && state.count >= 150) throw new AppError('RATE_LIMITED', 'Demo limit reached.');
    await model.insertMany([before], { session, ordered: true, timestamps: false });
    state.count++;
    return true;
  }
  throw new AppError('VALIDATION', 'Invalid undo operation');
}
export async function undoActions(user: CurrentUser, input: unknown) {
  const { batchId } = undoBodySchema.parse(input);
  const expiresAt = await getExpiryFor(user.userId, user.role);
  return actionTransaction(async (session) => {
    const state = await createActionState(user, session, expiresAt);
    const batch = await getUndoRows(user.userId, batchId, session);
    let reverted = 0, skipped = 0;
    for (const row of batch.rows) {
      if (await revertRow(state, row)) reverted++;
      else skipped++;
    }
    await markActionLogsUndone(user.userId, batch.rows.map((row) => row._id.toString()), session);
    return { batchId: batch.batchId, reverted, skipped };
  });
}

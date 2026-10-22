import 'server-only';
import type { ClientSession, Model } from 'mongoose';
import { ActionLog, type ActionLogDocument } from '../models/action-logs';
import { objectId } from '../validators/fields';
import { AppError } from '../errors';
import type { ACTION_LOG_ENTITIES, ACTION_OPS } from '../constants';

const logs: Model<ActionLogDocument> = ActionLog;
export type AuditWrite = Pick<ActionLogDocument, 'docId' | 'seq'> & {
  entity: typeof ACTION_LOG_ENTITIES[number]; op: typeof ACTION_OPS[number];
  before: Record<string, unknown> | null; after: Record<string, unknown> | null;
};
export async function saveActionLogs(userId: string, batchId: string, rows: AuditWrite[], session: ClientSession) {
  objectId.parse(userId);
  if (!rows.length) return;
  const expiresAt = new Date(Date.now() + 30 * 86400_000);
  await logs.insertMany(rows.map((row) => ({ ...row, userId, batchId, undone: false, expiresAt })), { session, ordered: true });
}
export async function getUndoRows(userId: string, batchId: string | undefined, session: ClientSession) {
  objectId.parse(userId);
  if (!batchId) {
    const newest = await logs.findOne({ userId, undone: false }).select('batchId -_id').sort({ createdAt: -1, _id: -1 }).session(session).lean();
    batchId = newest?.batchId;
  }
  if (!batchId) throw new AppError('NOT_FOUND', 'Nothing to undo.');
  const rows = await logs.find({ userId, batchId, undone: false }).select('_id batchId seq entity op docId before after').sort({ seq: -1 }).limit(750).session(session).lean();
  if (!rows.length) throw new AppError('NOT_FOUND', 'Nothing to undo.');
  return { batchId, rows };
}
export async function markActionLogsUndone(userId: string, ids: string[], session: ClientSession) {
  await logs.updateMany({ userId, _id: { $in: ids }, undone: false }, { $set: { undone: true } }, { session });
}

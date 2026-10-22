import type { Model } from 'mongoose';
import 'server-only';
import type { AuditWrite } from '../data/action-log';
import { Suggestion, type SuggestionDocument } from '../models/suggestions';
import { AppError } from '../errors';
import { jobCreateSchema, jobPatchSchema } from '../validators/job';
import { snapshotSchema } from './store';
import type { ActionItem } from './schema';
import type { ActionState } from './state';
import { writeEntity } from './write-entity';
import { writeAction } from './errors';

export async function writeSuggestion(item: Extract<ActionItem, { kind: 'suggestion' }>, state: ActionState, index: number): Promise<AuditWrite[]> {
  if (state.user.role !== 'admin') throw new AppError('FORBIDDEN', 'Administrator access required');
  const userId = state.user.userId, filter = { _id: item.id, userId };
  const found = await suggestions.findOne(filter).select(Object.keys(suggestions.schema.paths).join(' ')).session(state.session).lean();
  if (!found) throw new AppError('NOT_FOUND', 'Suggestion not found');
  if (found.state !== 'pending') throw new AppError('CONFLICT', 'Suggestion was already reviewed');
  const before = snapshotSchema.parse(found), rows: AuditWrite[] = [];
  if (item.decision === 'accept') {
    if (found.type === 'status_update') {
      if (!found.jobId) throw new AppError('VALIDATION', 'Suggestion has no linked job');
      const patch = jobPatchSchema.pick({ status: true, interviewAt: true }).required({ status: true }).parse(found.payload);
      rows.push(...await writeEntity({ kind: 'update', entity: 'job', id: found.jobId, patch }, state, index, found.gmailThreadId));
    } else {
      const data = jobCreateSchema.extend({ createdFrom: jobCreateSchema.shape.createdFrom.removeDefault().extract(['email']) }).parse(found.payload);
      rows.push(...await writeEntity({ kind: 'create', entity: 'job', data }, state, index, found.gmailThreadId));
    }
  }
  const after = { ...before, state: item.decision === 'accept' ? 'accepted' : 'dismissed', updatedAt: new Date() };
  await writeAction(index, () => suggestions.updateOne({ ...filter, state: 'pending' }, { $set: { state: after.state, updatedAt: after.updatedAt } }, { session: state.session, timestamps: false }));
  return [...rows, { seq: 0, entity: 'suggestion', op: 'update', docId: item.id, before, after }];
}

const suggestions: Model<SuggestionDocument> = Suggestion;

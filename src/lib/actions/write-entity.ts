import 'server-only';
import { Types } from 'mongoose';
import { todayDhaka } from '../dates';
import { AppError } from '../errors';
import { verifyTodoLinks } from '../data/todos';
import { todoCreateSchema, todoPatchSchema } from '../validators/todo';
import type { AuditWrite } from '../data/action-log';
import type { ActionItem } from './schema';
import type { ActionState } from './state';
import { entityStore, loadSnapshots, validatedSnapshot } from './store';
import { appendNote, prepareCreate, preparePatch } from './prepare';
import { writeAction } from './errors';
import type { JobCreate } from '../validators/job';

type EntityItem = Exclude<ActionItem, { kind: 'setting' | 'suggestion' }> | { kind: 'create'; entity: 'job'; data: JobCreate };
async function createEntity(item: Extract<EntityItem, { kind: 'create' }>, state: ActionState, index: number, gmailThreadId?: string): Promise<AuditWrite[]> {
  if (state.user.role === 'demo' && state.count >= 150) throw new AppError('RATE_LIMITED', 'Demo limit reached.');
  const now = new Date();
  const fields = prepareCreate(item.entity, item.data, todayDhaka(), now);
  if (item.entity === 'todo') await verifyTodoLinks(state.user.userId, todoCreateSchema.parse(item.data), state.session);
  const after = await validatedSnapshot(item.entity, { ...fields, ...(item.entity === 'job' && gmailThreadId ? { gmailThreadIds: [gmailThreadId] } : {}), _id: new Types.ObjectId(), userId: state.user.userId,
    createdAt: now, updatedAt: now, __v: 0, ...(state.expiresAt ? { expiresAt: state.expiresAt } : {}),
  });
  await writeAction(index, () => entityStore(item.entity).bulkWrite([{ insertOne: { document: after } }], { session: state.session, ordered: true, timestamps: false }));
  state.count++;
  return [{ seq: 0, entity: item.entity, op: 'create', docId: after._id.toString(), before: null, after }];
}
async function modifyEntity(item: Exclude<EntityItem, { kind: 'create' }>, state: ActionState, index: number, gmailThreadId?: string): Promise<AuditWrite[]> {
  const ids = 'ids' in item ? item.ids : [item.id];
  const before = await loadSnapshots(state.user.userId, item.entity, ids, state.session);
  const deleting = item.kind === 'delete' || item.kind === 'bulk_delete';
  if (deleting) {
    await writeAction(index, () => entityStore(item.entity).deleteMany({ _id: { $in: ids }, userId: state.user.userId }, { session: state.session }));
    state.count -= before.length;
    return before.map((snapshot) => ({ seq: 0, entity: item.entity, op: 'delete', docId: snapshot._id.toString(), before: snapshot, after: null }));
  }
  const patch = item.kind === 'append_note' ? { notes: appendNote(String(before[0].notes ?? ''), item.text) } : item.patch;
  if (item.entity === 'todo') await verifyTodoLinks(state.user.userId, todoPatchSchema.parse(patch), state.session);
  const now = new Date();
  const prepared = before.map((snapshot) => ({ before: snapshot, changes: { ...preparePatch(item.entity, snapshot, patch, todayDhaka(), now), ...(item.entity === 'job' && gmailThreadId ? { gmailThreadIds: [...new Set([...(Array.isArray(snapshot.gmailThreadIds) ? snapshot.gmailThreadIds : []), gmailThreadId])] } : {}) } }))
    .filter(({ changes }) => Object.keys(changes).length > 0);
  const rows = await Promise.all(prepared.map(async ({ before: snapshot, changes }) => ({
    before: snapshot, after: await validatedSnapshot(item.entity, { ...snapshot, ...changes, updatedAt: now }), changes,
  })));
  if (!rows.length) return [];
  const operations = rows.map(({ before: snapshot, changes }) => ({ updateOne: { filter: { _id: snapshot._id, userId: state.user.userId }, update: { $set: { ...changes, updatedAt: now } }, timestamps: false } }));
  await writeAction(index, () => entityStore(item.entity).bulkWrite(operations, { session: state.session, ordered: true, timestamps: false }));
  return rows.map(({ before: snapshot, after }) => ({ seq: 0, entity: item.entity, op: 'update', docId: snapshot._id.toString(), before: snapshot, after }));
}
export async function writeEntity(item: EntityItem, state: ActionState, index: number, gmailThreadId?: string) {
  return item.kind === 'create' ? createEntity(item, state, index, gmailThreadId) : modifyEntity(item, state, index, gmailThreadId);
}

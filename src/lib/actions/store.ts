import 'server-only';
import { z } from 'zod';
import { Types, type ClientSession, type Model } from 'mongoose';
import type { Entity } from '../constants';
import { Job } from '../models/jobs';
import { Certification } from '../models/certifications';
import { Todo } from '../models/todos';
import { objectId } from '../validators/fields';
import { AppError } from '../errors';

export const snapshotSchema = z.object({ _id: z.instanceof(Types.ObjectId), userId: objectId, createdAt: z.date(), updatedAt: z.date() }).passthrough();
export type Snapshot = z.infer<typeof snapshotSchema>;
export function entityStore(entity: Entity) {
  const model = entity === 'job' ? Job : entity === 'certification' ? Certification : Todo;
  return model as unknown as Model<Snapshot>;
}
export async function loadSnapshots(userId: string, entity: Entity, ids: string[], session: ClientSession) {
  const model = entityStore(entity);
  const fields = Object.keys(model.schema.paths).filter((key) => !key.includes('.$')).join(' ');
  const rows = await model.find({ _id: { $in: ids }, userId }).select(fields).limit(25).session(session).lean();
  if (rows.length !== ids.length) throw new AppError('NOT_FOUND', 'One or more items were not found');
  const indexed = new Map(rows.map((row) => [row._id.toString(), snapshotSchema.parse(row)]));
  return ids.map((id) => indexed.get(id)!);
}
export async function validatedSnapshot(entity: Entity, fields: Record<string, unknown>) {
  const document = new (entityStore(entity))(fields);
  await document.validate();
  return snapshotSchema.parse(document.toObject({ flattenMaps: true, minimize: false }));
}

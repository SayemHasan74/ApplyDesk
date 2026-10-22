import 'server-only';
import type { Model } from 'mongoose';
import { connectDb } from '../db';
import { MAX_LIST } from '../constants';
import { todayDhaka } from '../dates';
import { AppError } from '../errors';
import { Certification, type CertificationDocument } from '../models/certifications';
import { certCreateSchema, certPatchSchema, type CertCreate, type CertPatch } from '../validators/certification';
import { objectId } from '../validators/fields';
import { certItemSchema } from '../certifications/items';
import { prepareCertCreate, prepareCertPatch } from '../certifications/writes';
import { scopedFilter } from './scope';
import { displayDocument } from '../serialize';

const model = Certification as Model<CertificationDocument>;
const fields = [...Object.keys(certCreateSchema.shape), 'createdAt', 'updatedAt'];
const projection = [...fields, '_id'].join(' ');
const serialize = (value: Record<string, unknown>) => certItemSchema.parse(displayDocument(value, fields));
function writeError(error: unknown): never {
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
    throw new AppError('CONFLICT', 'You already track this certification from this provider.');
  }
  throw error;
}

export async function listCerts(userId: string) {
  await connectDb();
  return (await model.find(scopedFilter(userId, {})).select(projection).sort({ createdAt: -1 }).limit(MAX_LIST).lean()).map(serialize);
}
export async function getCert(userId: string, id: string) {
  objectId.parse(id);
  await connectDb();
  const item = await model.findOne(scopedFilter(userId, { _id: id })).select(projection).lean();
  if (!item) throw new AppError('NOT_FOUND', 'Certification not found');
  return serialize(item);
}
export async function createCert(userId: string, input: CertCreate, expiresAt?: Date | null) {
  const values = certCreateSchema.parse(input);
  await connectDb();
  try {
    const item = await model.create({ ...prepareCertCreate(values, todayDhaka()), userId, ...(expiresAt ? { expiresAt } : {}),
    });
    return serialize(item.toObject());
  } catch (error) { return writeError(error); }
}
export async function updateCert(userId: string, id: string, patch: CertPatch) {
  const values = certPatchSchema.parse(patch);
  const current = await getCert(userId, id);
  const changes = prepareCertPatch(current, values, todayDhaka());
  if (!Object.keys(changes).length) return current;
  try {
    const item = await model.findOneAndUpdate(scopedFilter(userId, { _id: id }), { $set: changes }, { returnDocument: 'after', runValidators: true }).select(projection).lean();
    if (!item) throw new AppError('NOT_FOUND', 'Certification not found');
    return serialize(item);
  } catch (error) { return writeError(error); }
}
export async function deleteCert(userId: string, id: string) {
  objectId.parse(id);
  await connectDb();
  const result = await model.deleteOne(scopedFilter(userId, { _id: id }));
  if (!result.deletedCount) throw new AppError('NOT_FOUND', 'Certification not found');
  return { id };
}

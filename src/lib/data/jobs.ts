import 'server-only';
import { Types, type Model } from 'mongoose';
import { connectDb } from '../db';
import { MAX_LIST } from '../constants';
import { todayDhaka } from '../dates';
import { jobDedupeKey } from '../dedupe';
import { AppError } from '../errors';
import { Job, type JobDocument } from '../models/jobs';
import { jobCreateSchema, jobIdSchema, jobPatchSchema, type JobCreate, type JobPatch } from '../validators/job';
import { jobItemSchema } from '../jobs/items';
import { scopedFilter } from './scope';

const model = Job as Model<JobDocument>;
const fields = [...Object.keys(jobCreateSchema.shape), '_id', 'createdAt', 'updatedAt'].join(' ');

function serialize(value: Record<string, unknown>) {
  const editable = Object.fromEntries(Object.keys(jobCreateSchema.shape).map((key) => [key, value[key]]));
  return jobItemSchema.parse({ ...editable,
    id: value._id instanceof Types.ObjectId ? value._id.toHexString() : undefined,
    createdAt: value.createdAt instanceof Date ? value.createdAt.toISOString() : value.createdAt,
    updatedAt: value.updatedAt instanceof Date ? value.updatedAt.toISOString() : value.updatedAt,
  });
}

function writeError(error: unknown): never {
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
    throw new AppError('CONFLICT', 'You already track this role at this company.');
  }
  throw error;
}

export async function listJobs(userId: string) {
  await connectDb();
  const jobs = await model.find(scopedFilter(userId, {})).select(fields).sort({ createdAt: -1 }).limit(MAX_LIST).lean();
  return jobs.map(serialize);
}

export async function getJob(userId: string, id: string) {
  jobIdSchema.parse(id);
  await connectDb();
  const job = await model.findOne(scopedFilter(userId, { _id: id })).select(fields).lean();
  if (!job) throw new AppError('NOT_FOUND', 'Job not found');
  return serialize(job);
}

export async function createJob(userId: string, input: JobCreate, expiresAt?: Date | null) {
  const values = jobCreateSchema.parse(input);
  await connectDb();
  try {
    const job = await model.create({ ...values, userId, dedupeKey: jobDedupeKey(values.company, values.role),
      ...(expiresAt ? { expiresAt } : {}),
      appliedAt: values.status === 'applied' && !values.appliedAt ? todayDhaka() : values.appliedAt,
    });
    return serialize(job.toObject());
  } catch (error) { return writeError(error); }
}

export async function updateJob(userId: string, id: string, patch: JobPatch) {
  const values = jobPatchSchema.parse(patch);
  const current = await getJob(userId, id);
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(jobPatchSchema.shape) as (keyof JobPatch)[]) {
    if (values[key] !== undefined) changes[key] = values[key];
  }
  if (values.company !== undefined || values.role !== undefined) {
    changes.dedupeKey = jobDedupeKey(values.company ?? current.company, values.role ?? current.role);
  }
  if (values.status === 'applied' && !(values.appliedAt === undefined ? current.appliedAt : values.appliedAt)) changes.appliedAt = todayDhaka();
  if (!Object.keys(changes).length) return current;
  try {
    const job = await model.findOneAndUpdate(scopedFilter(userId, { _id: id }), { $set: changes }, { new: true, runValidators: true }).select(fields).lean();
    if (!job) throw new AppError('NOT_FOUND', 'Job not found');
    return serialize(job);
  } catch (error) { return writeError(error); }
}

export async function deleteJob(userId: string, id: string) {
  jobIdSchema.parse(id);
  await connectDb();
  const result = await model.deleteOne(scopedFilter(userId, { _id: id }));
  if (!result.deletedCount) throw new AppError('NOT_FOUND', 'Job not found');
  return { id };
}

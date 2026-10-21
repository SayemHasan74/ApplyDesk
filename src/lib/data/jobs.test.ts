import { beforeEach, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ connect: vi.fn(), find: vi.fn(), findOne: vi.fn(), update: vi.fn(), remove: vi.fn(), create: vi.fn(), select: vi.fn(), sort: vi.fn(), limit: vi.fn(), lean: vi.fn() }));
vi.mock('../db', () => ({ connectDb: mocks.connect }));
vi.mock('../models/jobs', () => ({ Job: { find: mocks.find, findOne: mocks.findOne, findOneAndUpdate: mocks.update, deleteOne: mocks.remove, create: mocks.create } }));
import { listJobs, getJob, createJob, updateJob, deleteJob } from './jobs';
import { jobCreateSchema } from '../validators/job';
import { todayDhaka } from '../dates';

const userId = '0123456789abcdef01234567';
const id = '0123456789abcdef01234568';
const document = () => ({ ...jobCreateSchema.parse({ company: 'Company', role: 'Engineer' }), _id: new Types.ObjectId(id), userId, dedupeKey: 'company|engineer', createdAt: new Date('2026-10-21T00:00:00Z'), updatedAt: new Date('2026-10-21T00:00:00Z') });
beforeEach(() => {
  vi.resetAllMocks();
  const chain = { select: mocks.select, sort: mocks.sort, limit: mocks.limit, lean: mocks.lean };
  for (const method of [mocks.find, mocks.findOne, mocks.update, mocks.select, mocks.sort, mocks.limit]) method.mockReturnValue(chain);
  mocks.lean.mockResolvedValue(document());
  mocks.remove.mockResolvedValue({ deletedCount: 1 });
});
it('scopes list and detail reads, caps and projects lists, and serializes plain display fields', async () => {
  mocks.lean.mockResolvedValueOnce([document()]);
  const items = await listJobs(userId);
  expect(mocks.find).toHaveBeenCalledWith({ userId });
  expect(mocks.sort).toHaveBeenCalledWith({ createdAt: -1 });
  expect(mocks.limit).toHaveBeenCalledWith(500);
  expect(mocks.select).toHaveBeenCalledWith(expect.stringContaining('company'));
  expect(items[0]).toMatchObject({ id, createdAt: '2026-10-21T00:00:00.000Z' });
  for (const key of ['_id', 'userId', 'daysLeft', 'badge', 'dedupeKey']) expect(items[0]).not.toHaveProperty(key);
  await getJob(userId, id);
  expect(mocks.findOne).toHaveBeenCalledWith({ _id: id, userId });
});
it('creates scoped documents with computed dedupe keys and the exact demo expiration', async () => {
  mocks.create.mockResolvedValue({ toObject: document });
  const expiresAt = new Date('2026-10-22');
  await createJob(userId, jobCreateSchema.parse({ company: 'Company', role: 'Engineer' }), expiresAt);
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ userId, dedupeKey: 'company|engineer', expiresAt }));
});
it('keeps sparse patches sparse, sets appliedAt once and scopes every update filter', async () => {
  await updateJob(userId, id, { status: 'applied' });
  expect(mocks.update).toHaveBeenCalledWith({ _id: id, userId }, { $set: { status: 'applied', appliedAt: todayDhaka() } }, { new: true, runValidators: true });
  mocks.update.mockClear();
  mocks.lean.mockResolvedValueOnce({ ...document(), appliedAt: '2026-01-01' }).mockResolvedValueOnce(document());
  await updateJob(userId, id, { status: 'applied' });
  expect(mocks.update).toHaveBeenCalledWith({ _id: id, userId }, { $set: { status: 'applied' } }, { new: true, runValidators: true });
});
it('recomputes the dedupe key when either identity field changes and scopes deletes', async () => {
  await updateJob(userId, id, { company: 'New Company' });
  expect(mocks.update).toHaveBeenCalledWith({ _id: id, userId }, { $set: { company: 'New Company', dedupeKey: 'new company|engineer' } }, { new: true, runValidators: true });
  await deleteJob(userId, id);
  expect(mocks.remove).toHaveBeenCalledWith({ _id: id, userId });
});
it('maps duplicate writes to CONFLICT and absent or cross-tenant documents to NOT_FOUND', async () => {
  mocks.create.mockRejectedValueOnce({ code: 11000 });
  await expect(createJob(userId, jobCreateSchema.parse({ company: 'C', role: 'R' }))).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
  mocks.lean.mockResolvedValueOnce(null);
  await expect(getJob('other-tenant', id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  expect(mocks.findOne).toHaveBeenLastCalledWith({ _id: id, userId: 'other-tenant' });
  mocks.remove.mockResolvedValueOnce({ deletedCount: 0 });
  await expect(deleteJob(userId, id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
});

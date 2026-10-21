import { beforeEach, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ find: vi.fn(), findOne: vi.fn(), update: vi.fn(), remove: vi.fn(), create: vi.fn(), select: vi.fn(), sort: vi.fn(), limit: vi.fn(), lean: vi.fn() }));
vi.mock('../db', () => ({ connectDb: vi.fn() }));
vi.mock('../models/certifications', () => ({ Certification: { find: mocks.find, findOne: mocks.findOne, findOneAndUpdate: mocks.update, deleteOne: mocks.remove, create: mocks.create } }));
import { listCerts, getCert, createCert, updateCert, deleteCert } from './certifications';
import { certCreateSchema } from '../validators/certification';
import { todayDhaka } from '../dates';
import { certDedupeKey } from '../dedupe';

const userId = '0123456789abcdef01234567';
const id = '0123456789abcdef01234568';
const document = () => ({ ...certCreateSchema.parse({ name: 'Cloud', provider: 'Academy', progressPercent: 20 }), _id: new Types.ObjectId(id), userId, dedupeKey: 'academy|cloud', createdAt: new Date(), updatedAt: new Date() });
beforeEach(() => {
  vi.resetAllMocks();
  const chain = { select: mocks.select, sort: mocks.sort, limit: mocks.limit, lean: mocks.lean };
  for (const method of [mocks.find, mocks.findOne, mocks.update, mocks.select, mocks.sort, mocks.limit]) method.mockReturnValue(chain);
  mocks.lean.mockResolvedValue(document()); mocks.create.mockResolvedValue({ toObject: document }); mocks.remove.mockResolvedValue({ deletedCount: 1 });
});
it('scopes and caps list/detail reads and omits internal storage metadata', async () => {
  mocks.lean.mockResolvedValueOnce([document()]);
  const [item] = await listCerts(userId);
  expect(mocks.find).toHaveBeenCalledWith({ userId }); expect(mocks.limit).toHaveBeenCalledWith(500);
  expect(mocks.select).toHaveBeenCalledWith(expect.stringContaining('progressPercent')); expect(mocks.sort).toHaveBeenCalledWith({ createdAt: -1 });
  expect(item.id).toBe(id); expect(item).not.toHaveProperty('userId'); expect(item).not.toHaveProperty('dedupeKey');
  await getCert(userId, id); expect(mocks.findOne).toHaveBeenCalledWith({ _id: id, userId });
});
it('includes tenant and exact demo expiry when creating and computes dedupe', async () => {
  const expiresAt = new Date('2026-10-22T00:00:00Z');
  await createCert(userId, certCreateSchema.parse({ name: 'Cloud', provider: 'Academy' }), expiresAt);
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ userId, expiresAt, dedupeKey: 'academy|cloud' }));
});
it('applies completion effects without resetting unrelated fields and recomputes identity', async () => {
  await updateCert(userId, id, { status: 'completed' });
  expect(mocks.update).toHaveBeenCalledWith({ _id: id, userId }, { $set: { status: 'completed', completedAt: todayDhaka(), progressPercent: 100 } }, { returnDocument: 'after', runValidators: true });
  await updateCert(userId, id, { name: 'New' });
  expect(mocks.update).toHaveBeenLastCalledWith({ _id: id, userId }, { $set: { name: 'New', dedupeKey: certDedupeKey('Academy', 'New') } }, expect.anything());
});
it('scopes deletion, maps duplicate writes and returns not-found for missing records', async () => {
  await deleteCert(userId, id); expect(mocks.remove).toHaveBeenCalledWith({ _id: id, userId });
  mocks.create.mockRejectedValueOnce({ code: 11000 });
  await expect(createCert(userId, certCreateSchema.parse({ name: 'Cloud', provider: 'Academy' }))).rejects.toMatchObject({ code: 'CONFLICT' });
  mocks.update.mockImplementationOnce(() => { throw { code: 11000 }; });
  await expect(updateCert(userId, id, { name: 'Taken' })).rejects.toMatchObject({ code: 'CONFLICT' });
  mocks.lean.mockResolvedValueOnce(null);
  await expect(updateCert(userId, id, { notes: 'x' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
});

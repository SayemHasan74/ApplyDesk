import { beforeEach, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ find: vi.fn(), findOne: vi.fn(), update: vi.fn(), remove: vi.fn(), clear: vi.fn(), create: vi.fn(), select: vi.fn(), sort: vi.fn(), limit: vi.fn(), lean: vi.fn(), job: vi.fn(), cert: vi.fn(), linkLean: vi.fn() }));
vi.mock('../db', () => ({ connectDb: vi.fn() }));
vi.mock('../models/todos', () => ({ Todo: { find: mocks.find, findOne: mocks.findOne, findOneAndUpdate: mocks.update, deleteOne: mocks.remove, deleteMany: mocks.clear, create: mocks.create } }));
vi.mock('../models/jobs', () => ({ Job: { findOne: mocks.job } }));
vi.mock('../models/certifications', () => ({ Certification: { findOne: mocks.cert } }));
import { listTodos, createTodo, updateTodo, deleteTodo, deleteDoneTodos } from './todos';
import { todoCreateSchema } from '../validators/todo';

const userId = '0123456789abcdef01234567';
const id = '0123456789abcdef01234568';
const document = () => ({ ...todoCreateSchema.parse({ title: 'Task' }), completedAt: null, _id: new Types.ObjectId(id), userId, createdAt: new Date(), updatedAt: new Date() });
beforeEach(() => {
  vi.resetAllMocks();
  const chain = { select: mocks.select, sort: mocks.sort, limit: mocks.limit, lean: mocks.lean };
  for (const method of [mocks.find, mocks.findOne, mocks.update, mocks.select, mocks.sort, mocks.limit]) method.mockReturnValue(chain);
  const link = { select: vi.fn().mockReturnThis(), lean: mocks.linkLean };
  mocks.job.mockReturnValue(link); mocks.cert.mockReturnValue(link); mocks.linkLean.mockResolvedValue({ _id: id });
  mocks.lean.mockResolvedValue(document()); mocks.create.mockResolvedValue({ toObject: document });
  mocks.remove.mockResolvedValue({ deletedCount: 1 }); mocks.clear.mockResolvedValue({ deletedCount: 3 });
});
it('caps and scopes list, creation, deletion, and bulk clear', async () => {
  mocks.lean.mockResolvedValueOnce([document()]);
  expect((await listTodos(userId))[0].id).toBe(id);
  expect(mocks.find).toHaveBeenCalledWith({ userId }); expect(mocks.limit).toHaveBeenCalledWith(500);
  expect(mocks.select).toHaveBeenCalledWith(expect.stringContaining('completedAt'));
  const expiresAt = new Date('2026-10-22T00:00:00Z');
  await createTodo(userId, todoCreateSchema.parse({ title: 'Task' }), expiresAt);
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ userId, expiresAt, dueDate: null }));
  await deleteTodo(userId, id); expect(mocks.remove).toHaveBeenCalledWith({ _id: id, userId });
  expect(await deleteDoneTodos(userId)).toEqual({ count: 3 }); expect(mocks.clear).toHaveBeenCalledWith({ userId, status: 'done' });
});
it('sets and clears completion timestamps on tenant-scoped updates', async () => {
  await updateTodo(userId, id, { status: 'done' });
  expect(mocks.findOne).toHaveBeenCalledWith({ _id: id, userId });
  expect(mocks.update).toHaveBeenCalledWith({ _id: id, userId }, { $set: { status: 'done', completedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) } }, { returnDocument: 'after', runValidators: true });
  mocks.lean.mockResolvedValueOnce({ ...document(), status: 'done', completedAt: new Date() });
  await updateTodo(userId, id, { status: 'todo' });
  expect(mocks.update).toHaveBeenLastCalledWith({ _id: id, userId }, { $set: { status: 'todo', completedAt: null } }, expect.anything());
});
it('verifies each linked resource against the same tenant before any write', async () => {
  await createTodo(userId, todoCreateSchema.parse({ title: 'Task', linkedJobId: id, linkedCertId: id }));
  expect(mocks.job).toHaveBeenCalledWith({ _id: id, userId }); expect(mocks.cert).toHaveBeenCalledWith({ _id: id, userId });
  mocks.linkLean.mockResolvedValueOnce(null);
  await expect(updateTodo(userId, id, { linkedCertId: id })).rejects.toMatchObject({ code: 'VALIDATION' });
  expect(mocks.update).not.toHaveBeenCalled();
  mocks.linkLean.mockResolvedValueOnce(null);
  await expect(createTodo(userId, todoCreateSchema.parse({ title: 'Task', linkedJobId: id }))).rejects.toMatchObject({ code: 'VALIDATION' });
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
it('skips linked lookups for unrelated sparse patches and handles missing records', async () => {
  await updateTodo(userId, id, { title: 'Edited' });
  expect(mocks.job).not.toHaveBeenCalled(); expect(mocks.cert).not.toHaveBeenCalled();
  expect(mocks.update).toHaveBeenCalledWith({ _id: id, userId }, { $set: { title: 'Edited' } }, expect.anything());
  mocks.lean.mockResolvedValueOnce(null);
  await expect(updateTodo(userId, id, { title: 'Missing' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
});

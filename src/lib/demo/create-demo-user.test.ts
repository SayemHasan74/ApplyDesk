import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Job } from '../models/jobs';
import { Certification } from '../models/certifications';
import { Todo } from '../models/todos';
import { Types } from 'mongoose';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ increment: vi.fn(), connectDb: vi.fn(), create: vi.fn(), deleteUser: vi.fn() }));
vi.mock('../models/users', () => ({ User: { create: mocks.create, deleteOne: mocks.deleteUser } }));
vi.mock('../counters', () => ({ incrementIfBelow: mocks.increment }));
vi.mock('../db', () => ({ connectDb: mocks.connectDb }));
import { createDemoUser } from './create-demo-user';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-21T19:05:00Z')); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.clearAllMocks(); });
it('does not insert a user or seed documents after the rate limit is reached', async () => {
  mocks.increment.mockResolvedValue(false);
  expect(await createDemoUser()).toBeNull();
  expect(mocks.increment).toHaveBeenCalledWith('demo-create:2026-10-22-01', 20, 3600);
  expect(mocks.create).not.toHaveBeenCalled();
});
it('seeds exactly once per collection with isolated user ids and a shared 24-hour expiry', async () => {
  mocks.increment.mockResolvedValue(true);
  const user = { _id: new Types.ObjectId() };
  mocks.create.mockResolvedValue(user);
  const jobs = vi.spyOn(Job, 'insertMany').mockImplementation(async () => []);
  const certs = vi.spyOn(Certification, 'insertMany').mockImplementation(async () => []);
  const todos = vi.spyOn(Todo, 'insertMany').mockImplementation(async () => []);
  expect(await createDemoUser()).toBe(user);
  expect(mocks.create).toHaveBeenCalledWith({ role: 'demo', name: 'Demo visitor', expiresAt: new Date(Date.now() + 24 * 3_600_000) });
  for (const [insert, count] of [[jobs, 8], [certs, 5], [todos, 8]] as const) {
    expect(insert).toHaveBeenCalledTimes(1);
    const [items] = insert.mock.calls[0];
    expect(items).toHaveLength(count);
    expect(items).toEqual(Array.from({ length: count }, () => expect.objectContaining({ userId: user._id.toHexString(), expiresAt: new Date(Date.now() + 24 * 3_600_000) })));
  }
});
it('cleans up failed seeds using the new tenant id and propagates the failure', async () => {
  mocks.increment.mockResolvedValue(true);
  const user = { _id: new Types.ObjectId() };
  mocks.create.mockResolvedValue(user);
  const error = new Error('Seed write failed');
  vi.spyOn(Job, 'insertMany').mockRejectedValueOnce(error);
  vi.spyOn(Certification, 'insertMany').mockImplementation(async () => []);
  vi.spyOn(Todo, 'insertMany').mockImplementation(async () => []);
  const jobs = vi.spyOn(Job, 'deleteMany').mockResolvedValue({ acknowledged: true, deletedCount: 0 });
  const certs = vi.spyOn(Certification, 'deleteMany').mockResolvedValue({ acknowledged: true, deletedCount: 5 });
  const todos = vi.spyOn(Todo, 'deleteMany').mockResolvedValue({ acknowledged: true, deletedCount: 8 });
  await expect(createDemoUser()).rejects.toBe(error);
  for (const cleanup of [jobs, certs, todos]) expect(cleanup).toHaveBeenCalledWith({ userId: user._id.toHexString() });
  expect(mocks.deleteUser).toHaveBeenCalledWith({ _id: user._id });
});

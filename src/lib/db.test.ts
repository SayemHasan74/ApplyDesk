import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock('mongoose', () => ({ default: { connect: mocks.connect } }));
vi.mock('./env', () => ({ getEnv: () => ({ MONGODB_URI: 'mongodb://localhost/test' }) }));
import { connectDb } from './db';

beforeEach(() => { globalThis.applyDeskDb = undefined; mocks.connect.mockReset(); });
it('shares concurrent connections and then reuses the connected instance', async () => {
  const connection = { connected: true };
  mocks.connect.mockResolvedValue(connection);
  expect(await Promise.all([connectDb(), connectDb()])).toEqual([connection, connection]);
  expect(await connectDb()).toBe(connection);
  expect(mocks.connect).toHaveBeenCalledTimes(1);
  expect(mocks.connect).toHaveBeenCalledWith('mongodb://localhost/test', { maxPoolSize: 5, serverSelectionTimeoutMS: 5000, bufferCommands: false, autoIndex: false });
});
it('clears a rejected promise and retries on the next call', async () => {
  mocks.connect.mockRejectedValueOnce(new Error('Connection refused')).mockResolvedValueOnce({ connected: true });
  await expect(connectDb()).rejects.toThrow('Connection refused');
  expect(globalThis.applyDeskDb).toEqual({ conn: null, promise: null });
  await expect(connectDb()).resolves.toEqual({ connected: true });
  expect(mocks.connect).toHaveBeenCalledTimes(2);
});

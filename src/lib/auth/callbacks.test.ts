import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ connectDb: vi.fn(), update: vi.fn() }));
vi.mock('../db', () => ({ connectDb: mocks.connectDb }));
vi.mock('../env', () => ({ getEnv: () => ({ ALLOWED_EMAIL: 'owner@example.com' }) }));
vi.mock('../models/users', () => ({ User: { findOneAndUpdate: mocks.update } }));
import { jwtCallback, signInCallback } from './callbacks';

const userId = '0123456789abcdef01234567';
const google = { provider: 'google', providerAccountId: 'google-id', type: 'oidc' as const };
const demo = { provider: 'demo', providerAccountId: userId, type: 'credentials' as const };
const profile = { email: 'OWNER@EXAMPLE.COM', email_verified: true };
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

it('allows only the verified owner and a demo created by Credentials', async () => {
  expect(await signInCallback({ user: { id: 'google-id' }, account: google, profile })).toBe(true);
  expect(await signInCallback({ user: { id: 'google-id' }, account: google, profile: { email: 'other@example.com', email_verified: true } })).toBe(false);
  expect(await signInCallback({ user: { id: userId, role: 'demo' }, account: demo })).toBe(true);
  expect(await signInCallback({ user: { id: userId, role: 'admin' }, account: demo })).toBe(false);
});
it('upserts the admin only during the initial Google sign-in', async () => {
  mocks.update.mockResolvedValue({ _id: new Types.ObjectId(userId), role: 'admin' });
  const token = await jwtCallback({ token: {}, user: { id: 'google-id', name: 'Owner' }, account: google, profile, trigger: 'signIn' });
  expect(token).toMatchObject({ userId, role: 'admin' });
  expect(mocks.update).toHaveBeenCalledWith({ email: 'owner@example.com' }, {
    $setOnInsert: { role: 'admin', email: 'owner@example.com', name: 'Owner' },
  }, { upsert: true, new: true });
  const laterToken = { userId, role: 'admin' as const, other: 'unchanged' };
  expect(await jwtCallback({ token: laterToken })).toBe(laterToken);
  expect(mocks.connectDb).toHaveBeenCalledTimes(1);
  expect(mocks.update).toHaveBeenCalledTimes(1);
});
it('sets a 23-hour demo deadline once and never extends it on later calls', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  const token = { userId, role: 'demo' as const };
  const first = await jwtCallback({ token, user: { id: userId, role: 'demo' }, account: demo, trigger: 'signIn' });
  expect(first).toMatchObject({ userId, role: 'demo', demoExpiresAt: Date.now() + 23 * 3_600_000 });
  vi.advanceTimersByTime(3_600_000);
  expect(await jwtCallback({ token })).toBe(first);
  expect(mocks.connectDb).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
it('ignores client session updates and refuses initial sign-in role escalation', async () => {
  const token = { userId, role: 'demo' as const, demoExpiresAt: 1 };
  expect(await jwtCallback({ token, trigger: 'update', session: { role: 'admin', demoExpiresAt: Number.MAX_SAFE_INTEGER } })).toBe(token);
  await expect(jwtCallback({ token: {}, user: { id: userId, role: 'admin' }, account: demo })).rejects.toThrow('Account is not allowed');
  await expect(jwtCallback({ token: {}, user: { id: 'google-id' }, account: google, profile: { email: 'wrong@example.com', email_verified: true } })).rejects.toThrow('Account is not allowed');
  expect(mocks.connectDb).not.toHaveBeenCalled();
});

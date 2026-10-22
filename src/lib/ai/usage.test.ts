import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ increment: vi.fn(), count: vi.fn(), settings: vi.fn(), find: vi.fn(), update: vi.fn(), lean: vi.fn() }));
vi.mock('../counters', () => ({ incrementIfBelow: mocks.increment, getCount: mocks.count }));
vi.mock('../data/users', () => ({ getSettings: mocks.settings }));
vi.mock('../models/users', () => ({ User: { findOne: mocks.find, findOneAndUpdate: mocks.update } }));
vi.mock('../db', () => ({ connectDb: vi.fn() }));
vi.mock('../env', () => ({ getEnv: () => ({ DEMO_AI_DAILY_LIMIT: 6 }) }));
vi.mock('../dates', async (importOriginal) => ({ ...await importOriginal<typeof import('../dates')>(), todayDhaka: () => '2026-10-22' }));
import { getAiUsage, reserveAiRequest } from './usage';
import { mapApiError } from '../api/security';
import { admin, demo } from './test-fixtures';

beforeEach(() => {
  vi.resetAllMocks(); mocks.settings.mockResolvedValue({ aiDailyLimit: 18 }); mocks.increment.mockResolvedValue(true); mocks.count.mockResolvedValue(3);
  const chain = { select: () => chain, lean: mocks.lean };
  mocks.find.mockReturnValue(chain); mocks.update.mockReturnValue(chain); mocks.lean.mockResolvedValue({ demoAiUsed: 1 });
});
it('atomically reserves the configured admin budget with 3 day TTL', async () => {
  await reserveAiRequest(admin);
  expect(mocks.increment).toHaveBeenCalledWith('ai:admin:2026-10-22', 18, 259200);
  expect(await getAiUsage(admin)).toEqual({ remaining: 15, limit: 18, scope: 'admin' });
});
it('reserves global demo budget before atomic personal lifetime cap', async () => {
  await reserveAiRequest(demo);
  expect(mocks.increment).toHaveBeenCalledWith('ai:demo:2026-10-22', 6, 259200);
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ _id: demo.userId, role: 'demo', demoAiUsed: { $lt: 2 }, expiresAt: expect.anything() }), { $inc: { demoAiUsed: 1 } }, expect.anything());
  expect(await getAiUsage(demo)).toEqual({ remaining: 1, limit: 2, scope: 'demo' });
});
it('returns AI_LIMIT 429 without a user increment if global cap is blocked', async () => {
  mocks.increment.mockResolvedValue(false);
  const error = await reserveAiRequest(demo).catch((error: unknown) => error);
  expect(mapApiError(error)).toEqual({ status: 429, error: { code: 'AI_LIMIT', message: 'The demo AI limit is reached for today. Everything else still works.' } });
  expect(mocks.update).not.toHaveBeenCalled();
  await expect(reserveAiRequest(admin)).rejects.toThrow('Your daily AI limit is reached');
});
it('accepts a global count waste if personal cap fails; floors remaining at zero', async () => {
  mocks.lean.mockResolvedValue(null);
  await expect(reserveAiRequest(demo)).rejects.toMatchObject({ responseCode: 'AI_LIMIT' });
  expect(mocks.increment).toHaveBeenCalledTimes(1);
  mocks.lean.mockResolvedValue({ demoAiUsed: 3 }); mocks.count.mockResolvedValue(100);
  expect((await getAiUsage(demo)).remaining).toBe(0);
  expect((await getAiUsage(admin)).remaining).toBe(0);
});

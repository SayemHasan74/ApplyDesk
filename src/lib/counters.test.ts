import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ connectDb: vi.fn(), update: vi.fn(), find: vi.fn(), select: vi.fn(), lean: vi.fn() }));
vi.mock('./db', () => ({ connectDb: mocks.connectDb }));
vi.mock('./models/counters', () => ({ Counter: { findOneAndUpdate: mocks.update, findOne: mocks.find } }));
import { getCount, incrementIfBelow } from './counters';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.find.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ lean: mocks.lean });
});
it('increments atomically below the limit with an absolute TTL', async () => {
  mocks.update.mockResolvedValue(null);
  expect(await incrementIfBelow('demo-create:2026-10-21-10', 20, 3600)).toBe(true);
  expect(mocks.update).toHaveBeenCalledWith({ key: 'demo-create:2026-10-21-10', count: { $lt: 20 } }, {
    $inc: { count: 1 }, $setOnInsert: { expiresAt: expect.any(Date) },
  }, { upsert: true });
});
it('treats only E11000 as a reached limit and propagates other failures', async () => {
  mocks.update.mockRejectedValueOnce({ code: 11000 });
  expect(await incrementIfBelow('limit', 20, 3600)).toBe(false);
  mocks.update.mockRejectedValueOnce(new Error('Database unavailable'));
  await expect(incrementIfBelow('limit', 20, 3600)).rejects.toThrow('Database unavailable');
});
it('returns the stored count or zero for a missing key', async () => {
  mocks.lean.mockResolvedValueOnce({ count: 7 }).mockResolvedValueOnce(null);
  expect(await getCount('usage')).toBe(7);
  expect(await getCount('missing')).toBe(0);
  expect(mocks.find).toHaveBeenCalledWith({ key: 'usage' });
  expect(mocks.select).toHaveBeenCalledWith('count');
});
